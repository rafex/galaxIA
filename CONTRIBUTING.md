# Contribuir a galaxIA

Gracias por tu interés en aportar a galaxIA, una PoC de inteligencia
artificial federada y soberana. Este documento resume cómo proponer cambios
de forma que encajen con la forma de trabajar del proyecto.

## Antes de empezar

- Lee [`docs/arquitectura.md`](docs/arquitectura.md),
  [`docs/protocolo.md`](docs/protocolo.md) y
  [`docs/protocolo-provider.md`](docs/protocolo-provider.md) para entender
  el protocolo FHS, cómo se relacionan `navigator`, `portal` y los
  providers, y el contrato plug-and-play que debe cumplir cualquier
  provider nuevo (registro, Pulse, manifiesto, códigos de error).
- Revisa [`docs/vocabulario.md`](docs/vocabulario.md) — galaxIA usa un
  vocabulario de producto propio (Star, Satellite, Atlas, Portal,
  Navigator, Pulse, Mission...) en documentación e interfaz. El protocolo
  y el código (`provider`, `capability`, `manifest`, `registry`) no
  cambian de nombre — usa el término técnico en código, el de producto en
  documentación de cara al usuario.
- Este proyecto usa **SpecNative**: las decisiones de diseño relevantes se
  documentan como entradas numeradas en
  [`spec-native/DECISIONS.md`](spec-native/DECISIONS.md), y el estado general
  del trabajo vive en [`spec-native/ROADMAP.md`](spec-native/ROADMAP.md).
  Antes de proponer un cambio de diseño, revisa si ya hay una decisión
  relacionada.
- El roadmap público, con objetivos y fechas, vive en
  [Issues](https://github.com/rafex/galaxIA/issues) y en el
  [Project — galaxIA Roadmap](https://github.com/users/rafex/projects/9).
  Es un buen punto de partida para encontrar en qué ayudar.

## Cómo reportar un bug

Abre un issue describiendo:

- Qué esperabas que pasara y qué pasó en realidad.
- Pasos para reproducirlo (incluye si fue en un solo host o en topología
  multi-host, y si TLS estaba activo).
- Logs relevantes de `navigator`, `star` (Star/LLM) u `satellite-ocr`
  (Satellite/OCR) según corresponda.

## Cómo proponer un cambio

1. Haz un fork del repositorio y crea una rama descriptiva a partir de
   `main` (ej. `fix/matching-capabilities`, `feat/kb-provider`).
2. Si el cambio afecta el protocolo, el contrato de un provider, o una
   decisión de arquitectura ya documentada, agrega o actualiza la entrada
   correspondiente en `spec-native/DECISIONS.md` como parte del PR.
3. Mantén los cambios acotados: un PR, un propósito. Evita mezclar
   refactors no relacionados con la corrección o feature que estás
   aportando.
4. Verifica el cambio de punta a punta, no solo con typecheck/build. Si
   tocas el chat o un provider, levanta el stack (`just container-up-core`,
   `just container-up-llm`, `just container-up-ocr`) y prueba el flujo real
   antes de abrir el PR.
5. Actualiza la documentación en `docs/` si el cambio altera el
   comportamiento descrito ahí — la documentación desactualizada se trata
   como un bug.

## Estilo de código

- TypeScript en todo el monorepo (`packages/`, `apps/`, `examples/`).
- Sin comentarios explicando *qué* hace el código; solo cuando el *por qué*
  no es obvio (una restricción oculta, un workaround puntual).
- Prioriza claridad y consistencia con el código existente sobre
  abstracciones nuevas. No agregues configuración o manejo de errores para
  escenarios que no pueden ocurrir.

## Mensajes de commit

Usa el formato `tipo: descripción breve` (`feat`, `fix`, `docs`, `refactor`,
`chore`), en español, describiendo el propósito del cambio.

## Código de conducta

Sé respetuoso y constructivo. Este es un proyecto comunitario sin ánimo de
lucro — las discusiones técnicas son bienvenidas, los ataques personales no.

## Licencia

Al contribuir aceptas que tu aporte se distribuya bajo la
[licencia MIT](LICENSE) del proyecto.
