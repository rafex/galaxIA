# SPEC-KB-0001 — KB provider: bases de conocimiento de solo lectura, compartidas entre conversaciones

## Estado

`done (local)` — implementado y verificado con procesos reales en local, incluyendo prueba real en navegador (2026-07-06). Pendiente verificación contra hardware real (mismo bloqueo que issue #1). `kbMaxPerQuestion > 1` queda parcial — ver TASK-KB-0004.

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
- Sincronización automática entre nodos KB de distintos operadores.
- Detección o promoción automática de contenido desde RAG.
- El mecanismo exacto de indexado administrativo (CLI, endpoint separado, etc.) — a decidir cuando se priorice la implementación.
- **Modo "mágico" de selección automática de KB sin confirmación** — documentado como premisa a futuro en "Modo mágico (documentado, no implementado)" más abajo, explícitamente fuera de alcance por ahora (DEC-0027).

## Diseño (cerrado — DEC-0027)

- `kb_query` sigue la misma forma que `document_query` de RAG (embeber + similitud coseno + top-k), pero **no** está scoped por `conversationId` — cualquier conversación que consulte este nodo ve el mismo corpus.
- **Dos modos de disparador, ambos dentro de alcance:**

  1. **Manual explícito** — el usuario elige una KB (o ninguna) antes de preguntar, vía `preferences.kb: string` (id del nodo KB) — mismo patrón que `preferences.model` para elegir una Star manualmente. Esa elección se usa para responder hasta que el usuario la cambie; **no queda fija para toda la conversación** (a diferencia de RAG, donde un documento indexado sí lo está) — el usuario puede cambiar de KB entre preguntas dentro de la misma conversación.
  2. **Recomendada** — para cada pregunta, el sistema compara el texto de la pregunta contra la `capability.description` (y `capability.tags`, ver DEC-0028) de cada KB disponible (registrada en el Registry/Atlas) usando un mecanismo **determinístico y reproducible** (matching de texto o embeddings — nunca una decisión de tool-calling del LLM principal, ver justificación abajo), recomienda la de mejor coincidencia, y pide confirmación al usuario antes de consultarla (mismo patrón que la confirmación de adjunto de OCR/RAG). Si ninguna KB coincide razonablemente, el sistema debe poder recomendar "ninguna" — nunca forzar una elección de baja relevancia.

- **Cambio de KB durante la conversación:** permitido y esperado en ambos modos — cada pregunta puede requerir un dominio distinto. No hay bloqueo de "una KB por conversación" como sí lo hay para RAG.
- **Límite de KBs por pregunta:** `preferences.kbMaxPerQuestion` (default `1`) — por defecto, una sola KB se consulta por cada pregunta individual. El usuario puede subir este límite para permitir que una misma pregunta consulte varias KBs a la vez (ej. una pregunta que cruza dos dominios) — si lo hace, el `Portal` debe advertir explícitamente que los modelos pequeños de este stack (`qwen2.5-coder-3b`, sin GPU) pueden volverse notablemente más lentos o no completar una respuesta al combinar contexto de varias KBs simultáneamente. A lo largo de una conversación completa no hay límite de cuántas KBs *distintas* se usan (una por pregunta, o la misma repetida) — el límite es solo por pregunta.
- Manifiesto: mismo formato base que RAG, con `capabilities: [{ id: "kb.query", description: "...", tags: [...], ... }]` y `privacy.retention: "permanent-readonly"`. La `description` (y `tags`, si se implementan — DEC-0028) son el texto que el modo "recomendada" usa para decidir — debe ser preciso y específico (ej. "Constitución Política de los Estados Unidos Mexicanos, texto vigente", no solo "documentos legales").
- **Tags de proveedor y de comunidad (DEC-0028, diseño aparte, sin implementar):** además de `description`, se diseñó (no implementado) un campo `capability.tags` autodeclarado por el operador, y un mecanismo de tags de comunidad agregados por el Atlas para que quien elige pueda contrastar "qué dice ofrecer la KB" vs "qué ha confirmado la comunidad". La parte de comunidad queda explícitamente bloqueada hasta que `SPEC-AUTH-0001` (pausado) resuelva identidad de usuario — sin eso, sería trivialmente manipulable por el propio operador. Ver DEC-0028 para el diseño completo.

### Modo mágico (documentado, no implementado — DEC-0027)

**Premisa/objetivo:** que el sistema elija la KB más relevante para una pregunta sin pedir confirmación al usuario — la versión más fluida/"amigable" de los tres modos, sin fricción de selección ni de confirmación.

**Por qué no se implementa en esta iteración:** dejar que el LLM de chat decida sin preguntar reintroduce el mismo riesgo que DEC-0020 resolvió para OCR — los modelos de este hardware comunitario no son confiables tomando este tipo de decisión vía tool-calling (DEC-0016/DEC-0017: tool-calling poco confiable, necesitó parser de respaldo). La consecuencia de una KB mal elegida es **peor** que la de una tool mal invocada: un `tool.error` es un fallo visible y recuperable; una **KB equivocada usada "con confianza"** produce una respuesta que suena autorizada pero viene del dominio incorrecto — un fallo silencioso que el usuario no puede detectar sin ya conocer la respuesta.

**Camino posible a futuro, si se retoma:** el *routing* (qué KB elegir) tendría que seguir siendo determinístico/reproducible — el mismo mecanismo de matching del modo "recomendada", sin la LLM decidiendo — y lo único que cambiaría sería omitir el paso de confirmación. Es decir, "mágico" debería significar "recomendado sin preguntar", nunca "que el modelo elija libremente". Aun así, `provenance` tendría que declarar siempre qué KB se usó (o ninguna), para que sea auditable después aunque no se haya confirmado antes.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Sin proceso definido de curaduría/actualización de contenido | Medio | Fuera de alcance de esta iteración; documentar como paso manual del operador |
| Confundir una KB con RAG en la UI (el usuario podría pensar que puede "subir" a una KB) | Medio | El `Portal` no debe ofrecer una acción de adjuntar contra un nodo KB — solo consulta |
| `capability.description`/`tags` son autodeclarados por el operador, nadie los verifica | Medio | Diseño de mitigación documentado en DEC-0028 (tags de comunidad) — bloqueado hasta que exista identidad de usuario (`SPEC-AUTH-0001`, pausado); no implementar una mitigación parcial sin auth real, daría falsa sensación de garantía |
| Ninguna KB coincide bien con la pregunta, pero el sistema recomienda una de baja relevancia igual | Medio | El modo "recomendada" debe poder recomendar explícitamente "ninguna" — nunca forzar una elección |
| Permitir varias KBs por pregunta (`kbMaxPerQuestion` > 1) puede saturar el contexto de un modelo de 4096 tokens y degradar o colgar la respuesta | Medio | Advertencia obligatoria en el `Portal` al subir el límite por encima de 1 (DEC-0027) |

## Enlaces y decisiones relacionadas

- DEC-0020 — Ejecución determinística de OCR (razón por la que el modo "mágico" no se implementa todavía).
- DEC-0025 — Separación memoria de conversación / RAG / KB, retención generalizada.
- DEC-0027 — Disparador de kb-provider: manual y recomendado ahora; "mágico" documentado pero no implementado.
- DEC-0028 — Tags de capability: autodeclarados (diseño listo) y de comunidad (diseño listo, bloqueado por `SPEC-AUTH-0001`).
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — capability hermana para contenido privado por conversación.
- `docs/protocolo-provider.md` — contrato base que debe cumplir cualquier nodo `mcp`.
- `spec-native/specs/kb-multi-consulta/SPEC.md` (SPEC-KB-0002, DEC-0048) — consulta de múltiples KBs por pregunta.
- `spec-native/specs/kb-citacion/SPEC.md` (SPEC-KB-0003, DEC-0049) — metadata de citación (`KbCitation`) y fuente primaria en resultados de `kb.query`.

## Tareas relacionadas

- Ver `spec-native/tasks/kb-provider/TASKS.md`.

## Notas

- Diseño del disparador cerrado el 2026-07-06 (DEC-0027) — modos manual y recomendado especificados, listos para tareas de implementación. El modo "mágico" queda documentado como premisa a futuro, explícitamente no implementado. Falta aún TASK-KB-0002 (proceso administrativo de indexado) antes de escribir código.
