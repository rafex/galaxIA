# Manifiesto Star (proveedor LLM)

Un Star es el nodo de la red FHS que provee acceso a un modelo LLM. Se registra ante el Atlas
enviando su Beacon (manifiesto JSON) dentro del mensaje `handshake` del protocolo FHS (DEC-0087).

## Ejemplo completo

```json
{
  "fhsVersion": "1",
  "provider": {
    "id": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
    "name": "Mac mini de Raúl",
    "type": "star",
    "visibility": "community",
    "region": "mx-cdmx"
  },
  "endpoint": {
    "url": "wss://192.168.3.173:8081/register",
    "multiaddr": "/ip4/192.168.3.173/tcp/8081/ws"
  },
  "models": [
    {
      "id": "qwen2.5-coder-3b",
      "displayName": "Qwen 2.5 Coder 3B",
      "capabilities": ["chat", "tool_calling"],
      "contextWindow": 4096,
      "languages": ["es", "en"],
      "toolCalling": true
    }
  ],
  "privacy": {
    "retention": "none",
    "trainingUse": false
  },
  "availability": {
    "maxConcurrentRequests": 2
  }
}
```

El schema completo está en `schemas/beacon-star.schema.json`.

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...` (DEC-0030). Se genera con la
  clave privada del nodo — no es un nombre elegido a mano. El `handshake` se firma con esa clave.
- `provider.type`: siempre `"star"`.
- `provider.visibility`: `"public"` (cualquier Navigator), `"private"` (solo local), o `"community"` (grupos autorizados).
- `endpoint.url`: FHS WebSocket URL del nodo (donde otros peers se conectan directamente en P2P).
- `endpoint.multiaddr`: Multiaddr para conexión P2P directa sin DNS (DEC-0086).
- `models[].capabilities`: `"chat"`, `"completion"`, `"embedding"`, `"vision"`, `"tool_calling"`.
- `models[].toolCalling`: `true` si el modelo puede invocar tools de forma nativa.
- `availability.maxConcurrentRequests`: misiones simultáneas máximas — superarlo activa el error
  `OVERLOADED` (DEC-0072).
- `privacy.trainingUse`: `true` si las conversaciones pueden usarse para fine-tuning.

## Cómo registrarse (protocolo FHS, DEC-0087)

El registro ocurre por WebSocket, no por HTTP. El Star conecta al Atlas y envía un `handshake`:

```
WebSocket: wss://atlas-host:8081/register
Sec-WebSocket-Protocol: fhs.v1
```

Primer mensaje (dentro de un Envelope firmado):

```json
{
  "messageId": "uuid-v4",
  "sourcePeerId": "did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK",
  "timestamp": 1722620400000,
  "version": "1",
  "signature": "base64-ed25519...",
  "type": "handshake",
  "fhsVersion": "1",
  "listenAddrs": ["/ip4/192.168.3.173/tcp/8081/ws"],
  "beacon": { "...": "el manifiesto completo de arriba" }
}
```

Atlas responde con `handshake_ack` y el Star queda en Orbit.

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

El flag `--jinja` activa el parseo del chat template real del modelo (incluye el formato de tool calls).
Sin él, `llama-server` no expone `tool_calls` correctamente en la respuesta. Aun con `--jinja`,
algunos modelos/versiones no llenan ese campo de forma confiable — `examples/star-example/src/llm-bridge.ts`
tiene un fallback que parsea la llamada desde el texto de respuesta cuando esto pasa (DEC-0017).

El endpoint de la API OpenAI-compatible que el Star usa internamente estará en:

```
http://<ip>:8080/v1/chat/completions
```

El puerto y el modelo son configurables — no hardcodear el modelo en el Beacon del provider.
`examples/star-example` lee `MODEL_ID`, `MODEL_DISPLAY_NAME`, `MODEL_CONTEXT_WINDOW` y
`MODEL_TOOL_CALLING_SUPPORTED` de variables de entorno (DEC-0019).

Antes de declarar `MODEL_TOOL_CALLING_SUPPORTED=true`, verificar con una llamada `curl` real
que el modelo efectivamente invoca tools — ver `docs/protocolo-provider.md`, sección "Lecciones de integración".
