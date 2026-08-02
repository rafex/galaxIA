# FHS Protocol — Flujos de Secuencia

**Versión:** 2.0  
**DECs:** DEC-P2P-001 (libp2p: DHT + GossipSub)  
**Fecha:** 2026-08-02

Todos los mensajes de stream directo viajan dentro de un `Envelope` firmado con Ed25519.  
Los mensajes GossipSub llevan su propia firma (sin Envelope).  
El framing binario se describe en [idl/framing.md](framing.md).

---

## 1. Bootstrap — Unión al Swarm P2P

Flujo de un nodo nuevo (Star, Satellite, Nova, Navigator) al unirse a la red FHS.

```mermaid
sequenceDiagram
  participant N as Nodo nuevo<br/>(Star / Satellite / Nova)
  participant A as Atlas<br/>(bootstrap peer)
  participant D as DHT Swarm
  participant G as GossipSub

  N->>A: Conectar a bootstrap peer (multiaddr conocido)
  A->>N: Lista de peers del swarm

  N->>D: Kademlia Join
  N->>D: DHT.put(did, DhtBeaconRecord { beacon, multiaddrs, expiresAt, signature })
  note over D: Record distribuido en el swarm (TTL 24 h, renovar cada 12 h)

  N->>G: Suscribir a fhs/v1/nodes/advertise, fhs/v1/missions/*, fhs/v1/reputation/update
  N->>G: NodeAdvertiseMessage { did, beacon, multiaddrs, ttlSeconds=60, signature }

  note over N: Nodo operativo.<br/>No necesita Atlas para ninguna operación posterior.
```

---

## 2. Dispatch de Misión — GossipSub (offer → bid → assign)

Navigator recibe una Mission del Portal y asigna el mejor provider vía GossipSub antes de abrir el stream directo.

```mermaid
sequenceDiagram
  participant Po as Portal
  participant N as Navigator
  participant G as GossipSub
  participant S as Star (provider)

  Po->>N: Envelope → agent.start { sessionId, scope, model }
  Po->>N: Envelope → chat.request { missionId, messages[], model }

  N->>Po: Envelope → dispatch.ack { missionId, queuedAt }

  N->>G: MissionOfferMessage { missionId, requiredCapabilities, scope, bidDeadlineMs }
  N->>Po: Envelope → agent.status { status: "offering" }

  note over G: Stars elegibles reciben la oferta y evalúan si pueden satisfacerla
  S->>G: MissionBidMessage { missionId, providerDid, reputationScore, estimatedLatencyMs, trustLevel }
  note over N: Acumula bids hasta bidDeadlineMs<br/>Ordena: trustLevel > reputationScore > estimatedLatencyMs

  N->>G: MissionAssignMessage { missionId, assignedProvider: star.DID }
  N->>Po: Envelope → agent.status { status: "assigning" }
  N->>Po: Envelope → star.selected { missionId, providerId: star.DID, model }

  N->>S: libp2p dial (multiaddrs del MissionBidMessage)
  N->>S: Envelope → handshake { fhsVersion, listenAddrs, beacon }
  S->>N: Envelope → handshake_ack { leaseSeconds, heartbeatSeconds }

  N->>S: Envelope → chat.request { missionId, messages[], model }
  N->>Po: Envelope → agent.status { status: "calling_star" }

  loop Streaming de tokens
    S->>N: Envelope → chat.delta { missionId, delta }
    N->>Po: Envelope → assistant.delta { missionId, delta }
  end

  S->>N: Envelope → chat.completed { missionId, content }
  N->>Po: Envelope → assistant.completed { missionId, content, provenance }
  N->>Po: Envelope → agent.status { status: "completed" }

  N->>G: ReputationUpdateMessage { missionId, providerDid: star.DID, latencyMs, success }
```

---

## 3. Misión de Tool Call — Navigator → Satellite

Subflujo intercalado en la Misión de Chat cuando el Star solicita invocar una herramienta.

