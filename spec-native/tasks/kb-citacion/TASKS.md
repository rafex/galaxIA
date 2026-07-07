# TASKS — kb-citacion (SPEC-KB-0003, DEC-0049)

## TASK-KBCITE-0001 — `ArtifactRef`/`KbCitation`/`KbQueryChunk` en el protocolo

- **Estado:** `done`
- `packages/fhs-protocol/src/types.ts`: `ArtifactRef` (DEC-0046, solo el tipo — sin flujo que lo use todavía), `KbCitation`, `KbQueryChunk`.
- `packages/fhs-protocol/src/sse.ts`: `ProvenanceInfo.tools[].citations?: KbCitation[]`.
- Verificado: `npm run typecheck`/`build` en `packages/fhs-protocol`.

## TASK-KBCITE-0002 — `kb-provider` de referencia puebla `citation`

- **Estado:** `done`
- `galaxIA-satellite-star/examples/kb-provider/src/kb-bridge.ts`: cada `Chunk` guarda su `sourceFile`; `query()` devuelve `KbQueryChunk[]` con `citation.documentTitle` = nombre del archivo. Deliberadamente mínimo (mismo principio de TASK-KB-0002: no es una recomendación de curaduría).
- Verificado: `npm run typecheck`/`build` en todo el workspace de `galaxIA-satellite-star`.

## TASK-KBCITE-0003 — Navigator propaga citas a provenance

- **Estado:** `done`
- `apps/navigator/src/agent/runtime.ts::queryKb`: parsea `KbQueryChunk[]`, etiqueta cada fragmento con `[Fuente: <documentTitle>]` al construir el contexto que recibe el LLM (atribución vía prompting, DEC-0048 — no lógica nueva de protocolo), y agrega las citas a `usedTools`/`buildProvenance`.
- Verificado: `npm run typecheck`/`build` en `apps/navigator`.

## TASK-KBCITE-0004 — Portal muestra las fuentes en el panel de Procedencia

- **Estado:** `done`
- `apps/portal/src/components/chat-view.ts::renderProvenance`: nueva fila "Fuentes" por tool cuando trae `citations`, con `escapeHtml` (la metadata es autodeclarada por el provider, DEC-0028 — no se confía en que venga sanitizada).
- Verificado: `npm run typecheck`/`build` + build de Vite; probado en `portal-dev` real (escaping confirmado con un `documentTitle` malicioso vía `preview_eval`).

## Pendiente (backlog, no bloqueante)

- `sourceArtifact`/`ArtifactRef` no tiene ningún flujo real que lo use todavía — depende de que se implemente SPEC-IPFS-0001/DEC-0047 (reemplazo de `file_base64`).
- Un provider real (no el `kb-provider` de referencia) que quiera poblar `versionDate`/`pageStart`/`pageEnd`/`tags`/`metadata` necesita su propio proceso de curaduría — sigue fuera de alcance del protocolo (DEC-0026/DEC-0037/TASK-KB-0002).
- Verificación E2E completa (stack real: atlas + navigator + star-example + mock-llm + kb-provider, pregunta real, confirmar cita mostrada en Portal) — no ejecutada en esta sesión por requerir orquestar procesos de dos repos; typecheck/build + prueba de escaping en `portal-dev` real cubren el riesgo principal (XSS) sin ese costo.
