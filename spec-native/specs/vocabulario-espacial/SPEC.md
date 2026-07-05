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

## Decisión: Opción B — "Star" para LLM, "Satellite" para tools

**Resuelto (2026-07-05):** se elige la **Opción B**. "Estrella" (Star)
nombra un nodo de razonamiento/generación (LLM); "satélite" (Satellite)
nombra un nodo de herramientas (OCR, búsqueda, etc.) — no son sinónimos.
Cuando algo aplica a cualquier tipo de nodo por igual, se usa **"nodo"**
como término neutro, no "satélite" como paraguas (ese uso quedó
descartado). Ver entrada nueva en `spec-native/DECISIONS.md` para el
registro formal de esta decisión.

Motivo: metáfora más precisa — en una galaxia, las estrellas son fuente
de energía/razonamiento; los satélites orbitan y aportan una función
específica. `spec-native/specs/satelite-rating/SPEC.md` y
`spec-native/specs/p2p-discovery/SPEC.md` ya se actualizaron para
reflejar esto (ambas seguían en `draft`, sin código implementado, así
que el costo de cambiarlas fue bajo — se decidió antes de empezar a
programar, no después).

## Vocabulario (tabla canónica)

| Concepto técnico | Nombre GalaxIA | Motivo |
|---|---|---|
| Red completa | Galaxy / GalaxIA Network | La federación completa de nodos |
| Nodo proveedor (genérico, cualquier tipo) | Node / Nodo | Término neutro cuando no importa si es Star o Satellite |
| LLM provider | Star | Fuente de razonamiento/generación — central, como una estrella |
| Tool provider | Satellite | Capacidad específica que orbita y aporta una función (OCR, búsqueda, etc.) |
| Registro (Registry) | Atlas | Mapa de nodos y capacidades |
| Manifiesto (manifest) | Beacon | Lo que anuncia un nodo al conectarse |
| Chat web | Portal | Entrada humana a la red |
| Orquestador / Agent Runtime | Navigator | Decide rutas entre razonamiento (Star) y herramientas (Satellite) |
| Ejecución de una tool (`tool.call`) | Mission | Una tarea enviada a un satélite |
| Auditoría/procedencia (`provenance`) | Flight Log | Registro de qué pasó, qué nodo, qué datos |
| Heartbeat (`ping`/`pong`) | Pulse | Señal periódica de vida |
| Conexión activa con la red | Orbit | Estado de "conectado y registrado" |
| Capacidad (`capability`) | Signal | Lo que un nodo anuncia que puede hacer |

Subtipos de satélite reservados para cuando existan (sin implementar
hoy): *Tool Satellite* (genérico, ya cubierto por "Satellite" a secas),
*Memory Satellite* (búsqueda/vector store), *Storage Satellite*
(archivos/documentos), *Bridge Satellite* (conecta con otro protocolo o
red). No hay subtipos de Star reservados todavía — un solo tipo de
razonamiento por ahora.

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
> convierten en estrellas y satélites. Cada estrella aporta razonamiento;
> cada satélite aporta una capacidad — OCR, búsqueda, memoria o
> automatización. El Portal los descubre mediante Atlas y el Navegador
> los combina en un agente comunitario.

**Inglés** (para documentación en inglés, si se necesita):

> GalaxIA is a sovereign AI galaxy where old computers become stars and
> satellites. Each star contributes reasoning; each satellite
> contributes a capability — OCR, search, memory or automation. The
> Portal discovers them through Atlas, and the Navigator combines them
> into a community agent.

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Aplicar el vocabulario nuevo solo en documentos nuevos deja inconsistencia con lo ya escrito (`docs/`, `spec-native/`, la presentación, el portal) | Medio | Mientras no se ejecute la actualización retroactiva (fuera de alcance), documentar explícitamente que ambos vocabularios conviven — el técnico en código/protocolo, el espacial en material nuevo de cara a usuario |
| Cambiar el significado de "satélite" después de ya usarlo en 2 specs y en `ROADMAP.md`/`TRACEABILITY.md` | Medio | Resuelto: `satelite-rating`, `p2p-discovery`, `ROADMAP.md` y `TRACEABILITY.md` ya se actualizaron al vocabulario nuevo (nodo/estrella/satélite) como parte de esta misma iteración |
| Renombrar código/carpetas/contenedores reales bajo presión de "se ve más bonito", sin medir el costo de romper despliegues ya verificados en 3 máquinas | Alto si se hiciera ahora | Explícitamente fuera de alcance en esta iteración (ver arriba) — cualquier renombrado de código requiere su propia spec y decisión |
| Inconsistencia entre la frase de posicionamiento (ya asume Opción A) y lo que finalmente se decida | Bajo | La frase se marca explícitamente como "pendiente de ajuste si se elige Opción B" (ver arriba) |

## Criterios de aceptación

- [x] Decisión explícita tomada entre Opción A y Opción B — Opción B,
      documentada en `spec-native/DECISIONS.md` como nueva entrada.
- [ ] Tabla de vocabulario publicada en un único lugar referenciable
      (`docs/vocabulario.md`, nombre tentativo) que otros documentos citan
      en vez de reinventar la lista.
- [x] Sección "Vocabulario" de `satelite-rating/SPEC.md` y
      `p2p-discovery/SPEC.md` actualizada a la Opción B (nodo/estrella/
      satélite), incluyendo sus `TASKS.md` y diagramas de secuencia.
- [ ] Frase de posicionamiento (ES/EN) incorporada al portal web
      (`site/index.md` de este mismo repo) — ya redactada arriba,
      distinguiendo estrellas de satélites, falta incorporarla al sitio.
- [ ] Ningún archivo de código (`.ts`, nombres de carpeta, nombres de
      contenedor) se modifica como parte de esta spec — solo
      documentación/vocabulario.
- [x] `docs/README.md`, `docs/protocolo.md`, `site/protocolo.md` y
      `package.json` actualizados de `Federation of Sovereign Hosts` /
      `Federación de Nodos Soberanos` a `Federation of Sovereign
      Horizons` / `Federación de Horizontes Soberanos`, manteniendo la
      sigla `FHS` sin cambios (TASK-VOCAB-0004b).

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
