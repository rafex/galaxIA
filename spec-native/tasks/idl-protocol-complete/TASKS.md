# TASKS.md — Completar IDL del protocolo FHS

> **Nota de alcance:** las tareas históricas que mencionan OpenAPI, REST,
> WebSocket, WSS o SSE están supersedidas por DEC-0090/0091. Los únicos
> contratos vigentes son `idl/fhs-protocol.proto` y la documentación AsyncAPI
> del transporte libp2p; los JSON Schema son auxiliares y no wire format.

## Metadata

- Iniciativa: `idl-protocol-complete`
- Spec relacionada: `spec-native/specs/fhs-mvp/SPEC.md`, `docs/protocolo.md`, `docs/protocolo-provider.md`
- Owner: rafex
- Estado general: `done`

## Contexto

galaxIA es ahora un repositorio IDL-only. El análisis de brecha identificó que los 3 IDL formales
(`asyncapi.yaml`, `fhs-protocol.proto`, `openapi.yaml`) cubren solo los 12 mensajes de misión,
pero omiten el flujo de registro/conexión completo, los schemas de manifiesto (Beacon) por tipo
de nodo, el canal Portal↔Navigator, y los endpoints REST más usados. Además hay inconsistencias
de vocabulario (`"llm"`/`"mcp"` vs `"star"`/`"satellite"`) que deben resolverse.

Orden de ejecución respeta dependencias: el índice (`idl/README.md`) se escribe al final cuando
todos los artefactos ya existen. Los schemas de Beacon dependen de la alineación de vocabulario.

---

## Tareas

### TASK-IDL-001 — Mensajes de registro en asyncapi.yaml y fhs-protocol.proto

- ID: TASK-IDL-001
- State: `done`
- Owner: rafex
- Dependencies: —
- Expected files:
  - `idl/asyncapi.yaml` (modificado)
  - `idl/fhs-protocol.proto` (modificado)
- Close criteria: Los mensajes `hello`, `welcome`, `register`, `registered`, `ping`, `pong`,
  `error`, `node.online` y `node.lost` aparecen definidos en ambos IDL formales con todos sus
  campos, canal y dirección correctos. El canal `/register` de AsyncAPI tiene el flujo completo
  de conexión. El `.proto` incluye los nuevos tipos en el `oneof` de `FhsMessage`.
- Validation: ✅ PR #78 mergeado. Verificado campo a campo contra `docs/protocolo.md` y
  `docs/protocolo-provider.md`. `FhsMessage.oneof` extendido a 21 campos (fields 13-21).
  Canal `/atlas/nodes` añadido para `node.online`/`node.lost`. `enum FhsErrorCode` con 12 códigos.

---

### TASK-IDL-002 — JSON Schemas de manifiesto Beacon por tipo de nodo

- ID: TASK-IDL-002
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-001
- Expected files:
  - `schemas/beacon-base.schema.json` — campos obligatorios compartidos
  - `schemas/beacon-star.schema.json` — manifiesto Star (LLM provider)
  - `schemas/beacon-satellite.schema.json` — manifiesto Satellite (tool provider)
  - `schemas/beacon-nova.schema.json` — manifiesto Nova (agente con loop)
- Close criteria: Los 4 schemas son JSON Schema draft-07 válidos. `beacon-star`, `beacon-satellite`
  y `beacon-nova` extienden `beacon-base` mediante `$ref` o `allOf`. El campo `provider.type`
  usa vocabulario canónico (`"star"` | `"satellite"` | `"nova"` | `"multi"`). Los ejemplos de
  `docs/manifiesto-llm.md` y `docs/manifiesto-mcp.md` son válidos contra el schema correspondiente.
  Los schemas incluyen `availability.maxConcurrentRequests` (DEC-0072, código `OVERLOADED`) y
  `provider.region` (campo documentado en `docs/manifiesto-llm.md`).
- Validation: Comparar campo por campo con `docs/manifiesto-llm.md`, `docs/protocolo-provider.md`
  (sección "Manifiesto — campos obligatorios sin excepción") y `docs/vocabulario.md`.

Campos de `beacon-base` (mínimo obligatorio según `protocolo-provider.md`):

| Campo                        | Tipo         | Obligatorio |
|------------------------------|--------------|-------------|
| `fhsVersion`                 | string       | Sí          |
| `provider.id`                | string (DID) | Sí          |
| `provider.type`              | enum         | Sí          |
| `provider.visibility`        | enum         | Sí          |
| `provider.region`            | string       | No          |
| `endpoint`                   | object       | Sí          |
| `availability.maxConcurrentRequests` | integer | No        |
| `privacy.retention`          | string       | Sí          |
| `privacy.trainingUse`        | boolean      | Sí (Star)   |

