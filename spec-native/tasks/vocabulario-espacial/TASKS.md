# TASKS.md

## Metadata

- Iniciativa: vocabulario-espacial
- Spec relacionada: `spec-native/specs/vocabulario-espacial/SPEC.md` (SPEC-VOCAB-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `in_progress` (decisión tomada — Opción B — specs dependientes ya alineadas; documento canónico y frase de posicionamiento ya publicados; queda pendiente solo TASK-VOCAB-0005, backlog no bloqueante)

## Tareas

### TASK-VOCAB-0001 - Decidir Opción A vs. Opción B (Star vs. Satélite general)

- ID: TASK-VOCAB-0001
- State: `done`
- Owner: rafex (decisión del owner, no de un agente)
- Dependencies: ninguna — **bloqueaba todas las demás tareas de esta iniciativa**
- Expected files: `spec-native/DECISIONS.md` (nueva entrada documentando la decisión)
- Close criteria: entrada nueva en `DECISIONS.md` con la opción elegida (A o B) y su justificación.
- Validation: Opción B elegida (2026-07-05) — "Star" para LLM, "Satellite" para tools, "nodo" como término neutro. Registrado en `spec-native/DECISIONS.md`.

### TASK-VOCAB-0002 - Documento canónico de vocabulario

- ID: TASK-VOCAB-0002
- State: `done`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001
- Expected files: `docs/vocabulario.md` (nuevo), `docs/README.md` (agregado a la tabla de documentos)
- Close criteria: tabla de vocabulario de la SPEC trasladada a este documento, ya resuelta a la Opción B (nodo/estrella/satélite).
- Validation: 2026-07-05, revisión manual — la tabla coincide exactamente con la de `spec-native/specs/vocabulario-espacial/SPEC.md`, sin contradecir la decisión Opción B (DEC-0024). Enlazado desde `docs/README.md`.

### TASK-VOCAB-0003 - Alinear specs existentes con la decisión

- ID: TASK-VOCAB-0003
- State: `done`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001
- Expected files: `spec-native/specs/satelite-rating/SPEC.md`, `spec-native/specs/p2p-discovery/SPEC.md`, sus respectivos `TASKS.md`
- Close criteria: ambas secciones "Vocabulario" actualizadas a la Opción B — "satélite" genérico reemplazado por "nodo" en todo el cuerpo de ambas specs (incluidos diagramas de secuencia), reservando "estrella"/"satélite" para cuando la distinción LLM/tool importa.
- Validation: `grep -n "satélite" spec-native/specs/satelite-rating/SPEC.md spec-native/specs/p2p-discovery/SPEC.md` — 2026-07-05, solo quedan menciones dentro de sus propias secciones "Vocabulario" (intencional).

### TASK-VOCAB-0004b - Reformular la expansión de las siglas FHS

- ID: TASK-VOCAB-0004b
- State: `done`
- Owner: rafex
- Dependencies: ninguna — no depende de TASK-VOCAB-0001 (no toca la decisión Star/Satélite)
- Expected files: `docs/README.md`, `docs/protocolo.md`, `site/protocolo.md`, `package.json`
- Close criteria: `Federation of Sovereign Hosts` / `Federación de Nodos Soberanos` reemplazado por `Federation of Sovereign Horizons` / `Federación de Horizontes Soberanos` en los archivos del repo. La sigla `FHS` no cambia.
- Validation: `grep -rn "Sovereign Hosts\|Nodos Soberanos"` en el repo y en `presentaciones-cursos-talleres` — 2026-07-05, confirmado sin resultados fuera de esta misma spec/tarea (que documentan la frase vieja intencionalmente). También se corrigió `package.json` (no estaba en el plan original de 3 archivos) y la presentación `red-soberana-de-ia` en el repo aparte (commit `b716dfb`).

### TASK-VOCAB-0004 - Frase de posicionamiento en el portal web

- ID: TASK-VOCAB-0004
- State: `done`
- Owner: rafex
- Dependencies: TASK-VOCAB-0001, TASK-VOCAB-0002
- Expected files: `site/index.md`
- Close criteria: la frase de posicionamiento (ES, y EN si aplica) incorporada al portal, ajustada según la decisión de TASK-VOCAB-0001.
- Validation: 2026-07-05, frase en español agregada como nueva sección "Estrellas y satélites" en `site/index.md`, entre "Cómo se arma la red" y "Súmate". No se pudo correr `bundle exec jekyll build` en este entorno (sin Gemfile/jekyll instalado localmente en `site/`) — validado por revisión manual del markup (HTML balanceado, mismo patrón que las secciones vecinas). Pendiente no bloqueante: confirmar visualmente con un build real de Jekyll (ej. GitHub Pages) antes de considerarlo verificado end-to-end.

### TASK-VOCAB-0005 - Backlog: actualización retroactiva de documentación existente

- ID: TASK-VOCAB-0005
- State: `pending` (explícitamente no bloqueante — es backlog, no parte del cierre de esta iniciativa)
- Owner: rafex
- Dependencies: TASK-VOCAB-0001, TASK-VOCAB-0002
- Expected files: `docs/*.md`, `spec-native/*.md`, presentación `red-soberana-de-ia` (repo aparte)
- Close criteria: inventario de qué documentos usan vocabulario técnico donde tendría sentido el espacial, priorizado — no implica reescribir todo de una vez.
- Validation: no aplica (es un inventario/backlog, no un cierre binario).
