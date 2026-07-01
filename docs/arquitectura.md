# Arquitectura de galaxIA

## Vista general

galaxIA tiene tres capas principales:

1. **Frontend** — la cara del chat.
2. **Agent Backend** — el cerebro que coordina todo.
3. **Proveedores** — los nodos que aportan recursos.

```
┌─────────────────────────────────────────┐
│           Navegador (localhost:3000)      │
│              Chat web                   │
└──────────────┬──────────────────────────┘
               │ WebSocket (chat)
               ▼
┌─────────────────────────────────────────┐
│        Agent Backend (localhost:8083)    │
│                                          │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │ Registry    │  │ Agent Runtime    │  │
│  │ (WebSocket) │  │ (ciclo LLM→tool) │  │
│  └──────┬──────┘  └────────┬─────────┘  │
│         │                   │            │
│  ┌──────▼──────┐  ┌─────────▼────────┐   │
│  │ LLM Gateway │  │ MCP Host         │   │
│  │ (FHS WS)    │  │ (MCP / FHS WS)   │   │
│  └─────────────┘  └──────────────────┘   │
└──────┬────────────────────┬─────────────┘
       │ FHS WebSocket      │ FHS WS / MCP
       ▼                    ▼
┌─────────────┐    ┌─────────────────┐
│ LLM Provider│    │ OCR Provider    │
│ (FHS node)  │    │ (FHS node)      │
│   ↓ HTTP    │    │   ↓ HTTP        │
│ llama.cpp   │    │ Tesseract       │
└─────────────┘    └─────────────────┘
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

- **LLM Provider**: un nodo FHS completo. Se registra en el Registry, expone un WebSocket FHS para recibir `chat.request`, y traduce internamente a llama.cpp/Ollama/vLLM. Ejemplo: `examples/llm-provider/`.
- **OCR Provider**: un nodo FHS completo para tools. Se registra en el Registry como tipo `mcp`, expone un WebSocket FHS para recibir `tool.list`/`tool.call`, y traduce internamente al servicio OCR real (Tesseract). Ejemplo: `examples/ocr-provider/`.

## Flujo de un mensaje

1. El usuario escribe en el chat y adjunta opcionalmente una imagen.
2. El frontend envía el mensaje por WebSocket al Agent Backend.
3. El Agent Runtime clasifica la intención.
4. Resuelve el mejor LLM disponible desde el Registry.
5. Resuelve las tools MCP candidatas desde el Registry.
6. El LLM Gateway abre un WebSocket FHS al LLM Provider y envía `chat.request`.
7. Si el LLM solicita una tool, la ejecuta vía MCP Host.
8. Reinyecta el resultado al LLM con otra llamada FHS.
9. Recibe `chat.completed` y envía la respuesta al frontend con procedencia.

## Protocolos usados

- **WebSocket FHS**: registro de nodos (`/fhs/v1/ws`) y streaming del chat (`/api/chat/ws`).
- **WebSocket FHS (chat)**: comunicación entre Agent Server y LLM providers (`chat.request`/`chat.delta`/`chat.completed`).
- **WebSocket FHS (tools)**: comunicación entre Agent Server y Tool providers (`tool.list`/`tool.call`/`tool.result`).
- **HTTP REST**: consultas al catálogo (`/api/fhs/providers`, `/api/fhs/models`).
- **HTTP (interno)**: los providers traducen FHS → servicio real internamente (llama.cpp, Tesseract). El Agent Server no usa HTTP para hablar con modelos ni tools.
- **MCP**: protocolo estándar para tools, usado internamente por los providers FHS (no expuesto al Agent Server).
