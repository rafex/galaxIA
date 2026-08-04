# FHS — IDL y contrato wire

Este directorio define el contrato FHS **libp2p-only**. No contiene endpoints
web, adaptadores ni modos de compatibilidad con el PoC anterior.

## Archivos IDL

| Archivo | Formato | Propósito |
|---|---|---|
| [`fhs-protocol.proto`](fhs-protocol.proto) | Protobuf v3 | Envelope y payloads canónicos |
| [`asyncapi.yaml`](asyncapi.yaml) | AsyncAPI 3.0 | Canales libp2p y tópicos GossipSub |
| [`gossipsub.md`](gossipsub.md) | Markdown | Reglas de pub/sub y records |
| [`framing.md`](framing.md) | Markdown | LPP para streams libp2p |
| [`flows.md`](flows.md) | Markdown + Mermaid | Flujos del protocolo |
| [`../schemas/`](../schemas/) | Validación documental | No se transmite; el Beacon wire es `Beacon` Protobuf |

## Tres capacidades libp2p

### DHT Kademlia

`DhtBeaconRecord` se publica bajo `{did}` y `DhtReputationRecord` bajo
`reputation/{did}`. Los records llevan multiaddrs libp2p y firma del emisor.

### GossipSub

Los tópicos normativos son `nodes/advertise`, `missions/offer`,
`missions/bid`, `missions/assign` y `reputation/update`, todos bajo el prefijo
`fhs/v1/`.

### Stream directo

Todo stream usa `/fhs/v1/0.1.0`, con handshake bilateral, Pulse y Envelopes
Protobuf firmados. El framing es `[varint-length][Envelope bytes]`.

- **Portal ↔ Navigator:** `agent.start`, `chat.request`, estado y resultado.
- **Navigator ↔ Star:** `chat.request`, `chat.delta`, `chat.completed`.
- **Navigator ↔ Satellite:** `tool.call`, `tool.result` y errores.
- **Cualquier par:** `handshake`, `handshake_ack`, `ping`, `pong`, `error`.

## Implementar un nodo

1. Genera o carga una identidad Ed25519 y deriva su DID y PeerId.
2. Configura uno o más bootstrap peers libp2p.
3. Únete a Kademlia y publica un Beacon válido en la DHT.
4. Suscríbete a GossipSub y publica `NodeAdvertiseMessage` con TTL.
5. Responde a ofertas con bids firmados cuando tengas la capability requerida.
6. Acepta la asignación y abre `/fhs/v1/0.1.0` con el peer ganador.
7. Valida cada Envelope antes de ejecutar su payload.

Portal, Navigator, Star, Satellite y Nova deben implementar libp2p para ser
conformes. No hay una ruta alternativa para clientes que no puedan participar
en el swarm.

## Generar código

```bash
# Go
protoc --go_out=. fhs-protocol.proto

# TypeScript
protoc --plugin=protoc-gen-ts_proto --ts_proto_out=. fhs-protocol.proto

# Python
protoc --python_out=. fhs-protocol.proto

# Rust, desde build.rs
tonic_build::compile_protos("idl/fhs-protocol.proto")?;
```

El package Protobuf es `fhs.v1`. El framing y las reglas de transporte están en
[`framing.md`](framing.md) y [`../docs/transport.md`](../docs/transport.md).
