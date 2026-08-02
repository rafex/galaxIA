# Ephemeral Satellite — WASM en Dispositivos Móviles

> Spec completa: `spec-native/specs/ephemeral-satellite/SPEC.md`
> IDL: `idl/fhs-protocol.proto`, `idl/asyncapi.yaml`, `schemas/beacon-base.schema.json`

## Concepto

Un **Ephemeral Satellite** es un Satellite que:
- Ejecuta sus capabilities como código WASM dentro de un navegador o app móvil.
- Tiene ciclo de vida corto (lease TTL configurable, máx. 24h).
- Es **delegado por un Nodo Host** (Star, Satellite o Nova ya en Orbit) que publicó el WASM.
- Hereda la confianza del Host mediante una firma criptográfica (DelegationToken).

El dispositivo móvil no es un actor anónimo — es una extensión computacional de un nodo conocido.

## Flujo de Vida Completo

```mermaid
sequenceDiagram
    participant M as Móvil / Navegador
    participant H as Nodo Host<br/>(Satellite en Orbit)
    participant A as Atlas
    participant NAV as Navigator

    note over M,H: 1. Distribución del WASM

    M->>H: Carga página web del Nodo Host<br/>(HTTP/HTTPS — plano de distribución)
    H->>M: bundle.wasm + DelegationToken pre-firmado<br/>{ issuer:hostDID, subject:"", capabilities:[...],<br/>wasmHash:"sha256:...", expiresAt:..., signature:... }

    note over M: 2. Preparación local
    note over M: Verifica SHA-256 del bundle contra DelegationToken.wasmHash
    note over M: Genera did:key:z<efímero> (Ed25519 nuevo)
    note over M: Rellena DelegationToken.subject con el DID efímero

    note over M,A: 3. Entrar en Orbit

    M->>A: WS CONNECT wss://atlas/register (fhs.v1 binario)
    M->>A: Envelope { handshake }<br/>beacon { ephemeral:true, delegatedBy:hostDID }<br/>delegation_token (proto, firmado por Host)

    note over A: Valida Cadena de Delegación<br/>→ TrustLevel = DELEGATED

    A->>M: Envelope { handshake_ack }<br/>trustLevel="delegated"

    A->>NAV: Envelope { node_online }<br/>providerId=ephDID, ephemeral:true,<br/>trustLevel:"delegated", delegatedBy:hostDID

    note over M,NAV: 4. Recibir y ejecutar Missions

    NAV->>M: Envelope { tool_call }<br/>missionId, toolCalls[]

    note over M: Web Worker ejecuta WASM<br/>(aislado del hilo principal)

    M->>NAV: Envelope { dispatch_ack }<br/>missionId, queuedAt

    note over M: WASM procesa la tool call

    M->>NAV: Envelope { tool_result }<br/>missionId, toolCallId, result

    note over NAV: 5. Post-Mission feedback

    NAV->>A: Envelope { mission_feedback }<br/>missionId, satelliteDid=ephDID,<br/>latencyMs, success:true, delegatedBy:hostDID

    note over A: Actualiza reputación del Ephemeral Satellite<br/>y contador de delegaciones exitosas del Host

    note over M,A: Pulse continuo

    loop cada heartbeatSeconds
        M->>A: Envelope { ping }
        A->>M: Envelope { pong }
    end
```

## Expulsión cuando el Host Sale del Orbit

```mermaid
sequenceDiagram
    participant H as Nodo Host
    participant A as Atlas
    participant M as Ephemeral Satellite
    participant NAV as Navigator

    note over H: Nodo Host se desconecta<br/>(cierre limpio o timeout de Pulse)

    A->>NAV: Envelope { node_lost }<br/>providerId=hostDID

    note over A: Detecta Ephemeral Satellites\ncon delegatedBy == hostDID

    A->>M: Envelope { error: DELEGATION_EXPIRED }
    note over A: Cierra WS del Ephemeral Satellite

    A->>NAV: Envelope { node_lost }<br/>providerId=ephDID
```

## Flujo de Error: Hash WASM Incorrecto

```mermaid
sequenceDiagram
    participant M as Ephemeral Satellite
    participant NAV as Navigator
    participant A as Atlas

    NAV->>M: Envelope { tool_call } — missionId

    note over M: Web Worker detecta que el bundle.wasm\ncargado tiene hash diferente\nal DelegationToken.wasmHash

    M->>NAV: Envelope { tool_error }<br/>missionId, error="wasm_hash_mismatch"

    NAV->>A: Envelope { mission_feedback }<br/>missionId, success:false,<br/>errorCode="WASM_HASH_MISMATCH"

    note over A: Registra incidente en reputación<br/>del Ephemeral Satellite y del Host
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

La firma cubre los campos 1-5 en serialización proto canónica (determinista). El verificador (Atlas) extrae la clave pública directamente del DID `issuer` (`did:key` embeds pubkey) — no hay PKI, no hay lookup externo.

## Niveles de Confianza

| TrustLevel | Condición | Comportamiento |
| ---------- | --------- | -------------- |
| `delegated` | DelegationToken válido, Host en Orbit, firma OK | Navigator enruta Missions sin restricción adicional |
| `community` | Host conocido pero WASM no firmado directamente por él | Portal muestra badge de advertencia |
| `unverified` | Sin DelegationToken (WASM local / desarrollo) | Portal muestra alerta; Navigator requiere configuración `allowUnverified:true` |

## Arquitectura WASM en el Navegador

```
Página web (thread principal)
├── Conecta WS a Atlas → handshake
├── Gestiona Pulse (ping/pong)
└── Despacha Missions al Web Worker

Web Worker (thread aislado)
├── Carga bundle.wasm vía WebAssembly.instantiate()
├── Verifica SHA-256 antes de instanciar
├── Expone funciones string-in / string-out:
│     solveExpression(expr: string): string
│     computeCurpEncoded(input: string): string
└── Responde tool.call con tool.result
```

El Web Worker es obligatorio — el WASM no puede bloquear el thread principal (donde vive la conexión WS).