```mermaid
sequenceDiagram
  participant N as Navigator
  participant G as GossipSub
  participant SAT as Satellite
  participant Po as Portal

  note over N: Star devolvió toolCalls[] — Navigator inicia Tool Mission

  N->>G: MissionOfferMessage { missionId, requiredCapabilities: ["ocr.extract"], missionType: "tool_call" }
  SAT->>G: MissionBidMessage { missionId, providerDid: sat.DID, offeredCapabilities: ["ocr.extract"] }
  N->>G: MissionAssignMessage { missionId, assignedProvider: sat.DID }

  N->>SAT: libp2p dial (multiaddrs del bid)
  N->>SAT: Envelope → handshake { beacon }
  SAT->>N: Envelope → handshake_ack

  N->>Po: Envelope → tool.selected { missionId, providerId: sat.DID, capabilityId }
  N->>Po: Envelope → agent.status { status: "calling_satellite" }

  N->>SAT: Envelope → tool.call { missionId, toolCalls[] }

  alt Éxito
    SAT->>N: Envelope → tool.result { missionId, toolCallId, result }
  else Error del Satellite
    SAT->>N: Envelope → tool.error { missionId, toolCallId, error }
  end

  note over N: Resultado inyectado como Message { role: "tool" } en el próximo chat.request

  alt Cancelación del Portal
    Po->>N: Envelope → chat.cancel { missionId }
    N->>SAT: Envelope → tool.cancel { missionId }
  end

  N->>G: ReputationUpdateMessage { missionId, providerDid: sat.DID, success }
```

---

## 4. Handshake de Stream Directo

Establecimiento de un stream directo `/fhs/v1/0.1.0` entre cualquier par de nodos FHS: Navigator↔Star, Navigator↔Satellite, Portal↔Navigator.

```mermaid
sequenceDiagram
  participant I as Iniciador<br/>(Navigator / Portal)
  participant R as Receptor<br/>(Star / Satellite / Navigator)

  I->>R: libp2p dial (multiaddr del bid o DHT lookup)
  note over I,R: Negociación de subprotocolo: fhs.v1 (binario) o fhs.v1.json

  I->>R: Envelope { handshake: HandshakeMessage }<br/>fhsVersion, listenAddrs, beacon (JSON serializado)

  note over R: 1. Valida Envelope.signature Ed25519<br/>2. Verifica DID en caché GossipSub o DHT lookup<br/>3. Valida Beacon contra JSON Schema

  alt Handshake exitoso
    R->>I: Envelope { handshake_ack: HandshakeAckMessage }<br/>leaseSeconds, heartbeatSeconds, leaseExpires, trustLevel
    note over I,R: Stream ACTIVO — en Orbit (peer-to-peer)
  else Firma inválida o DID desconocido
    R->>I: Envelope { error: INVALID_SIGNATURE }
    note over R: Cierra stream
  end

  loop cada heartbeatSeconds
    I->>R: Envelope { ping }
    R->>I: Envelope { pong { serverTimestamp } }
  end

  note over I,R: Lease expira sin ping → cada nodo cierra stream localmente
```

---

## 5. Error y Reconexión

Manejo de errores P2P: sin bids disponibles, peer inalcanzable, y reconexión con backoff.

```mermaid
sequenceDiagram
  participant N as Navigator
  participant G as GossipSub
  participant D as DHT
  participant Po as Portal

  N->>G: MissionOfferMessage { missionId, bidDeadlineMs }
  note over N: Espera bids…

  alt Sin bids antes de bidDeadlineMs
    N->>Po: Envelope → error { missionId, code: BID_TIMEOUT }
    note over Po: Usuario recibe error — puede reintentar
  end

  alt Peer asignado inalcanzable al abrir stream
    note over N: Backoff exponencial: 1 s → 2 s → 4 s → 8 s → 16 s (máx.)
    N->>D: DHT.get(assignedDid) — buscar multiaddrs actualizadas

    alt Reconexión exitosa
      N->>G: MissionAssignMessage (mismo missionId, mismo provider)
      note over N: Continúa la misión
    else Fallo definitivo
      N->>Po: Envelope → error { missionId, code: PEER_UNREACHABLE }
      N->>G: MissionOfferMessage — nueva oferta para el mismo missionId
      note over N: Intenta asignar a otro provider
    end
  end

  alt Provider pierde conectividad (TTL de NodeAdvertiseMessage expira)
    note over G: Nodo deja de publicar NodeAdvertiseMessage
    note over N: TTL expira en caché local — Navigator marca el nodo offline
    note over N: No hay node.lost explícito — el silencio es la señal
  end
```

---

## Referencias

- [idl/fhs-protocol.proto](fhs-protocol.proto) — definición completa de todos los tipos de mensaje
- [idl/asyncapi.yaml](asyncapi.yaml) — canales WebSocket y GossipSub
- [idl/gossipsub.md](gossipsub.md) — especificación de tópicos GossipSub
- [idl/framing.md](framing.md) — especificación LPP de framing binario
- [protocol/p2p.md](../protocol/p2p.md) — modelo de red P2P completo
- [schemas/](../schemas/) — JSON Schemas de los Beacons
- [spec-native/DECISIONS.md](../spec-native/DECISIONS.md) — DEC-P2P-001
