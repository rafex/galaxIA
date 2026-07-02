# TRACEABILITY.md

Mapa de relaciones entre specs, tareas, decisiones y validacion.

## Objetivo

Permitir que una persona o agente pueda reconstruir rapidamente:

- que spec origino un cambio
- que tareas ejecutaron esa spec
- que decisiones condicionaron el trabajo
- que evidencia valida el resultado

## Cuando actualizar este archivo

Actualizar al cerrar una iniciativa, no durante la ejecucion.
El momento correcto es cuando la spec pasa a estado `done` o `blocked`.

Si una decision cambia el alcance de una spec activa, registrar
la relacion antes de continuar.

## Formato sugerido

| Spec | Estado | Tareas | Decisiones | Archivos principales | Validacion | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| fhs-mvp | active | TASK-FHS-0001..0008 | DEC-0001..DEC-0005 | `packages/fhs-protocol/`, `apps/agent-server/`, `apps/web/`, `examples/llm-provider/`, `examples/ocr-provider/` | Chat E2E con Qwen 0.5B, OCR E2E con ether-ocr | Stack desplegado en bastion 192.168.3.173. LLM via FHS WS + curl. OCR via FHS WS + curl -F. Timeouts a 300s para hardware lento. |
