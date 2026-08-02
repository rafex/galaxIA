# FHS Protocol — Flujos de secuencia

**Versión:** 1.0  
**DECs:** DEC-0086 (LPP framing + gossip), DEC-0087 (Envelope P2P, Handshake 2-step)  
**Fecha:** 2026-08-02

Todos los mensajes viajan dentro de un `Envelope` firmado con Ed25519 (`source_peer_id` + `signature`).  
El framing binario se describe en [idl/framing.md](framing.md).

---

## 1. Registro de Provider — Handshake 2-step (DEC-0087)

Flujo de registro de un Star, Satellite o Nova ante un Atlas. Reemplaza el flujo de 4 mensajes (hello → welcome → register → registered) con 2 mensajes mutuamente autenticados vía Envelope.

```mermaid
sequenceDiagram
  participant P as Provider<br/>(Star / Satellite / Nova)
  participant A as Atlas

  P->>A: WebSocket connect /register<br/>Sec-WebSocket-Protocol: fhs.v1
  note over P,A: Negociación de subprotocolo; Atlas elige fhs.v1 (binario) o fhs.v1.json

  P->>A: Envelope { sourcePeerId: provider.DID, signature } → handshake<br/>{ fhsVersion, listenAddrs: ["/ip4/…/tcp/8081/ws"], beacon: "{…JSON…}" }
  note over A: Valida Envelope.signature + beacon schema (beacon-base.schema.json)

  A->>P: Envelope { sourcePeerId: atlas.DID, signature } → handshake_ack<br/>{ fhsVersion, leaseSeconds: 30, heartbeatSeconds: 10, leaseExpires, acceptedServices }
  note over P: Provider entra en estado Orbit

  loop Cada heartbeatSeconds (Pulse)
    P->>A: Envelope → ping {}
    A->>P: Envelope → pong { serverTimestamp }
  end

  note over A: Sin ping antes de leaseSeconds → emite node.lost y libera el DID del routing table
```

---

## 2. Misión de Chat — Portal → Navigator → Star

Flujo completo de una conversación con un LLM a través de la red FHS.

```mermaid
sequenceDiagram
  participant Po as Portal
  participant N as Navigator
  participant A as Atlas
  participant S as Star

  Po->>N: Envelope → agent.start { sessionId, scope: "network", model }
  Po->>N: Envelope → chat.request { missionId, messages[], tools[], model }

  N->>Po: Envelope → dispatch.ack { missionId, queuedAt }
  note over N: Navigator consulta Atlas para elegir el Star disponible

  N->>Po: Envelope → star.selected { missionId, providerId: star.DID, model }
  N->>Po: Envelope → agent.status { missionId, status: "calling_star" }

  N->>S: Envelope → chat.request { missionId, messages[], tools[], model }

  loop Streaming de tokens
    S->>N: Envelope → chat.delta { missionId, delta }
    N->>Po: Envelope → assistant.delta { missionId, delta }
  end

  S->>N: Envelope → chat.completed { missionId, content, toolCalls[] }
  N->>Po: Envelope → assistant.completed { missionId, content, provenance }
  note over Po: provenance = { providerId, model, completionTokens, toolProviderIds[], dataExported, jurisdiction }
```

---

## 3. Misión de Tool Call — Navigator → Satellite

Subflujo que se intercala dentro de la Misión de Chat cuando el Star solicita invocar una herramienta.

```mermaid
sequenceDiagram
  participant N as Navigator
  participant S as Satellite
  participant Po as Portal

  note over N: Star devolvió toolCalls[] en chat.completed — Navigator inicia tool mission

  N->>S: Envelope → tool.list { missionId }
  S->>N: Envelope → tool.list.response { missionId, tools[] }

  N->>Po: Envelope → tool.selected { missionId, providerId: satellite.DID, capabilityId }
  N->>Po: Envelope → agent.status { missionId, status: "calling_satellite" }

  N->>S: Envelope → tool.call { missionId, toolCalls[] }

  alt Éxito
    S->>N: Envelope → tool.result { missionId, toolCallId, result }
  else Error del Satellite
    S->>N: Envelope → tool.error { missionId, toolCallId, error }
  end

  note over N: Resultado inyectado como Message { role: "tool" } en el próximo chat.request al Star

  alt Cancelación del Portal
    Po->>N: Envelope → chat.cancel { missionId }
    N->>S: Envelope → tool.cancel { missionId }
  end
```

---

## 4. Error y reconexión

Manejo de errores de autenticación y reconexión con backoff exponencial.

```mermaid
sequenceDiagram
  participant P as Provider
  participant A as Atlas

  P->>A: WebSocket connect /register
  P->>A: Envelope → handshake { fhsVersion, listenAddrs, beacon }
  A->>P: Envelope → error { code: INVALID_SIGNATURE, message: "…" }
  note over P: Provider verifica su clave privada Ed25519 — no hace retry inmediato

  note over P: Backoff exponencial: 1 s → 2 s → 4 s → 8 s → 16 s (máx.)

  P->>A: WebSocket reconnect
  P->>A: Envelope → handshake (beacon firmado correctamente)
  A->>P: Envelope → handshake_ack { leaseSeconds: 30, … }
  note over P: En Orbit

  note over P,A: Si el lease expira sin ping (Provider crasheó o perdió red)
  A-->>N: Envelope → node.lost { providerId, providerName, services[] }
  note over N: Navigator retira el Star/Satellite del routing table
```

---

## 5. Gossip Atlas ↔ Atlas

Sincronización de routing tables entre Atlas en una federación distribuida sin coordinador central (DEC-0086).

```mermaid
sequenceDiagram
  participant A1 as Atlas-1
  participant A2 as Atlas-2

  A1->>A2: WebSocket connect /gossip<br/>Sec-WebSocket-Protocol: fhs.v1

  A1->>A2: Envelope { sourcePeerId: atlas1.DID, signature } → atlas.announce<br/>{ providerIds: ["did:key:zStar1", "did:key:zSatellite1"] }
  note over A2: Atlas-2 conoce los providers que ve Atlas-1

  A2->>A1: Envelope { sourcePeerId: atlas2.DID, signature } → atlas.sync<br/>{ providers: [NodeOnlineMessage{ providerId, providerName, services[] }, …] }
  note over A1: Routing tables sincronizadas bidirec­cionalmente

  note over A1,A2: A partir de aquí, cualquier Atlas puede rutear misiones<br/>a providers registrados en cualquier otro Atlas de la federación
```

---

## Referencias

- [idl/fhs-protocol.proto](fhs-protocol.proto) — definición completa de todos los tipos de mensaje
- [idl/asyncapi.yaml](asyncapi.yaml) — canales WebSocket y bindings
- [idl/framing.md](framing.md) — especificación LPP de framing binario
- [schemas/](../schemas/) — JSON Schemas de los Beacons
- [spec-native/DECISIONS.md](../spec-native/DECISIONS.md) — DEC-0086, DEC-0087