---

### TASK-IDL-003 — Diagramas de secuencia Mermaid en idl/flows.md

- ID: TASK-IDL-003
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-001
- Expected files:
  - `idl/flows.md` (nuevo)
- Close criteria: El archivo contiene al menos 4 `sequenceDiagram` Mermaid que cubren:
  1. Flujo de registro completo (Provider → Atlas: hello → welcome → register → registered → ping/pong)
  2. Flujo de chat completo (Portal → Navigator → Star → Navigator → Portal, incluyendo `dispatch.ack`)
  3. Flujo de tool call (Navigator → Satellite: tool.list → tool.list.response → tool.call → tool.result)
  4. Flujo de error y reconexión (error → backoff → retry del registro)
  Cada diagrama nombra los actores con vocabulario canónico (Portal, Navigator, Atlas, Star, Satellite)
  y muestra el nombre del mensaje FHS sobre cada flecha (ej. `chat.request`, `chat.delta`).
- Validation: Los diagramas son coherentes con `docs/arquitectura.md`, `docs/protocolo.md` y
  el ciclo de vida de `docs/protocolo-provider.md`. No contradicen ninguna DEC activa.

---

### TASK-IDL-004 — Endpoints REST faltantes y correcciones en openapi.yaml

- ID: TASK-IDL-004
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-002
- Expected files:
  - `idl/openapi.yaml` (modificado)
- Close criteria: `openapi.yaml` incluye los endpoints REST usados en producción que hoy faltan:
  - `GET /api/fhs/providers` con query params `?type=star|satellite|nova|multi`,
    `?scope=local|network|community|external`
  - `GET /api/fhs/models` (modelos disponibles de todos los Stars registrados)
  - `POST /api/fhs/metrics/sample` (fire-and-forget de métricas de latencia/éxito)
  - Respuestas `400`, `401`, `404`, `503` en todos los endpoints existentes
  Y las correcciones de inconsistencias detectadas:
  - `NodeManifest.did` renombrado a `providerId` (coherencia con el resto de schemas)
  - `NodeSummary.visibility` añade el valor `"community"` (faltaba en el enum)
  - Schema `Scope` formalizado como componente reutilizable: `enum: [local, network, community, external]`
  - Schema `Provenance` añadido en `components/schemas`: campos `llm`, `tools`, `dataExported`,
    `jurisdiction` — referenciado por `assistant.completed` en AsyncAPI (TASK-IDL-007)
  Todos los `provider.type` en el spec usan vocabulario canónico (star/satellite/nova/multi).
- Validation: Comparar contra `docs/atlas.md` y el `AtlasClient` descrito en `docs/arquitectura.md`.
  Verificar que el vocabulario es coherente con `schemas/beacon-base.schema.json` de TASK-IDL-002.
  `grep -r '"did":' idl/openapi.yaml` no debe devolver resultados en `NodeManifest`.

---

### TASK-IDL-005 — Alineación de vocabulario en docs/ y IDL existente

- ID: TASK-IDL-005
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-002
- Expected files:
  - `docs/manifiesto-llm.md` (modificado)
  - `docs/manifiesto-mcp.md` (modificado)
  - `docs/protocolo-provider.md` (modificado — tabla de campos)
  - `idl/asyncapi.yaml` (modificado — si aún usa `"llm"`/`"mcp"`)
  - `idl/fhs-protocol.proto` (modificado — si aplica)
- Close criteria: Ningún archivo del repo usa `"type": "llm"` o `"type": "mcp"` como valor del
  campo `provider.type` del manifiesto. Los docs de ejemplo actualizan sus bloques JSON al
  vocabulario canónico. Los títulos de `docs/manifiesto-llm.md` y `docs/manifiesto-mcp.md`
  reflejan la jerga real ("Manifiesto Star", "Manifiesto Satellite").
  Los ejemplos de DID en ambos manifiestos usan formato real `did:key:z...` en lugar de
  los placeholders `did:key:macmini-raul` / `did:key:raspi-ocr-01` que hoy existen.
- Validation: `grep -r '"type": "llm"' idl/ docs/ schemas/` y
  `grep -r '"type": "mcp"' idl/ docs/ schemas/` no deben devolver resultados tras esta tarea.
  `grep -r 'did:key:macmini' docs/` y `grep -r 'did:key:raspi' docs/` tampoco.

> Esta tarea puede ejecutarse en paralelo con TASK-IDL-003 y TASK-IDL-004 una vez terminada
> TASK-IDL-002.

---

### TASK-IDL-006 — idl/README.md — índice de navegación

- ID: TASK-IDL-006
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-001, TASK-IDL-002, TASK-IDL-003, TASK-IDL-004, TASK-IDL-005,
  TASK-IDL-007, TASK-IDL-008
