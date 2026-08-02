# TASKS.md — Completar IDL del protocolo FHS

## Metadata

- Iniciativa: `idl-protocol-complete`
- Spec relacionada: `spec-native/specs/fhs-mvp/SPEC.md`, `docs/protocolo.md`, `docs/protocolo-provider.md`
- Owner: rafex
- Estado general: `in_progress`

## Contexto

galaxIA es ahora un repositorio IDL-only. El análisis de brecha identificó que los 3 IDL formales
(`asyncapi.yaml`, `fhs-protocol.proto`, `openapi.yaml`) cubren solo los 12 mensajes de misión,
pero omiten el flujo de registro/conexión completo, los schemas de manifiesto (Beacon) por tipo
de nodo, y los endpoints REST más usados. Además hay inconsistencias de vocabulario
(`"llm"`/`"mcp"` vs `"star"`/`"satellite"`) que deben resolverse antes de añadir más IDL.

Orden de ejecución respeta dependencias: el índice (`idl/README.md`) se escribe al final cuando
todos los artefactos ya existen. Los schemas de Beacon dependen de la alineación de vocabulario.

---

## Tareas

### TASK-IDL-001 — Mensajes de registro en asyncapi.yaml y fhs-protocol.proto

- ID: TASK-IDL-001
- State: `todo`
- Owner: rafex
- Dependencies: —
- Expected files:
  - `idl/asyncapi.yaml` (modificado)
  - `idl/fhs-protocol.proto` (modificado)
- Close criteria: Los mensajes `hello`, `welcome`, `register`, `registered`, `ping`, `pong` y
  `error` aparecen definidos en ambos IDL formales con todos sus campos, canal y dirección
  correctos. El canal `/register` de AsyncAPI tiene el flujo completo de conexión (no solo
  `DispatchAckMessage`). El `.proto` incluye los nuevos tipos en el `oneof` de `FhsMessage`.
- Validation: Revisar manualmente que cada campo de `docs/protocolo.md` (sección mensajes) y
  `docs/protocolo-provider.md` (ciclo de vida obligatorio) tiene su equivalente formal en ambos
  IDL. Ningún mensaje mencionado en la documentación en prosa debe estar ausente del IDL.

Mensajes a agregar (fuente: `docs/protocolo.md` y `docs/protocolo-provider.md`):

| Mensaje       | Dirección              | Descripción |
|---------------|------------------------|-------------|
| `hello`       | Provider → Atlas       | Identificación inicial con DID firmado |
| `welcome`     | Atlas → Provider       | Confirmación de identidad, nonce de challenge |
| `register`    | Provider → Atlas       | Envío del manifiesto (Beacon) |
| `registered`  | Atlas → Provider       | Confirmación de registro con `visibility` asignada |
| `ping`        | Provider → Atlas       | Heartbeat — Pulse (cada 10s) |
| `pong`        | Atlas → Provider       | Respuesta a ping |
| `error`       | Atlas → Provider       | Error estandarizado con código (`NOT_IDENTIFIED`, `INVALID_MANIFEST`, etc.) |

> Nota: `dispatch.ack` ya existe en `asyncapi.yaml` y `fhs-protocol.proto`; verificar que
> es coherente con el resto de los mensajes nuevos.

---

### TASK-IDL-002 — JSON Schemas de manifiesto Beacon por tipo de nodo

- ID: TASK-IDL-002
- State: `todo`
- Owner: rafex
- Dependencies: TASK-IDL-001
- Expected files:
  - `schemas/beacon-base.schema.json` — campos obligatorios compartidos
  - `schemas/beacon-star.schema.json` — manifiesto LLM (Star)
  - `schemas/beacon-satellite.schema.json` — manifiesto tool/MCP (Satellite)
  - `schemas/beacon-nova.schema.json` — manifiesto agente con loop (Nova)
- Close criteria: Los 4 schemas son JSON Schema draft-07 válidos. `beacon-star`, `beacon-satellite`
  y `beacon-nova` extienden `beacon-base` mediante `$ref` o `allOf`. El campo `provider.type`
  usa el vocabulario canónico (`"star"` | `"satellite"` | `"nova"` | `"multi"`) — no `"llm"` ni
  `"mcp"`. Los ejemplos de `docs/manifiesto-llm.md` y `docs/manifiesto-mcp.md` son válidos contra
  el schema correspondiente (mentalmente, no requiere validador automático).
- Validation: Comparar campo por campo con `docs/manifiesto-llm.md`, `docs/protocolo-provider.md`
  (sección "Manifiesto — campos obligatorios sin excepción") y `docs/vocabulario.md`.

