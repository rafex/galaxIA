# Implementar FHS en otros lenguajes

FHS es un protocolo P2P independiente de lenguaje. La conformidad exige
implementar libp2p completo: DHT Kademlia, GossipSub y el stream directo
`/fhs/v1/0.1.0`. No existe un subset de conexión directa ni un fallback para
clientes que no tengan libp2p.

## Prioridad de implementaciones

| Lenguaje | Estado | Objetivo |
|---|---|---|
| TypeScript / JavaScript | Referencia | Runtime de validación |
| Rust | Prioridad de producción | Providers en hardware limitado |
| Go | Planeado | Bootstrap peers y providers |
| Python | Planeado | Providers de ML cuando py-libp2p sea suficiente |
| Java | Planeado | Integraciones JVM |

## Requisitos de cualquier nodo

1. Identidad Ed25519 persistente: DID `did:key:z...` y PeerId libp2p derivado.
2. Kademlia DHT para publicar y resolver Beacons y reputación.
3. GossipSub para presencia, dispatch y reputación.
4. Stream `/fhs/v1/0.1.0` para handshake y ejecución de Missions.
5. Protobuf binario con LPP; el Envelope es la unidad firmada del stream.
6. Seguridad libp2p y multiplexado configurados por el swarm.
7. Beacon válido con `endpoint.multiaddr` como único endpoint.

Un nodo que solo implemente un socket o un stream aislado no es FHS conforme:
no puede descubrir peers, recibir el dispatch descentralizado ni publicar su
presencia de forma verificable.

## Librerías de referencia

### Go

```go
libp2p "github.com/libp2p/go-libp2p"
dht "github.com/libp2p/go-libp2p-kad-dht"
pubsub "github.com/libp2p/go-libp2p-pubsub"
```

### Rust

```toml
libp2p = { version = "0.54", features = ["kad", "gossipsub", "noise", "yamux"] }
```

### TypeScript / Node.js

```typescript
import { createLibp2p } from 'libp2p'
import { kadDHT } from '@libp2p/kad-dht'
import { gossipsub } from '@chainsafe/libp2p-gossipsub'
```

### Python

Usar `py-libp2p` solo cuando la versión elegida soporte DHT, GossipSub y
streams protocolados necesarios. Si no los soporta, el provider no puede
declararse conforme todavía.

## Serialización

La fuente canónica es [`idl/fhs-protocol.proto`](../idl/fhs-protocol.proto).
Los mensajes de stream, DHT y GossipSub son Protobuf. El framing está definido
en [`idl/framing.md`](../idl/framing.md).

## Referencias

- [`idl/asyncapi.yaml`](../idl/asyncapi.yaml)
- [`idl/gossipsub.md`](../idl/gossipsub.md)
- [`docs/p2p.md`](./p2p.md)
- [`docs/protocolo-provider.md`](./protocolo-provider.md)
