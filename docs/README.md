# galaxIA — Documentación del protocolo FHS

Documentación del **protocolo FHS (Federation of Sovereign Horizons)** y la red P2P descentralizada que implementa. Esta carpeta unifica la documentación orientada a humanos y la documentación técnica detallada del protocolo.

> **Definiciones formales** (Protobuf; AsyncAPI y schemas solo documentales) → [`idl/`](../idl/) y [`schemas/`](../schemas/)
> **Decisiones de arquitectura y specs** → [`spec-native/`](../spec-native/)
> **Documentación de las apps** (despliegue, contenedores, configuración) → repo `galaxIA-Core`

---

## ¿Qué es galaxIA?

galaxIA es un experimento para construir un **chat de IA comunitario y soberano**:

- Cualquier persona puede aportar a la red su propio hardware.
- Ese hardware puede ofrecer un modelo de lenguaje (**Star**), una herramienta como OCR (**Satellite**), o un agente autónomo (**Nova**).
- La red es **P2P descentralizada** — sin servidor central, sin registro obligatorio, sin dueño único.
- **Navigator** descubre los recursos disponibles mediante DHT y GossipSub, y los combina en respuestas.

> galaxIA federa recursos de IA locales en una red P2P: modelos y herramientas se descubren, asignan y usan desde un chat, sin depender de proveedores centralizados.

---

## Documentación orientada a humanos

| Documento | Contenido |
|---|---|
| [`protocolo.md`](./protocolo.md) | Las 10 reglas del protocolo FHS P2P: DHT, GossipSub, dispatch de Missions, privacidad, reputación distribuida |
| [`protocolo-provider.md`](./protocolo-provider.md) | Contrato P2P que todo provider debe cumplir para participar en la red |
| [`implementacion-multilenguaje.md`](./implementacion-multilenguaje.md) | Cómo implementar FHS en Go, Python, Rust y TypeScript |
| [`beacon-star.md`](./beacon-star.md) | Beacon de un Star (proveedor LLM): campos, ejemplo y ciclo de vida P2P |
| [`beacon-satellite.md`](./beacon-satellite.md) | Beacon de un Satellite (proveedor de tools): campos, ejemplo y ciclo de vida P2P |
| [`vocabulario.md`](./vocabulario.md) | Vocabulario espacial de producto (Star/Satellite/Atlas/Navigator/Portal/Mission/…) |

---

## Documentación técnica del protocolo

| Documento | Contenido |
|---|---|
| [`architecture.md`](./architecture.md) | Topología de red, nodos, roles y modelo de federación |
| [`p2p.md`](./p2p.md) | Red P2P descentralizada: DHT Kademlia, GossipSub, descubrimiento, presencia |
| [`identity.md`](./identity.md) | Identidad criptográfica: `did:key`, Ed25519, Envelope signature |
| [`handshake.md`](./handshake.md) | Handshake del stream directo `/fhs/v1/0.1.0` y ciclo de vida en Orbit |
| [`mission.md`](./mission.md) | Ciclo de vida de una Mission: chat, tool dispatch, cancelación |
| [`trust.md`](./trust.md) | Confianza: niveles, delegación, reputación distribuida |
| [`transport.md`](./transport.md) | Capa de transporte única: libp2p + Protobuf |
| [`network.md`](./network.md) | Topología completa de la red libp2p FHS |
| [`ephemeral-satellite.md`](./ephemeral-satellite.md) | Ephemeral Satellite: WASM en dispositivos móviles, delegación, confianza |

---

## Principio base

> **El único transporte del protocolo FHS es P2P (libp2p) con Protobuf binario.**
> No hay un Registry central obligatorio. Atlas es solo el bootstrap peer de entrada al swarm.
> Ver [`p2p.md`](./p2p.md) y [`transport.md`](./transport.md).

## Versión del protocolo

`fhs.v1` — Alpha (DEC-P2P-001). Definido en `idl/fhs-protocol.proto` y `idl/asyncapi.yaml`.
Release publicado: [`v0.1.0-p2p-alpha`](https://github.com/rafex/galaxIA/releases/tag/v0.1.0-p2p-alpha).
