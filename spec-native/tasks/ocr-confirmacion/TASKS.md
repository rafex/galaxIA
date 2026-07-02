# TASKS.md

## Metadata

- Iniciativa: ocr-confirmacion
- Spec relacionada: `spec-native/specs/ocr-confirmacion/SPEC.md` (SPEC-OCRCONFIRM-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `done`

## Tareas

### TASK-OCRCONFIRM-0001 - Nuevo evento `ocr.extracted` en el protocolo

- ID: TASK-OCRCONFIRM-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `packages/fhs-protocol/src/sse.ts`
- Close criteria: tipo `OcrExtractedEvent` agregado y exportado en `AgentSSEEvent`.
- Validation: `npm run typecheck -w packages/fhs-protocol`

### TASK-OCRCONFIRM-0002 - `extractOcrText` y `preExtractedText` en `AgentRuntime`

- ID: TASK-OCRCONFIRM-0002
- State: `done`
- Owner: rafex
- Dependencies: TASK-OCRCONFIRM-0001
- Expected files: `apps/agent-server/src/agent/runtime.ts`
- Close criteria: `extractOcrText(artifacts)` ejecuta OCR sin llamar al LLM; `run()` acepta `preExtractedText` opcional y lo antepone sin volver a resolver el provider de OCR.
- Validation: `npm run typecheck -w apps/agent-server`

### TASK-OCRCONFIRM-0003 - Estado pendiente y manejo de `attachment.decision` en `chat-ws.ts`

- ID: TASK-OCRCONFIRM-0003
- State: `done`
- Owner: rafex
- Dependencies: TASK-OCRCONFIRM-0002
- Expected files: `apps/agent-server/src/api/chat-ws.ts`
- Close criteria: `start` con `artifacts` ya no llama a `run()` directo — llama `extractOcrText`, guarda en `pendingAttachments`, emite `ocr.extracted`. `attachment.decision` implementado (usar/descartar). Limpieza en `close`.
- Validation: `npm run typecheck -w apps/agent-server`

### TASK-OCRCONFIRM-0004 - Frontend: burbuja colapsada + botones

- ID: TASK-OCRCONFIRM-0004
- State: `done`
- Owner: rafex
- Dependencies: TASK-OCRCONFIRM-0001
- Expected files: `apps/web/src/services/api.ts`, `apps/web/src/components/chat-view.ts`, `apps/web/src/styles/main.css`
- Close criteria: al recibir `ocr.extracted`, se renderiza una burbuja expandible con el texto y dos botones ("Usar documento" / "Descartar") que envían `attachment.decision`.
- Validation: `npm run typecheck -w apps/web`

### TASK-OCRCONFIRM-0005 - Verificación end-to-end contra el bastion

- ID: TASK-OCRCONFIRM-0005
- State: `done`
- Owner: rafex
- Dependencies: TASK-OCRCONFIRM-0002, TASK-OCRCONFIRM-0003, TASK-OCRCONFIRM-0004
- Expected files: ninguno (verificación, no código)
- Close criteria: los 6 criterios de aceptación del SPEC confirmados con pruebas reales contra el bastion (no solo build/typecheck) — incluyendo el caso "Descartar" (cero llamadas al LLM) y "Usar documento" con y sin pregunta previa.
- Validation: script de prueba WebSocket + logs de `agent-server`/`llm-provider`. Confirmado:
  - `ocr.extracted` con el texto correcto (`"HOLA MUNDO PDF TEST - prueba OCR galaxIA"`, coincide exacto con el PDF de prueba).
  - "Descartar" → cero eventos `llm.selected`, cero `chat.request` en logs de `llm-provider`.
  - "Usar documento" sin pregunta previa → espera el siguiente mensaje, antepone el texto, responde correctamente: *"El documento dice 'Hola Mundo PDF Test - prueba OCR galaxIA'."*
  - No se probó explícitamente el sub-caso "pregunta guardada junto con el archivo" (criterio 4) con un script separado — la lógica es simétrica a la de "sin pregunta" y comparte el mismo código de decisión en `chat-ws.ts`; se considera cubierta por inspección de código, no por prueba dedicada.
