# Navigator — El orquestador de galaxIA

Navigator es el Agent Runtime del protocolo FHS: resuelve qué LLM/tools usar, ejecuta el ciclo de chat, y sirve al Portal. Corre en `apps/navigator/`. Desde DEC-0035 es un servicio independiente de Atlas (el Registry) — le habla por HTTP vía `AtlasClient`, ya no lo hospeda en el mismo proceso.

## Las dos caras de Navigator

```
                          ┌──────────────────────────────┐
  Navegador ──WebSocket──▶│          Navigator             │
  (Portal)                │                               │
                          │  ┌─────────────────────────┐ │
                          │  │  1. Agent Runtime       │ │◀──HTTP (AtlasClient)──▶ Atlas
                          │  │  clasifica → resuelve   │ │   getProviders()          (Registry)
                          │  │  → ejecuta → responde   │ │   recordSample()
                          │  └───────────┬─────────────┘ │
                          │              │ emite          │
                          │  ┌───────────▼─────────────┐ │
                          │  │  2. Chat API            │ │
                          │  │  /api/chat/ws           │─┼──WebSocket──▶ Navegador
                          │  └─────────────────────────┘ │  (eventos)
                          └──────────────────────────────┘
                                  │                    │
                             FHS WebSocket         FHS WebSocket
                                  ▼                    ▼
                            Star (LLM)          Satellite (tools)
```

### 1. Agent Runtime — el que decide y ejecuta

El Runtime recibe un mensaje del usuario y ejecuta este ciclo:

```
Mensaje del usuario (¿trae artifacts adjuntos?)
    │
    ├── SÍ ──▶ extractOcrText() — OCR determinístico, SIN llamar al LLM
    │          Emite `ocr.extracted`. El frontend pide confirmación
    │          ("Usar documento" / "Descartar") antes de continuar.
    │          Ver spec-native/specs/ocr-confirmacion/SPEC.md
    │
    ▼ (si no hay adjunto, o el usuario ya confirmó "usar")
┌─────────────┐
│  clasificar  │  ¿Qué necesita? ¿Resumen? ¿Chat simple?
└──────┬──────┘
       ▼
┌─────────────┐
│ resolver LLM │  GET /api/fhs/providers?type=llm a Atlas (AtlasClient)
└──────┬──────┘  Prefiere modelos con tool calling nativo.
       ▼
┌─────────────┐
│ resolver     │  GET /api/fhs/providers?type=mcp a Atlas para las
│ tools        │  capacidades restantes (no incluye OCR, ya resuelto)
└──────┬──────┘
       ▼
┌─────────────┐
│ llamar LLM   │  Envía el historial (con texto OCR ya antepuesto, si aplica)
└──────┬──────┘  + tools disponibles vía FHS WebSocket directo al Star.
       ▼
  ¿El LLM pidió ejecutar una tool?
       │
  ┌────┴────┐
  NO        SÍ
  │         │
  │    ┌────▼─────┐
  │    │ ejecutar  │  El MCP Host invoca la tool en el Satellite.
  │    │ tool      │  El resultado se reinyecta al LLM.
  │    └────┬─────┘
  │         │
  │    ┌────▼─────┐
  │    │ llamar    │  Segunda llamada al LLM con el resultado.
  │    │ LLM otra  │  Esta vez SIN tools, para respuesta final.
  │    │ vez       │
  │    └────┬─────┘
  │         │
  └────┬────┘
       ▼
┌─────────────┐
│ responder    │  La respuesta + procedencia se emite al frontend.
└─────────────┘
```

En cada llamada a un Star/Satellite, el Runtime reporta la muestra de latencia/éxito a Atlas vía `atlasClient.recordSample(...)` (fire-and-forget — no bloquea la respuesta al usuario si Atlas está lento o caído).

**Por qué OCR ya no depende de tool calling:** modelos pequeños/locales resultaron poco confiables decidiendo cuándo invocar `ocr_extract` (a veces sí, a veces no, sin cambiar la petición — ver `spec-native/DECISIONS.md` DEC-0016/DEC-0017). Cuando el usuario adjunta un archivo, la intención ya es inequívoca, así que el runtime ejecuta el OCR directamente (DEC-0020) en vez de ofrecerlo como tool al LLM.

**Dónde vive el código:** `apps/navigator/src/agent/runtime.ts`, `apps/navigator/src/atlas-client.ts`

### 2. Chat API — la cara al usuario

El frontend se conecta a `/api/chat/ws` y envía:

```json
{
  "type": "start",
  "message": { "role": "user", "content": "Hola, ¿qué puedes hacer?" },
  "artifacts": ["data:application/pdf;base64,..."],
  "attachmentName": "documento.pdf",
  "preferences": { "model": "auto", "scope": "community" }
}
```

Si `artifacts` trae un archivo, el runtime **no llama al LLM en ese turno** — solo extrae el texto (OCR) y responde con `ocr.extracted`. El usuario decide con un segundo mensaje:

```json
{ "type": "attachment.decision", "conversationId": "...", "use": true }
```

Ver `spec-native/specs/ocr-confirmacion/SPEC.md` para el flujo completo.

Recibe eventos en tiempo real:

| Evento | Significado |
|---|---|
| `session` | ID de conversación asignado |
| `agent.status` | Estado actual del ciclo (classifying, resolving-model...) |
| `llm.selected` | Qué modelo se eligió y por qué |
| `tool.selected` | Qué tool se va a usar |
| `tool.running` | La tool está ejecutándose |
| `tool.completed` | La tool terminó (con duración) |
| `assistant.delta` | Fragmento de texto de la respuesta |
| `assistant.completed` | Respuesta final + procedencia |
| `ocr.extracted` | Texto extraído de un archivo adjunto — antes de llamar al LLM, espera confirmación del usuario (`attachment.decision`) |
| `error` | Algo falló |

Todo evento lleva `conversationId` — `chat-ws.ts` solo reenvía a la conexión dueña de esa conversación, nunca a otros clientes conectados (ver `spec-native/DECISIONS.md` DEC-0018). (`node.online`/`node.lost` viven en el `EventBus` interno de Atlas, un proceso aparte — no llegan a este EventBus.)

**Dónde vive el código:** `apps/navigator/src/api/chat-ws.ts`

## El Gateway LLM por FHS

La comunicación con el proveedor LLM es por WebSocket con mensajes tipados del protocolo — **no** HTTP directo:

```
Agent Runtime → LlmGateway → FHS WebSocket → star → HTTP → llama.cpp
                                              (ejemplo en
                                              examples/star-example/)
```

El Gateway envía `chat.request` y recibe `chat.delta` / `chat.completed`. El proveedor LLM es un nodo FHS completo que se registra en Atlas y habla el protocolo — Navigator abre la conexión de chat directamente contra el Star, sin pasar por Atlas. **Navigator no sabe nada de OpenAI API, solo habla FHS.**

```
 chat.request ──────────▶  star          ──HTTP──▶  llama.cpp
               FHS WS         (registrado
◀── chat.delta               en Atlas)
◀── chat.completed
```

**Dónde vive el código:**
- Gateway: `apps/navigator/src/providers/llm-gateway.ts`
- Ejemplo de provider: `examples/star-example/src/index.ts`

## El Gateway de Tools por FHS

Igual que el LLM, las tools (OCR, etc.) se consumen vía FHS WebSocket directo al Satellite — Navigator no conoce MCP ni REST para tools.

```
Agent Runtime → MCP Host → FHS WS → satellite-ocr → curl → ether-ocr
               tool.list            (registrado       REST API
               tool.call             en Atlas)         /api/v1/ocr
```

El OCR Provider expone tools con schema tipado:

```json
{
  "type": "tool.call",
  "requestId": "...",
  "toolName": "ocr_extract",
  "arguments": { "file_base64": "...", "filename": "captura.png", "lang": "spa+eng" }
}
```

Y responde:

```json
{
  "type": "tool.result",
  "requestId": "...",
  "toolName": "ocr_extract",
  "content": [{ "type": "text", "text": "Hola mundo extraído de la imagen" }]
}
```

**Dónde vive el código:**
- Tool provider ejemplo: `examples/satellite-ocr-example/src/index.ts`
- Bridge a ether-ocr: `examples/satellite-ocr-example/src/ocr-bridge.ts`
- Mensajes FHS de tools: `packages/fhs-protocol/src/messages.ts`

## Cómo levantar Navigator

Requiere Atlas corriendo primero (ver `docs/atlas.md`).

```bash
# Desarrollo (con hot reload)
npm run dev -w apps/navigator

# O directamente
cd apps/navigator
PORT=8083 ATLAS_URL=http://localhost:8081 npx tsx src/index.ts
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8082` (contenedor) / `8083` (dev) | Puerto HTTP + WebSocket de chat |
| `HOST` | `127.0.0.1` | Interfaz de escucha |
| `ATLAS_URL` | `http://localhost:8081` | Dónde vive Atlas — sin descubrimiento mDNS todavía (deferido, DEC-0035) |
| `TLS_CERT_PATH` / `TLS_KEY_PATH` | — | Opt-in de TLS/WSS para la Chat API (ver `docs/tls-autofirmado.md`) |

### Endpoints expuestos

| Ruta | Método | Descripción |
|---|---|---|
| `/health` | GET | Health check |
| `/api/chat` | POST | Chat por REST (legacy) |
| `/api/chat/ws` | WebSocket | Chat en tiempo real |
| `/api/chat/:id/events` | GET (SSE) | Eventos de una conversación específica |

## Submódulos internos

| Carpeta/archivo | Responsabilidad |
|---|---|
| `agent/` | Ciclo del agente: clasificar, resolver, ejecutar, responder |
| `atlas-client.ts` | Cliente HTTP de Atlas — reemplaza el acceso en proceso a la clase `Atlas` (DEC-0035) |
| `providers/llm-gateway.ts` | Comunicación FHS WebSocket directa con proveedores LLM |
| `providers/mcp-host.ts` | Cliente FHS WebSocket contra providers de tools (no usa el SDK MCP nativo — ver DEC-0014) |
| `api/` | Endpoints REST + WebSocket para chat y eventos |
| `sse/` | Bus de eventos (propio de Navigator) que alimenta el streaming al frontend |

Ver `docs/atlas.md` para el Registry (Atlas): protocolo de registro de nodos, endpoints del catálogo, y su contrato con Navigator.