- Expected files:
  - `idl/README.md` (nuevo)
- Close criteria: El archivo explica en menos de 2 pantallas: (1) qué es el IDL de FHS y por qué
  hay 4 formatos distintos, (2) tabla de qué es autoritativo para qué, (3) cómo usar cada IDL
  para generar código en distintos lenguajes, (4) enlace a `schemas/` y a `idl/flows.md`.
  Sirve como punto de entrada para un desarrollador externo que quiera implementar un provider FHS
  sin leer todo el repo.
- Validation: Leer el archivo sin contexto previo y verificar que un desarrollador nuevo puede
  entender qué archivo descargar primero según su objetivo (implementar un provider, verificar
  un manifiesto, generar código Protobuf, etc.).

---

### TASK-IDL-007 — Canal Portal↔Navigator en asyncapi.yaml y fhs-protocol.proto

- ID: TASK-IDL-007
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-001
- Expected files:
  - `idl/asyncapi.yaml` (modificado — nuevo canal `/chat` para Portal↔Navigator)
  - `idl/fhs-protocol.proto` (modificado — nuevos tipos de mensaje)
- Close criteria: `asyncapi.yaml` define el canal `/chat` (WebSocket Navigator) con los 6 mensajes
  de la capa Portal↔Navigator, usando vocabulario canónico (no el viejo `llm.selected`):

  | Mensaje              | Dirección             | Descripción |
  |----------------------|-----------------------|-------------|
  | `start`              | Portal → Navigator    | Inicia conversación con `sessionId`, `model`, `scope` |
  | `agent.status`       | Navigator → Portal    | Estado del agente (`thinking`, `calling`, `streaming`) |
  | `star.selected`      | Navigator → Portal    | Star elegido para la misión (`providerId`, `model`) |
  | `tool.selected`      | Navigator → Portal    | Satellite y tool invocados (`providerId`, `capability`) |
  | `assistant.delta`    | Navigator → Portal    | Fragmento de texto en streaming (`delta`, `missionId`) |
  | `assistant.completed`| Navigator → Portal    | Respuesta final con `content`, `provenance`, `missionId` |

  Los tipos Protobuf correspondientes se añaden al `oneof` de `FhsMessage` (fields 22-27).
  El schema `Provenance` (definido en TASK-IDL-004 para `openapi.yaml`) es reutilizado aquí
  como `$ref` en `assistant.completed`.
- Validation: Verificar contra `docs/protocolo.md` (sección mensajes Portal↔Navigator) que
  todos los campos documentados en prosa tienen su equivalente formal. Confirmar que ningún
  mensaje usa vocabulario viejo (`llm.selected`, `llm`).

---

### TASK-IDL-008 — CallerAuth en tool.list y tool.call

- ID: TASK-IDL-008
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-001
- Validation: ✅ Resuelto por DEC-0087 (Envelope P2P). `CallerAuth` eliminado del IDL.
  La autenticación en todos los mensajes (incluyendo `tool.list` y `tool.call`) viene
  de `Envelope.source_peer_id` (callerId) + `Envelope.signature`. No hay campo `auth`
  separado; el Envelope lo cubre para todos los mensajes por diseño.

### TASK-IDL-012 — Actualizar idl/flows.md para reflejar Handshake 2-step (DEC-0087)

- ID: TASK-IDL-012
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-003
- Expected files:
  - `idl/flows.md` (modificado — diagrama 1 actualizado, posiblemente diagrama nuevo de Envelope)
- Close criteria: El diagrama de registro en `idl/flows.md` muestra el flujo 2-step:
  `handshake` → `handshake_ack` → `ping/pong`. Los mensajes del diagrama incluyen el
  Envelope frame (messageId, sourcePeerId) como notación. El diagrama antiguo de 4 pasos
  (hello/welcome/register/registered) es reemplazado o eliminado.
- Validation: Coherente con DEC-0087, `idl/fhs-protocol.proto` y `idl/asyncapi.yaml`.

---

### TASK-IDL-009 — Endpoint multiaddr en Beacon schemas (P2P)

- ID: TASK-IDL-009
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-002
- Expected files:
  - `schemas/beacon-base.schema.json` (modificado — campo `endpoint.multiaddr`)
  - `idl/asyncapi.yaml` (modificado — campo `endpoint.multiaddr` en schema RegisterMessage)
- Close criteria: Los schemas de Beacon incluyen el campo opcional `endpoint.multiaddr` (string,
  formato multiaddr: `/ip4/…/tcp/…/ws/p2p/did:key:z…`) junto al `endpoint.url` existente.
  La presencia de `multiaddr` permite a otros nodos conectarse directamente como peer P2P
  sin depender de DNS o IP estática. Al menos uno de los dos campos (`url` o `multiaddr`)
  debe estar presente (validado por `oneOf` o `anyOf` en el schema).
