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
│ Qwen 0.5B       │  │   ↓ Tesseract        │
│ :43110 (host)   │  │ :8000 (container)    │
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
- **MCP Host**: cliente MCP que conecta con servidores de tools.
- **EventBus**: distribuye eventos tipados FHS a los clientes WebSocket.

### Proveedores

- **LLM Provider**: un nodo FHS completo. Se registra en el Registry, expone un WebSocket FHS para recibir `chat.request`, y traduce internamente a llama.cpp vía `curl`. Modelo: Qwen 2.5 0.5B. Ejemplo: `examples/llm-provider/`. Documentación: [`proveedores.md`](./proveedores.md).
- **OCR Provider**: un nodo FHS completo para tools. Se registra en el Registry como tipo `mcp`, expone un WebSocket FHS para recibir `tool.list`/`tool.call`, y traduce internamente a ether-ocr vía `curl -F`. Ejemplo: `examples/ocr-provider/`. Documentación: [`proveedores.md`](./proveedores.md).

## Flujo de un mensaje

1. El usuario escribe en el chat y adjunta opcionalmente una imagen.
2. El frontend envía el mensaje por WebSocket al Agent Backend vía nginx proxy.
3. El Agent Runtime clasifica la intención.
4. Resuelve el mejor LLM disponible desde el Registry.
5. Resuelve las tools MCP candidatas desde el Registry (incluyendo OCR).
6. El LLM Gateway abre un WebSocket FHS al LLM Provider y envía `chat.request`.
7. Si el LLM solicita una tool (ej: OCR), el MCP Host la ejecuta vía FHS WebSocket al OCR Provider, que a su vez llama a ether-ocr.
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
| `llm-provider` | `host.containers.internal:43110` | curl → llama.cpp en host |
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
- **HTTP (interno)**: los providers traducen FHS → servicio real internamente (llama.cpp, Tesseract). El Agent Server no usa HTTP para hablar con modelos ni tools.
- **MCP**: protocolo estándar para tools, usado internamente por los providers FHS (no expuesto al Agent Server).
