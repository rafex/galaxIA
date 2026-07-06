# Manifiesto de proveedor LLM

Un proveedor LLM se publica en el Registry enviando un manifiesto JSON por WebSocket.

## Ejemplo completo

```json
{
  "fhsVersion": "0.1",
  "provider": {
    "id": "did:key:macmini-raul",
    "name": "Mac mini de Raúl",
    "type": "llm",
    "visibility": "community",
    "region": "mx-cdmx"
  },
  "endpoint": {
    "protocol": "openai-compatible",
    "url": "http://192.168.3.173:8080/v1"
  },
  "models": [
    {
      "id": "qwen2.5-coder-3b",
      "displayName": "Qwen 2.5 Coder 3B",
      "capabilities": ["chat", "tool.calling"],
      "contextWindow": 4096,
      "languages": ["es", "en"],
      "toolCalling": {
        "supported": true,
        "mode": "native",
        "formats": ["openai"]
      }
    }
  ],
  "privacy": {
    "retention": "none",
    "trainingUse": false
  }
}
```

## Campos importantes

- `provider.id`: identificador único — `did:key:z...` real derivado de una identidad Ed25519 (DEC-0030), no un nombre elegido a mano. `hello`/`register` deben firmarse con la clave privada correspondiente.
- `provider.type`: siempre `"llm"`.
- `endpoint.protocol`: `"openai-compatible"` para llama.cpp, Ollama, vLLM.
- `endpoint.url`: URL base del servidor.
- `models`: lista de modelos disponibles en ese endpoint.
- `models[].capabilities`: capacidades del modelo (`chat`, `tool.calling`).
- `models[].toolCalling.supported`: si el modelo puede invocar tools.

## Cómo enviarlo

Conecta al Registry por WebSocket y envía:

```json
{
  "type": "register",
  "providerId": "did:key:macmini-raul",
  "manifest": { /* ... el manifiesto ... */ },
  "timestamp": 1719700000
}
```

## Levantar llama.cpp

```bash
./llama-server \
  -m models/qwen2.5-coder-3b-instruct-q4_k_m.gguf \
  --port 8080 \
  --host 0.0.0.0 \
  --jinja \
  -n 1024 \
  --ctx-size 4096
```

El flag `--jinja` activa el parseo del chat template real del modelo (incluye el formato de tool calls) — sin él, `llama-server` no expone `tool_calls` correctamente en la respuesta OpenAI-compatible. Aun con `--jinja`, algunos modelos/versiones no llenan ese campo de forma confiable — `examples/llm-provider/src/llm-bridge.ts` tiene un fallback que parsea la llamada desde el texto de respuesta cuando esto pasa (ver `spec-native/DECISIONS.md` DEC-0017).

La API OpenAI-compatible estará en:

```
http://<ip>:8080/v1/chat/completions
```

El puerto y el modelo son configurables — no hardcodear el modelo en el manifiesto del provider. `examples/llm-provider` lee `MODEL_ID`, `MODEL_DISPLAY_NAME`, `MODEL_CONTEXT_WINDOW` y `MODEL_TOOL_CALLING_SUPPORTED` de variables de entorno (DEC-0019). Antes de declarar `MODEL_TOOL_CALLING_SUPPORTED=true`, verificar con una llamada `curl` real que el modelo efectivamente invoca tools — ver `docs/protocolo-provider.md`, sección "Lecciones de integración".
