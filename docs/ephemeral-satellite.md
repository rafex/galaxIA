# Ephemeral Satellite — WASM en Dispositivos Móviles

> Spec completa: `spec-native/specs/ephemeral-satellite/SPEC.md`
> IDL wire: `idl/fhs-protocol.proto`; los schemas auxiliares no se transmiten.

## Concepto

Un **Ephemeral Satellite** es un Satellite que:
- Ejecuta sus capabilities como código WASM dentro de un navegador o app móvil.
- Tiene ciclo de vida corto (lease TTL configurable, máx. 24h).
- Es **delegado por un Nodo Host** (Star, Satellite o Nova activo en el swarm) que publicó el WASM.
- Hereda la confianza del Host mediante una firma criptográfica (DelegationToken).

El dispositivo móvil no es un actor anónimo — es una extensión computacional de un nodo conocido.

## Flujo de Vida Completo

```mermaid
sequenceDiagram
    participant M as Móvil / Navegador
    participant H as Nodo Host<br/>(Satellite en swarm)
    participant D as DHT Swarm
    participant G as GossipSub
    participant NAV as Navigator

    note over M,H: 1. El runtime recibe WASM + DelegationToken fuera de FHS
    note over M,H: { issuer:hostDID, subject:"", capabilities:[...],<br/>wasmHash:"sha256:...", expiresAt:..., signature:... }

    note over M: 2. Preparación local
    note over M: Verifica SHA-256 del bundle contra DelegationToken.wasmHash
    note over M: Genera did:key:z<efímero> (Ed25519 nuevo)
    note over M: Rellena DelegationToken.subject con el DID efímero

    note over M,D: 3. Unirse al swarm P2P

    M->>D: Kademlia Join (vía bootstrap peer conocido, ej. Atlas)
    M->>D: DHT.put(ephDID, DhtBeaconRecord { ephemeral:true, delegatedBy:hostDID })
    M->>G: NodeAdvertiseMessage { did:ephDID, ephemeral:true, delegatedBy:hostDID }

    note over NAV: Navigator recibe MissionBidMessage de ephDID<br/>Verifica DelegationToken de forma autónoma

    NAV->>D: DHT.get(hostDID) → DhtBeaconRecord del Host
    note over NAV: Extrae pubKey del hostDID (did:key embeds pubkey)<br/>Verifica firma Ed25519 del DelegationToken<br/>→ TrustLevel = DELEGATED

    note over M,NAV: 4. Recibir y ejecutar Missions

    NAV->>M: Stream directo /fhs/v1/0.1.0 → handshake
    M->>NAV: handshake_ack { trustLevel:"delegated" }

    NAV->>M: Envelope { tool_call }<br/>missionId, toolCalls[]

    note over M: Web Worker ejecuta WASM<br/>(aislado del hilo principal)

    M->>NAV: Envelope { dispatch_ack }<br/>missionId, queuedAt

    note over M: WASM procesa la tool call

    M->>NAV: Envelope { tool_result }<br/>missionId, toolCallId, result

    note over NAV: 5. Post-Mission feedback (distribuido)

    NAV->>G: ReputationUpdateMessage { missionId, providerDid:ephDID,<br/>latencyMs, success:true, delegatedBy:hostDID }

    note over M: Pulse continuo (peer-to-peer)

    loop cada heartbeatSeconds
        M->>NAV: Envelope { ping }
        NAV->>M: Envelope { pong }
    end
```

## Expiración cuando el Host Sale del Swarm

En el modelo P2P no hay expulsión activa orquestada por Atlas. El ciclo de vida es:

```mermaid
sequenceDiagram
    participant H as Nodo Host
    participant D as DHT
    participant G as GossipSub
    participant M as Ephemeral Satellite
    participant NAV as Navigator

    note over H: Nodo Host deja de publicar NodeAdvertiseMessage

    note over G: TTL del anuncio del Host expira (default 60s)
    note over NAV: Navigator marca el Host offline en caché local

    note over D: DhtBeaconRecord del Host expira (TTL 24h)

    note over NAV: Al recibir nuevo bid del Ephemeral Satellite:<br/>DHT.get(hostDID) falla o devuelve record expirado<br/>→ No puede verificar DelegationToken<br/>→ Rechaza el bid (BID_REJECTED)

    note over M: Lease del stream directo con Navigator expira<br/>→ Stream cierra por timeout (sin node.lost explícito)
    note over M: Ephemeral Satellite puede intentar reconectar<br/>cuando el Host vuelva al swarm
```

## Flujo de Error: Hash WASM Incorrecto

```mermaid
sequenceDiagram
    participant M as Ephemeral Satellite
    participant NAV as Navigator
    participant G as GossipSub

    NAV->>M: Envelope { tool_call } — missionId

    note over M: Web Worker detecta que el bundle.wasm<br/>cargado tiene hash diferente<br/>al DelegationToken.wasmHash

    M->>NAV: Envelope { tool_error }<br/>missionId, error="wasm_hash_mismatch"

    NAV->>G: ReputationUpdateMessage { missionId, success:false,<br/>errorCode:"WASM_HASH_MISMATCH", delegatedBy:hostDID }

    note over NAV: Reputación del ephDID cae en caché local<br/>Otros Navigators que reciban el feed también lo registran
```

## DelegationToken (Protobuf)

```protobuf
message DelegationToken {
  string          issuer       = 1;  // did:key:z<host>
  string          subject      = 2;  // did:key:z<efímero>
  repeated string capabilities = 3;  // ["arithmetic.solve", "curp.compute"]
  string          wasm_hash    = 4;  // "sha256:<64 hex chars>"
  int64           expires_at   = 5;  // Unix ms
  bytes           signature    = 6;  // Ed25519 sobre canonical proto(1-5)
}
```

La firma cubre los campos 1-5 en serialización proto canónica (determinista). El verificador (Navigator) extrae la clave pública directamente del DID `issuer` (`did:key` embeds pubkey) — no hay PKI, no hay lookup externo, no hay Atlas en el camino.

## Niveles de Confianza

| TrustLevel | Condición | Comportamiento |
| ---------- | --------- | -------------- |
| `delegated` | DelegationToken válido, Host activo en DHT, firma OK | Navigator enruta Missions sin restricción adicional |
| `community` | Host en DHT pero WASM no firmado directamente por él | Portal muestra badge de advertencia |
| `unverified` | Sin DelegationToken (WASM local / desarrollo) | Portal muestra alerta; Navigator requiere configuración `allowUnverified:true` |

## Arquitectura WASM en el Navegador

```
Página web (thread principal)
├── Se une al swarm DHT (vía bootstrap peer)
├── Publica DhtBeaconRecord + NodeAdvertiseMessage
├── Gestiona stream directo con Navigator (handshake + ping/pong)
└── Despacha Missions al Web Worker

Web Worker (thread aislado)
├── Carga bundle.wasm vía WebAssembly.instantiate()
├── Verifica SHA-256 antes de instanciar
├── Expone funciones string-in / string-out:
│     solveExpression(expr: string): string
│     computeCurpEncoded(input: string): string
└── Responde tool.call con tool.result
```

El Web Worker es obligatorio — el WASM no puede bloquear el thread principal (donde vive la conexión P2P y el stream directo con Navigator).
