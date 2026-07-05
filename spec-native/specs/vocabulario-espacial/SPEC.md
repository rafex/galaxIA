# SPEC-VOCAB-0001 — Vocabulario espacial coherente con "GalaxIA"

## Estado

`draft`

## Owner

Raúl Fletes (rafex)

## Problema

El nombre del proyecto ya juega con la metáfora "Galaxia + IA" (`GalaxIA` =
`Galaxy` + `IA`/`AI`), pero el resto del vocabulario técnico es genérico:
`provider`, `registry`, `agent`, `manifest`, `heartbeat`, `provenance`,
"chat web". Ninguno refuerza la marca ni la metáfora espacial que el
nombre ya promete.

Ya existe una primera decisión parcial de vocabulario: la sección
"Vocabulario" de `spec-native/specs/satelite-rating/SPEC.md` adoptó
**"satélite"** como el nombre de producto para cualquier nodo de la red
(LLM u OCR/tool, sin distinción), dejando el protocolo (`provider`,
`providerId`) sin cambios. `spec-native/specs/p2p-discovery/SPEC.md`
reutiliza el mismo término.

El usuario propone ahora un vocabulario mucho más completo — cubre la red
completa, el registro, el manifiesto, el chat, el orquestador, y la
ejecución de tools — pero con un matiz que **entra en conflicto directo**
con lo ya decidido: reserva "Star" para nodos de razonamiento (LLM) y dice
que "Satellite" debería ser solo para nodos de herramientas, no un término
general. Ver "Decisión pendiente" abajo — es lo primero que hay que
resolver antes de aplicar cualquier tabla de nombres.

## Alcance

### Dentro del alcance

- Tabla canónica de vocabulario espacial (ver "Vocabulario propuesto"),
  cubriendo: la red completa, el Registry, el manifiesto, el chat web, el
  agente/orquestador, LLM provider, tool provider, ejecución de una tool,
  procedencia/auditoría, heartbeat.
- Confirmar (o corregir) la regla de dos capas ya usada para "satélite":
  el protocolo y el código internos **no cambian de nombre**
  (`provider`, `capability`, `manifest`, `registry`, `requestId`, tipos de
  `packages/fhs-protocol`, etc.) — el vocabulario espacial se usa en
  documentación, presentaciones, portal web y mensajes de cara al
  usuario, nunca en el JSON del protocolo ni en identificadores de código.
