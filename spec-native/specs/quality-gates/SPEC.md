# SPEC-QUALITY-0001 — Tests reales, formato/estilo, y workflow de regresión continua

## Estado

`proposed` — solo documentado, sin implementar. Se retoma explícitamente después de cerrar las definiciones/decisiones activas del proyecto (indicación del usuario, 2026-07-06).

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

## Preguntas abiertas (para cuando se priorice)

1. ¿Framework de test?
2. ¿Unitario primero, integración primero, o ambos desde el inicio?
3. ¿ESLint + Prettier, u otra combinación? ¿Reglas estrictas desde el día uno, o incrementales (permitir warnings, subir a error con el tiempo)?
4. ¿El test de integración/regresión corre en el mismo `ci.yml` por PR, o en un workflow aparte con trigger distinto?
5. ¿Se aplica también a `galaxIA-satellite-star` (los providers de referencia), o solo a este repo primero?
