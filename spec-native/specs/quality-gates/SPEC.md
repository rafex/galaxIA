# SPEC-QUALITY-0001 — Tests reales, formato/estilo, y workflow de regresión continua

## Estado

`accepted` — implementado (DEC-0073, 2026-07-11). Las tres piezas que faltaban al proponer esta spec ya están cerradas:

1. **Tests unitarios/integración**: ESLint real (`eslint.config.mjs`, ya no placeholder) + suites Vitest en los 4 workspaces — resuelto en sesiones previas a esta entrada (no requirió una iniciativa aparte, se fue completando junto con DEC-0048/DEC-0069).
2. **Workflow de regresión funcional real**: `scripts/e2e-smoke.ts` + job `e2e-smoke` en `ci.yml` (DEC-0073) — levanta Atlas + Navigator reales, registra un Star mock con los payloads endurecidos de DEC-0069 (hello/register firmados, welcome verificado, `visibility` propagada) y ejerce un `chat.request`/`chat.completed` real por la API pública, verificando `CallerAuth` en el camino. Encontró un bug real la primera vez que corrió (ver "Hallazgo").
3. **Formato/estilo**: ESLint typescript-eslint con `no-explicit-any`/`no-unsafe-*` en `error` (política DEC-0055-ish, ver CLAUDE.md del repo) — ya activo, no placeholder.

## Hallazgo real (justifica la spec por sí solo)

La primera corrida del smoke E2E expuso un bug de robustez que ningún test unitario ni typecheck detectaba: si un provider responde `chat.completed` sin el campo `toolCalls` (opcional en la práctica del wire aunque el tipo TS lo declare obligatorio), `AgentRuntime.callLlm` lanzaba `TypeError: Cannot read properties of undefined (reading 'length')` **sin capturar** — la conversación quedaba colgada indefinidamente sin ningún error visible para el usuario ni evento SSE. Corregido normalizando `toolCalls ?? []` en `llm-gateway.ts` al recibir el mensaje del wire (ambos paths: `generate` y `stream`). Exactamente el tipo de bug que "compila y tipa" nunca iba a encontrar — solo ejercer el flujo real lo hizo.

## Owner

Raúl Fletes (rafex)

## Contexto

`DEC-0042` agregó `.github/workflows/ci.yml`: typecheck + build + un gate de lint que hoy es un placeholder (`echo 'No linter configurado todavía'`, siempre pasa). Eso valida que el código **compile y tipe** — no valida que **funcione**, ni que siga un estilo o unas convenciones consistentes. `spec-native/pipelines/CI.md` ya documenta esa distinción explícitamente (ver sección "Gates obligatorios", fila "Verificación end-to-end real").

El usuario señaló, al cerrar DEC-0042, que faltan tres piezas reales:

1. **Tests** (unitarios/integración) — hoy no existe ninguna suite automatizada en el repo. Toda verificación de comportamiento es manual: procesos reales levantados a mano, descrita caso por caso en `DECISIONS.md`/`TASKS.md` de cada iniciativa (ver la regla derivada en `spec-native/TRACEABILITY.md`, "registrado no es probado").
2. **Un workflow que valide que el protocolo/sistema sigue funcionando** — algo más allá de "compila", que ejerza el comportamiento real (idealmente automatizando el patrón manual que ya se usa hoy: levantar Atlas + Navigator + un Star/Satellite mock y correr un flujo de chat/tool real).
3. **Control de formato/estilo y mejores prácticas** — hoy no hay ningún linter/formatter real configurado (ni ESLint, ni Prettier, ni nada equivalente); el gate de lint de `ci.yml` es un placeholder a propósito, documentado como tal.

## Alcance (a definir cuando se retome, no cerrado aquí)

Esta spec **no** decide todavía:

- Framework de test (Vitest, Jest, node:test nativo, u otro) — a evaluar cuando se priorice.
- Qué se prueba primero: ¿unitario en `packages/fhs-protocol` (validación de manifiestos, tipos, mensajes) o integración end-to-end (Atlas + Navigator + un mock provider real por WebSocket)? Dado que el patrón de verificación manual ya usado en todo el proyecto es "levantar procesos reales y ejercer un flujo real" (ver casi cualquier entrada de `DECISIONS.md`), un test de integración real que automatice ese mismo patrón probablemente valga más que tests unitarios aislados — pero es una decisión a tomar cuando se retome, no aquí.
- Linter/formatter concretos — candidatos obvios: ESLint (reglas de TypeScript) + Prettier (formato), pero sin decidir configuración, reglas activadas, o si se adopta un preset existente vs. uno propio.
- Si el gate de "sigue funcionando" vive en el mismo `ci.yml` (por PR) o en un workflow aparte con triggers distintos (ej. nightly, o solo en push a `main`) — un test de integración real que levante varios procesos reales probablemente sea más lento que typecheck/build, lo cual puede justificar un pipeline separado.

## Por qué se documenta ahora y se implementa después

El usuario pidió explícitamente dejar esto como spec pendiente, no como tarea activa — se retoma cuando las definiciones/decisiones actuales del proyecto estén cerradas, para no interrumpir el hilo de trabajo en curso. Este documento existe para que la necesidad quede registrada y no se pierda entre sesiones, no como compromiso de fecha.

## Relación con specs y decisiones existentes

- `spec-native/pipelines/CI.md` / `CD.md` — donde vivirá la descripción del pipeline real una vez implementado.
- `spec-native/DECISIONS.md` DEC-0042 — el CI de typecheck/build/lint que esta spec extiende.
- `spec-native/TRACEABILITY.md` — la regla "registrado no es probado" que un test suite automatizado real terminaría de resolver de raíz (hoy depende de que un humano/agente recuerde verificar manualmente).

## Decisiones tomadas al implementar (DEC-0073)

1. Framework de test: **Vitest** (ya en uso en los 4 workspaces).
2. El smoke E2E corre **en el mismo `ci.yml`**, como job separado (`e2e-smoke`) — no bloquea lint/typecheck/test/build (corren en paralelo), pero sí bloquea el merge si falla. No se justificó un workflow aparte: el costo adicional (~1 min de build + arranque de 2 procesos) es aceptable por PR.
3. **No** se aplicó todavía a `galaxIA-satellite-star` — queda como trabajo futuro de ese repo, mismo principio de DEC-0026/DEC-0037 (no es responsabilidad de `galaxIA` gestionar la calidad de sus consumidores).
4. El smoke prioriza **integración real de punta a punta** sobre unitarios aislados para el flujo del protocolo — confirmado como la decisión correcta por el hallazgo real que produjo en su primera corrida (ver arriba), algo que ningún test unitario habría detectado.
