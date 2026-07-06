# TASKS.md

## Metadata

- Iniciativa: rag-provider
- Spec relacionada: `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `todo` — diseño cerrado (DEC-0025), lista para iniciar implementación cuando se priorice

## Tareas

### TASK-RAG-0001 - Resolver ciclo de vida del estado por conversación

- ID: TASK-RAG-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/DECISIONS.md` (DEC-0025)
- Close criteria: decisión documentada sobre dónde vive el estado "documento indexado para conversationId X".
- Validation: resuelto en DEC-0025 (2026-07-05) — el flag vive en `apps/agent-server/src/api/chat-ws.ts`, mismo patrón que `pendingAttachments`, marcado en el momento de la confirmación de adjunto. La implementación real queda en TASK-RAG-0006.

### TASK-RAG-0002 - Levantar el motor de embeddings elegido para el nodo de referencia

- ID: TASK-RAG-0002
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: script de arranque en el bastion (`/opt/llama.cpp/current/scripts/` si se elige `llama-server --embedding`), `containers/compose.yaml`
- Close criteria: una llamada de prueba (`curl` u otra) contra el motor elegido devuelve un vector para un texto de prueba.
- Validation: prueba manual antes de escribir código del provider — mismo principio que "Lecciones de integración" en `docs/protocolo-provider.md`. Nota (DEC-0026): esta tarea documenta la elección concreta del nodo de referencia de esta PoC — no es un requisito de protocolo; otro operador podría elegir un motor distinto.

### TASK-RAG-0003 - Crear `examples/rag-provider/` (esqueleto FHS)

- ID: TASK-RAG-0003
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0001
- Expected files: `examples/rag-provider/src/index.ts`, `examples/rag-provider/src/rag-bridge.ts`, `examples/rag-provider/package.json`, `containers/rag-provider/Containerfile`
- Close criteria: el provider se registra en el Registry y aparece en `/api/fhs/providers` con capabilities `document.index` y `document.retrieve`.
- Validation: `curl http://<bastion>:30083/api/fhs/providers` muestra el nuevo provider.

Seguir el mismo patrón que `examples/ocr-provider/` (ciclo de vida hello/register/ping, dispatcher concurrente — ver `docs/protocolo-provider.md`).

### TASK-RAG-0004 - Implementar `document_index`

- ID: TASK-RAG-0004
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0002, TASK-RAG-0003
- Expected files: `examples/rag-provider/src/rag-bridge.ts`
- Close criteria: dado un texto largo, la tool devuelve `chunksIndexed > 0` y los chunks quedan accesibles para `document_query`.
- Validation: tool call real vía script de prueba (WebSocket directo al provider), no solo build/typecheck.

### TASK-RAG-0005 - Implementar `document_query`

- ID: TASK-RAG-0005
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0004
- Expected files: `examples/rag-provider/src/rag-bridge.ts`
- Close criteria: dada una pregunta relacionada con el texto indexado, devuelve los chunks más relevantes (verificar manualmente que el top-1 es semánticamente pertinente, no solo que la tool no falla).
- Validation: prueba con un documento real de prueba y una pregunta cuya respuesta esté en un fragmento específico, no en todo el documento.

### TASK-RAG-0006 - Integrar indexado/recuperación determinísticos en `chat-ws.ts`/`runtime.ts`

- ID: TASK-RAG-0006
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0001, TASK-RAG-0005
- Expected files: `apps/agent-server/src/api/chat-ws.ts`, `apps/agent-server/src/agent/runtime.ts`
- Close criteria: en el mismo punto donde `chat-ws.ts` resuelve `attachment.decision { use: true }`, se llama a `document_index` y se marca `conversationId` en el flag "RAG activo" (mismo patrón que `pendingAttachments`); en mensajes siguientes de una conversación marcada, `runtime.ts` llama a `document_query` antes de la llamada al LLM y antepone los chunks sin exponerlos en la UI. El indexado nunca ocurre antes de la confirmación del usuario.
- Validation: prueba end-to-end real contra el bastion — subir documento, confirmar, hacer una pregunta específica sobre una parte del documento, confirmar que la respuesta es correcta, que `provenance` refleja el uso de RAG, y que una segunda conversación sin documento no dispara ninguna llamada a `document_query`.

### TASK-RAG-0007 - Declarar privacidad y actualizar documentación

- ID: TASK-RAG-0007
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0006
- Expected files: `docs/proveedores.md`, `docs/protocolo.md`, `docs/protocolo-provider.md`, `spec-native/TRACEABILITY.md`
- Close criteria: `rag-provider` documentado igual que `ocr-provider`/`llm-provider` en `docs/proveedores.md`; `privacy.retention` (formato generalizado, DEC-0025) y `privacy.warning` visibles y explicados; `docs/protocolo-provider.md` actualizado con ambos campos como parte del contrato de manifiesto.
- Validation: revisión de que el checklist de privacidad de `docs/protocolo.md` se cumple para este provider, y que el `Portal` muestra `privacy.warning` antes de aceptar el primer adjunto contra un nodo con retención distinta de `"none"`.
