# Implementar FHS en otros lenguajes

FHS no es una librería, es un **protocolo de mensajes JSON sobre WebSocket**. La implementación de referencia (`packages/fhs-protocol`, `examples/llm-provider`, `examples/ocr-provider`) está en TypeScript/Node.js porque es el stack del MVP (ver `spec-native/STACK.md` y `spec-native/DECISIONS.md` DEC-0002), pero **nada en el protocolo depende de TypeScript**. Cualquier lenguaje con cliente WebSocket y serialización JSON puede implementar un provider o un cliente FHS.

## Lenguajes soportados (orden de prioridad)

| # | Lenguaje | Estado | Caso de uso típico |
|---|---|---|---|
| 1 | **TypeScript / JavaScript** | ✅ Implementación de referencia | Providers en Node.js, frontend web |
| 2 | **Python** | 📋 Planeado | Providers de ML/IA (Tesseract, Whisper, modelos HuggingFace) |
| 3 | **Rust** | 📋 Planeado | Providers en hardware limitado (Raspberry Pi, edge) |
| 4 | **Java** | 📋 Planeado | Integración con sistemas empresariales/comunitarios existentes |

El orden refleja qué tan probable es que la comunidad aporte ese tipo de nodo primero (scripts Python de IA, hardware embebido en Rust, sistemas ya escritos en Java). No es una limitación técnica: el protocolo es igual de válido en cualquier lenguaje desde el día uno.

## Qué debe implementar cualquier cliente/provider FHS

Sin importar el lenguaje, para ser compatible con FHS v0.1 hay que implementar:

1. **Cliente WebSocket** contra el Registry (`ws://<registry-host>/fhs/v1/ws`).
2. **Serialización/deserialización JSON** de los mensajes del protocolo (ver `packages/fhs-protocol/src/messages.ts` como fuente de verdad de los tipos, y `docs/protocolo.md` para la especificación en prosa).
3. **Ciclo de vida de registro**: `hello` → `welcome` → `register` → `registered` → `ping`/`pong` cada 10s (ver regla 3 de `docs/protocolo.md`).
4. **Manifiesto** válido según el tipo de proveedor: `llm` (`docs/manifiesto-llm.md`) o `mcp` (`docs/manifiesto-mcp.md`).
5. **Los campos de privacidad obligatorios** — `privacy.retention`, `privacy.trainingUse` (si aplica) — y respetar el `scope` de cada petición. Ver la sección "Privacidad" en `docs/protocolo.md`. Esto no es opcional en ningún lenguaje: un provider que no declare o no respete estos campos no es FHS-compatible, aunque hable el protocolo correctamente a nivel de mensajes.
6. **Degradación graceful**: si algo falla, responder con un mensaje de error tipado (`chat.error`, `tool.error`), nunca inventar una respuesta ni cerrar la conexión en silencio.

## Librerías recomendadas por lenguaje

Estas son sugerencias de punto de partida, no una decisión cerrada — cualquier librería WebSocket + JSON estándar del lenguaje sirve.

### Python

```python
# WebSocket: websockets (asyncio) o websocket-client (sync)
# JSON: json (stdlib)
import asyncio
import json
import websockets

async def register():
    async with websockets.connect("ws://localhost:8083/fhs/v1/ws") as ws:
        await ws.send(json.dumps({
            "type": "hello",
            "providerId": "did:key:mi-nodo-python",
            "timestamp": int(time.time()),
        }))
        welcome = json.loads(await ws.recv())
        # enviar "register" con el manifiesto, luego "ping" cada 10s
```

Caso de uso natural: providers que envuelven modelos de Python (Whisper para transcripción, HuggingFace Transformers, Tesseract vía `pytesseract`) — el mismo patrón que hoy usa `examples/ocr-provider` en Node.js, pero hablando FHS desde Python en vez de traducir a Node.

### Rust

```rust
// WebSocket: tokio-tungstenite
// JSON: serde + serde_json
use tokio_tungstenite::connect_async;
use serde_json::json;

let (mut ws_stream, _) = connect_async("ws://localhost:8083/fhs/v1/ws").await?;
let hello = json!({
    "type": "hello",
    "providerId": "did:key:mi-nodo-rust",
    "timestamp": now_unix()
});
ws_stream.send(Message::Text(hello.to_string())).await?;
```

Caso de uso natural: providers en hardware con recursos limitados (Raspberry Pi, microcontroladores con Linux) donde el footprint de Node.js es demasiado grande.

### Java

```java
// WebSocket: Java-WebSocket o el cliente WebSocket de Jakarta EE (jakarta.websocket)
// JSON: Jackson o Gson
import org.java_websocket.client.WebSocketClient;
import com.fasterxml.jackson.databind.ObjectMapper;

ObjectMapper mapper = new ObjectMapper();
Map<String, Object> hello = Map.of(
    "type", "hello",
    "providerId", "did:key:mi-nodo-java",
    "timestamp", Instant.now().getEpochSecond()
);
client.send(mapper.writeValueAsString(hello));
```

Caso de uso natural: integrar FHS con sistemas ya existentes en organizaciones/comunidades que corren stacks Java (bibliotecas públicas, cooperativas, universidades).

### TypeScript / JavaScript (referencia)

Ver implementación completa en `examples/llm-provider/src/` y `examples/ocr-provider/src/`. Usa `ws` para el cliente WebSocket y los tipos de `packages/fhs-protocol` para los mensajes.

## Qué NO cambia entre lenguajes

- El **formato de los mensajes** (`hello`, `register`, `ping`/`pong`, `chat.request`, `tool.call`, etc.) es idéntico en todos los lenguajes — es JSON, no un binding específico de un runtime.
- Los **campos de privacidad** (`scope`, `retention`, `trainingUse`, `provenance`) son obligatorios en todos los lenguajes por igual.
- El **Registry** (hoy embebido en `apps/agent-server`, TypeScript) no necesita saber en qué lenguaje está escrito un provider — solo ve mensajes JSON por WebSocket.

## Cómo proponer un nuevo provider en otro lenguaje

1. Revisar `docs/proveedores.md` para entender la estructura esperada (registro, manifiesto, ciclo de vida de una tool call o chat).
2. Confirmar que el manifiesto declara correctamente `privacy.retention` (y `trainingUse` si es `llm`).
3. Implementar el ciclo `hello`/`register`/`ping` y el manejo de la capability o modelo que se quiere exponer.
4. Documentar el provider siguiendo el mismo formato que `docs/proveedores.md` (qué es, cómo funciona, variables de entorno, tools/modelos expuestos).
5. Si el provider vive fuera de este repositorio (caso típico para providers comunitarios), enlazarlo desde `docs/proveedores.md` en vez de copiar el código aquí.