Campos de `beacon-base` (mínimo obligatorio según `protocolo-provider.md`):

| Campo                | Tipo     | Obligatorio |
|----------------------|----------|-------------|
| `fhsVersion`         | string   | Sí          |
| `provider.id`        | string (DID) | Sí      |
| `provider.type`      | enum     | Sí          |
| `provider.visibility`| enum     | Sí          |
| `endpoint`           | object   | Sí          |
| `privacy.retention`  | string   | Sí          |
| `privacy.trainingUse`| boolean  | Sí (LLM)    |

---

### TASK-IDL-003 — Diagramas de secuencia Mermaid en idl/flows.md

- ID: TASK-IDL-003
- State: `todo`
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

### TASK-IDL-004 — Endpoints REST faltantes en openapi.yaml

- ID: TASK-IDL-004
- State: `todo`
- Owner: rafex
- Dependencies: TASK-IDL-002
- Expected files:
  - `idl/openapi.yaml` (modificado)
- Close criteria: `openapi.yaml` incluye los endpoints REST usados en producción que hoy faltan:
  - `GET /api/fhs/providers` con query params `?type=star|satellite|nova|multi`, `?scope=local|network|community|external`
  - `GET /api/fhs/models` (modelos disponibles de todos los Stars)
  - `POST /api/fhs/metrics/sample` (fire-and-forget de métricas de latencia/éxito)
  - Respuestas `400`, `401`, `404`, `503` en todos los endpoints existentes
  Todos los `provider.type` en el spec usan vocabulario canónico (star/satellite/nova/multi).
- Validation: Comparar contra `docs/atlas.md` y el `AtlasClient` descrito en `docs/arquitectura.md`.
  Verificar que el vocabulario es coherente con `schemas/beacon-base.schema.json` de TASK-IDL-002.

---

### TASK-IDL-005 — Alineación de vocabulario en docs/ y IDL existente

- ID: TASK-IDL-005
- State: `todo`
- Owner: rafex
- Dependencies: TASK-IDL-002
- Expected files:
  - `docs/manifiesto-llm.md` (modificado)
  - `docs/manifiesto-mcp.md` (modificado — si existe)
  - `docs/protocolo-provider.md` (modificado — tabla de campos)
  - `idl/asyncapi.yaml` (modificado — si aún usa `"llm"`/`"mcp"`)
  - `idl/fhs-protocol.proto` (modificado — si aplica)
- Close criteria: Ningún archivo del repo usa `"type": "llm"` o `"type": "mcp"` como valor del
  campo `provider.type` del manifiesto. Todos usan `"star"`, `"satellite"`, `"nova"` o `"multi"`.
  Los docs de ejemplo actualizan sus bloques JSON. `docs/manifiesto-llm.md` ya no tiene `"providerId"`
  suelto — usa el campo correcto según el schema definido en TASK-IDL-002.
- Validation: `grep -r '"type": "llm"' idl/ docs/ schemas/` y
  `grep -r '"type": "mcp"' idl/ docs/ schemas/` no deben devolver resultados tras esta tarea.

> Esta tarea puede ejecutarse en paralelo con TASK-IDL-003 y TASK-IDL-004 una vez terminada
> TASK-IDL-002.

---

### TASK-IDL-006 — idl/README.md — índice de navegación

- ID: TASK-IDL-006
- State: `todo`
- Owner: rafex
- Dependencies: TASK-IDL-001, TASK-IDL-002, TASK-IDL-003, TASK-IDL-004, TASK-IDL-005
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

## Dependencias visuales

```
TASK-IDL-001 (mensajes registro)
    │
    ├──► TASK-IDL-002 (schemas Beacon)
    │         │
    │         ├──► TASK-IDL-004 (openapi.yaml completo)
    │         │         │
    │         └──► TASK-IDL-005 (vocabulario)   ◄──┐
    │                   │                           │
    ├──► TASK-IDL-003 (flows.md Mermaid)            │
    │                                               │
    └──────────────────────────────────────────── TASK-IDL-006 (README.md)
                                                     ▲
                      TASK-IDL-003 ─────────────────┘
                      TASK-IDL-004 ─────────────────┘
                      TASK-IDL-005 ─────────────────┘
```

TASK-IDL-001 desbloquea todo. TASK-IDL-006 cierra la iniciativa.
TASK-IDL-003, TASK-IDL-004 y TASK-IDL-005 pueden ejecutarse en paralelo
una vez terminadas TASK-IDL-001 y TASK-IDL-002.
