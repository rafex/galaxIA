# Arquitectura de galaxIA

## Vista general

galaxIA tiene tres capas principales:

1. **Frontend** — la cara del chat.
2. **Agent Backend** — el cerebro que coordina todo.
3. **Proveedores** — los nodos que aportan recursos.

```
┌──────────────────────────────────────────────────────────┐
│              Navegador (192.168.3.173:3000)              │
│                   Chat web (nginx)                       │
└──────────────┬───────────────────────────────────────────┘
               │ WebSocket (chat) → proxy nginx
               ▼
┌──────────────────────────────────────────────────────────┐
│           Agent Backend (192.168.3.173:30083)            │
│                     container: fhs-agent-server           │
│                                                          │
│  ┌─────────────┐  ┌──────────────────┐  ┌─────────────┐ │
│  │ Registry    │  │ Agent Runtime    │  │ EventBus    │ │
│  │ (WebSocket) │  │ (ciclo LLM→tool) │  │ (SSE/WS)    │ │
│  └──────┬──────┘  └────────┬─────────┘  └─────────────┘ │
│         │                   │                            │
│  ┌──────▼──────┐  ┌─────────▼────────┐                  │
│  │ LLM Gateway │  │ MCP Host         │                  │
│  │ (FHS WS)    │  │ (MCP / FHS WS)   │                  │
│  └─────────────┘  └──────────────────┘                  │
└──────┬────────────────────┬─────────────────────────────┘
       │ FHS WebSocket      │ FHS WebSocket
       ▼                    ▼
┌─────────────────┐  ┌──────────────────────┐
│ fhs-llm-provider│  │ fhs-ocr-provider     │
│ (Node.js FHS)   │  │ (Node.js FHS)        │
│   ↓ curl        │  │   ↓ curl -F          │
│ llama.cpp       │  │ ether-ocr-api:8000   │
│ Qwen2.5-Coder3B │  │   ↓ Tesseract        │
│ :8080 (host)    │  │ :8000 (container)    │
└─────────────────┘  └──────────────────────┘
```

## Componentes

### Frontend (`apps/web`)

- Vite + vanilla TypeScript + CSS3.
- Se conecta al Agent Backend por WebSocket.
- Muestra mensajes, actividad del agente y procedencia.
- Permite adjuntar imágenes para OCR.

### Agent Backend (`apps/agent-server`)

- **Registry**: catálogo de nodos y servicios. Usa WebSocket para registro y heartbeat. Los proveedores se conectan a `/fhs/v1/ws` y envían `hello` + `register` + `ping`.
- **Agent Runtime**: ciclo principal. Clasifica intención, resuelve LLM desde el Registry, resuelve tools desde el Registry, ejecuta y responde.
- **LLM Gateway**: habla el protocolo FHS por WebSocket. Envía `chat.request` al proveedor LLM y recibe `chat.delta`/`chat.completed`. **No usa HTTP directo a los modelos.**
- **MCP Host**: pese al nombre, habla el protocolo FHS de tools (`tool.list`/`tool.call`) por WebSocket — **no** el SDK oficial de MCP (corregido en DEC-0014; la implementación original sí lo usaba y por eso nunca lograba conectar con los providers reales).
- **EventBus**: distribuye eventos tipados FHS a los clientes WebSocket, filtrados por `conversationId` (DEC-0018) — cada cliente solo recibe eventos de su propia conversación.

### Proveedores

- **LLM Provider**: un nodo FHS completo. Se registra en el Registry, expone un WebSocket FHS para recibir `chat.request`, y traduce internamente a llama.cpp vía `curl`. Modelo configurado por variables de entorno (DEC-0019), actualmente Qwen 2.5 Coder 3B con tool calling. Ejemplo: `examples/llm-provider/`. Documentación: [`proveedores.md`](./proveedores.md).
- **OCR Provider**: un nodo FHS completo para tools. Se registra en el Registry como tipo `mcp`, expone un WebSocket FHS para recibir `tool.list`/`tool.call`, y traduce internamente a ether-ocr vía `curl -F`. Ejemplo: `examples/ocr-provider/`. Documentación: [`proveedores.md`](./proveedores.md).

