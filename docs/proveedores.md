# Proveedores FHS — Nodos que aportan recursos

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

## LLM Provider (`examples/llm-provider/`)

### Qué es

Un nodo FHS que envuelve un motor de inferencia (llama.cpp). Corre en Node.js, se registra en el Registry y expone un WebSocket FHS de chat en el puerto `43111`.

### Cómo funciona

1. **Registro**: se conecta al Registry (`ws://agent-server:8081/fhs/v1/ws`) y envía `hello` + `register` con un manifiesto `LlmProviderManifest`
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
  "endpoint": { "protocol": "fhs", "url": "ws://llm-provider:43111/fhs/v1/chat" },
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
| `LLM_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `llm-provider`) |
| `REGISTRY_URL` | `ws://localhost:8083/fhs/v1/ws` | URL del Registry |
| `LLAMA_CPP_URL` | `http://localhost:43110/v1` | URL del servidor llama.cpp (en el bastion: `:8080`, ver `docs/despliegue.md`) |
| `PROVIDER_ID` | `did:key:macmini-raul` | Identidad del proveedor |
| `MODEL_ID` | `qwen2.5-coder-3b-instruct` | ID del modelo publicado en el manifiesto (DEC-0019) |
| `MODEL_DISPLAY_NAME` | `Qwen 2.5 Coder 3B Instruct` | Nombre legible del modelo |
| `MODEL_CONTEXT_WINDOW` | `4096` | Ventana de contexto declarada |
| `MODEL_TOOL_CALLING_SUPPORTED` | `true` | Si el modelo declara soporte de tool calling. Verificar con `curl` antes de cambiarlo (ver `docs/protocolo-provider.md`, "Lecciones de integración") — declarar `true` para un modelo que no lo soporta de forma confiable no lo hace confiable |

---

## OCR Provider (`examples/ocr-provider/`)

### Qué es

Un nodo FHS que envuelve un servicio de OCR (ether-ocr). Corre en Node.js, se registra en el Registry y expone un WebSocket FHS de tools en el puerto `43112`.

### Cómo funciona

1. **Registro**: se conecta al Registry y envía un manifiesto `McpProviderManifest` con la capability `document.ocr`
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

El Agent Runtime (`apps/agent-server/src/agent/runtime.ts`) **no espera a que el LLM decida invocar `ocr_extract`**. Cuando el usuario adjunta un archivo, la intención ya es inequívoca — el runtime llama a la tool directamente antes de involucrar al LLM. Esto se adoptó porque modelos pequeños/locales no son confiables tomando esa decisión (ver `spec-native/DECISIONS.md` DEC-0016, DEC-0017, DEC-0020).

Además, el frontend muestra el texto extraído en una burbuja colapsada con botones "Usar documento"/"Descartar" **antes** de llamar al LLM — el usuario confirma explícitamente si quiere gastar una llamada (lenta en hardware comunitario) con ese contexto. Ver `spec-native/specs/ocr-confirmacion/SPEC.md`.

### Puente interno (OcrBridge)

Usa `curl` con `multipart/form-data` hacia la API REST de ether-ocr (`POST /api/v1/ocr`). Escribe la imagen decodificada a un archivo temporal y lo sube con `-F file=@/tmp/imagen.png`.

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `OCR_PROVIDER_PORT` | `43112` | Puerto del WebSocket FHS de tools |
| `OCR_PROVIDER_HOST` | `localhost` | Hostname para el manifiesto (en contenedores: `ocr-provider`) |
| `REGISTRY_URL` | `ws://localhost:8083/fhs/v1/ws` | URL del Registry |
| `OCR_SERVICE_URL` | `http://ether-ocr-api:8000` | URL base de la API REST de OCR |
| `OCR_API_KEY` | `dev-key-ether-ocr` | API key para autenticación |
| `PROVIDER_ID` | `did:key:ocr-provider-01` | Identidad del proveedor |

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

1. Crear carpeta en `examples/<nombre>-provider/`
2. Implementar `src/index.ts` con:
   - Conexión al Registry y registro con manifiesto
   - Servidor WebSocket FHS para el protocolo (chat o tools)
3. Implementar `src/<nombre>-bridge.ts` con el puente al servicio real
4. Crear `Containerfile` para despliegue en contenedor
5. Agregar al `compose.yaml`
6. Registrar en `mock-providers.ts` (opcional, para pruebas sin contenedor)

El contrato del protocolo está en `packages/fhs-protocol/src/messages.ts`.