- Validation: Comparar con `idl/framing.md` sección de multiaddr y DEC-0086.

---

### TASK-IDL-010 — Actualizar idl/flows.md con el flujo de gossip Atlas↔Atlas

- ID: TASK-IDL-010
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-003, TASK-IDL-009
- Expected files:
  - `idl/flows.md` (modificado — 5to diagrama de secuencia)
- Close criteria: `idl/flows.md` incluye un 5to `sequenceDiagram` que muestra el flujo de
  gossip P2P entre dos instancias Atlas:
  `Atlas-A → Atlas-B: WebSocket /gossip (Sec-WebSocket-Protocol: fhs.v1)`
  `Atlas-A → Atlas-B: atlas.announce { atlasId, providerIds[] }`
  `Atlas-B → Atlas-A: atlas.sync { providers[] }`
  El diagrama incluye la nota del framing LPP en modo binario.
- Validation: Coherente con `idl/framing.md`, DEC-0086 y los schemas de AtlasAnnounce/AtlasSync.

---

### TASK-IDL-011 — Actualizar openapi.yaml con endpoint de discovery P2P

- ID: TASK-IDL-011
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-004
- Expected files:
  - `idl/openapi.yaml` (modificado)
- Close criteria: `openapi.yaml` incluye:
  - `GET /api/fhs/atlas/peers` — lista de Atlas peers conocidos por este Atlas (para bootstrap)
    Respuesta: `[{ atlasId, endpoint, multiaddr?, lastSync }]`
  - `POST /api/fhs/atlas/peers` — registrar un Atlas peer manualmente (config del operador)
  El campo `multiaddr` aparece en `NodeSummary` y `NodeDetail` como opcional (P2P endpoint).
- Validation: Coherente con DEC-0086 y el canal `/atlas/gossip` de asyncapi.yaml.

### TASK-IDL-013 — Contexto documental estructurado y retiro de confirmación OCR

- ID: TASK-IDL-013
- State: `done`
- Owner: rafex
- Dependencies: TASK-IDL-007
- Expected files:
  - `idl/fhs-protocol.proto`
  - `galaxIA-SDK/packages/fhs-protocol/src/generated/fhs-protocol_pb.ts`
  - consumidores Portal/Navigator del contrato Protobuf
- Close criteria: `ChatRequestMessage.document_context` usa el mensaje
  `DocumentContext` con `filename` y `text`; no existe `AttachmentDecisionMessage`,
  `attachment_decision`, `sendDecision` ni `AgentStartMessage.ocr_mode`.
  El OCR se ejecuta automáticamente y el contexto puede reutilizarse en un
  turno posterior del mismo chat.
- Validation: round-trip Protobuf del SDK, typecheck completo de Core y
  búsqueda cross-repo sin referencias ejecutables a los símbolos retirados.

---

## Dependencias visuales

```
TASK-IDL-001 (mensajes registro) ✅
    │
    ├──► TASK-IDL-002 (schemas Beacon) ← availability, region
    │         │
    │         ├──► TASK-IDL-004 (openapi.yaml) ← scope, provenance, NodeManifest.did→providerId
    │         │         │
    │         │         └──► TASK-IDL-011 (openapi P2P endpoints)
    │         │
    │         ├──► TASK-IDL-005 (vocabulario) ← DID reales, star/satellite en docs
    │         │
    │         └──► TASK-IDL-009 (multiaddr en Beacon)
    │                   │
    │                   └──► TASK-IDL-010 (flow gossip en flows.md)
    │
    ├──► TASK-IDL-003 (flows.md Mermaid)
    │         │
    │         └──► TASK-IDL-010 (flow gossip)
    │
    ├──► TASK-IDL-007 (canal Portal↔Navigator) ← star.selected, provenance
    │
    └──► TASK-IDL-008 (auth en tool.list/tool.call)
    
    Todos ──► TASK-IDL-006 (README.md) [cierra la iniciativa]
```

TASK-IDL-001 ✅ desbloquea todo. TASK-IDL-006 cierra la iniciativa.
TASK-IDL-003, TASK-IDL-007 y TASK-IDL-008 pueden ejecutarse en paralelo
una vez terminada TASK-IDL-001 (no dependen de Beacon schemas).
TASK-IDL-004 y TASK-IDL-005 pueden ejecutarse en paralelo una vez
terminada TASK-IDL-002.
TASK-IDL-009, TASK-IDL-010, TASK-IDL-011 son la serie P2P (DEC-0086).
