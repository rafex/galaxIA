# TASKS.md

## Metadata

- Iniciativa: kb-provider
- Spec relacionada: `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `todo` — bloqueado en diseño, no en implementación (ver TASK-KB-0001)

## Tareas

### TASK-KB-0001 - Resolver cómo se dispara una consulta a KB

- ID: TASK-KB-0001
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: `spec-native/specs/kb-provider/SPEC.md`
- Close criteria: decisión documentada (como sección "Diseño" actualizada en el SPEC, o un nuevo DEC) sobre qué dispara `kb_query` — a diferencia de RAG, no hay un evento de "adjuntar" que lo active automáticamente.
- Validation: revisión de diseño, sin código todavía.

Bloqueante para el resto de las tareas — el SPEC señala esto como el riesgo de diseño principal, sin resolver.

### TASK-KB-0002 - Definir el proceso administrativo de indexado

- ID: TASK-KB-0002
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: `spec-native/specs/kb-provider/SPEC.md`
- Close criteria: decisión documentada sobre cómo el operador puebla una KB (CLI, script, endpoint separado) — fuera del flujo de chat de un usuario final.
- Validation: revisión de diseño, sin código todavía.

Las tareas de implementación (`examples/kb-provider/`, tool `kb_query`, manifiesto, integración con `runtime.ts`) se agregan cuando TASK-KB-0001 y TASK-KB-0002 estén resueltas.
