# TASKS.md

## Metadata

- Iniciativa: rag-provider
- Spec relacionada: `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `done (local)` — implementado y verificado con procesos reales en local (2026-07-06). Pendiente verificación contra hardware real, mismo bloqueo que issue #1/TASK-P2P-0006.

## Tareas

### TASK-RAG-0001 - Resolver ciclo de vida del estado por conversación

- ID: TASK-RAG-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/DECISIONS.md` (DEC-0025)
- Close criteria: decisión documentada sobre dónde vive el estado "documento indexado para conversationId X".
- Validation: resuelto en DEC-0025 (2026-07-05) — el flag vive en `apps/navigator/src/api/chat-ws.ts` (`ragActiveConversations`, mismo patrón que `pendingAttachments`), marcado en el momento de la confirmación de adjunto. Implementado en TASK-RAG-0006.

### TASK-RAG-0002 - Motor de recuperación del nodo de referencia

- ID: TASK-RAG-0002
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `examples/rag-provider/src/rag-bridge.ts`
- Close criteria: ~~decisión documentada sobre qué motor de embeddings usa el nodo de referencia~~ — **corregido de alcance (2026-07-06):** galaxIA define el protocolo y la interfaz (contrato de tools, manifiesto, trazabilidad), nunca el motor interno de un provider — no es una decisión de este proyecto, ni siquiera para el nodo de referencia. `rag-bridge.ts` implementa el mecanismo mínimo posible (similitud de Jaccard por solapamiento de palabras, sin embeddings semánticos) exclusivamente para demostrar que el contrato FHS funciona de punta a punta — documentado explícitamente en el código como no-recomendación (DEC-0026). Cualquier operador real sustituye esto por su propio motor sin tocar el protocolo.
- Validation: `rag-bridge.ts` probado de forma aislada (indexado + consulta) y a través del contrato FHS completo (ver TASK-RAG-0004/0005).

### TASK-RAG-0003 - Crear `examples/rag-provider/` (esqueleto FHS)

- ID: TASK-RAG-0003
- State: `done`
- Owner: rafex
- Dependencies: TASK-RAG-0001
- Expected files: `examples/rag-provider/src/index.ts`, `examples/rag-provider/src/rag-bridge.ts`, `examples/rag-provider/package.json`, `containers/rag-provider/Containerfile`
- Close criteria: el provider se registra en Atlas y aparece en `/api/fhs/providers` con capabilities `document.index` y `document.query`.
- Validation: verificado real en local — `GET /api/fhs/providers?type=mcp` muestra el provider con ambas capabilities tras un `hello`/`register` real firmado (DEC-0030).

Mismo patrón que `examples/satellite-ocr-example/` (ciclo de vida hello/register/ping, dispatcher concurrente — ver `docs/protocolo-provider.md`).

### TASK-RAG-0004 - Implementar `document_index`

- ID: TASK-RAG-0004
- State: `done`
- Owner: rafex
- Dependencies: TASK-RAG-0002, TASK-RAG-0003
- Expected files: `examples/rag-provider/src/rag-bridge.ts`
- Close criteria: dado un texto largo, la tool devuelve `chunksIndexed > 0` y los chunks quedan accesibles para `document_query`.
- Validation: tool call real vía `AgentRuntime.indexDocumentForRag()` contra un `rag-provider` real corriendo — confirmado en logs (`tool.call ... document_index`) y en la traza de Atlas (`capability: document.index`).

### TASK-RAG-0005 - Implementar `document_query`

- ID: TASK-RAG-0005
- State: `done`
- Owner: rafex
- Dependencies: TASK-RAG-0004
- Expected files: `examples/rag-provider/src/rag-bridge.ts`
- Close criteria: dada una pregunta relacionada con el texto indexado, devuelve los chunks más relevantes.
- Validation: prueba real con un documento de 3 secciones (manzanas/elefantes/volcanes) y una pregunta sobre elefantes — los chunks devueltos contienen el término correcto; calidad limitada por el motor mínimo elegido a propósito (ver TASK-RAG-0002), no una limitación del contrato.
- **Bug real encontrado y corregido durante esta verificación:** `McpHost.matchCapabilityId()` (`apps/navigator/src/providers/mcp-host.ts`) elegía la primera capability con **alguna** palabra en común con el nombre de la tool, no la de mayor coincidencia — con dos capabilities que comparten el prefijo `document.*` (`document.index`/`document.retrieve` originalmente), la tool `document_query` se enrutaba mal hacia `document.index`. Corregido a un matching por score (más palabras compartidas gana) y renombrada la capability a `document.query` (coincide exactamente con el nombre de la tool) para eliminar la ambigüedad de raíz.

### TASK-RAG-0006 - Integrar indexado/recuperación determinísticos en `chat-ws.ts`/`runtime.ts`

- ID: TASK-RAG-0006
- State: `done`
- Owner: rafex
- Dependencies: TASK-RAG-0001, TASK-RAG-0005
- Expected files: `apps/navigator/src/api/chat-ws.ts`, `apps/navigator/src/agent/runtime.ts`
- Close criteria: en el mismo punto donde `chat-ws.ts` resuelve `attachment.decision { use: true }`, se llama a `document_index` (vía `indexForRag()`) y se marca `conversationId` en `ragActiveConversations` (mismo patrón que `pendingAttachments`); en mensajes siguientes de una conversación marcada, `runtime.run(..., ragActive: true)` llama a `document_query` antes de la llamada al LLM y antepone los chunks sin exponerlos en la UI (`queryRagContext`, silencioso, sin eventos `tool.*`). El indexado nunca ocurre antes de la confirmación del usuario.
- Validation: verificado real con `apps/atlas` + `apps/navigator` + `examples/star-example` + `examples/rag-provider` como procesos reales — indexado tras confirmación, `document_query` disparado en el turno siguiente, chunks recuperados anteponen correctamente al mensaje del usuario, `provenance.tools` refleja el uso de `document.query`, y la traza de Atlas muestra ambas llamadas (`document.index`, `document.query`) con latencia real.

### TASK-RAG-0007 - Declarar privacidad y actualizar documentación

- ID: TASK-RAG-0007
- State: `done`
- Owner: rafex
- Dependencies: TASK-RAG-0006
- Expected files: `docs/proveedores.md`, `docs/protocolo-provider.md`, `spec-native/TRACEABILITY.md`
- Close criteria: `rag-provider` documentado igual que `satellite-ocr-example`/`star-example` en `docs/proveedores.md`; `privacy.retention` (formato generalizado, DEC-0025, ahora tipado en `packages/fhs-protocol/src/types.ts` como `RetentionPolicy`) y `privacy.warning` declarados en el manifiesto.
- Validation: manifiesto de `examples/rag-provider` declara `privacy: { retention: { ttl: "PT4H" }, warning: "..." }`. **Pendiente no bloqueante:** el `Portal` todavía no muestra `privacy.warning` en la burbuja de confirmación de adjunto — hoy es genérica y no conoce el manifiesto del provider que eventualmente indexará el documento (chicken-and-egg: la confirmación ocurre antes de resolver qué rag-provider se usará). Anotado como mejora futura, no bloqueante para el resto del flujo.
