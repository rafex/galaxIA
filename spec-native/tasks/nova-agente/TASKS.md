# TASKS — nova-agente (SPEC-NOVA-0001, DEC-0055/0056)

## TASK-NOVA-0001 — Protocolo: `NodeType: "agent"`, `NovaBeacon`, `maxReasoningSteps`/`reasoningSteps`

- **Estado:** `done`
- `packages/fhs-protocol/src/types.ts`: `NodeType` gana `"agent"`.
- `packages/fhs-protocol/src/manifest.ts`: `NovaBeacon` (mismo patrón que `StarBeacon` + `reasoning.maxSteps`); `Beacon`/`flattenManifest` extendidos.
- `packages/fhs-protocol/src/llm.ts`: `GenerateRequest.maxReasoningSteps?`, `GenerateResponse.reasoningSteps?`.
- Verificado: `npm run typecheck`/`build` en `packages/fhs-protocol`, y `npm run typecheck` en `apps/atlas`/`apps/navigator`/`apps/portal` sin romper nada (cambio puramente aditivo).

## TASK-NOVA-0002 — Nova de referencia en `galaxIA-satellite-star`

- **Estado:** `done` — verificado contra hardware real (DEC-0056).
- `examples/nova-example/`: `ReasoningLoop` (loop acotado, reutiliza `LlmBridge`/parser tolerante de `star-example` en cada ronda), `calculator.ts` (tool de ejemplo, evaluador recursivo-descendente propio, sin `eval`/`Function`), `index.ts` (wiring FHS igual que `star-example`, `provider.type: "agent"`), `smoke-test.ts` (prueba directa del loop sin pasar por Atlas).
- Bug real encontrado y corregido: `llm-bridge.ts` dejaba el JSON crudo del fallback también en `content`, contaminando el historial en un loop (invisible en `star-example`, que solo hace una llamada) — corregido en `nova-example` y, por consistencia, también en `star-example`.
- Verificado: `npm run typecheck`/`build` en todo `galaxIA-satellite-star`; `smoke-test.ts` corrido contra `qwen2.5-coder-3b-instruct` real en `bastion-wifi` (`llama-server --jinja`, CPU-only) — respuesta final correcta tras el fix.
- Dos limitaciones reales del modelo/diseño observadas y documentadas (no resueltas, ver Riesgos en `SPEC.md`): el modelo repite la misma tool call varias rondas en vez de reconocer que ya tiene el resultado; ofrecer una tool irrelevante puede degradar una respuesta simple (mismo problema que motivó el gate de KB, DEC-0054).

## TASK-NOVA-0003 — Registro/descubrimiento FHS completo de un Nova contra Atlas real

- **Estado:** pendiente — no ejecutado en esta sesión.
- `TASK-NOVA-0002` solo probó `ReasoningLoop` de forma directa (sin Atlas/Navigator de por medio). Falta correr `nova-example` como proceso FHS real (`hello`/`register`/`chat.request` vía WebSocket) contra un Atlas real, para confirmar que el registro/descubrimiento funciona igual que ya está probado para `star-example`/`satellite-ocr-example`.

## Pendiente (backlog, no bloqueante)

- Que Navigator prefiera automáticamente un Nova sobre un Star para ciertas tareas — decisión de implementación futura, no resuelta aún.
- Streaming de pasos intermedios del loop hacia el Portal — fuera de alcance de SPEC-NOVA-0001.
- Gate de relevancia de tools antes de ofrecerlas a un Nova (Hallazgo 3, DEC-0056) — mismo tipo de mecanismo ya diseñado para KB (DEC-0054), sin aplicar aquí todavía.
- Explorar si otro modo de tool-calling o modelo evita que `qwen2.5-coder-3b-instruct` repita la misma tool call en vez de avanzar (Hallazgo 2, DEC-0056).