## Flujo de un mensaje

**Si el usuario adjunta un archivo** (imagen o PDF), el flujo es distinto y no involucra al LLM en el primer turno:

1. El frontend envía el mensaje + artifact por WebSocket al Agent Backend.
2. El runtime ejecuta OCR **directamente** contra el OCR Provider (sin tool calling — DEC-0020) y emite `ocr.extracted` con el texto.
3. El frontend muestra el texto en una burbuja colapsada y pide confirmación ("Usar documento" / "Descartar") — ver `spec-native/specs/ocr-confirmacion/SPEC.md`.
4. Solo si el usuario confirma, el texto se antepone a su pregunta y continúa el flujo normal de chat (pasos 3–9 abajo).

**Flujo normal de chat** (sin adjunto, o tras confirmar el uso de un documento):

1. El usuario escribe en el chat.
2. El frontend envía el mensaje por WebSocket al Agent Backend vía nginx proxy.
3. El Agent Runtime clasifica la intención.
4. Resuelve el mejor LLM disponible desde el Registry (prefiere modelos con tool calling).
5. Resuelve las tools MCP candidatas desde el Registry para otras capacidades (no OCR, ya resuelto de forma determinística si aplica).
6. El LLM Gateway abre un WebSocket FHS al LLM Provider y envía `chat.request`.
7. Si el LLM solicita una tool, el MCP Host la ejecuta vía FHS WebSocket al provider correspondiente.
8. Reinyecta el resultado al LLM con otra llamada FHS.
9. Recibe `chat.completed` y envía la respuesta al frontend con procedencia (qué LLM, qué tools, qué datos viajaron).

## Flujo de OCR (tool via FHS)

```
Cliente → Agent Server → OCR Provider (FHS WS) → curl -F → ether-ocr-api:8000/api/v1/ocr → Tesseract
   tool.call              tool.call               multipart     REST API
   ← tool.result          ← tool.result
```

## Redes y conectividad

Los servicios se comunican por Docker DNS dentro de la red `fhs`:

| Origen | Destino | Cómo |
|---|---|---|
| `fhs-web` | `agent-server:8081` | nginx proxy (Docker DNS) |
| `agent-server` | `llm-provider:43111` | WebSocket FHS (Docker DNS) |
| `agent-server` | `ocr-provider:43112` | WebSocket FHS (Docker DNS) |
| `llm-provider` | `host.containers.internal:8080` | curl → llama.cpp en host |
| `ocr-provider` | `ether-ocr-api:8000` | curl -F (Docker DNS, misma red `fhs`) |

El `ether-ocr-api` debe conectarse manualmente a la red `fhs` tras cada reinicio:

```bash
podman network connect fhs ether-ocr-api
```

## Protocolos usados

- **WebSocket FHS**: registro de nodos (`/fhs/v1/ws`) y streaming del chat (`/api/chat/ws`).
- **WebSocket FHS (chat)**: comunicación entre Agent Server y LLM providers (`chat.request`/`chat.delta`/`chat.completed`).
- **WebSocket FHS (tools)**: comunicación entre Agent Server y Tool providers (`tool.list`/`tool.call`/`tool.result`).
- **HTTP REST**: consultas al catálogo (`/api/fhs/providers`, `/api/fhs/models`).
- **HTTP (interno)**: los providers traducen FHS → servicio real internamente (llama.cpp, Tesseract vía ether-ocr-api REST). El Agent Server no usa HTTP para hablar con modelos ni tools.

> Nota: a pesar de que el tipo de provider se llama `"mcp"` y la clase se llama `McpHost`, **no se usa el protocolo MCP real en ningún punto de este stack** — es FHS WebSocket de punta a punta. El nombre es histórico; ver DEC-0014 en `spec-native/DECISIONS.md`.
