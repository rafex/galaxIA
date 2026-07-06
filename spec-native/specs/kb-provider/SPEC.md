# SPEC-KB-0001 — KB provider: bases de conocimiento de solo lectura, compartidas entre conversaciones

## Estado

`draft`

## Owner

Raúl Fletes (rafex)

## Problema

`rag-provider` (SPEC-RAG-0001) indexa contenido por conversación, privado por defecto, con retención acotada — correcto para un documento que un usuario adjunta puntualmente. Pero hay contenido de otra naturaleza: público, estable, y consultado repetidamente por muchos usuarios (ejemplo motivador: la Constitución de México). Forzar ese caso por el flujo de RAG significaría que cada usuario reindexe el mismo documento por su cuenta — cómputo desperdiciado y, peor, mezclar semánticamente algo público con un modelo de retención pensado para datos privados de sesión (ver DEC-0025).

Se necesita una capability separada para contenido de solo lectura, poblado por el operador del nodo, sin ciclo de vida atado a ninguna conversación.

## Relación con RAG y memoria de conversación (DEC-0025)

- **RAG** (`spec-native/specs/rag-provider/SPEC.md`) — el usuario aporta el contenido, alcance por conversación, retención acotada, nunca compartido.
- **KB** (este spec) — el operador aporta el contenido, alcance global (o por comunidad/nodo), sin TTL, siempre compartido entre quien consulte.
- **Memoria de conversación** — no cubierta por ninguno de los dos; capability aparte, opcional por nodo.

La promoción de un documento de RAG a KB (por ejemplo, porque el operador nota que muchos usuarios suben el mismo PDF) es una decisión manual del operador, fuera de banda — no una feature automática de ningún protocolo.

## Alcance

### Dentro del alcance

- Un nuevo provider FHS de tipo `mcp` (`examples/kb-provider/`), mismo contrato base que `rag-provider`.
- Una tool de consulta: `kb_query` (embeber pregunta + buscar por similitud + devolver top-k fragmentos) — misma mecánica de recuperación que `document_query` en RAG.
- **Sin tool de escritura expuesta a través del protocolo de chat.** La indexación de contenido en una KB es un proceso administrativo separado (script o comando de operador, ejecutado fuera del flujo de un usuario final) — a definir en la fase de implementación, no en este spec.
- `privacy.retention: "permanent-readonly"` — sin TTL, sin `privacy.warning` (no aplica: el operador decide qué es público, no el usuario).
- Posible respaldo de los documentos fuente en IPFS (contenido inmutable, público, deduplicado por hash) — el índice vectorial en sí (embeddings + metadata de búsqueda) permanece local a cada nodo KB; IPFS no reemplaza eso, solo puede servir como almacenamiento de los blobs de texto/documento original.

### Fuera del alcance (para esta iteración)

- Cualquier mecanismo de escritura o actualización vía el protocolo de chat de un usuario.
- Selección de múltiples KBs simultáneas por consulta (se asume que cada nodo KB expone un corpus, y el usuario/operador elige a cuál conectarse).
- Sincronización automática entre nodos KB de distintos operadores.
- Detección o promoción automática de contenido desde RAG.
- El mecanismo exacto de indexado administrativo (CLI, endpoint separado, etc.) — a decidir cuando se priorice esta iniciativa.

## Diseño (borrador, a completar cuando se priorice)

- `kb_query` sigue la misma forma que `document_query` de RAG (embeber + similitud coseno + top-k), pero **no** está scoped por `conversationId` — cualquier conversación que consulte este nodo ve el mismo corpus.
- Determinístico o no: a diferencia de RAG (donde la recuperación es siempre automática porque hay un documento activo conocido), una KB podría requerir que el usuario o el operador indiquen explícitamente "consulta esta base de conocimiento" — el disparo determinístico de RAG no aplica igual aquí porque no hay un evento de "adjuntar" que lo dispare. Este es el primer punto a resolver en detalle antes de implementar.
- Manifiesto: mismo formato base que RAG, con `capabilities: [{ id: "kb.query", ... }]` y `privacy.retention: "permanent-readonly"`.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sin proceso definido de curaduría/actualización de contenido | Medio | Fuera de alcance de esta iteración; documentar como paso manual del operador |
| Confundir una KB con RAG en la UI (el usuario podría pensar que puede "subir" a una KB) | Medio | El `Portal` no debe ofrecer una acción de adjuntar contra un nodo KB — solo consulta |
| Determinar cuándo se consulta una KB (a diferencia de RAG, no hay un evento de adjunto que lo dispare) | Alto | Ver "Diseño" — primer punto a resolver antes de implementar |

## Enlaces y decisiones relacionadas

- DEC-0025 — Separación memoria de conversación / RAG / KB, retención generalizada.
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — capability hermana para contenido privado por conversación.
- `docs/protocolo-provider.md` — contrato base que debe cumplir cualquier nodo `mcp`.

## Tareas relacionadas

- Ver `spec-native/tasks/kb-provider/TASKS.md`.

## Notas

- No implementar todavía. Este draft nace de la discusión sobre RAG (2026-07-05, DEC-0025) — el diseño está menos maduro que `rag-provider` a propósito; falta resolver el punto de "cómo se dispara la consulta" antes de considerarlo listo para tareas de implementación.
