# Implementar FHS en otros lenguajes

FHS es un protocolo P2P descentralizado basado en **libp2p** (DHT + GossipSub + streams directos). La implementación de referencia está en TypeScript/Node.js, pero **nada en el protocolo depende de TypeScript**. Cualquier lenguaje con librería libp2p o cliente WebSocket puede implementar un provider o cliente FHS.

## Lenguajes soportados

| # | Lenguaje | Estado | Caso de uso típico |
|---|----------|--------|--------------------|
| 1 | **TypeScript / JavaScript** | ✅ Referencia | Provider Node.js, frontend web, WASM browser |
| 2 | **Go** | 📋 Planeado | Provider de alto rendimiento, relay, bootstrap node |
| 3 | **Python** | 📋 Planeado | Providers de ML/IA (Whisper, HuggingFace, Tesseract) |
| 4 | **Rust** | 📋 Planeado | Providers en hardware limitado (Raspberry Pi, edge) |
| 5 | **Java** | 📋 Planeado | Integración con sistemas empresariales/comunitarios |

## Qué debe implementar cualquier provider FHS

Sin importar el lenguaje, para ser compatible con FHS (DEC-P2P-001):

1. **Identidad Ed25519** — generar o cargar un par de claves persistente. DID = `did:key:z<base58btc(pubkey)>`. PeerId libp2p derivado de la misma clave.

2. **libp2p o stack compatible** — con soporte para:
   - Kademlia DHT (descubrimiento y publicación de `DhtBeaconRecord`)
   - GossipSub (presencia, dispatch de Missions, reputación)
   - Streams directos sobre WSS con protocolo `/fhs/v1/0.1.0`
   - Noise/TLS (seguridad del transporte)
   - yamux/mplex (multiplexor)

3. **Beacon válido** según el schema correspondiente (`beacon-star.schema.json` o `beacon-satellite.schema.json`). Ver `docs/beacon-star.md` y `docs/beacon-satellite.md`.

4. **Ciclo de vida P2P**:
   - Bootstrap → Kademlia Join → publicar `DhtBeaconRecord` (TTL 24h)
   - Publicar `NodeAdvertiseMessage` en GossipSub cada 30s (TTL 60s)
   - Responder `MissionBidMessage` cuando se puede satisfacer una oferta
   - Aceptar stream directo post-assign y ejecutar la Mission

5. **Campos de privacidad obligatorios** — `privacy.retention` en el Beacon, respeto al `scope` de cada `MissionOfferMessage`. Un provider que no declare o no respete estos campos no es FHS-compatible aunque hable el protocolo correctamente a nivel de mensajes.

6. **Degradación graceful** — responder con error tipado (`chat.error`, `tool.error`) ante cualquier fallo, nunca cerrar el stream en silencio.

## Alternativa sin libp2p completo: WebSocket directo

Si la librería libp2p en el lenguaje objetivo está incompleta o no existe, se puede implementar un subset mínimo usando WebSocket directo:

```
Sin DHT/GossipSub:
- El nodo NO puede recibir Missions vía el ciclo GossipSub offer/bid/assign
- Requiere que Navigator lo tenga pre-configurado con su multiaddr
- Útil para desarrollo y pruebas, no para producción P2P real

Con solo stream directo:
- Implementar la negociación de subprotocolo: fhs.v1 (binario) o fhs.v1.json
- Implementar HandshakeMessage / HandshakeAckMessage
- Implementar los mensajes de Mission (chat.request / tool.call / etc.)
- Implementar Pulse (ping/pong)
```

## Librerías recomendadas por lenguaje

### Go

```go
// libp2p oficial en Go — el más maduro fuera de TypeScript/JS
// github.com/libp2p/go-libp2p
// github.com/libp2p/go-libp2p-kad-dht
// github.com/libp2p/go-libp2p-pubsub (GossipSub)

import (
    libp2p "github.com/libp2p/go-libp2p"
    dht "github.com/libp2p/go-libp2p-kad-dht"
    pubsub "github.com/libp2p/go-libp2p-pubsub"
)
// Ver idl/fhs-protocol.proto para generar los tipos Go con protoc --go_out=.
```

### Python

```python
# libp2p en Python: py-libp2p (en desarrollo)
# Alternativa para desarrollo: WebSocket directo
import asyncio, json
import websockets
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

# Para producción P2P completa, Go o Rust es más maduro que Python hoy
# Para un Satellite simple con WebSocket directo:
async def connect_and_handshake(uri, beacon_json, private_key):
    async with websockets.connect(
        uri,
        additional_headers={"Sec-WebSocket-Protocol": "fhs.v1.json"}
    ) as ws:
        envelope = {
            "type": "handshake",
            "fhsVersion": "1",
            "listenAddrs": [],
            "beacon": beacon_json
        }
        await ws.send(json.dumps(envelope))
        ack = json.loads(await ws.recv())
        return ack.get("trustLevel")
```

### Rust

```rust
// libp2p en Rust: rust-libp2p (el más maduro de todos)
// [dependencies]
// libp2p = { version = "0.54", features = ["kad", "gossipsub", "noise", "yamux", "websocket"] }

use libp2p::{kad, gossipsub, noise, yamux, websocket};
// Ver idl/fhs-protocol.proto para generar tipos Rust con tonic-build
// tonic-build = "0.12" en build.rs:
// tonic_build::compile_protos("idl/fhs-protocol.proto")?;
```

### TypeScript / Node.js

```typescript
// @libp2p/libp2p — implementación de referencia
// @libp2p/kad-dht, @chainsafe/libp2p-gossipsub
import { createLibp2p } from 'libp2p'
import { kadDHT } from '@libp2p/kad-dht'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
// Ver galaxIA-SDK: @rafex/galaxia-fhs-protocol para los tipos TypeScript
```

## Serialización de mensajes

Los mensajes de stream directo y DHT records usan **Protobuf** (binario). Los mensajes GossipSub también usan Protobuf.

Fuente de verdad: `idl/fhs-protocol.proto` — generar código en el lenguaje objetivo:

```bash
# Go
protoc --go_out=. idl/fhs-protocol.proto

# Python
protoc --python_out=. idl/fhs-protocol.proto

# Rust (en build.rs)
tonic_build::compile_protos("idl/fhs-protocol.proto")?;

# TypeScript
protoc --plugin=protoc-gen-ts_proto --ts_proto_out=. idl/fhs-protocol.proto
```

Para desarrollo o pruebas, el modo JSON (`Sec-WebSocket-Protocol: fhs.v1.json`) permite inspeccionar mensajes sin Protobuf.

## Referencia completa del protocolo

- [`idl/fhs-protocol.proto`](../idl/fhs-protocol.proto) — definición canónica de todos los mensajes
- [`idl/asyncapi.yaml`](../idl/asyncapi.yaml) — canales y bindings
- [`idl/gossipsub.md`](../idl/gossipsub.md) — especificación de tópicos GossipSub
- [`protocol/p2p.md`](../protocol/p2p.md) — modelo de red P2P con stack libp2p
- [`docs/protocolo-provider.md`](./protocolo-provider.md) — contrato que todo provider debe cumplir
- [`docs/beacon-star.md`](./beacon-star.md) — Beacon de Star
- [`docs/beacon-satellite.md`](./beacon-satellite.md) — Beacon de Satellite
