# TASKS.md

## Metadata

- Iniciativa: satelite-rating
- Spec relacionada: `spec-native/specs/satelite-rating/SPEC.md` (SPEC-SATRATING-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `done` — implementado y verificado end-to-end localmente (ver TASK-SATRATING-0008 para el detalle; pendiente repetir contra los 3 equipos reales de la demo cuando estén disponibles)

## Tareas

### TASK-SATRATING-0001 - Mensaje `dispatch.ack` en el protocolo

- ID: TASK-SATRATING-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `packages/fhs-protocol/src/messages.ts`, `docs/protocolo.md`, `docs/protocolo-provider.md`
- Close criteria: tipo `DispatchAckMessage` definido y exportado (agregado a `LlmProviderOutboundMessage` y `ToolProviderOutboundMessage`); ambos documentos actualizados con el formato exacto, cuándo se envía y cuándo no.
- Validation: `npm run typecheck -w packages/fhs-protocol` — OK.

### TASK-SATRATING-0002 - Emitir `dispatch.ack` en `examples/llm-provider`

- ID: TASK-SATRATING-0002
- State: `done`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `examples/llm-provider/src/index.ts`
- Close criteria: al recibir `chat.request`, el provider envía `dispatch.ack { requestId, queuedAt }` antes de llamar al bridge, sin bloquear el heartbeat existente.
- Validation: `npm run typecheck -w examples/llm-provider` — OK. Verificado con prueba real (ver TASK-SATRATING-0008): `avgDispatchMs` no nulo en `/api/fhs/providers`.

### TASK-SATRATING-0003 - Emitir `dispatch.ack` en `examples/ocr-provider`

- ID: TASK-SATRATING-0003
- State: `done`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `examples/ocr-provider/src/index.ts`
- Close criteria: al recibir `tool.call`, el provider envía `dispatch.ack { requestId, queuedAt }` antes de llamar al bridge, sin bloquear el heartbeat.
- Validation: `npm run typecheck -w examples/ocr-provider` — OK. Verificado con prueba real: tool call de OCR reflejada correctamente en las métricas del Registry.

### TASK-SATRATING-0004 - Registrar `dispatch.ack` en `McpHost`/`LlmGateway`

- ID: TASK-SATRATING-0004
- State: `done`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `apps/agent-server/src/providers/mcp-host.ts`, `apps/agent-server/src/providers/llm-gateway.ts`
- Close criteria: ambos clientes reconocen `dispatch.ack` entrante sin resolver la promesa pendiente (el ack no es la respuesta final), calculan `dispatchMs = ackAt - startedAt` con el reloj del Agent Server en ambos extremos, y lo devuelven junto al mensaje final (`DispatchResult`/`GenerateDispatchResult`). Si el ack nunca llega, `dispatchMs` queda `null` sin romper el flujo.
- Validation: `npm run typecheck -w apps/agent-server` — OK.

### TASK-SATRATING-0005 - Store de métricas en el Registry

- ID: TASK-SATRATING-0005
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `apps/agent-server/src/registry/metrics.ts` (nuevo), `apps/agent-server/src/registry/registry.ts`
- Close criteria: `Registry` expone `recordSample(providerId, capability, sample)` y `getMetrics(providerId, capability)`; ventana acotada a 50 muestras por `(providerId, capability)`; calcula `rating` con la fórmula v1 de la SPEC (`0.6*successRate + 0.4*latencyScore`, escala 0.0–5.0).
- Validation: `npm run typecheck -w apps/agent-server` — OK. Verificado con muestras reales (ver TASK-SATRATING-0008).

### TASK-SATRATING-0006 - Conectar `runtime.ts` con el store de métricas

- ID: TASK-SATRATING-0006
- State: `done`
- Owner: rafex
- Dependencies: TASK-SATRATING-0004, TASK-SATRATING-0005
- Expected files: `apps/agent-server/src/agent/runtime.ts`
- Close criteria: en `runOcrDeterministically`, `executeToolCall` y `callLlm` — los 3 puntos donde se calcula `duration`/se llama a un nodo — se llama a `registry.recordSample(...)` con latencia de despacho (si hubo ack), latencia total, y éxito/error (incluye el caso de excepción, con `dispatchMs: null` y `success: false`).
- Validation: `npm run typecheck -w apps/agent-server` — OK.

### TASK-SATRATING-0007 - Exponer métricas en `GET /api/fhs/providers`

- ID: TASK-SATRATING-0007
- State: `done`
- Owner: rafex
- Dependencies: TASK-SATRATING-0005
- Expected files: `apps/agent-server/src/api/providers.ts`
- Close criteria: cada provider en la respuesta incluye `metrics: [{ capability, rating, avgDispatchMs, avgTotalMs, successRate, sampleCount }]` — un elemento por modelo (si es `llm`) o por capability declarada (si es `mcp`). Sin muestras todavía, el elemento solo trae `capability` (spread de `null` es un no-op en JS). No se agregó el endpoint dedicado por capability — no hizo falta para el volumen de esta PoC.
- Validation: `curl` real contra el agent-server local, antes y después de generar muestras — confirmado en TASK-SATRATING-0008.

### TASK-SATRATING-0008 - Verificación end-to-end

- ID: TASK-SATRATING-0008
- State: `done` (local; pendiente repetir contra los 3 equipos reales cuando estén disponibles — no bloqueante, mismo código)
- Owner: rafex
- Dependencies: TASK-SATRATING-0002, TASK-SATRATING-0003, TASK-SATRATING-0006, TASK-SATRATING-0007
- Expected files: ninguno (verificación, no código)
- Close criteria: verificado 2026-07-05 con un stack local real (agent-server + `examples/llm-provider` real contra un LLM mock HTTP + `examples/ocr-provider` real contra un ether-ocr mock HTTP, ambos providers como procesos reales hablando FHS WebSocket real, no simulado):
  - Chat simple: `assistant.completed` correcto. `GET /api/fhs/providers` mostró `{ capability: "qwen2.5-coder-3b-instruct", rating: 5, avgDispatchMs: 6, avgTotalMs: 34, successRate: 1, sampleCount: 1 }` — latencia de despacho no nula, prueba directa de que `dispatch.ack` viajó de punta a punta.
  - OCR con adjunto real: `tool.selected` → `tool.running` → `tool.completed` → `ocr.extracted` con el texto del mock, confirmación `attachment.decision` respondida. `GET /api/fhs/providers` mostró `{ capability: "document.ocr", rating: 5, avgDispatchMs: 0, avgTotalMs: 17, successRate: 1, sampleCount: 1 }`.
  - Caso borde observado: el LLM mock (que decide por palabras clave, no por las tools ofrecidas) intentó re-invocar `ocr_extract` tras la confirmación — el runtime respondió `tool.error: "Tool no encontrada"` sin registrar una muestra falsa (el error ocurre antes de llamar a `mcpHost.callTool`, correcto) y sin romper la conversación (degradación graceful, `assistant.completed` igual). Confirma que el fix de e7f7e64 (no ofrecer `document.ocr` con texto pre-extraído) sigue funcionando correctamente.
- Validation: script de prueba WebSocket (dos escenarios) + logs de `agent-server`/`llm-provider`/`ocr-provider` + `curl -s http://localhost:8083/api/fhs/providers`. Pendiente (no bloqueante): repetir el mismo checklist contra laptop+bastion+Raspberry Pi cuando la red del sitio esté disponible de nuevo.
