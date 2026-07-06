# Arquitectura de galaxIA

## Vista general

galaxIA tiene cuatro capas principales (DEC-0035: Atlas y Navigator son servicios separados, antes vivían en un solo proceso):

1. **Portal** — la cara del chat.
2. **Navigator** — el cerebro que orquesta LLM/tools.
3. **Atlas** — el catálogo de nodos (Registry).
4. **Proveedores** (Star/Satellite) — los nodos que aportan recursos.

```
┌──────────────────────────────────────────────────────────┐
│              Navegador (192.168.3.173:3000)              │
│                   Chat web (nginx)                       │
└──────────────┬───────────────────────────────────────────┘
               │ WebSocket (chat) → proxy nginx (/api/chat*)
               │ HTTP/WS registro (/api/fhs/*, /fhs/v1/ws) ──────┐
               ▼                                                 ▼
┌──────────────────────────────────┐          ┌──────────────────────────────┐
│  Navigator (container: fhs-navigator)         │  Atlas (container: fhs-atlas)  │
│                                   │          │                              │
│  ┌─────────────┐  ┌────────────┐ │  HTTP    │  ┌────────────────────────┐ │
│  │ Agent       │  │ EventBus   │ │◀────────▶│  │ Registry (WebSocket)   │ │
│  │ Runtime     │  │ (SSE/WS)   │ │ AtlasClient │  catálogo + rating     │ │
│  └──────┬──────┘  └────────────┘ │          │  └────────────────────────┘ │
│         │                        │          └──────────────┬───────────────┘
│  ┌──────▼──────┐  ┌────────────┐ │                         │ FHS WebSocket
│  │ LLM Gateway │  │ MCP Host   │ │                         │ (hello/register/ping)
│  │ (FHS WS)    │  │(FHS WS)    │ │                         ▼
│  └──────┬──────┘  └─────┬──────┘ │              (Star/Satellite se registran
└─────────┼─────────────────┼──────┘               directamente aquí, no vía Navigator)
          │ FHS WebSocket   │ FHS WebSocket
          ▼                 ▼
┌─────────────────┐  ┌──────────────────────┐
│ fhs-star        │  │ fhs-satellite-ocr    │
│ (Node.js FHS)   │  │ (Node.js FHS)        │
│   ↓ curl        │  │   ↓ curl -F          │
│ llama.cpp       │  │ ether-ocr-api:8000   │
│ Qwen2.5-Coder3B │  │   ↓ Tesseract        │
│ :8080 (host)    │  │ :8000 (container)    │
└─────────────────┘  └──────────────────────┘
```

## Componentes

### Portal (`apps/portal`)

- Vite + vanilla TypeScript + CSS3.
- Se conecta a Navigator por WebSocket (chat) y a Atlas por REST (catálogo) — vía el proxy nginx, que enruta por prefijo de ruta.
- Muestra mensajes, actividad del agente y procedencia.
- Permite adjuntar imágenes para OCR.

### Navigator (`apps/navigator`)

- **Agent Runtime**: ciclo principal. Clasifica intención, resuelve LLM/tools consultando a Atlas por HTTP (`AtlasClient`), ejecuta y responde.
- **AtlasClient** (`atlas-client.ts`): único punto de acoplamiento con Atlas — `getProviders()` (lectura, para resolver a qué nodo enrutar) y `recordSample()` (escritura fire-and-forget de telemetría, DEC-0035).
- **LLM Gateway**: habla el protocolo FHS por WebSocket directo al Star. Envía `chat.request` y recibe `chat.delta`/`chat.completed`. **No usa HTTP directo a los modelos.**
- **MCP Host**: pese al nombre, habla el protocolo FHS de tools (`tool.list`/`tool.call`) por WebSocket directo al Satellite — **no** el SDK oficial de MCP (corregido en DEC-0014).
- **EventBus** (propio de Navigator): distribuye eventos tipados FHS a los clientes WebSocket, filtrados por `conversationId` (DEC-0018).

### Atlas (`apps/atlas`)

- **Registry**: catálogo de nodos y servicios. Usa WebSocket para registro y heartbeat. Los proveedores se conectan a `/fhs/v1/ws` y envían `hello` + `register` + `ping` — directamente a Atlas, sin pasar por Navigator.
- Expone el catálogo (`/api/fhs/providers`, `/api/fhs/models`, etc.) y el rating por nodo (SPEC-SATRATING-0001) vía REST, consumido tanto por el Portal (mostrar catálogo) como por Navigator (`AtlasClient`, resolver + reportar métricas).
- Ver `docs/atlas.md` para el detalle completo.

### Proveedores

