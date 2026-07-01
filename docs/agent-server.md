# Agent Server — El cerebro de galaxIA

El Agent Server es el orquestador central del protocolo FHS. Corre en `apps/agent-server/` y concentra tres responsabilidades en un solo proceso.

## Las tres caras del Agent Server

```
                          ┌──────────────────────────────┐
  Navegador ──WebSocket──▶│        Agent Server           │
  (chat)                  │                               │
                          │  ┌─────────────────────────┐ │
  LLM Provider ◀──FHS WS──┼──│  1. Registry (catálogo)  │─┼──FHS WS──▶ MCP Provider
  (llama.cpp)   registra  │  │  /fhs/v1/ws              │ │  registra    (OCR, etc.)
                          │  └───────────┬─────────────┘ │
                          │              │ busca          │
                          │  ┌───────────▼─────────────┐ │
                          │  │  2. Agent Runtime       │ │
                          │  │  clasifica → resuelve   │ │
                          │  │  → ejecuta → responde   │ │
                          │  └───────────┬─────────────┘ │
                          │              │ emite          │
                          │  ┌───────────▼─────────────┐ │
                          │  │  3. Chat API            │ │
                          │  │  /api/chat/ws           │─┼──WebSocket──▶ Navegador
                          │  └─────────────────────────┘ │  (eventos)
                          └──────────────────────────────┘
```

### 1. Registry — el catálogo

El Registry mantiene la lista de proveedores disponibles. **No ejecuta nada, solo cataloga.**

Los proveedores se conectan por WebSocket a `/fhs/v1/ws` y envían:

1. `hello` — "hola, soy did:key:macmini-raul"
2. `register` — "ofrezco esto" (con un manifiesto)
3. `ping` — "sigo vivo" (cada 10s)

Si un proveedor deja de hacer ping, el Registry lo marca como `lost` y notifica a los agentes.

**Dónde vive el código:** `apps/agent-server/src/registry/`

### 2. Agent Runtime — el que decide y ejecuta

El Runtime recibe un mensaje del usuario y ejecuta este ciclo:

```
Mensaje del usuario
    │
    ▼
┌─────────────┐
│  clasificar  │  ¿Qué necesita? ¿OCR? ¿Resumen? ¿Chat simple?
└──────┬──────┘
       ▼
┌─────────────┐
│ resolver LLM │  Pregunta al Registry: ¿hay proveedores "llm"?
└──────┬──────┘  Prefiere modelos con tool calling nativo.
       ▼
┌─────────────┐
│ resolver     │  Pregunta al Registry: ¿hay tools MCP para
│ tools        │  las capacidades detectadas?
└──────┬──────┘
       ▼
┌─────────────┐
│ llamar LLM   │  Envía el historial + tools disponibles al modelo
└──────┬──────┘  vía FHS WebSocket (protocolo interno de chat).
       ▼
  ¿El LLM pidió ejecutar una tool?
       │
  ┌────┴────┐
  NO        SÍ
  │         │
  │    ┌────▼─────┐
  │    │ ejecutar  │  El MCP Host invoca la tool en el proveedor.
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

**Dónde vive el código:** `apps/agent-server/src/agent/runtime.ts`

### 3. Chat API — la cara al usuario

El frontend se conecta a `/api/chat/ws` y envía:

```json
{
  "type": "start",
  "message": { "role": "user", "content": "Hola, ¿qué puedes hacer?" },
  "preferences": { "model": "auto", "scope": "community" }
}
```

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
| `error` | Algo falló |

**Dónde vive el código:** `apps/agent-server/src/api/chat-ws.ts`

## El Gateway LLM por FHS

Antes (versión inicial) el Agent Server llamaba directo al LLM por HTTP:

```
Agent Runtime → HTTP → llama.cpp     ❌ sin protocolo
```

Ahora (versión FHS) la comunicación es por WebSocket con mensajes tipados del protocolo:

```
Agent Runtime → LlmGateway → FHS WebSocket → llm-provider → HTTP → llama.cpp
                                              (ejemplo en
                                              examples/llm-provider/)
```

El Gateway envía `chat.request` y recibe `chat.delta` / `chat.completed`. El proveedor LLM es un nodo FHS completo que se registra en el Registry y habla el protocolo. Esto permite demostrar que el protocolo funciona: **el Agent Server no sabe nada de OpenAI API, solo habla FHS.**

```
 chat.request ──────────▶  llm-provider  ──HTTP──▶  llama.cpp
               FHS WS         (registrado
◀── chat.delta               en Registry)
◀── chat.completed
```

**Dónde vive el código:**
- Gateway: `apps/agent-server/src/providers/llm-gateway.ts`
- Ejemplo de provider: `examples/llm-provider/src/index.ts`

## Cómo levantar el Agent Server

```bash
# Desarrollo (con hot reload)
npm run dev -w apps/agent-server

# O directamente
cd apps/agent-server
PORT=8083 npx tsx src/index.ts
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8081` | Puerto HTTP + WebSocket |
| `HOST` | `127.0.0.1` | Interfaz de escucha |

### Endpoints expuestos

| Ruta | Método | Descripción |
|---|---|---|
| `/health` | GET | Health check |
| `/api/fhs/providers` | GET | Lista de proveedores registrados |
| `/api/fhs/models` | GET | Modelos LLM disponibles |
| `/api/fhs/events` | GET | Stream SSE de eventos del Registry |
| `/api/chat` | POST | Chat por REST (legacy) |
| `/api/chat/ws` | WebSocket | Chat en tiempo real |
| `/fhs/v1/ws` | WebSocket | Registry (proveedores se conectan aquí) |

## Submódulos internos

| Carpeta | Responsabilidad |
|---|---|
| `registry/` | Catálogo de nodos y servicios en memoria, leases, heartbeats |
| `agent/` | Ciclo del agente: clasificar, resolver, ejecutar, responder |
| `providers/llm-gateway.ts` | Comunicación FHS WebSocket con proveedores LLM |
| `providers/mcp-host.ts` | Cliente MCP contra servidores de tools |
| `api/` | Endpoints REST + WebSocket para chat, providers y eventos |
| `sse/` | Bus de eventos que alimenta el streaming al frontend |

## El Registry es observable, no controlador

El Registry **no**:
- Ejecuta herramientas
- Ve datos del usuario
- Toma decisiones por el agente
- Requiere autenticación en v0.1

El Registry **sí**:
- Sabe qué nodos existen
- Sabe qué servicios ofrece cada nodo
- Detecta caídas por lease vencido
- Notifica a los agentes cuando un nodo aparece o desaparece
