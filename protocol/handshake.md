# Handshake — Protocolo de Conexión y Ciclo de Vida

## Visión General

Un nodo entra en **Orbit** mediante un handshake de 2 pasos seguido de un Pulse (ping/pong) periódico. Este flujo reemplaza el protocolo de 4 pasos (hello/welcome/register/registered) eliminado en DEC-0087.

## Handshake Estándar (Nodo Persistente)

```mermaid
sequenceDiagram
    participant N as Nodo<br/>(Star/Satellite/Nova/Navigator)
    participant A as Atlas

    N->>A: WS CONNECT wss://atlas/register<br/>Sec-WebSocket-Protocol: fhs.v1

    note over N,A: Handshake 2-step (DEC-0087)

    N->>A: Envelope { handshake: HandshakeMessage }<br/>fhsVersion, listenAddrs, beacon (JSON Beacon firmado)

    note over A: Valida Envelope.signature (Ed25519)<br/>Valida Beacon contra JSON Schema<br/>Registra en Orbit con lease

    A->>N: Envelope { handshake_ack: HandshakeAckMessage }<br/>leaseSeconds, heartbeatSeconds, leaseExpires,<br/>acceptedServices, trustLevel="standard"

    note over N,A: Nodo en Orbit

    loop cada heartbeatSeconds
        N->>A: Envelope { ping: PingMessage }
        A->>N: Envelope { pong: PongMessage } — serverTimestamp para RTT
    end

    note over A: Atlas emite node.online a Navigators conectados
```

## Handshake de Ephemeral Satellite

```mermaid
sequenceDiagram
    participant B as Browser/Móvil<br/>(Ephemeral Satellite)
    participant H as Nodo Host<br/>(ya en Orbit)
    participant A as Atlas

    note over B,H: Pre-handshake: obtener DelegationToken

    B->>H: GET /wasm-bundle<br/>(HTTP/HTTPS — plano de distribución, no protocolo FHS)
    H->>B: bundle.wasm + DelegationToken pre-firmado
    note over B: Verifica SHA-256 del bundle<br/>contra DelegationToken.wasmHash

    note over B,A: Handshake con delegación

    B->>A: WS CONNECT wss://atlas/register<br/>Sec-WebSocket-Protocol: fhs.v1

    B->>A: Envelope { handshake: HandshakeMessage }<br/>beacon { provider.ephemeral:true, provider.delegatedBy: hostDID }<br/>delegation_token { issuer:hostDID, subject:ephDID,<br/>capabilities, wasmHash, expiresAt, signature }

    note over A: 1. Valida Envelope.signature del Ephemeral Satellite<br/>2. Extrae delegation_token.issuer (DID del Host)<br/>3. Verifica que Host esté en Orbit<br/>4. Extrae pubKey del Host desde did:key (sin PKI)<br/>5. Verifica firma Ed25519 del DelegationToken<br/>6. Verifica expiresAt > now()<br/>7. Verifica delegation_token.subject == Envelope.sourcePeerId<br/>8. Asigna TrustLevel según resultado

    alt Validación exitosa → TrustLevel = DELEGATED
        A->>B: Envelope { handshake_ack }<br/>trustLevel="delegated"<br/>leaseExpires = min(delegation_token.expiresAt, now+leaseSeconds)
        note over A: Emite node.online { ephemeral:true, trustLevel:"delegated" } a Navigators
    else Host no en Orbit o firma inválida
        A->>B: Envelope { error: DELEGATION_INVALID }
        note over A: Cierra conexión WS
    else Token expirado
        A->>B: Envelope { error: DELEGATION_EXPIRED }
        note over A: Cierra conexión WS
    end

    loop cada heartbeatSeconds
        B->>A: Envelope { ping }
        A->>B: Envelope { pong }
    end
```

## Salida del Orbit

```mermaid
sequenceDiagram
    participant N as Nodo
    participant A as Atlas
    participant NAV as Navigator

    alt Cierre limpio
        N->>A: Cierra WebSocket (close frame)
        note over A: Elimina de Orbit inmediatamente
    else Timeout de Pulse
        note over A: No recibe ping en > leaseSeconds
        note over A: Marca como expired
    end

    A->>NAV: Envelope { node_lost: NodeLostMessage }<br/>providerId, providerName, services

    note over A: Si el nodo que salió es un Nodo Host<br/>que tiene Ephemeral Satellites activos...

    loop Por cada Ephemeral Satellite del Host
        A->>EphNode: Envelope { error: DELEGATION_EXPIRED }
        note over A: Cierra conexión WS del Ephemeral Satellite
        A->>NAV: Envelope { node_lost } — para cada Ephemeral Satellite expulsado
    end
```

## Campos del Beacon

El `HandshakeMessage.beacon` es un JSON serializado que sigue el schema `beacon-base.schema.json` (y sus extensiones por tipo: `beacon-star`, `beacon-satellite`, `beacon-nova`).

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
| `leaseSeconds` | 30 | TTL del Orbit. El nodo debe renovar con ping antes de que expire. |
| `heartbeatSeconds` | 10 | Intervalo recomendado de ping. |
| `leaseExpires` (Ephemeral) | `min(token.expiresAt, now + leaseSeconds)` | Atlas nunca extiende más allá de la expiración del DelegationToken. |
