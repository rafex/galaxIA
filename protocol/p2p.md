# P2P — Red Descentralizada FHS (libp2p)

La red FHS es una red P2P descentralizada basada en **libp2p**.
No hay un registro central obligatorio. Cada nodo es igual a los demás.

---

## Stack libp2p en FHS

```
┌─────────────────────────────────────────────────────┐
│  Aplicación FHS                                      │
│  (Envelope + Protobuf, protocol /fhs/v1/0.1.0)      │
├───────────────────────────┬─────────────────────────┤
│  Stream directo           │  GossipSub              │
│  (handshake, misiones)    │  (presencia, dispatch,  │
│                           │   reputación)           │
├───────────────────────────┴─────────────────────────┤
│  libp2p                                              │
│  ├── Kademlia DHT    (descubrimiento, reputación)   │
│  ├── GossipSub       (pub/sub broadcast)            │
│  ├── Identify        (intercambio de multiaddrs)    │
│  └── AutoNAT / Relay (NAT traversal, opcional)      │
├─────────────────────────────────────────────────────┤
│  Seguridad: Noise / TLS 1.3                         │
├─────────────────────────────────────────────────────┤
│  Multiplexor: yamux / mplex                         │
├─────────────────────────────────────────────────────┤
│  Transporte: TCP + WebSocket (WSS obligatorio)      │
└─────────────────────────────────────────────────────┘
```

---

## Identidad de nodo

Cada nodo tiene un **PeerId** derivado de su clave Ed25519:

```
Par de claves Ed25519 → DID: did:key:z<base58btc(clave_pública)>
                       → PeerId libp2p: derivado de la misma clave pública
```

La relación entre DID FHS y PeerId libp2p es directa: ambos se derivan de
la misma clave Ed25519. Esto permite:
- Verificar firmas de Envelope FHS usando solo el DID (sin PKI)
- Que el PeerId libp2p y el DID FHS sean el mismo nodo sin ambigüedad

Ver `protocol/identity.md` para generación de claves y formato del DID.

---

## Descubrimiento de nodos — DHT Kademlia

La **DHT Kademlia** (libp2p `go-libp2p-kad-dht` / `js-libp2p-kad-dht`) es
el mecanismo de descubrimiento primario.

### Publicación en DHT

Cuando un nodo se une a la red:
1. Conecta a uno o más **bootstrap peers** (Atlas o cualquier peer conocido).
2. Publica su `DhtBeaconRecord` en la DHT:
   - **Key**: su DID (`did:key:z...`)
   - **Value**: `DhtBeaconRecord` serializado en Protobuf
   - **TTL**: 24h (renovar cada 12h)
3. Suscribe al GossipSub (tópicos `fhs/v1/*`).
4. Publica `NodeAdvertiseMessage` en `fhs/v1/nodes/advertise`.

### Búsqueda en DHT

Cuando un nodo necesita encontrar a otro por DID:
```
DHT.get(did) → DhtBeaconRecord { beacon, multiaddrs, expiresAt, signature }
→ Verificar firma Ed25519 del record
→ Conectar a uno de los multiaddrs
→ Abrir stream /fhs/v1/0.1.0
→ Handshake (HandshakeMessage → HandshakeAckMessage)
```

### Reputación en DHT

```
DHT.get("reputation/" + did) → DhtReputationRecord { score, missionsSuccess, ... }
```

Múltiples Navigators publican su propia evaluación bajo la misma key.
La key `"reputation/" + did` puede contener múltiples records firmados
por diferentes evaluadores. Los nodos pueden agregar la media ponderada localmente.

---

## Presencia de nodos — GossipSub

**GossipSub** complementa la DHT para presencia en tiempo real.

```mermaid
sequenceDiagram
    participant N as Nodo (cualquiera)
    participant G as Red GossipSub

    loop cada ttlSeconds/2 (ej. cada 30s)
        N->>G: NodeAdvertiseMessage { did, beacon, multiaddrs, ttlSeconds=60, signature }
        Note over G: Todos los suscritos al tópico<br/>fhs/v1/nodes/advertise reciben el mensaje
    end

    Note over N: Si el nodo deja de publicar,<br/>los demás lo marcan offline<br/>cuando el TTL expire (60s)
```

### Cuándo usar DHT vs GossipSub para descubrimiento

| Caso | Mecanismo |
| ---- | --------- |
| Encontrar un nodo por DID conocido | DHT (búsqueda directa) |
| Saber qué nodos están activos ahora | GossipSub `fhs/v1/nodes/advertise` |
| Conocer las capabilities de un nodo | DHT (DhtBeaconRecord.beacon) |
| Saber la reputación de un proveedor | DHT `reputation/{did}` + caché GossipSub |

---

## Dispatch de Missions — GossipSub

El dispatch de Missions es **completamente descentralizado**. Navigator no necesita
consultar a Atlas para saber qué providers existen — usa su caché local de
`NodeAdvertiseMessage` recibidos + la DHT.

