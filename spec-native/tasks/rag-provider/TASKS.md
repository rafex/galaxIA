# TASKS.md

## Metadata

- Iniciativa: rag-provider
- Spec relacionada: `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `todo`

## Tareas

### TASK-RAG-0001 - Resolver ciclo de vida del estado por conversación

- ID: TASK-RAG-0001
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: `apps/agent-server/src/api/chat-ws.ts`, `apps/agent-server/src/agent/runtime.ts`
- Close criteria: decisión documentada (como decisión en `spec-native/DECISIONS.md`) sobre dónde vive el estado "documento indexado para conversationId X" — en el `rag-provider` (recomendado en el SPEC) o en un store nuevo del agent-server.
- Validation: revisión de diseño, sin código todavía.

Bloqueante para las demás tareas — el SPEC señala esto como el riesgo de diseño principal antes de implementar.

### TASK-RAG-0002 - Levantar `llama-server --embedding` para el modelo de embeddings

- ID: TASK-RAG-0002
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: script de arranque en el bastion (`/opt/llama.cpp/current/scripts/`), `containers/compose.yaml`
- Close criteria: `curl` contra el endpoint de embeddings devuelve un vector para un texto de prueba.
- Validation: prueba manual con `curl` antes de escribir código del provider — mismo principio que "Lecciones de integración" en `docs/protocolo-provider.md`.

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

### TASK-RAG-0006 - Integrar indexado/recuperación determinísticos en `AgentRuntime`

- ID: TASK-RAG-0006
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0001, TASK-RAG-0005
- Expected files: `apps/agent-server/src/agent/runtime.ts`
- Close criteria: al adjuntar un documento se indexa sin que el LLM lo decida (mismo patrón que `runOcrDeterministically`, DEC-0020); en mensajes siguientes de la misma conversación con documento indexado, se recupera contexto antes de llamar al LLM.
- Validation: prueba end-to-end real contra el bastion — subir documento, hacer una pregunta específica sobre una parte del documento, confirmar que la respuesta es correcta y que `provenance` refleja el uso de RAG.

### TASK-RAG-0007 - Declarar privacidad y actualizar documentación

- ID: TASK-RAG-0007
- State: `todo`
- Owner:
- Dependencies: TASK-RAG-0006
- Expected files: `docs/proveedores.md`, `docs/protocolo.md` (si aplica), `spec-native/TRACEABILITY.md`
- Close criteria: `rag-provider` documentado igual que `ocr-provider`/`llm-provider` en `docs/proveedores.md`; `privacy.retention: "session"` visible y explicado.
- Validation: revisión de que el checklist de privacidad de `docs/protocolo.md` se cumple para este provider.
