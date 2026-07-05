# TASKS.md

## Metadata

- Iniciativa: satelite-rating
- Spec relacionada: `spec-native/specs/satelite-rating/SPEC.md` (SPEC-SATRATING-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `pending` (spec en `draft`, sin implementación iniciada)

## Tareas

### TASK-SATRATING-0001 - Mensaje `dispatch.ack` en el protocolo

- ID: TASK-SATRATING-0001
- State: `pending`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `packages/fhs-protocol/src/` (tipo de mensaje), `docs/protocolo.md`, `docs/protocolo-provider.md`
- Close criteria: tipo `DispatchAckMessage` (o equivalente) definido y exportado; ambos documentos actualizados con el formato exacto, cuándo se envía y cuándo no (ver SPEC, sección "Mensaje nuevo").
- Validation: `npm run typecheck -w packages/fhs-protocol`

### TASK-SATRATING-0002 - Emitir `dispatch.ack` en `examples/llm-provider`

- ID: TASK-SATRATING-0002
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `examples/llm-provider/src/index.ts` o `examples/llm-provider/src/llm-bridge.ts`
- Close criteria: al recibir `chat.request`, el provider envía `dispatch.ack { requestId, queuedAt }` antes de llamar a `llama-server`, sin bloquear el heartbeat existente.
- Validation: `npm run typecheck -w examples/llm-provider` + prueba manual contra `llama-server` real observando el orden de mensajes en logs.

### TASK-SATRATING-0003 - Emitir `dispatch.ack` en `examples/ocr-provider`

- ID: TASK-SATRATING-0003
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `examples/ocr-provider/src/index.ts` o `examples/ocr-provider/src/ocr-bridge.ts`
- Close criteria: al recibir `tool.call`, el provider envía `dispatch.ack { requestId, queuedAt }` antes de llamar a `ether-ocr-api`, sin bloquear el heartbeat.
- Validation: `npm run typecheck -w examples/ocr-provider` + prueba manual contra `ether-ocr-api` real.

### TASK-SATRATING-0004 - Registrar `dispatch.ack` en `McpHost`/`LlmGateway`

- ID: TASK-SATRATING-0004
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0001
- Expected files: `apps/agent-server/src/providers/mcp-host.ts`, `apps/agent-server/src/providers/llm-gateway.ts`
- Close criteria: ambos clientes reconocen `dispatch.ack` entrante, marcan el timestamp de recepción (`queuedAt` propio, no confiar ciegamente en el del nodo para el cálculo de latencia — usar el reloj del Agent Server en ambos extremos), y lo dejan disponible para quien calcule las muestras (TASK-SATRATING-0005). No debe romper el flujo si el ack nunca llega (ver SPEC, "Qué pasa si el nodo nunca manda dispatch.ack").
- Validation: `npm run typecheck -w apps/agent-server`

### TASK-SATRATING-0005 - Store de métricas en el Registry

- ID: TASK-SATRATING-0005
- State: `pending`
- Owner: rafex
- Dependencies: ninguna (puede avanzar en paralelo a TASK-SATRATING-0001..0004)
- Expected files: `apps/agent-server/src/registry/metrics.ts` (nuevo), `apps/agent-server/src/registry/registry.ts`
- Close criteria: `Registry` expone `recordSample(providerId, capability, sample)` y `getMetrics(providerId, capability)`; ventana acotada de muestras (tamaño o tiempo fijo, documentado); calcula `rating` con la fórmula v1 de la SPEC.
- Validation: `npm run typecheck -w apps/agent-server` + prueba unitaria simple si el proyecto ya tiene suite de tests para `registry/`; si no, prueba manual con muestras sintéticas.

### TASK-SATRATING-0006 - Conectar `runtime.ts` con el store de métricas

- ID: TASK-SATRATING-0006
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0004, TASK-SATRATING-0005
- Expected files: `apps/agent-server/src/agent/runtime.ts`
- Close criteria: en los mismos puntos donde hoy se calcula `duration` para `tool.completed`/`chat.completed`, se llama a `registry.recordSample(...)` con latencia de despacho (si hubo ack), latencia total, y éxito/error.
- Validation: `npm run typecheck -w apps/agent-server`

### TASK-SATRATING-0007 - Exponer métricas en `GET /api/fhs/providers`

- ID: TASK-SATRATING-0007
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0005
- Expected files: el handler de `GET /api/fhs/providers` en `apps/agent-server/src/` (confirmar archivo exacto al implementar)
- Close criteria: cada `service` en la respuesta incluye `metrics: { rating, avgDispatchMs, avgTotalMs, successRate, sampleCount }`. Se decide en esta tarea si además se agrega el endpoint dedicado `GET /api/fhs/providers/:providerId/metrics` mencionado como opcional en la SPEC.
- Validation: `curl` real contra el agent-server con al menos una muestra registrada.

### TASK-SATRATING-0008 - Verificación end-to-end contra los 3 equipos reales

- ID: TASK-SATRATING-0008
- State: `pending`
- Owner: rafex
- Dependencies: TASK-SATRATING-0002, TASK-SATRATING-0003, TASK-SATRATING-0006, TASK-SATRATING-0007
- Expected files: ninguno (verificación, no código)
- Close criteria: los 6 criterios de aceptación de la SPEC confirmados contra la topología real (laptop + bastion + Raspberry Pi) — varias peticiones de chat y de OCR, confirmando que las latencias reportadas por `/api/fhs/providers` coinciden con lo observado en los logs de cada nodo.
- Validation: script de prueba WebSocket (mismo patrón usado en sesiones anteriores) + logs de `agent-server`/`llm-provider`/`ocr-provider` + `curl` a `/api/fhs/providers`.