- **Star (LLM)**: un nodo FHS completo. Se registra en Atlas, expone un WebSocket FHS para recibir `chat.request`, y traduce internamente a llama.cpp vía `curl`. Modelo configurado por variables de entorno (DEC-0019), actualmente Qwen 2.5 Coder 3B con tool calling. Ejemplo: `examples/star-example/`. Documentación: [`proveedores.md`](./proveedores.md).
- **Satellite (OCR)**: un nodo FHS completo para tools. Se registra en Atlas como tipo `mcp`, expone un WebSocket FHS para recibir `tool.list`/`tool.call`, y traduce internamente a ether-ocr vía `curl -F`. Ejemplo: `examples/satellite-ocr-example/`. Documentación: [`proveedores.md`](./proveedores.md).

## Flujo de un mensaje

**Si el usuario adjunta un archivo** (imagen o PDF), el flujo es distinto y no involucra al LLM en el primer turno:

1. El Portal envía el mensaje + artifact por WebSocket a Navigator.
2. El runtime ejecuta OCR **directamente** contra el Satellite (sin tool calling — DEC-0020) y emite `ocr.extracted` con el texto.
3. El Portal muestra el texto en una burbuja colapsada y pide confirmación ("Usar documento" / "Descartar") — ver `spec-native/specs/ocr-confirmacion/SPEC.md`.
4. Solo si el usuario confirma, el texto se antepone a su pregunta y continúa el flujo normal de chat (pasos 3–9 abajo).

**Flujo normal de chat** (sin adjunto, o tras confirmar el uso de un documento):

1. El usuario escribe en el chat.
2. El Portal envía el mensaje por WebSocket a Navigator vía nginx proxy.
3. El Agent Runtime clasifica la intención.
4. Resuelve el mejor LLM disponible consultando `GET /api/fhs/providers?type=llm` a Atlas (prefiere modelos con tool calling).
5. Resuelve las tools MCP candidatas consultando `GET /api/fhs/providers?type=mcp` a Atlas (no OCR, ya resuelto de forma determinística si aplica).
6. El LLM Gateway abre un WebSocket FHS directo al Star y envía `chat.request`.
7. Si el LLM solicita una tool, el MCP Host la ejecuta vía FHS WebSocket directo al Satellite correspondiente.
8. Reinyecta el resultado al LLM con otra llamada FHS.
9. Recibe `chat.completed`, reporta la muestra de latencia/éxito a Atlas (`POST /api/fhs/metrics/sample`, fire-and-forget) y envía la respuesta al Portal con procedencia (qué LLM, qué tools, qué datos viajaron).

## Flujo de OCR (tool via FHS)

```
Cliente → Navigator → Satellite OCR (FHS WS) → curl -F → ether-ocr-api:8000/api/v1/ocr → Tesseract
   tool.call            tool.call                  multipart     REST API
   ← tool.result        ← tool.result
```

## Redes y conectividad

Los servicios se comunican por Docker DNS dentro de la red `fhs`:

| Origen | Destino | Cómo |
|---|---|---|
| `fhs-portal` (nginx) | `atlas:8081` | proxy `/api/fhs/*`, `/fhs/v1/ws` (Docker DNS) |
| `fhs-portal` (nginx) | `navigator:8090` | proxy `/api/chat*` (Docker DNS) |
| `navigator` | `atlas:8081` | HTTP (`ATLAS_URL`, `AtlasClient`) |
| `navigator` | `star:43111` | WebSocket FHS (Docker DNS) |
| `navigator` | `satellite-ocr:43112` | WebSocket FHS (Docker DNS) |
| `star` | `atlas:8081` | WebSocket FHS — registro (`REGISTRY_URL`) |
| `satellite-ocr` | `atlas:8081` | WebSocket FHS — registro (`REGISTRY_URL`) |
| `star` | `host.containers.internal:8080` | curl → llama.cpp en host |
| `satellite-ocr` | `ether-ocr-api:8000` | curl -F (Docker DNS, misma red `fhs`) |

El `ether-ocr-api` debe conectarse manualmente a la red `fhs` tras cada reinicio:

```bash
podman network connect fhs ether-ocr-api
```

## Protocolos usados

- **WebSocket FHS**: registro de nodos (`/fhs/v1/ws`, en Atlas) y streaming del chat (`/api/chat/ws`, en Navigator).
- **WebSocket FHS (chat)**: comunicación directa entre Navigator y Star (`chat.request`/`chat.delta`/`chat.completed`).
- **WebSocket FHS (tools)**: comunicación directa entre Navigator y Satellite (`tool.list`/`tool.call`/`tool.result`).
- **HTTP REST**: Navigator↔Atlas (`AtlasClient` — resolver providers, reportar métricas); Portal↔Atlas (consultas al catálogo, `/api/fhs/providers`, `/api/fhs/models`).
- **HTTP (interno)**: los providers traducen FHS → servicio real internamente (llama.cpp, Tesseract vía ether-ocr-api REST). Ni Navigator ni Atlas usan HTTP para hablar con modelos ni tools — solo entre ellos dos.

> Nota: a pesar de que el tipo de provider se llama `"mcp"` y la clase se llama `McpHost`, **no se usa el protocolo MCP real en ningún punto de este stack** — es FHS WebSocket de punta a punta. El nombre es histórico; ver DEC-0014 en `spec-native/DECISIONS.md`.
