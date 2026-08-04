# galaxIA

GalaxIA es un PoC de inteligencia artificial federada y soberana. Conecta equipos reutilizados donde cada nodo aporta capacidades: LLM locales con llama.cpp o herramientas como OCR vía MCP. Un chat web descubre nodos, aplica reglas de privacidad y combina razonamiento y acción. Sin nube, suscripciones ni dueño.

Define **FHS (Federation of Sovereign Horizons)**, un protocolo **libp2p-only**
e independiente de lenguaje. DHT Kademlia, GossipSub y los streams directos
`/fhs/v1/0.1.0` son los únicos caminos normativos. Las definiciones formales
viven en `idl/` y `schemas/`; no hay compatibilidad con transportes web ni JSON
en el wire. Todos los datos transmitidos están tipados en Protobuf.

¿Quieres correrlo? Ver [`docs/instalacion.md`](docs/instalacion.md) (contenedor + release, `npx`, o clonar y compilar).

## Vocabulario

GalaxIA (Galaxy + IA) tiene su propio vocabulario de producto — **Star** (nodo LLM), **Satellite** (nodo de herramientas), **Atlas** (bootstrap peer), **Portal** (chat web), **Navigator** (orquestador), **Beacon** (manifiesto), **Pulse** (heartbeat), **Mission** (ejecución de una tool), **Flight Log** (procedencia/auditoría), **Orbit** (conexión activa), **Signal** (capacidad anunciada). Desde DEC-0033/DEC-0034/DEC-0035 este vocabulario también nombra identificadores de código, archivos, paquetes npm y contenedores (`Atlas`, `Signal`, `Beacon`...) — el wire protocol canónico es `Envelope` Protobuf sobre libp2p, con `handshake`/`handshake_ack`. Tabla completa en [`docs/vocabulario.md`](docs/vocabulario.md).

## Estructura del repo

| Carpeta | Qué es |
|---|---|
| `idl/` | Protobuf, AsyncAPI y framing del protocolo |
| `schemas/` | Artefactos de documentación/validación; no forman parte del wire Protobuf |
| `docs/` | Documentación para humanos — protocolo, despliegue, vocabulario, contenedores |
| `spec-native/` | Contexto técnico para agentes de IA — specs, decisiones (`DECISIONS.md`), roadmap, trazabilidad |
| `site/` | Portal web público ([galax-ia.rafex.io](https://galax-ia.rafex.io)), sitio Jekyll |

Este repo es **IDL + schemas + documentación del protocolo**. El runtime de Atlas,
Navigator y Portal vive en `galaxIA-Core`; los tipos cliente y SDK viven en
`galaxIA-SDK`; las implementaciones de referencia de Star/Satellite/Nova/RAG/KB
viven en [`galaxIA-satellite-star`](https://github.com/rafex/galaxIA-satellite-star).
Ver el mapa completo en [`ECOSYSTEM.md`](ECOSYSTEM.md).

## Estado del proyecto

PoC activa, evolucionando hacia mayor madurez — no producción todavía. El
protocolo está definido como libp2p-only; las implementaciones runtime deben
validar DHT, GossipSub y el stream directo antes de considerarse conformes.
Sigue una metodología **spec-first** ("SpecNative").

- **Hecho en el contrato:** FHS P2P alpha con Envelope Protobuf, DHT, GossipSub, Mission dispatch, handshake directo y provenance (DEC-0090).
- **En curso / próximo:** `rag-provider` y `kb-provider` (ya implementados en `galaxIA-satellite-star`), descubrimiento por mDNS, SDKs de referencia en Python/Rust/Java.
- **Roadmap público:** [Project — galaxIA Roadmap](https://github.com/users/rafex/projects/9) e [Issues](https://github.com/rafex/galaxIA/issues).

## Empezar

Documentación completa para humanos en [`docs/README.md`](docs/README.md) — incluye cómo desplegar, cómo integrar un nuevo provider, y el contrato plug-and-play que debe cumplir. Contexto técnico exhaustivo (specs, decisiones, tareas) en [`spec-native/`](spec-native/).
