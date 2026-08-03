# FHS Protocol IDL — Red P2P libp2p

Definiciones formales del protocolo de mensajería de **Federation of Sovereign Horizons (FHS)**.
La red es P2P descentralizada: DHT Kademlia para descubrimiento, GossipSub para dispatch,
streams directos para ejecución. **No hay registro central.** Atlas = bootstrap peer.

Ver `docs/p2p.md` para el modelo de red completo.

---

## Archivos IDL

| Archivo | Formato | Autoritativo para |
|---------|---------|-------------------|
| [`fhs-protocol.proto`](fhs-protocol.proto) | Protobuf proto3 | Definición binaria canónica de todos los mensajes (stream directo + GossipSub + DHT records). |
| [`asyncapi.yaml`](asyncapi.yaml) | AsyncAPI 3.0 | Canales de stream directo WSS y tópicos GossipSub. |
| [`gossipsub.md`](gossipsub.md) | Markdown | Especificación de cada tópico GossipSub: campos, verificación, criterios de selección. |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.1 | Endpoints REST de gestión (health, discovery, métricas) — plano de gestión únicamente. |
| [`framing.md`](framing.md) | Markdown | Especificación del framing LPP (Length-Prefix Protocol) para modo binario `fhs.v1`. |
| [`flows.md`](flows.md) | Markdown + Mermaid | Diagramas de secuencia de los flujos principales. |
| [`../schemas/`](../schemas/) | JSON Schema draft-07 | Schemas de Beacon por tipo de nodo. |

---

## Dos planos de mensajería

### 1. Stream directo FHS

Protocolo libp2p `/fhs/v1/0.1.0` sobre WSS. Mensajes en `Envelope` Protobuf.

- **Portal ↔ Navigator**: `agent.start`, `chat.request`, `assistant.delta`, `assistant.completed`
- **Navigator ↔ Star** (post-assign): `chat.request`, `chat.delta`, `chat.completed`
- **Navigator ↔ Satellite** (post-assign): `tool.call`, `tool.result`
- **Cualquier par**: `handshake`, `handshake_ack`, `ping`, `pong`, `error`

### 2. GossipSub (broadcast P2P)

| Tópico | Mensaje | Propósito |
|--------|---------|-----------|
| `fhs/v1/nodes/advertise` | `NodeAdvertiseMessage` | Presencia (reemplaza node.online/lost) |
| `fhs/v1/missions/offer` | `MissionOfferMessage` | Navigator busca provider |
| `fhs/v1/missions/bid` | `MissionBidMessage` | Provider responde con disponibilidad |
| `fhs/v1/missions/assign` | `MissionAssignMessage` | Navigator confirma asignación |
| `fhs/v1/reputation/update` | `ReputationUpdateMessage` | Post-Mission feedback |

### 3. DHT Kademlia (records)

| Key | Record | Publicado por |
|-----|--------|---------------|
| `{did}` | `DhtBeaconRecord` | El nodo mismo |
| `reputation/{did}` | `DhtReputationRecord` | Navigators |

---

## Por dónde empezar según tu objetivo

### Implementar un provider (Star o Satellite)

1. Lee `docs/p2p.md` para entender cómo te unes al swarm DHT.
2. Genera tu DID Ed25519 (`did:key:z...`) y publica tu `DhtBeaconRecord`.
3. Suscríbete a `fhs/v1/nodes/advertise` y `fhs/v1/missions/offer`.
4. Publica `NodeAdvertiseMessage` periódicamente.
5. Cuando recibes `MissionOfferMessage` que puedes satisfacer → publica `MissionBidMessage`.
6. Si recibes `MissionAssignMessage` con tu DID → acepta el stream directo del Navigator.
7. Valida tu Beacon contra `schemas/beacon-star.schema.json` o `beacon-satellite.schema.json`.

### Implementar un Navigator (Agent Runtime)

1. Lee `docs/p2p.md` y `idl/gossipsub.md` para el flujo completo.
2. Suscríbete a todos los tópicos GossipSub.
3. Mantén caché local de `NodeAdvertiseMessage` por TTL.
4. Al recibir Mission del Portal: publica `MissionOfferMessage` → espera bids → asigna.
5. Abre stream directo con el provider ganador: handshake → mission execution.
6. Post-Mission: publica `ReputationUpdateMessage` y actualiza `DhtReputationRecord`.

### Implementar un cliente (Portal)

1. Abre stream WSS directo con Navigator (handshake → stream activo).
2. Envía `AgentStartMessage` → `ChatRequestMessage`.
3. Recibe `AssistantDeltaMessage` (streaming) y `AssistantCompletedMessage`.

### Consultar providers disponibles (integración REST externa)

REST es el plano de gestión únicamente — no forma parte del protocolo FHS:
1. Lee `openapi.yaml` — endpoints `GET /api/fhs/providers`, `GET /api/fhs/models`.

---

## Generar código desde el Protobuf

```bash
# Go
protoc --go_out=. --go-grpc_out=. fhs-protocol.proto

# TypeScript (via ts-proto)
protoc --plugin=protoc-gen-ts_proto --ts_proto_out=. fhs-protocol.proto

# Python
protoc --python_out=. fhs-protocol.proto

# Rust (via tonic-build, en build.rs)
tonic_build::compile_protos("idl/fhs-protocol.proto")?;
```

El package proto es `fhs.v1`. La opción `go_package` apunta a `github.com/rafex/galaxIA/idl/fhs/v1`.

---

## Modos de transporte (stream directo)

| Modo | Header | Frames | Uso |
|------|--------|--------|-----|
| Binario (primario) | `fhs.v1` | binary + LPP + Protobuf | producción, P2P |
| JSON (compat) | `fhs.v1.json` | text + JSON | desarrollo, herramientas |

El framing LPP (`[varint-length][Envelope bytes]`) está especificado en `framing.md`.

---

## Versiones

| Artefacto | Versión | Cambios principales |
|-----------|---------|---------------------|
| `fhs-protocol.proto` | v3 | DEC-P2P-001: DHT + GossipSub + Atlas como bootstrap peer |
| `asyncapi.yaml` | 0.5.0 | DEC-P2P-001: tópicos GossipSub, eliminado registro centralizado |
| `gossipsub.md` | 1.0 | Nuevo: spec completa de tópicos GossipSub |
| `openapi.yaml` | 0.2.0 | Sin cambios (solo plano de gestión) |
| Beacon schemas | 1.0 | Sin cambios |

Historial de decisiones: `spec-native/DECISIONS.md`
