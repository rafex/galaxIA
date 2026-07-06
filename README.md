# galaxIA

GalaxIA es un PoC de inteligencia artificial federada y soberana. Conecta equipos reutilizados donde cada nodo aporta capacidades: LLM locales con llama.cpp o herramientas como OCR vía MCP. Un chat web descubre nodos, aplica reglas de privacidad y combina razonamiento y acción. Sin nube, suscripciones ni dueño.

Implementa **FHS (Federation of Sovereign Horizons)**, un protocolo JSON sobre WebSocket, independiente de lenguaje — ver [`docs/implementacion-multilenguaje.md`](docs/implementacion-multilenguaje.md).

## Vocabulario

GalaxIA (Galaxy + IA) tiene su propio vocabulario de producto — **Star** (nodo LLM), **Satellite** (nodo de herramientas), **Atlas** (Registry), **Portal** (chat web), **Navigator** (orquestador), **Beacon** (manifiesto), **Pulse** (heartbeat), **Mission** (ejecución de una tool), **Flight Log** (procedencia/auditoría), **Orbit** (conexión activa), **Signal** (capacidad anunciada). Desde DEC-0033/DEC-0034/DEC-0035 este vocabulario también nombra identificadores de código, archivos, paquetes npm y contenedores (`Atlas`, `Signal`, `Beacon`, `apps/atlas`, `apps/navigator`...) — lo único que **no** cambia es el protocolo JSON en el cable (nombres de campo como `providerId`, tipos de mensaje `hello`/`register`). Tabla completa en [`docs/vocabulario.md`](docs/vocabulario.md).

## Estructura del repo

| Carpeta | Qué es |
|---|---|
| `apps/atlas/` | Atlas — Registry (catálogo de nodos), servicio independiente desde DEC-0035 |
| `apps/navigator/` | Navigator — Agent Runtime + API de chat, habla con Atlas por HTTP |
| `apps/portal/` | Portal — chat web vanilla con Vite |
| `packages/fhs-protocol/` | Tipos y constantes del protocolo FHS — fuente de verdad, no dependencia obligatoria |
| `examples/star-example/` | Star de referencia sobre `llama.cpp`, con tool calling |
| `examples/satellite-ocr-example/` | Satellite de referencia para extracción de texto (OCR) |
| `docs/` | Documentación para humanos — protocolo, despliegue, vocabulario, contenedores |
| `spec-native/` | Contexto técnico para agentes de IA — specs, decisiones (`DECISIONS.md`), roadmap, trazabilidad |
| `site/` | Portal web público ([galax-ia.rafex.io](https://galax-ia.rafex.io)), sitio Jekyll |
| `containers/` | `compose.yaml` y overlays (TLS) para desplegar con Podman/Docker |

## Estado del proyecto

PoC activa, evolucionando hacia mayor madurez — no producción todavía. Ya validada end-to-end con hardware real (topología multi-host laptop + bastion, TLS/WSS con certificado autofirmado, chat con LLM local y flujo completo de OCR con confirmación). Sigue una metodología **spec-first** ("SpecNative"): cada decisión y capacidad nueva se documenta en `spec-native/` antes de escribirse en código.

- **Hecho:** protocolo FHS v0.1 (hello/register/Pulse), chat federado con tool calling, OCR con confirmación explícita, rating de nodos (`dispatch.ack` + latencia), TLS de punta a punta, despliegue multi-host real, vocabulario de marca.
- **En curso / próximo:** `rag-provider` (indexado y recuperación de documentos), `kb-provider` (bases de conocimiento compartidas de solo lectura), descubrimiento por mDNS, SDKs de referencia en Python/Rust/Java.
- **Roadmap público:** [Project — galaxIA Roadmap](https://github.com/users/rafex/projects/9) e [Issues](https://github.com/rafex/galaxIA/issues).

## Empezar

Documentación completa para humanos en [`docs/README.md`](docs/README.md) — incluye cómo desplegar, cómo integrar un nuevo provider, y el contrato plug-and-play que debe cumplir. Contexto técnico exhaustivo (specs, decisiones, tareas) en [`spec-native/`](spec-native/).