- Resolver explícitamente el conflicto Star vs. Satélite (ver "Decisión
  pendiente") antes de que cualquier documento nuevo use la tabla.
- Adoptar la frase de posicionamiento en español e inglés que ya redactó
  el usuario, como texto de referencia reutilizable (portal web,
  presentaciones futuras).
- Un lugar único donde vivir la tabla canónica (`docs/vocabulario.md`,
  nombre tentativo) que cualquier otro documento pueda citar en vez de
  reinventar la lista.
- **Reformular la expansión de las siglas FHS**: de `Federation of
  Sovereign Hosts` (`Federación de Nodos Soberanos`) a `Federation of
  Sovereign Horizons` (`Federación de Horizontes Soberanos`) — mismas
  siglas `FHS`, más coherente con la metáfora espacial de la marca y
  menos "servidores", más "expansión comunitaria". Confirmado de bajo
  riesgo: la expansión completa solo aparece en 3 archivos de
  documentación (`docs/README.md`, `docs/protocolo.md`,
  `site/protocolo.md`) más la presentación `red-soberana-de-ia` (repo
  aparte) — **ningún identificador de código, constante ni mensaje
  tipado** deletrea las palabras completas (`FHS_VERSION`, `type: "hello"`,
  etc. usan solo la sigla). A diferencia del resto de renombrados de esta
  spec, este sí se puede ejecutar como parte de la misma iteración.

### Fuera del alcance (para esta iteración)

- **Renombrar paquetes o carpetas del repo** (`apps/web` → algo tipo
  "portal", `apps/agent-server` → algo tipo "navigator"/"atlas",
  `packages/fhs-protocol` → algo tipo "protocol", `examples/llm-provider`
  → algo tipo "star", `examples/ocr-provider` → algo tipo
  "ocr-satellite"). Esto es un cambio de ingeniería real, no solo de
  vocabulario: rompe imports (`@galaxia/fhs-protocol`), el `Justfile`,
  todos los scripts de despliegue, y — más urgente — los **nombres de
  contenedor ya corriendo en las 3 máquinas reales de la demo**
  (`fhs-agent-server`, `fhs-llm-provider`, `fhs-ocr-provider`,
  `fhs-web`). Se registra como decisión futura separada, con su propia
  spec si se decide avanzar; no se ejecuta aquí.
- **Cambiar los mensajes tipados del protocolo** (`hello`, `register`,
  `chat.request`, etc.) o la sigla `FHS` en sí — solo se reformula qué
  significan las siglas (ver "Dentro del alcance"), no los mensajes ni el
  nombre corto del protocolo.
- **Actualizar retroactivamente** todo lo ya escrito con el vocabulario
  viejo (`docs/*.md`, `spec-native/*.md`, la presentación
  `red-soberana-de-ia`, el portal web `site/`). Son decenas de archivos;
  se deja como trabajo de seguimiento explícito (ver TASKS.md), no se
  ejecuta como parte de esta spec.
- **Inventar tipos de provider que no existen todavía** (ej. "Memory
  Satellite", "Storage Satellite", "Bridge Satellite" de la propuesta
  original). Se documentan como nombres reservados para cuando esas
  capacidades existan — no se crea código ni tipos nuevos ahora.

## Decisión pendiente: ¿"satélite" es el término general, o se reserva para tools?

Esto es lo primero que hay que resolver, porque cambia el significado de
un término que ya se usó en dos specs en `draft`
(`satelite-rating`, `p2p-discovery`) y en `ROADMAP.md`/`TRACEABILITY.md`.

**Opción A — "Satélite" como paraguas (lo ya decidido, sin cambios)**

- Satélite = cualquier nodo de la red, sin distinción de tipo.
- Subtipos con adjetivo cuando hace falta precisión: "satélite de
  razonamiento" (LLM), "satélite de herramienta" (tool) — en vez de una
  palabra completamente distinta.
- Ventaja: cero retrabajo en `satelite-rating`/`p2p-discovery`, que ya
  usan "satélite" en ese sentido general.

**Opción B — "Star" para LLM, "Satellite" solo para tools (propuesta nueva)**

- Metáfora más precisa: en una galaxia, las estrellas son fuente de
  energía/razonamiento; los satélites orbitan y aportan una función
  específica. Encaja mejor con la explicación que da la propuesta.
- Requiere actualizar la sección "Vocabulario" de
  `spec-native/specs/satelite-rating/SPEC.md` y
  `spec-native/specs/p2p-discovery/SPEC.md` — ambas siguen en `draft`,
  sin código implementado todavía, así que el costo de cambiarlas ahora
  es bajo. Sería mucho más caro decidir esto después de implementar
  `satelite-rating` (habría que renombrar el rating, las métricas, y
  toda mención ya hecha).

**Recomendación:** decidirlo ahora, no después de implementar
`satelite-rating` — es el momento más barato para cambiar de opinión si
se va a cambiar. No se asume ninguna de las dos opciones en el resto de
esta spec hasta que el owner decida.

## Vocabulario propuesto (tabla de referencia)

| Concepto técnico | Nombre GalaxIA | Motivo |
|---|---|---|
| Red completa | Galaxy / GalaxIA Network | La federación completa de nodos |
| Nodo proveedor (genérico) | Satellite *(o Star si se elige Opción B para LLM)* | Cada equipo orbita y aporta algo |
| Registro (Registry) | Atlas | Mapa de nodos y capacidades |
| Manifiesto (manifest) | Beacon | Lo que anuncia un satélite al conectarse |
| Chat web | Portal | Entrada humana a la red |
| Orquestador / Agent Runtime | Navigator | Decide rutas entre razonamiento (LLM) y herramientas |
| LLM provider | Star *(si Opción B)* | Fuente de razonamiento/generación |
| Tool provider | Satellite / Module | Capacidad específica (OCR, búsqueda, etc.) |
| Ejecución de una tool (`tool.call`) | Mission | Una tarea enviada a un nodo |
| Auditoría/procedencia (`provenance`) | Flight Log | Registro de qué pasó, qué nodo, qué datos |
| Heartbeat (`ping`/`pong`) | Pulse | Señal periódica de vida |
| Conexión activa con la red | Orbit | Estado de "conectado y registrado" |
| Capacidad (`capability`) | Signal | Lo que un satélite anuncia que puede hacer |

Subtipos de satélite reservados para cuando existan (sin implementar
hoy): *Reasoning Satellite* (LLM, si se elige Opción A), *Tool Satellite*,
*Memory Satellite* (búsqueda/vector store), *Storage Satellite*
(archivos/documentos), *Bridge Satellite* (conecta con otro protocolo o
red).

## Diseño

### Dos capas: protocolo/código vs. producto/documentación

Mismo principio ya usado para "satélite" en `satelite-rating/SPEC.md`:
el vocabulario espacial vive en documentación, UI y mensajes de cara al
usuario. El protocolo FHS y los identificadores de código
(`provider`, `providerId`, `capability`, `manifest`, `Registry`,
`requestId`) **no cambian** — evita romper compatibilidad, imports, y los
tres despliegues reales ya verificados esta semana. Si en el futuro se
decide alinear también el código (ver "Fuera de alcance"), es una
decisión de ingeniería separada, con su propio análisis de costo/riesgo.

### Frase de posicionamiento

**Español** (para el portal web y presentaciones):

> GalaxIA es una galaxia soberana de IA donde equipos reutilizados se
> convierten en satélites. Cada satélite aporta una capacidad:
> razonamiento, OCR, búsqueda, memoria o automatización. El Portal los
> descubre mediante Atlas y el Navegador los combina en un agente
> comunitario.

**Inglés** (para documentación en inglés, si se necesita):

> GalaxIA is a sovereign AI galaxy where old computers become satellites.
> Each satellite contributes a capability: reasoning, OCR, search, memory
> or automation. The Portal discovers them through Atlas, and the
> Navigator combines them into a community agent.

Nota: ambas frases usan "satélite"/"satellite" como término general
(Opción A). Si se elige la Opción B, hay que ajustar la frase para
distinguir "estrellas" (razonamiento) de "satélites" (herramientas) antes
de publicarla.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Aplicar el vocabulario nuevo solo en documentos nuevos deja inconsistencia con lo ya escrito (`docs/`, `spec-native/`, la presentación, el portal) | Medio | Mientras no se ejecute la actualización retroactiva (fuera de alcance), documentar explícitamente que ambos vocabularios conviven — el técnico en código/protocolo, el espacial en material nuevo de cara a usuario |
| Cambiar el significado de "satélite" (Opción B) después de ya usarlo en 2 specs y en `ROADMAP.md`/`TRACEABILITY.md` | Medio | Si se elige Opción B, actualizar esas menciones como parte de la misma iniciativa que resuelve esta spec — no dejarlas a medias |
| Renombrar código/carpetas/contenedores reales bajo presión de "se ve más bonito", sin medir el costo de romper despliegues ya verificados en 3 máquinas | Alto si se hiciera ahora | Explícitamente fuera de alcance en esta iteración (ver arriba) — cualquier renombrado de código requiere su propia spec y decisión |
| Inconsistencia entre la frase de posicionamiento (ya asume Opción A) y lo que finalmente se decida | Bajo | La frase se marca explícitamente como "pendiente de ajuste si se elige Opción B" (ver arriba) |

## Criterios de aceptación

- [ ] Decisión explícita tomada entre Opción A y Opción B (documentada en
      `spec-native/DECISIONS.md` como nueva entrada, no solo en esta spec).
- [ ] Tabla de vocabulario publicada en un único lugar referenciable
      (`docs/vocabulario.md`, nombre tentativo) que otros documentos citan
      en vez de reinventar la lista.
- [ ] Sección "Vocabulario" de `satelite-rating/SPEC.md` y
      `p2p-discovery/SPEC.md` actualizada si se elige la Opción B, o
      confirmada sin cambios si se elige la Opción A.
- [ ] Frase de posicionamiento (ES/EN) incorporada al portal web
      (`site/index.md` de este mismo repo), ajustada según la opción
      elegida.
- [ ] Ningún archivo de código (`.ts`, nombres de carpeta, nombres de
      contenedor) se modifica como parte de esta spec — solo
      documentación/vocabulario.
- [ ] `docs/README.md`, `docs/protocolo.md` y `site/protocolo.md`
      actualizados de `Federation of Sovereign Hosts` /
      `Federación de Nodos Soberanos` a `Federation of Sovereign
      Horizons` / `Federación de Horizontes Soberanos`, manteniendo la
      sigla `FHS` sin cambios.

## Enlaces relacionados

- `spec-native/specs/satelite-rating/SPEC.md` — decisión de vocabulario
  previa ("satélite" como término general), en conflicto directo con la
  Opción B de esta spec.
- `spec-native/specs/p2p-discovery/SPEC.md` — misma nota de vocabulario,
  mismo posible conflicto.
- `site/` — portal web de galaxIA en este mismo repo, candidato principal
  para aplicar la frase de posicionamiento y el vocabulario nuevo.
- `spec-native/DECISIONS.md` DEC-0001..DEC-0004 — nombres actuales del
  protocolo (`provider`, `manifest`, `registry`) que esta spec decide no
  tocar.
