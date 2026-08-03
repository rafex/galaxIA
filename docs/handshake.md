# Handshake — Stream Directo y Ciclo de Vida

## Visión General

El **handshake** establece un **stream directo** `/fhs/v1/0.1.0` entre cualquier par de nodos FHS. Se usa en tres contextos:

- **Portal → Navigator**: al inicio de cada sesión de agente (siempre activo).
- **Navigator → Star**: post-`MissionAssignMessage` en GossipSub.
- **Navigator → Satellite**: post-`MissionAssignMessage` para una Tool Mission.

El handshake **no** sustituye el descubrimiento de nodos — eso ocurre antes mediante DHT y GossipSub (ver `docs/p2p.md`).

## Handshake de Stream Directo

```mermaid
sequenceDiagram
    participant I as Iniciador<br/>(Navigator / Portal)
    participant R as Receptor<br/>(Star / Satellite / Navigator)

    I->>R: libp2p dial (multiaddr del MissionBidMessage o DHT lookup)
    note over I,R: Negociación de subprotocolo: fhs.v1 (binario) o fhs.v1.json

    I->>R: Envelope { handshake: HandshakeMessage }<br/>fhsVersion, listenAddrs, beacon (JSON serializado)

    note over R: 1. Valida Envelope.signature Ed25519 del iniciador<br/>2. Verifica DID del iniciador en caché GossipSub o DHT<br/>3. Valida Beacon contra JSON Schema

    alt Handshake exitoso
        R->>I: Envelope { handshake_ack: HandshakeAckMessage }<br/>leaseSeconds, heartbeatSeconds, leaseExpires, trustLevel
        note over I,R: Stream ACTIVO — en Orbit (lease peer-to-peer activo)
    else Firma inválida o DID desconocido
        R->>I: Envelope { error: INVALID_SIGNATURE }
        note over R: Cierra stream
    end

    loop cada heartbeatSeconds
        I->>R: Envelope { ping }
        R->>I: Envelope { pong { serverTimestamp } }
    end
```

Un nodo en **Orbit** respecto a otro peer tiene un stream activo con lease vigente. No es un estado global — cada par de nodos mantiene su propio lease de forma independiente.

## Handshake de Ephemeral Satellite

El Ephemeral Satellite (WASM en browser o móvil) se une al swarm como cualquier nodo, pero su confianza se verifica via `DelegationToken` — un credential Ed25519 firmado por el Nodo Host que lo avala.

```mermaid
sequenceDiagram
    participant B as Browser/Móvil<br/>(Ephemeral Satellite)
    participant H as Nodo Host<br/>(activo en el swarm)
    participant D as DHT Swarm
    participant G as GossipSub
    participant NAV as Navigator

    note over B,H: Pre-unión: obtener WASM + DelegationToken

    B->>H: GET /wasm-bundle (HTTPS — plano de distribución, no protocolo FHS)
    H->>B: bundle.wasm + DelegationToken pre-firmado<br/>{ issuer: hostDID, subject: ephDID,<br/>  capabilities, wasmHash, expiresAt, signature }
    note over B: Verifica SHA-256(bundle) == DelegationToken.wasmHash

    note over B: Unirse al swarm P2P (igual que cualquier nodo)

    B->>D: Kademlia Join (vía bootstrap peer: Atlas u otro conocido)
    B->>D: DHT.put(ephDID, DhtBeaconRecord { ephemeral:true, delegatedBy: hostDID })
    B->>G: NodeAdvertiseMessage { did: ephDID, ephemeral:true, delegatedBy: hostDID }

    note over NAV: Recibe MissionBidMessage del ephDID<br/>Verifica DelegationToken de forma autónoma (sin Atlas)

    NAV->>D: DHT.get(hostDID) → DhtBeaconRecord del Host
    note over NAV: Extrae pubKey del hostDID (did:key embeds pubkey, sin PKI)<br/>Verifica firma Ed25519 del DelegationToken<br/>Verifica expiresAt > now()<br/>Verifica DelegationToken.subject == ephDID

    alt Validación exitosa → trustLevel = DELEGATED
        NAV->>B: libp2p dial → Handshake estándar
        B->>NAV: Envelope { handshake_ack }
        note over NAV,B: Stream ACTIVO con trustLevel = "delegated"
    else Token inválido, expirado o Host no encontrado en DHT
        note over NAV: Rechaza el bid → BID_REJECTED
    end
```

La verificación del `DelegationToken` es autónoma: Navigator la realiza usando solo el DHT y la clave pública embebida en el DID del Host. Atlas no interviene.

## Salida del Swarm

Un nodo sale del swarm cuando deja de publicar `NodeAdvertiseMessage`. No hay un mensaje `node.lost` explícito:

```mermaid
sequenceDiagram
    participant N as Nodo
    participant G as GossipSub
    participant NAV as Navigator

    alt Cierre limpio
        N->>G: NodeAdvertiseMessage { ttlSeconds: 0 }
        note over G: Peers marcan el nodo offline inmediatamente
    else Caída inesperada
        note over G: Nodo deja de publicar NodeAdvertiseMessage
        note over NAV: TTL del último anuncio expira en caché local<br/>Navigator marca el nodo offline (sin notificación externa)
    end

    note over NAV: Si había un stream directo activo con ese nodo:<br/>Lease expira por timeout (leaseSeconds) → cierre local
```

Si el Nodo Host de un Ephemeral Satellite deja de publicar (DhtBeaconRecord expira), los Navigators que intenten verificar el DelegationToken del efímero obtendrán error de verificación y rechazarán sus bids.

## Campos del Beacon

El `HandshakeMessage.beacon` es un JSON serializado siguiendo el schema `beacon-base.schema.json` (y sus extensiones por tipo: `beacon-star`, `beacon-satellite`, `beacon-nova`).

Campos clave para Ephemeral Satellites:

```json
{
  "fhsVersion": "1",
  "provider": {
    "id": "did:key:z<efímero>",
    "type": "satellite",
    "visibility": "community",
    "ephemeral": true,
    "delegatedBy": "did:key:z<host>",
    "leaseSeconds": 3600
  },
  "capabilities": [
    { "id": "arithmetic.solve", "name": "Aritmética" },
    { "id": "curp.compute",    "name": "Cálculo de CURP" }
  ],
  "device": {
    "platform": "browser",
    "wasmTier": "baseline",
    "fingerprint": "sha256:<hash-no-reversible>"
  },
  "endpoint": {
    "url": "wss://atlas.ejemplo.com"
  },
  "privacy": {
    "retention": "none"
  }
}
```

## Parámetros de Lease

| Parámetro | Default | Descripción |
| --------- | ------- | ----------- |
| `leaseSeconds` | 30 | TTL del stream directo. El iniciador debe renovar con ping antes de que expire. |
| `heartbeatSeconds` | 10 | Intervalo recomendado de ping. |
| `leaseExpires` (Ephemeral) | `min(token.expiresAt, now + leaseSeconds)` | El receptor nunca extiende el lease más allá de la expiración del DelegationToken. |
