# Proveedores FHS — Nodos que aportan recursos

> **Las implementaciones de referencia de estos providers ya no viven en este repo.** Se movieron a [`galaxIA-satellite-star`](https://github.com/rafex/galaxIA-satellite-star), que depende de `@galaxia/fhs-protocol` publicado desde aquí. Este documento describe el contrato del protocolo y el comportamiento determinístico del lado de Navigator (que sí vive aquí) — las rutas `examples/*-provider/` referidas abajo apuntan a ese otro repo.

Los proveedores son nodos independientes que se registran en el Registry FHS y exponen capacidades (LLM, tools) a través del protocolo FHS WebSocket. **El Agent Server nunca llama directo a las APIs nativas de los servicios.** Todo pasa por el protocolo FHS.

## ¿Por qué wrappers FHS?

Sin el protocolo, el Agent Server tendría que conocer los detalles de cada API: OpenAI, llama.cpp, Ollama, MCP, REST, etc. Con FHS, **solo habla un idioma** — mensajes tipados por WebSocket.

```
Agent Server         Provider FHS          Servicio real
     │                    │                     │
     │ chat.request       │                     │
     ├───────────────────►│                     │
     │                    │ HTTP/curl/SSE       │
     │                    ├────────────────────►│
     │                    │◄────────────────────┤
     │◄── chat.completed ─┤                     │
```

## LLM Provider (`examples/star-example/`)

### Qué es

Un nodo FHS que envuelve un motor de inferencia (llama.cpp). Corre en Node.js, se registra en el Registry y expone un WebSocket FHS de chat en el puerto `43111`.

### Cómo funciona

1. **Registro**: se conecta a Atlas (`ws://atlas:8081/fhs/v1/ws`) y envía `hello` + `register` con un manifiesto `StarBeacon`
2. **Chat FHS**: expone un servidor WebSocket en `:43111`. Cuando el Agent Server se conecta:
   - Recibe `chat.request` con el `GenerateRequest` (modelo, mensajes, tools)
   - Llama a llama.cpp vía `curl` (child_process, evita bug de Undici + ws en Node.js)
   - Responde con `chat.delta` (streaming) o `chat.completed` (respuesta final)
   - Si `llama-server` decide usar una tool pero no llena el campo `tool_calls` nativo, `LlmBridge` tiene un fallback que parsea la llamada desde el texto de respuesta (ver `spec-native/DECISIONS.md` DEC-0017)
3. **Modelo actual**: Qwen 2.5 Coder 3B Instruct (Q4_K_M, con tool calling habilitado — ver DEC-0016). El modelo, su tool calling y su ventana de contexto **ya no están hardcodeados**: se configuran por variables de entorno (ver tabla abajo, DEC-0019). En el bastion, `llama-server` corre por separado (fuera de este repo, ver `docs/despliegue.md`) en el puerto `8080` con `--jinja`.

### Manifiesto

```json
{
  "fhsVersion": "0.1",
  "provider": { "id": "did:key:macmini-raul", "type": "llm", "visibility": "community" },
  "endpoint": { "protocol": "fhs", "url": "ws://star:43111/fhs/v1/chat" },
  "models": [{ "id": "qwen2.5-coder-3b-instruct", "capabilities": ["chat", "tool.calling"], "contextWindow": 4096, "toolCalling": { "supported": true } }]
}
```

### Puente interno (LlmBridge)

El bridge usa `curl` vía `child_process.execFile` en vez de `fetch()` o `http.request()` de Node.js. Esto evita un conflicto de event loop entre la librería `ws` y Undici (el cliente HTTP nativo de Node.js).

```typescript
// No usa fetch() — usa curl para evitar bug Undici + ws
const stdout = await this.curlPost("http://llama:43110/v1/chat/completions", body);
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `LLM_PROVIDER_PORT` | `43111` | Puerto del WebSocket FHS de chat |
| `LLM_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `star`) |
| `REGISTRY_URL` | `ws://localhost:8081/fhs/v1/ws` | URL del Registry |
| `LLAMA_CPP_URL` | `http://localhost:43110/v1` | URL del servidor llama.cpp (en el bastion: `:8080`, ver `docs/despliegue.md`) |
| `PROVIDER_ID` | `did:key:macmini-raul` | Identidad del proveedor |
| `MODEL_ID` | `qwen2.5-coder-3b-instruct` | ID del modelo publicado en el manifiesto (DEC-0019) |
| `MODEL_DISPLAY_NAME` | `Qwen 2.5 Coder 3B Instruct` | Nombre legible del modelo |
| `MODEL_CONTEXT_WINDOW` | `4096` | Ventana de contexto declarada |
| `MODEL_TOOL_CALLING_SUPPORTED` | `true` | Si el modelo declara soporte de tool calling. Verificar con `curl` antes de cambiarlo (ver `docs/protocolo-provider.md`, "Lecciones de integración") — declarar `true` para un modelo que no lo soporta de forma confiable no lo hace confiable |

---

## OCR Provider (`examples/satellite-ocr-example/`)

### Qué es

