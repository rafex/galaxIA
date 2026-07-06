# TASKS.md

## Metadata

- Iniciativa: kb-provider
- Spec relacionada: `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `todo` — diseño del disparador cerrado (DEC-0027); falta TASK-KB-0002 antes de escribir código

## Tareas

### TASK-KB-0001 - Resolver cómo se dispara una consulta a KB

- ID: TASK-KB-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/DECISIONS.md` (DEC-0027), `spec-native/specs/kb-provider/SPEC.md`
- Close criteria: decisión documentada sobre qué dispara `kb_query`.
- Validation: resuelto en DEC-0027 (2026-07-06) — modo manual (`preferences.kb`) y modo recomendado (matching determinístico contra `capability.description` + confirmación) quedan dentro de alcance; modo "mágico" (sin confirmación) documentado como premisa a futuro, explícitamente no implementado, por el mismo riesgo que DEC-0020 resolvió para OCR. La KB usada puede cambiar entre preguntas de una misma conversación; `preferences.kbMaxPerQuestion` (default 1) limita cuántas KBs se consultan por una sola pregunta, con advertencia obligatoria si se sube.

### TASK-KB-0002 - Definir el proceso administrativo de indexado

- ID: TASK-KB-0002
- State: `todo`
- Owner:
- Dependencies: ninguna
- Expected files: `spec-native/specs/kb-provider/SPEC.md`
- Close criteria: decisión documentada sobre cómo el operador puebla una KB (CLI, script, endpoint separado) — fuera del flujo de chat de un usuario final.
- Validation: revisión de diseño, sin código todavía.

### TASK-KB-0003 - Agregar `capability.tags` autodeclarados al protocolo

- ID: TASK-KB-0003
- State: `todo`
- Owner:
- Dependencies: ninguna — sin bloqueos, puede implementarse antes que el resto de `kb-provider`
- Expected files: `packages/fhs-protocol/src/types.ts` (`Capability.tags?: string[]`), `docs/protocolo-provider.md`, `docs/manifiesto-mcp.md`
- Close criteria: `Capability` acepta un campo `tags` opcional; documentado como autodeclarado (mismo nivel de confianza que `description`, no verificado); usado como señal adicional en el matching del modo "recomendada" de `kb-provider` (TASK-KB-0001).
- Validation: `npm run typecheck -w packages/fhs-protocol` — sin romper providers existentes (campo opcional).

Ver DEC-0028 para el diseño completo (incluye la parte de tags de comunidad, bloqueada — no crear tarea de implementación para esa parte hasta que `SPEC-AUTH-0001` se retome).

Las tareas de implementación (`examples/kb-provider/`, tool `kb_query`, manifiesto, integración con `runtime.ts`) se agregan cuando TASK-KB-0001 y TASK-KB-0002 estén resueltas.
