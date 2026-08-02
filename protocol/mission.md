# Mission — Ciclo de Vida de una Tarea

## Concepto

Una **Mission** es la unidad de trabajo del protocolo FHS. Cada Mission tiene un `missionId` (UUID v4) que correlaciona todos los mensajes de ese trabajo a través de nodos.

```
missionId = UUID que acompaña cada mensaje del ciclo de vida:
  chat.request → chat.delta* → chat.completed
  tool.call    → dispatch.ack → tool.result
  agent.start  → agent.status → assistant.delta* → assistant.completed
```

## Flujo Completo: Portal → Navigator → Star → Satellite

```mermaid
sequenceDiagram
    participant P as Portal
    participant NAV as Navigator
    participant STAR as Star (LLM)
    participant SAT as Satellite (Tool)

    P->>NAV: Envelope { agent_start }<br/>sessionId, scope="network", model hint

    P->>NAV: Envelope { chat_request }<br/>missionId, messages[]

    note over NAV: Resuelve Star en caché local de GossipSub (NodeAdvertiseMessage)

    NAV->>P: Envelope { star_selected }<br/>missionId, providerId (DID del Star), model

    NAV->>STAR: Envelope { chat_request }<br/>missionId, messages[], tools[]

    STAR->>NAV: Envelope { dispatch_ack }<br/>missionId, queuedAt

    loop Tool calls (si el LLM necesita tools)
        STAR->>NAV: Envelope { chat_completed }<br/>missionId, toolCalls[]

        note over NAV: Resuelve Satellite para la tool call

        NAV->>P: Envelope { tool_selected }<br/>missionId, providerId (DID del Satellite), capabilityId

        NAV->>SAT: Envelope { tool_call }<br/>missionId, toolCalls[]

        SAT->>NAV: Envelope { tool_result }<br/>missionId, toolCallId, result (JSON)

        NAV->>STAR: Envelope { chat_request }<br/>missionId, messages[] con tool result incorporado
    end

    STAR-->>NAV: Envelope { chat_delta } × N   (streaming)
    NAV-->>P: Envelope { assistant_delta } × N  (streaming al Portal)

    STAR->>NAV: Envelope { chat_completed }<br/>missionId, content

    NAV->>P: Envelope { assistant_completed }<br/>missionId, content, provenance { providerId, model,<br/>toolProviderIds[], dataExported, jurisdiction }
```

## Cancelación

```mermaid
sequenceDiagram
    participant P as Portal
    participant NAV as Navigator
    participant STAR as Star

    P->>NAV: Envelope { chat_cancel }<br/>missionId

    NAV->>STAR: Envelope { tool_cancel }<br/>missionId   (si hay tool en vuelo)

    note over STAR: Aborta la inferencia

    STAR->>NAV: Envelope { chat_error }<br/>missionId, errorCode=CANCELLED
```

## Degradación Graceful

Si el Satellite seleccionado no responde dentro del timeout:

```mermaid
sequenceDiagram
    participant NAV as Navigator
    participant SAT1 as Satellite 1 (sin respuesta)
    participant SAT2 as Satellite 2 (backup)

    NAV->>SAT1: Envelope { tool_call } — missionId

    note over NAV: Timeout tras leaseSeconds

    NAV->>SAT1: Envelope { tool_cancel } — missionId

    note over NAV: Selecciona Satellite 2 del routing table<br/>con la misma capability

    NAV->>SAT2: Envelope { tool_call } — mismo missionId
    SAT2->>NAV: Envelope { tool_result } — missionId
```

## Scope de Resolución

Cuando Navigator busca un Star o Satellite para una Mission, usa el `scope` del `AgentStartMessage`:

| Scope | Qué providers considera |
| ----- | ----------------------- |
| `local` | Solo nodos en el mismo host (misma IP) |
| `network` | Nodos en la red local (mismo swarm DHT) |
| `community` | Nodos con `visibility: "community"` en el Atlas y sus pares federados |
| `external` | Todos los nodos públicos de la federación |

## ProvenanceInfo

Cada `AssistantCompletedMessage` incluye `ProvenanceInfo` con la trazabilidad completa:

```json
{
  "providerId":     "did:key:z<star>",
  "model":          "llama3.2:3b",
  "completionTokens": 142,
  "toolProviderIds": ["did:key:z<satellite-ocr>", "did:key:z<ephemeral-satellite>"],
  "dataExported":   false,
  "jurisdiction":   "MX"
}
```

Portal muestra esta información al usuario como la "Tarjeta de Procedencia" de la misión.
Para Ephemeral Satellites, Navigator añade el `trustLevel` del nodo (obtenido del `NodeAdvertiseMessage` o del `MissionBidMessage`).