Un nodo FHS que envuelve un servicio de OCR (ether-ocr). Corre en Node.js, se registra en el Registry y expone un WebSocket FHS de tools en el puerto `43112`.

### Cómo funciona

1. **Registro**: se conecta a Atlas y envía un manifiesto `SatelliteBeacon` con la capability `document.ocr`
2. **Tools FHS**: expone un servidor WebSocket en `:43112`. Cuando un cliente (Agent Server o script) se conecta:
   - Recibe `tool.list` → devuelve las tools disponibles con su schema
   - Recibe `tool.call` con `{ toolName, arguments }` → ejecuta el OCR y devuelve `tool.result`
3. **OCR real**: el bridge escribe la imagen base64 a un archivo temporal y llama a `ether-ocr-api` vía `curl -F` (multipart/form-data)

### Flujo de una tool call

```
Cliente              OCR Provider FHS        ether-ocr-api          Tesseract
  │                       │                      │                     │
  │ tool.call ───────────►│                      │                     │
  │  {file_base64,        │                      │                     │
  │   filename, lang}     │ curl -F              │                     │
  │                       │ POST /api/v1/ocr ───►│                     │
  │                       │                      │ tesseract           │
  │                       │                      ├────────────────────►│
  │                       │                      │◄────────────────────┤
  │                       │◄── {"status":"ok", ──┤                     │
  │                       │     "text":"..."}    │                     │
  │◄── tool.result ───────┤                      │                     │
```

### Tools expuestas

| Tool | Parámetros | Descripción |
|---|---|---|
| `ocr_extract` | `file_base64` (str), `filename` (str, opcional), `lang` (str, default: `spa+eng`) | Extrae texto de una imagen o PDF |

### Ejecución determinística, no vía tool calling del LLM

El Agent Runtime (`apps/navigator/src/agent/runtime.ts`) **no espera a que el LLM decida invocar `ocr_extract`**. Cuando el usuario adjunta un archivo, la intención ya es inequívoca — el runtime llama a la tool directamente antes de involucrar al LLM. Esto se adoptó porque modelos pequeños/locales no son confiables tomando esa decisión (ver `spec-native/DECISIONS.md` DEC-0016, DEC-0017, DEC-0020).

Además, el frontend muestra el texto extraído en una burbuja colapsada con botones "Usar documento"/"Descartar" **antes** de llamar al LLM — el usuario confirma explícitamente si quiere gastar una llamada (lenta en hardware comunitario) con ese contexto. Ver `spec-native/specs/ocr-confirmacion/SPEC.md`.

### Puente interno (OcrBridge)

Usa `curl` con `multipart/form-data` hacia la API REST de ether-ocr (`POST /api/v1/ocr`). Escribe la imagen decodificada a un archivo temporal y lo sube con `-F file=@/tmp/imagen.png`.

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `OCR_PROVIDER_PORT` | `43112` | Puerto del WebSocket FHS de tools |
| `OCR_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `satellite-ocr`) |
| `REGISTRY_URL` | `ws://localhost:8081/fhs/v1/ws` | URL del Registry |
| `OCR_SERVICE_URL` | `http://ether-ocr-api:8000` | URL base de la API REST de OCR |
| `OCR_API_KEY` | `dev-key-ether-ocr` | API key para autenticación |
| `PROVIDER_ID` | `did:key:satellite-ocr-01` | Identidad del proveedor |

---

## RAG Provider (`examples/rag-provider/`)

### Qué es

Un nodo FHS de tipo `mcp` que indexa y recupera fragmentos de un documento por conversación (SPEC-RAG-0001). Corre en Node.js, se registra en Atlas y expone un WebSocket FHS de tools en el puerto `43113`.

### Motor interno: deliberadamente mínimo, no una recomendación

`rag-bridge.ts` usa similitud de Jaccard (solapamiento de palabras) sobre chunks de tamaño fijo — **no embeddings semánticos reales**. Esto es a propósito (DEC-0026, DEC-0037): el protocolo FHS define el contrato de `document_index`/`document_query`, nunca el motor detrás de ellas. Cualquier operador real puede sustituir esto por `llama-server --embedding`, un modelo ONNX en proceso, o lo que prefiera, sin tocar el contrato.

### Tools expuestas

| Tool | Parámetros | Descripción |
|---|---|---|
| `document_index` | `text`, `conversationId`, `chunkSize` (opcional), `overlap` (opcional) | Trocea e indexa un documento para esta conversación |
| `document_query` | `query`, `conversationId`, `top_k` (opcional) | Recupera los fragmentos más relevantes ya indexados |

### Disparo determinístico, nunca vía tool calling del LLM