```mermaid
sequenceDiagram
    participant P as Portal
    participant NAV as Navigator
    participant G as GossipSub
    participant S as Star/Satellite
    participant STREAM as Stream Directo

    P->>NAV: agent.start { scope, model }
    P->>NAV: chat.request { missionId, messages }

    NAV->>NAV: Buscar providers elegibles en caché local
    NAV->>G: MissionOfferMessage (fhs/v1/missions/offer)<br/>{ missionId, requiredCapabilities, bidDeadlineMs }

    NAV->>P: agent.status { status: "offering" }

    G->>S: (reciben la oferta en el tópico)
    S->>S: Evaluar si puede satisfacer la oferta
    S->>G: MissionBidMessage (fhs/v1/missions/bid)<br/>{ missionId, providerDid, reputationScore, estimatedLatencyMs }

    NAV->>P: agent.status { status: "waiting_bid" }

    Note over NAV: Espera hasta bid_deadline_ms
    NAV->>NAV: Ordenar bids: trustLevel > reputation > latencia

    NAV->>G: MissionAssignMessage (fhs/v1/missions/assign)<br/>{ missionId, assignedProvider: <did del ganador> }
    NAV->>P: agent.status { status: "assigning" }
    NAV->>P: star.selected { providerId, model }

    NAV->>STREAM: Abrir stream directo /fhs/v1/0.1.0 → Star ganador
    NAV->>S: Handshake → HandshakeAck
    NAV->>S: chat.request { missionId, messages, model }
    NAV->>P: agent.status { status: "calling_star" }

    S->>NAV: chat.delta (streaming)
    NAV->>P: assistant.delta (streaming)

    S->>NAV: chat.completed
    NAV->>P: assistant.completed { provenance }
    NAV->>P: agent.status { status: "completed" }

    NAV->>G: ReputationUpdateMessage (fhs/v1/reputation/update)
```

---

## Bootstrap — El rol de Atlas en la red P2P

Atlas es un nodo FHS cuyo DID y multiaddrs se incluyen en la configuración
por defecto. Su rol es **únicamente** de bootstrap peer.

```mermaid
graph TB
    subgraph "Swarm DHT (malla P2P)"
        A["Atlas\n(bootstrap peer)"]
        NAV["Navigator"]
        S1["Star 1"]
        S2["Star 2"]
        SAT["Satellite OCR"]
        EPH["Ephemeral Satellite\n(WASM)"]
    end

    NEW["Nodo Nuevo"]

    NEW -->|"1. Conectar a bootstrap peer"| A
    A -->|"2. Descubrir peers del swarm"| NEW
    NEW -->|"3. Unirse al DHT"| S1
    NEW -->|"3. Unirse al DHT"| NAV

    Note1["Una vez en el swarm,<br/>el nodo no necesita Atlas"]

    S1 <-->|"GossipSub"| S2
    S1 <-->|"GossipSub"| NAV
    S2 <-->|"GossipSub"| SAT
    NAV <-->|"GossipSub"| SAT
    NAV <-->|"GossipSub"| EPH

    style A fill:#f59e0b,color:#000
    style Note1 fill:#f0fdf4,color:#166534
```

**Atlas NO:**
- Mantiene un registro de nodos activos (eso es la DHT + GossipSub)
- Tiene autoridad sobre otros nodos
- Es requerido para la comunicación inter-nodos una vez que el swarm está formado
- Es el único punto de entrada (cualquier nodo conocido puede ser bootstrap)

**Atlas SÍ:**
- Tiene uptime alto para ser un bootstrap peer confiable
- Participa en la DHT como cualquier otro nodo
- Puede cachear records DHT para acelerar el bootstrap de nuevos nodos

---

## Stream directo FHS

Los streams directos son conexiones punto-a-punto entre dos nodos FHS.
Se usan para la ejecución de Missions (chat.request, tool.call, etc.).

```
Protocol ID: /fhs/v1/0.1.0
Transport:   WebSocket + TLS (WSS)
Framing:     LPP (ver idl/framing.md)
Encoding:    Protobuf binario (Sec-WebSocket-Protocol: fhs.v1)
             JSON compat (Sec-WebSocket-Protocol: fhs.v1.json, solo dev)
```

### Ciclo de vida de un stream

```mermaid
stateDiagram-v2
    [*] --> CONNECTING: libp2p abre stream
    CONNECTING --> HANDSHAKING: conexión TCP+TLS establecida
    HANDSHAKING --> ACTIVE: HandshakeMessage → HandshakeAckMessage
    ACTIVE --> ACTIVE: ping/pong (cada heartbeatSeconds)
    ACTIVE --> ACTIVE: Mission messages (chat.request, tool.call, ...)
    ACTIVE --> CLOSED: cierre limpio o timeout de lease
    CLOSED --> [*]
    HANDSHAKING --> CLOSED: HandshakeNack / error
```

---

## NAT Traversal

Para nodos detrás de NAT (celular, red doméstica):

1. **AutoNAT** (libp2p): el nodo detecta si tiene IP pública o está detrás de NAT.
2. **Relay** (libp2p Circuit Relay v2): si no hay conexión directa posible, el stream
   se tuneliza a través de un relay conocido (que puede ser Atlas u otro nodo con IP pública).
3. **WebRTC** (libp2p, opcional): para conexiones browser-to-browser sin relay.

Los **Ephemeral Satellites** (WASM en browser) siempre usan relay porque los browsers
no pueden aceptar conexiones entrantes. Ver `protocol/ephemeral-satellite.md`.

---

## Federación entre comunidades

Múltiples "comunidades" FHS (clusters de nodos) pueden conectarse entre sí
si algún nodo de cada comunidad se une al mismo DHT swarm.

El mecanismo es el mismo que cualquier otro descubrimiento — no hay protocolo
de federación especial. Dos comunidades son parte de la misma red simplemente
si sus swarms DHT están conectados.

La granularidad de acceso se controla con:
- El campo `scope` en el Beacon: `local | network | community | external`
- El campo `scope` en `MissionOfferMessage`: Navigator solo recibe bids de providers
  cuyo `visibility` sea compatible con el `scope` solicitado
