# SPEC-KB-0002 — Consulta de múltiples KBs por pregunta

## Estado

`done (local)` — implementado y verificado con `npm run typecheck`/`build` en `galaxIA` y `galaxIA-satellite-star`; UI verificada en `portal-dev` real. Extiende `SPEC-KB-0001` (`done (local)`). Dos puntos siguen explícitamente diferidos (prioridad normativa, mecánica de calificación del usuario) — ver DEC-0048, DEC-0054.

## Owner

Raúl Fletes (rafex)

## Problema

`SPEC-KB-0001` cerró con `TASK-KB-0004` parcial (issue #21): `preferences.kbMaxPerQuestion` existe en el protocolo pero solo se soporta `1` — si se pide más, el sistema avisa que no lo cumple, en vez de intentarlo. Al debatir cómo cerrarlo, quedó claro que "simplemente permitir N" no alcanza — hay preguntas reales que cruzan más de un dominio normativo (ejemplo motivador: *"¿Puedo circular en moto por el carril del Metrobús y qué multa aplica?"*, que toca Reglamento de Tránsito, Ley de Movilidad, y posiblemente más KBs), y consultarlas todas sin control genera ruido, más tokens, más latencia, y respuestas menos precisas — inaceptable en el hardware comunitario de este stack (modelos pequeños, sin GPU, ventana de contexto de 4096 tokens).

## Propuesta

### Flujo de selección de KBs

1. **Catálogo visible antes de preguntar** — el Portal muestra la lista de KBs disponibles (reutiliza `GET /api/fhs/providers?type=mcp` filtrado por capability `kb.query`, ya usado hoy para poblar el selector — aquí como un catálogo navegable, no solo un dropdown).
2. **Selección manual** (ya implementada en SPEC-KB-0001, `preferences.kb`) — si el usuario elige, se usa esa directamente, sin pasos adicionales.
3. **Si no elige ninguna:** matching determinístico (mismo mecanismo ya usado en modo "recomendada" — Jaccard/embeddings contra `capability.description`/`tags`, DEC-0028) puntúa todas las KBs disponibles contra la pregunta.
4. **Top-N sobre un umbral** — de las que puntúan por encima de un umbral mínimo (valor exacto sin definir, ver preguntas abiertas), se toman las mejores para acotar la consulta — nunca todas las KBs registradas.
5. **Si ninguna puntúa por encima del umbral:** el LLM elige entre las KBs disponibles (o decide no usar ninguna). Esto es un cambio respecto al diseño original de SPEC-KB-0001 (que solo permitía "recomendar ninguna" en este caso) — ver justificación de por qué esto ya no viola DEC-0020 en la sección siguiente.
6. **Requisito no negociable:** las KBs efectivamente consultadas (paso 4 o 5) **siempre se muestran al usuario** — nunca una elección oculta. Este requisito es lo que hace aceptable el paso 5 (ver más abajo).

### Por qué el paso 5 no repite el riesgo de DEC-0020/DEC-0027

El motivo original para nunca dejar que el LLM decida qué KB usar (DEC-0020, reafirmado en DEC-0027 para el modo "mágico") era que una elección **oculta** y equivocada produce un fallo silencioso — una respuesta que suena autorizada pero viene del dominio incorrecto, sin ninguna señal visible de error. Ese riesgo depende de que la elección esté oculta. Si el sistema **siempre** muestra qué KB(s) se consultaron (requisito del paso 6), la elección deja de ser silenciosa — se vuelve visible y auditable, igual que un `tool.error`. Por eso el paso 5 (LLM elige solo cuando no hay match determinístico confiable) es aceptable **únicamente** si el paso 6 se cumple siempre, sin excepción.

El "modo mágico" de DEC-0027 (recomendar sin pedir confirmación) sigue sin implementarse — este spec no lo reabre. La diferencia es que aquí el LLM solo interviene en el caso límite (nada puntuó bien) y su elección se muestra igual que cualquier otra, no reemplaza la confirmación del modo recomendado normal.

### Mecanismo real del paso 5 (DEC-0054, cierra la pregunta abierta #3)

Se descartó un loop de razonamiento de varios pasos (propuesto y debatido, ver DEC-0050) — cada paso adicional es una nueva oportunidad de que el modelo no llene el formato esperado (DEC-0016/DEC-0017), así que un loop **compone** el riesgo de confiabilidad en vez de reducirlo. En su lugar se aplica la misma disciplina ya usada para el catálogo de parsers tolerantes (DEC-0050/SPEC-PARSER-0001): **una sola llamada al LLM + un parser determinístico y tolerante**, validado contra los ids realmente ofrecidos.

Concretamente: se le presenta al modelo la lista de KBs disponibles (id + descripción) y se le pide responder únicamente con `{"kbId": "<id>"}` o `{"kbId": null}`. El parser (`chooseKbViaTolerantParse`) quita fences de markdown si los hay, intenta `JSON.parse`, y valida que el `kbId` devuelto exista realmente entre las candidatas ofrecidas — igual que `tryParseFallbackToolCall`/`tryParseWithCatalog` nunca acepta un nombre de tool que no se ofreció. Si el parseo falla, el campo no es un string, o el id no está en la lista de candidatas, el resultado determinístico es "ninguna KB" — nunca se adivina ni se reintenta.

### Reutilizar RAG como mecanismo de fusión, no un motor nuevo

Cuando se consultan N KBs (paso 4), sus resultados se fusionan **indexándolos en el RAG de la conversación** (`document_index`, uno por cada KB consultada) y haciendo una sola `document_query` sobre ese índice acumulado — el mecanismo de similitud que RAG ya tiene (Jaccard, DEC-0026) hace la fusión/reranking global, sin inventar un motor de reranking nuevo.

**Campo `source` (DEC-0054, cierra la pregunta abierta #2):** `document_index` gana un parámetro opcional `source: string` (default `"user-upload"` si se omite — compatible con lo que ya existía); `document_query` devuelve ese mismo campo por chunk (`{ text, score, source }`). Navigator etiqueta cada chunk copiado desde una KB como `"kb:<providerId>"` al indexarlo, y usa esa procedencia para anteponer `[Fuente: <providerName>]` al texto que llega al LLM — mismo patrón textual ya usado para `KbCitation` (DEC-0049).

**Bug real encontrado al implementar:** `RagBridge.index()` (el motor mínimo de referencia de `rag-provider`) **reemplazaba** el índice de la conversación en cada llamada, en vez de acumular. Con una sola KB (o un solo documento de usuario) esto era invisible — pero la fusión multi-KB necesita varias llamadas a `document_index` (una por KB) para el mismo `conversationId`, y cada llamada nueva borraba silenciosamente las anteriores. Corregido para que acumule (`[...existentes, ...nuevos]`) — de otro modo el diseño de fusión de este spec no podía funcionar en absoluto, con o sin el campo `source`.

### Qué se deja a la generación del LLM (no a la ejecución/enrutamiento)

Distinción explícita, ya usada para justificar el paso 5: una decisión de **ejecución/enrutamiento** (qué tool se llama) debe seguir siendo determinística porque un error ahí es invisible; una decisión de **síntesis/redacción** (cómo se pondera y se cita cada fuente en el texto final) puede dejarse al LLM porque un error ahí es visible en la respuesta misma, no oculto.

- **Atribución en el texto** ("Según el Reglamento de Tránsito..., La Ley de Movilidad complementa...") — se resuelve con prompting: cada chunk llega etiquetado con su KB de origen (mismo campo `source` de arriba), y una instrucción de sistema le pide al modelo citar la fuente. No requiere lógica nueva de protocolo.
- **Prioridad normativa** ("oficial pesa más que un blog") — ver "Explícitamente diferido" abajo.

### Calificación del usuario (nuevo, sin diseñar en detalle)

El usuario debe poder calificar si la(s) KB(s) consultadas respondieron bien — mecanismo **distinto** de `satelite-rating` (que mide latencia/disponibilidad de nodo, no calidad de la elección/respuesta). No se diseña en este spec más allá de reconocer que existe la necesidad — ver preguntas abiertas.

## Explícitamente diferido (documentado, sin resolver)

**Prioridad normativa entre KBs** (ej. un reglamento oficial debería pesar más que una guía educativa al sintetizar una respuesta) — el usuario señaló explícitamente que esto es complejo y no se resuelve ahora. Una opción considerada (campo `capability.trustLevel`/`priority` autodeclarado) tiene el mismo problema que ya se identificó para `capability.tags` (DEC-0028): autodeclarado, no verificable, y la mitigación real (tags de comunidad) está bloqueada hasta `SPEC-AUTH-0001`. Se documenta como premisa a futuro, sin solución técnica asignada — mismo patrón que el modo "mágico" (DEC-0027) o el puente NATS (SPEC-BRIDGE-0001).

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| El LLM elige una KB de baja relevancia en el caso "sin match confiable" (paso 5) | Medio | Mitigado por el requisito de mostrar siempre qué KB se consultó (paso 6) — el usuario puede detectar y calificar una mala elección, no es un fallo oculto |
| Mezclar en el mismo índice de RAG contenido subido por el usuario y contenido copiado desde KBs, sin poder distinguirlos | Alto si no se implementa el campo `source` | Resuelto (DEC-0054): `document_index`/`document_query` cargan `source` por chunk |
| Combinar contexto de varias KBs excede la ventana de contexto (4096 tokens) del modelo de producción de este stack, o lo vuelve notablemente más lento | Medio–Alto | Mitigado por el límite `kbMaxPerQuestion` (top-N sobre umbral, nunca todas las KBs) + advertencia obligatoria en el Portal cuando se sube de 1 (DEC-0027, implementada) |
| Prioridad normativa sin resolver puede producir respuestas donde una fuente no oficial se cite con el mismo peso que una oficial | Medio | Ninguna por ahora — diferido explícitamente, ver arriba |
| El LLM del paso 5 no llena el JSON esperado (mismo riesgo de DEC-0016/DEC-0017 para tool-calling, aplicado aquí a una decisión estructurada distinta) | Medio | Mitigado por diseño (DEC-0054): una sola llamada + parser tolerante validado contra las candidatas reales; si falla, resultado determinístico "ninguna KB" — nunca se adivina |

## Preguntas abiertas (para cuando se priorice implementar)

1. ~~¿Cuál es el umbral numérico exacto de similitud para considerar una KB "candidata" en el paso 4?~~ **Resuelta (DEC-0054):** `0.05` — mismo valor ya usado por el modo "recomendada" de `SPEC-KB-0001`, para no introducir un segundo número arbitrario.
2. ~~Diseño completo del campo `source`/procedencia en `document_index`/`document_query` (RAG)~~ **Resuelta (DEC-0054):** `source?: string`, opcional, default `"user-upload"`; Navigator usa `"kb:<providerId>"` al fusionar.
3. ~~Cuando el LLM elige en el paso 5, ¿esa elección se pide vía tool-calling... o se resuelve de otra forma?~~ **Resuelta (DEC-0054):** ni tool-calling ni loop de razonamiento — una sola llamada + parser tolerante determinístico (mismo patrón de DEC-0050), validado contra las candidatas realmente ofrecidas.
4. Mecánica de la calificación del usuario — ¿qué se califica exactamente (la respuesta completa, cada KB individual), cómo se usa esa señal después (solo informativa/telemetría, o retroalimenta algo automático), y dónde vive (Portal, Atlas, otro lado). **Sin resolver** — fuera del alcance de esta ronda de cierre.
5. ¿El contenido de una KB copiado al RAG de la conversación (para la fusión) hereda el TTL de RAG (`PT4H`, DEC-0025) o el `permanent-readonly` de la KB original? **Sin resolver** — la implementación actual no aplica ningún TTL especial al contenido fusionado (vive mientras dure la conversación en memoria del `rag-provider`, igual que cualquier otro chunk indexado), sin una decisión explícita documentada todavía.
6. Prioridad normativa (ver "Explícitamente diferido") — sin solución técnica asignada.

## Enlaces y decisiones relacionadas

- `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001) — spec que este documento extiende; TASK-KB-0004 es el origen de esta iniciativa.
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — mecanismo de fusión reutilizado (`document_index`/`document_query`).
- DEC-0020 — ejecución determinística de decisiones críticas; base de la distinción "ejecución vs. síntesis" de este spec.
- DEC-0016/DEC-0017 — confiabilidad de tool-calling en este hardware; relevante para la pregunta abierta #3.
- DEC-0026/DEC-0037 — el protocolo define el contrato, nunca el motor interno; aplica a por qué no se impone un algoritmo de reranking nuevo (se reutiliza RAG).
- DEC-0027 — modo "mágico" de KB, diferido; este spec no lo reabre, solo cubre el caso límite de "sin match confiable".
- DEC-0028 — `Signal.tags`, y la misma tensión de "autodeclarado, no verificable" que bloquea resolver la prioridad normativa aquí.
- DEC-0050/`spec-native/specs/parser-catalog/SPEC.md` (SPEC-PARSER-0001) — mismo patrón (una llamada + parser tolerante determinístico, validado contra candidatas conocidas) reutilizado aquí para el paso 5.
- Issue #21 en GitHub — seguimiento público de esta iniciativa.

## Tareas relacionadas

- Ver `spec-native/tasks/kb-multi-consulta/TASKS.md`.

## Notas

- Implementado el 2026-07-07 (DEC-0054): umbral `0.05`, campo `source` en RAG (con el bug de `RagBridge.index()` reemplazando en vez de acumular corregido), mecanismo del paso 5 vía parser tolerante de una sola llamada, UI de `kbMaxPerQuestion` con advertencia (DEC-0027) agregada al Portal (no existía ningún control para esto antes — el campo del protocolo nunca se enviaba desde el frontend). Verificado con `npm run typecheck`/`build` en `galaxIA` y `galaxIA-satellite-star`; toggle de advertencia verificado en `portal-dev` real.
- Pendiente (backlog, no bloqueante): verificación E2E completa con el stack real (Atlas + Navigator + Portal + rag-provider + ≥2 kb-provider) — no ejecutada en esta sesión, sin ese stack corriendo; preguntas abiertas #4 (calificación del usuario) y #5 (retención del contenido fusionado) sin resolver.