`AgentRuntime.indexDocumentForRag()` se llama en el mismo instante en que `chat-ws.ts` resuelve `attachment.decision { use: true }` — reutiliza exactamente el flujo de confirmación de OCR ya existente, sin UI nueva. En turnos siguientes de una conversación marcada como "RAG activa" (`ragActiveConversations`), `AgentRuntime.queryRagContext()` se dispara antes de cada llamada al LLM, de forma silenciosa (sin eventos `tool.*` visibles, a diferencia de OCR).

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `RAG_PROVIDER_PORT` | `43113` | Puerto del WebSocket FHS de tools |
| `RAG_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `rag-provider`) |
| `REGISTRY_URL` | `ws://localhost:8081/fhs/v1/ws` | URL de Atlas |
| `PROVIDER_ID` | `did:key:rag-provider-01` | Identidad del proveedor |

---

## KB Provider (`examples/kb-provider/`)

### Qué es

Un nodo FHS de tipo `mcp` que expone una base de conocimiento de solo lectura, compartida entre conversaciones (SPEC-KB-0001) — para contenido público reutilizado por muchos usuarios (ej. la Constitución de México), a diferencia de RAG (privado, por conversación). Corre en Node.js, se registra en Atlas y expone un WebSocket FHS en el puerto `43114`.

### Contenido: carpeta local, NO un proceso de indexado recomendado

`examples/kb-provider/content/` se carga completa al arrancar el proceso (ver `content/README.md`, que declara explícitamente que esto es solo un mecanismo de prueba). TASK-KB-0002 se cerró aclarando que cómo un operador cura/indexa su KB es responsabilidad exclusiva suya, fuera del alcance del protocolo (mismo principio que DEC-0026 para RAG).

### Tools expuestas

| Tool | Parámetros | Descripción |
|---|---|---|
| `kb_query` | `query`, `top_k` (opcional) | Consulta la base de conocimiento por similitud — **no** está scoped por `conversationId`, cualquier conversación ve el mismo corpus |

### Dos modos de disparador (DEC-0027)

1. **Manual** — el usuario elige la KB explícitamente (`preferences.kb`, un dropdown en el `Portal`). Se resuelve directo, sin confirmación, y puede cambiar entre preguntas de la misma conversación.
2. **Recomendado** — `AgentRuntime.recommendKb()` compara la pregunta contra `capability.description`/`tags` (DEC-0028) de cada KB registrada con un matching determinístico (Jaccard, nunca el LLM decide) y, si hay coincidencia razonable, pide confirmación al usuario (`kb.recommended`/`kb.decision`) antes de consultar. Puede recomendar "ninguna" si nada coincide bien.

El modo "mágico" (recomendar sin pedir confirmación) queda documentado en DEC-0027 como premisa a futuro, explícitamente no implementado — mismo riesgo que llevó a DEC-0020 a exigir confirmación en OCR: una KB mal elegida "con confianza" es un fallo silencioso, peor que un `tool.error` visible.

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `KB_PROVIDER_PORT` | `43114` | Puerto del WebSocket FHS |
| `KB_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `kb-provider`) |
| `KB_CONTENT_DIR` | `./content` (relativo al módulo, no a `cwd`) | Carpeta con archivos `.txt` a cargar al arrancar |
| `KB_DESCRIPTION` | Constitución Política... (texto de ejemplo) | Descripción usada por el modo recomendado para el matching |
| `KB_TAGS` | `constitucion,mexico,derechos humanos,ley` | Tags autodeclarados (DEC-0028), separados por coma |
| `REGISTRY_URL` | `ws://localhost:8081/fhs/v1/ws` | URL de Atlas |
| `PROVIDER_ID` | `did:key:kb-provider-01` | Identidad del proveedor |

---

## Protocolo FHS entre Agent Server y Providers

### Chat (LLM)

```
Agent Server → Provider:  chat.request   { requestId, request: GenerateRequest }
Provider → Agent Server:  chat.delta     { requestId, delta: string }
Provider → Agent Server:  chat.completed { requestId, response: GenerateResponse }
Provider → Agent Server:  chat.error     { requestId, code, message }
```

### Tools (OCR, MCP)

```
Agent Server → Provider:  tool.list         { requestId }
Provider → Agent Server:  tool.list.response  { requestId, tools: [...] }
Agent Server → Provider:  tool.call         { requestId, toolName, arguments }
Provider → Agent Server:  tool.result       { requestId, toolName, content: [...] }
Provider → Agent Server:  tool.error        { requestId, toolName, code, message }
```

---

## Agregar un nuevo provider

Los providers nuevos se agregan en [`galaxIA-satellite-star`](https://github.com/rafex/galaxIA-satellite-star), no aquí:

1. Crear carpeta en `examples/<nombre>-provider/`
2. Implementar `src/index.ts` con:
   - Conexión al Registry y registro con manifiesto
   - Servidor WebSocket FHS para el protocolo (chat o tools)
3. Implementar `src/<nombre>-bridge.ts` con el puente al servicio real
4. Crear `Containerfile` para despliegue en contenedor
5. Agregar al `compose.yaml` de ese repo
6. Registrar en `mock-providers.ts` (opcional, para pruebas sin contenedor) — este script sí vive en este repo (`galaxIA`)

El contrato del protocolo está en `packages/fhs-protocol/src/messages.ts` (este repo) — si el provider nuevo necesita algo que el protocolo no soporta, ese cambio se debate e implementa aquí primero.
