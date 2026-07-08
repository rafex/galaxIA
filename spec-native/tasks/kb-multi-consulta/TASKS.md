# TASKS — kb-multi-consulta (SPEC-KB-0002, DEC-0048/0054)

## TASK-KB-0005 — `source` en RAG + corrección de `RagBridge.index()`

- **Estado:** `done`
- `galaxIA-satellite-star/examples/rag-provider/src/rag-bridge.ts`: `Chunk.source`, `index()` acumula (bug real corregido: antes reemplazaba el índice completo en cada llamada), `query()` devuelve `source` por chunk.
- `examples/rag-provider/src/index.ts`: `document_index` acepta `source` opcional (default `"user-upload"`).
- Verificado: `npm run typecheck`/`build` en `examples/rag-provider`.

## TASK-KB-0006 — Matching determinístico top-N + mecanismo LLM del caso límite (Navigator)

- **Estado:** `done`
- `apps/navigator/src/agent/runtime.ts`: `recommendKbCandidates` (umbral `0.05`, top-N `kbMaxPerQuestion`), `chooseKbViaTolerantParse` (una sola llamada al LLM + parser tolerante determinístico, mismo patrón que `ModelParserProfile`/DEC-0050), `resolveKbCandidates` (público, combina ambos — usado por `chat-ws.ts` antes de pedir confirmación).
- Verificado: `npm run typecheck`/`build` en `apps/navigator`.

## TASK-KB-0007 — Fusión multi-KB vía RAG (`queryMultipleKbs`)

- **Estado:** `done`
- `apps/navigator/src/agent/runtime.ts`: `queryMultipleKbs` reemplaza `queryKb` — consulta cada KB, indexa sus resultados en el RAG de la conversación con `source: "kb:<providerId>"`, fusiona con una sola `document_query` (`topK` proporcional al número de KBs), etiqueta `[Fuente: <providerName>]` en el texto final. Registra en `usedTools` todas las KBs efectivamente consultadas (requisito no negociable de mostrar qué se consultó, no solo qué aportó texto al resultado).
- `indexDocumentForRag`/`queryRagContext` extendidos con parámetros `source`/`topK`/`labelSource` — compatibles con el uso existente de RAG (un solo documento de usuario, sin cambios de comportamiento).
- Verificado: `npm run typecheck`/`build` en `apps/navigator`.

## TASK-KB-0008 — Protocolo: `KbRecommendedEvent` multi-candidato

- **Estado:** `done`
- `packages/fhs-protocol/src/sse.ts`: `KbRecommendedEvent.data.candidates: Array<{providerId, providerName, description}>` + `chosenByLlm?: boolean` (antes un candidato singular). `KbWarningEvent` retirado (ya no aplica).
- Verificado: `npm run typecheck`/`build` en `packages/fhs-protocol`.

## TASK-KB-0009 — `chat-ws.ts`: flujo multi-KB, sin el límite de "solo 1"

- **Estado:** `done`
- `apps/navigator/src/api/chat-ws.ts`: `PendingKbRecommendation.candidates` (array); `resolveKbAndChat` usa `runtime.resolveKbCandidates`; `kb.decision` pasa `kbProviderIds: string[]` a `runChat`. Se retiró el aviso `kb.warning`/límite de "solo 1 KB por pregunta" (`TASK-KB-0004`, ya superado).
- Verificado: `npm run typecheck`/`build` en `apps/navigator`.

## TASK-KB-0010 — Portal: selector `kbMaxPerQuestion` + confirmación multi-KB

- **Estado:** `done`
- `apps/portal/src/components/chat-view.ts`: nuevo selector `kbMaxPerQuestion` (1/2/3) con advertencia obligatoria al subir de 1 (DEC-0027) — no existía ningún control para esto antes (el campo del protocolo nunca se enviaba desde el frontend). `addKbRecommendedMessage` renderiza N candidatas (lista `<ul>`) con un solo confirmar/descartar para el conjunto — `textContent`, no `innerHTML` (mismo cuidado que `KbCitation`).
- Verificado: `npm run typecheck`/`build` + Vite build; toggle de la advertencia probado en `portal-dev` real (`getComputedStyle`, no solo el atributo `hidden`).

## Pendiente (backlog, no bloqueante)

- Verificación E2E completa con el stack real (Atlas + Navigator + Portal + `rag-provider` + ≥2 `kb-provider` con contenido real) — no ejecutada en esta sesión, sin ese stack corriendo simultáneamente.
- Pregunta abierta #4 (mecánica de calificación del usuario sobre la(s) KB(s) consultada(s)) — sin resolver.
- Pregunta abierta #5 (¿el contenido de una KB fusionado en RAG hereda el TTL de RAG o el `permanent-readonly` de la KB original?) — sin resolver; la implementación actual no aplica ningún TTL especial al contenido fusionado.
- Prioridad normativa entre KBs — explícitamente diferida desde DEC-0048, sin solución técnica asignada.
