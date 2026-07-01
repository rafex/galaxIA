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
    "url": "http://192.168.3.173:43110/v1"
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

- `provider.id`: identificador único (`did:key:<nombre>`).
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
  -m models/qwen2.5-coder-3b-instruct-q4_0.gguf \
  --port 43110 \
  --host 0.0.0.0 \
  -n 4096 \
  --ctx-size 4096
```

La API OpenAI-compatible estará en:

```
http://<ip>:43110/v1/chat/completions
```
