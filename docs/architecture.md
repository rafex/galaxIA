# Arquitectura — Red FHS P2P

## Nodos y Roles

| Nodo | Rol | `provider.type` |
| ---- | --- | --------------- |
| **Atlas** | Bootstrap peer. Primer punto de entrada al swarm DHT. No es un registro central. | `atlas` (especial, no en Beacon) |
| **Star** | Proveedor LLM. Ejecuta inferencia de lenguaje. | `star` |
| **Satellite** | Proveedor de herramientas (tools). Expone capabilities como OCR, búsqueda, CURP, etc. | `satellite` |
| **Nova** | Agente autónomo con loop propio. Puede coordinar Stars y Satellites. | `nova` |
| **Navigator** | Agent Runtime. Recibe Missions del Portal, despacha via GossipSub, ejecuta por stream directo. | — (peer FHS, no en DHT Beacon) |
| **Portal** | Interfaz de chat del usuario y peer FHS. Entra por bootstrap TLS y descubre Navigator por DHT/GossipSub. | — (peer libp2p) |
| **Ephemeral Satellite** | Satellite efímero ejecutando WASM en browser o móvil, delegado por un Nodo Host. | `satellite` + `ephemeral: true` |

## Topología de red

La red es una **malla P2P** (DHT Kademlia + GossipSub). No hay centro.
Los streams directos solo se abren cuando hay una Mission activa.

```mermaid
graph TB
    subgraph "Swarm DHT + GossipSub (malla P2P)"
        AT["Atlas\n(bootstrap peer)"]
        NAV["Navigator\n(Agent Runtime)"]
        STAR1["Star 1\n(LLM local)"]
        STAR2["Star 2\n(LLM remoto)"]
        SAT["Satellite\n(OCR)"]
        EPH["Ephemeral Satellite\n(WASM browser)"]
    end

    subgraph "Portal (peer libp2p, bootstrap TLS + discovery)"
        PORT["Portal\n(peer FHS; DHT/GossipSub)"]
    end

    subgraph "GossipSub tópicos"
        G1["fhs/v1/nodes/advertise"]
        G2["fhs/v1/missions/offer + bid + assign"]
        G3["fhs/v1/reputation/update"]
    end

    subgraph "DHT"
        D1["Beacons\n(did → DhtBeaconRecord)"]
        D2["Reputación\n(reputation/did → DhtReputationRecord)"]
    end

    %% GossipSub broadcast
    AT --- G1
    NAV --- G1
    STAR1 --- G1
    STAR2 --- G1
    SAT --- G1
    EPH --- G1

    NAV --- G2
    STAR1 --- G2
    STAR2 --- G2
    SAT --- G2

    NAV --- G3

    %% DHT
    AT --- D1
    STAR1 --- D1
    STAR2 --- D1
    SAT --- D1
    EPH --- D1
    AT --- D2
    NAV --- D2

    %% Stream directo (solo durante misiones activas)
    PORT -->|"stream libp2p\nchat.request / agent.start"| NAV
    NAV -.->|"stream directo post-assign\nchat.request"| STAR1
    NAV -.->|"stream directo post-assign\ntool.call"| SAT
    NAV -.->|"stream directo post-assign\ntool.call"| EPH

    %% Bootstrap (solo al unirse)
    STAR1 -.->|"bootstrap (solo 1 vez)"| AT
    PORT -.->|"bootstrap TLS configurado"| AT
    PORT --- G1
    PORT --- D1
```

**Leyenda:**
- `---` conexión GossipSub o DHT (permanente, broadcast)
- `-->` stream directo siempre activo (Portal↔Navigator)
- `-.->` stream directo temporal (solo durante Mission activa, post-assign)

## Cómo se forma el swarm

```mermaid
sequenceDiagram
    participant N as Nodo nuevo (Star/Satellite/Nova)
    participant A as Atlas (bootstrap peer)
    participant S as Swarm DHT existente

    N->>A: Conectar a bootstrap peer (multiaddr conocido)
    A->>N: Lista de peers del swarm DHT

    N->>S: Unirse al DHT (Kademlia join)
    N->>S: Publicar DhtBeaconRecord { did, beacon, multiaddrs }

    N->>S: Suscribirse a GossipSub topics (fhs/v1/*)
    N->>S: NodeAdvertiseMessage (fhs/v1/nodes/advertise)

    Note over N,S: Nodo operativo.<br/>Ya no depende de Atlas para comunicarse.
```

## Principio de Diseño

**Navigator nunca consulta a Atlas para despachar Missions.**
Navigator escucha los `NodeAdvertiseMessage` del tópico GossipSub `fhs/v1/nodes/advertise`
y mantiene una vista local de los peers disponibles.

Cuando llega una Mission, Navigator:
1. Publica `MissionOfferMessage` en GossipSub.
2. Recoge bids y selecciona el mejor.
3. Abre un stream directo con el provider ganador.
4. Ejecuta la Mission.

Atlas solo interviene cuando un nodo nuevo quiere unirse al swarm por primera vez.

El Portal es una excepción operativa de bootstrap: el navegador no puede
descubrir por mDNS. Su configuración HTTPS solo entrega una multiaddr TLS
inicial; después participa en DHT/GossipSub, verifica los anuncios Protobuf y
abre el chat por el stream libp2p directo. No existe un registro HTTP oculto.

## Discovery vs Routing

| Función | Mecanismo |
| ------- | --------- |
| Descubrir un nodo por DID | DHT lookup (`did` → `DhtBeaconRecord`) |
| Saber qué nodos están activos ahora | GossipSub `fhs/v1/nodes/advertise` (TTL cache) |
| Asignar una Mission | GossipSub offer/bid/assign |
| Ejecutar una Mission | Stream directo `/fhs/v1/0.1.0` |
| Consultar reputación | DHT `reputation/{did}` + GossipSub reputation cache |
