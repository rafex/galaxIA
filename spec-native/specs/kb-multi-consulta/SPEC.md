# SPEC-KB-0002 — Consulta de múltiples KBs por pregunta

## Estado

`accepted` (diseño cerrado, con dos puntos explícitamente diferidos) — sin implementar. Extiende `SPEC-KB-0001` (`done (local)`). Ver DEC-0048.

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

### Reutilizar RAG como mecanismo de fusión, no un motor nuevo

Cuando se consultan N KBs (paso 4), sus resultados se fusionan **indexándolos en el RAG de la conversación** (`document_index`, uno por cada KB consultada) y haciendo una sola `document_query` sobre ese índice acumulado — el mecanismo de similitud que RAG ya tiene (Jaccard, DEC-0026) hace la fusión/reranking global, sin inventar un motor de reranking nuevo.

**Extensión de protocolo necesaria:** para no perder de dónde vino cada fragmento (requisito de mostrar procedencia en la respuesta — ver ejemplo en Riesgos), `document_index`/`document_query` necesitan cargar un campo de origen por chunk (ej. `source: "kb:<providerId>"` vs. `source: "user-upload"`) — sin esto, no se puede distinguir contenido subido por el usuario de contenido copiado desde una KB dentro del mismo índice de RAG de la conversación, ni atribuir una respuesta a la KB correcta.

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
| Mezclar en el mismo índice de RAG contenido subido por el usuario y contenido copiado desde KBs, sin poder distinguirlos | Alto si no se implementa el campo `source` | Requiere la extensión de protocolo descrita arriba (`document_index`/`document_query` con `source` por chunk) — no opcional para esta iniciativa |
| Combinar contexto de varias KBs excede la ventana de contexto (4096 tokens) del modelo de producción de este stack, o lo vuelve notablemente más lento | Medio–Alto | Mismo riesgo ya documentado en SPEC-KB-0001/DEC-0027 — el límite de "top-N sobre un umbral" (no todas las KBs) es la mitigación principal, pero el umbral exacto queda sin definir (ver preguntas abiertas) |
| Prioridad normativa sin resolver puede producir respuestas donde una fuente no oficial se cite con el mismo peso que una oficial | Medio | Ninguna por ahora — diferido explícitamente, ver arriba |

## Preguntas abiertas (para cuando se priorice implementar)

1. ¿Cuál es el umbral numérico exacto de similitud para considerar una KB "candidata" en el paso 4? No definido.
2. Diseño completo del campo `source`/procedencia en `document_index`/`document_query` (RAG) — nombre del campo, si es obligatorio u opcional, cómo se distingue "usuario" de "kb:&lt;id&gt;".
3. Cuando el LLM elige en el paso 5 (sin match confiable), ¿esa elección se pide vía tool-calling del propio LLM (con el riesgo de confiabilidad ya documentado en DEC-0016/DEC-0017 para este hardware), o se resuelve de otra forma (ej. el LLM solo redacta con el conjunto de candidatas ya dado, sin "elegir" activamente vía una tool call)? No resuelto — afecta directamente si el paso 5 hereda el mismo problema de confiabilidad que motivó el determinismo original.
4. Mecánica de la calificación del usuario — ¿qué se califica exactamente (la respuesta completa, cada KB individual), cómo se usa esa señal después (solo informativa/telemetría, o retroalimenta algo automático), y dónde vive (Portal, Atlas, otro lado).
5. ¿El contenido de una KB copiado al RAG de la conversación (para la fusión) hereda el TTL de RAG (`PT4H`, DEC-0025) o el `permanent-readonly` de la KB original? Afecta el modelo de privacidad/retención de la conversación.
6. Prioridad normativa (ver "Explícitamente diferido") — sin solución técnica asignada.

## Enlaces y decisiones relacionadas

- `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001) — spec que este documento extiende; TASK-KB-0004 es el origen de esta iniciativa.
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — mecanismo de fusión reutilizado (`document_index`/`document_query`).
- DEC-0020 — ejecución determinística de decisiones críticas; base de la distinción "ejecución vs. síntesis" de este spec.
- DEC-0016/DEC-0017 — confiabilidad de tool-calling en este hardware; relevante para la pregunta abierta #3.
- DEC-0026/DEC-0037 — el protocolo define el contrato, nunca el motor interno; aplica a por qué no se impone un algoritmo de reranking nuevo (se reutiliza RAG).
- DEC-0027 — modo "mágico" de KB, diferido; este spec no lo reabre, solo cubre el caso límite de "sin match confiable".
- DEC-0028 — `Signal.tags`, y la misma tensión de "autodeclarado, no verificable" que bloquea resolver la prioridad normativa aquí.
- Issue #21 en GitHub — seguimiento público de esta iniciativa.

## Tareas relacionadas

- Aún no creadas — `spec-native/tasks/kb-multi-consulta/TASKS.md` se escribe cuando se priorice la implementación.
