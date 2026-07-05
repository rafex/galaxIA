# TASKS.md

## Metadata

- Iniciativa: vocabulario-espacial
- Spec relacionada: `spec-native/specs/vocabulario-espacial/SPEC.md` (SPEC-VOCAB-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `pending` (spec en `draft`, bloqueada en la decisión Star vs. Satélite)

## Tareas

### TASK-VOCAB-0001 - Decidir Opción A vs. Opción B (Star vs. Satélite general)

- ID: TASK-VOCAB-0001
- State: `pending`
- Owner: rafex (decisión del owner, no de un agente)
- Dependencies: ninguna — **bloquea todas las demás tareas de esta iniciativa**
- Expected files: `spec-native/DECISIONS.md` (nueva entrada documentando la decisión)
- Close criteria: entrada nueva en `DECISIONS.md` con la opción elegida (A o B) y su justificación.
- Validation: no aplica (decisión, no código)

### TASK-VOCAB-0002 - Documento canónico de vocabulario

- ID: TASK-VOCAB-0002
- State: `pending`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001
- Expected files: `docs/vocabulario.md` (nuevo, nombre tentativo)
- Close criteria: tabla de vocabulario de la SPEC trasladada a este documento, ajustada según la decisión de TASK-VOCAB-0001 (con o sin "Star" como término separado).
- Validation: revisión manual — la tabla no debe contradecir la decisión tomada.

### TASK-VOCAB-0003 - Alinear specs existentes con la decisión

- ID: TASK-VOCAB-0003
- State: `pending`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001
- Expected files: `spec-native/specs/satelite-rating/SPEC.md`, `spec-native/specs/p2p-discovery/SPEC.md`
- Close criteria: si se eligió Opción B, ambas secciones "Vocabulario" se actualizan para distinguir "Star" (LLM) de "Satellite" (tools). Si se eligió Opción A, se agrega una nota confirmando que no hay cambios.
- Validation: revisión manual de ambos documentos.

### TASK-VOCAB-0004b - Reformular la expansión de las siglas FHS

- ID: TASK-VOCAB-0004b
- State: `done`
- Owner: rafex
- Dependencies: ninguna — no depende de TASK-VOCAB-0001 (no toca la decisión Star/Satélite)
- Expected files: `docs/README.md`, `docs/protocolo.md`, `site/protocolo.md`, `package.json`
- Close criteria: `Federation of Sovereign Hosts` / `Federación de Nodos Soberanos` reemplazado por `Federation of Sovereign Horizons` / `Federación de Horizontes Soberanos` en los archivos del repo. La sigla `FHS` no cambia. La presentación `red-soberana-de-ia` (repo `presentaciones-cursos-talleres`, aparte) queda pendiente como tarea de seguimiento separada (otro repo, fuera del alcance de este commit).
- Validation: `grep -rn "Sovereign Hosts\|Nodos Soberanos"` en el repo — 2026-07-05, confirmado sin resultados fuera de esta misma spec/tarea (que documentan la frase vieja intencionalmente). También se encontró y corrigió `package.json` (no estaba en el plan original de 3 archivos).

### TASK-VOCAB-0004 - Frase de posicionamiento en el portal web

- ID: TASK-VOCAB-0004
- State: `pending`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001, TASK-VOCAB-0002
- Expected files: `site/index.md`
- Close criteria: la frase de posicionamiento (ES, y EN si aplica) incorporada al portal, ajustada según la decisión de TASK-VOCAB-0001.
- Validation: `just generate`/build de Jekyll (o el mecanismo que use `site/`) sin errores, revisión visual.

### TASK-VOCAB-0005 - Backlog: actualización retroactiva de documentación existente

- ID: TASK-VOCAB-0005
- State: `pending` (explícitamente no bloqueante — es backlog, no parte del cierre de esta iniciativa)
- Owner: rafex
- Dependencies: TASK-VOCAB-0001, TASK-VOCAB-0002
- Expected files: `docs/*.md`, `spec-native/*.md`, presentación `red-soberana-de-ia` (repo aparte)
- Close criteria: inventario de qué documentos usan vocabulario técnico donde tendría sentido el espacial, priorizado — no implica reescribir todo de una vez.
- Validation: no aplica (es un inventario/backlog, no un cierre binario).
