# galaxIA — Documentación del protocolo FHS

Documentación en lenguaje humano del **protocolo FHS (Federation of Sovereign Horizons)** y la red P2P descentralizada que implementa.

> Para las definiciones formales (Protobuf, AsyncAPI, JSON Schemas) ver [`idl/`](../idl/) y [`schemas/`](../schemas/).
> Para el contexto técnico detallado de arquitectura y decisiones, ver [`spec-native/`](../spec-native/).
> Para la documentación de las implementaciones (apps, despliegue, contenedores), ver el repo `galaxIA-Core`.

## ¿Qué es galaxIA?

galaxIA es un experimento para construir un **chat de IA comunitario y soberano**:

- Cualquier persona puede aportar a la red su propio hardware.
- Ese hardware puede ofrecer un modelo de lenguaje (Star), una herramienta como OCR (Satellite), o un agente autónomo (Nova).
- La red es P2P descentralizada — sin servidor central, sin registro obligatorio, sin dueño único.
- Navigator descubre los recursos disponibles mediante DHT y GossipSub, y los combina en respuestas.

## Documentos disponibles

| Documento | Contenido |
|---|---|
| [`protocolo.md`](./protocolo.md) | Las reglas del protocolo FHS P2P: DHT, GossipSub, dispatch de Missions, privacidad |
| [`protocolo-provider.md`](./protocolo-provider.md) | Contrato que todo provider debe cumplir para participar en la red |
| [`implementacion-multilenguaje.md`](./implementacion-multilenguaje.md) | Cómo implementar FHS en Python, Rust, Java y TypeScript |
| [`beacon-star.md`](./beacon-star.md) | Beacon de un proveedor LLM (Star): campos, ejemplo y ciclo de vida P2P |
| [`beacon-satellite.md`](./beacon-satellite.md) | Beacon de un proveedor de tools (Satellite): campos, ejemplo y ciclo de vida P2P |
| [`vocabulario.md`](./vocabulario.md) | Vocabulario espacial de producto (Star/Satellite/Atlas/Portal/…) |

## En una frase

> **galaxIA federa recursos de IA locales en una red P2P: modelos y herramientas se descubren, asignan y usan desde un chat web, sin depender de proveedores centralizados.**
