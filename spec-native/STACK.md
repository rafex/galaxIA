# STACK.md — stack vigente

> **Nota normativa:** este archivo describe el stack actual del protocolo. Las
> referencias históricas a Fastify, WebSocket, WSS, SSE, REST o OpenAPI
> corresponden a PoC retiradas y no son dependencias del wire FHS.

## Contratos y serialización

- **Protobuf v3:** formato único de wire para FHS.
- **LPP:** framing de los Envelopes dentro del stream libp2p.
- **libp2p:** DHT Kademlia, GossipSub y stream directo
  `/fhs/v1/0.1.0`.
- **AsyncAPI:** documentación del protocolo; no introduce un transporte web.
- **JSON Schema:** validación y documentación auxiliar en `schemas/`; no se
  transmite por FHS.
- **XML:** no forma parte del protocolo ni de sus artefactos normativos.

## Runtimes

Los runtimes de Portal, Navigator, Atlas, Star, Satellite y Nova se mantienen
en repositorios separados. Cada implementación puede elegir el lenguaje y la
biblioteca libp2p que necesite, siempre que respete el IDL Protobuf, el framing,
las firmas y el protocolo `/fhs/v1/0.1.0`.

Este repositorio conserva el contrato compartido y herramientas como
`protoc`/validadores; no define un servidor HTTP para el protocolo.

## Dependencias externas

Un nodo puede envolver servicios que no controla:

- LLM/OCR externos: HTTP/HTTPS solo dentro del adaptador local del provider.
- IPFS externo: un gateway HTTP/HTTPS de lectura es una excepción de adaptación
  cuando el servicio no ofrece libp2p. No transporta mensajes FHS.
- IPFS de la red galaxIA: acceso nativo IPFS/libp2p obligatorio; el gateway
  externo no se usa como sustituto interno.

Estas integraciones no se anuncian como endpoints FHS, no participan en
descubrimiento ni reciben el Beacon o los mensajes de Mission.

## Restricciones de implementación

- No agregar rutas de protocolo HTTP/HTTPS, REST, WebSocket/WSS o SSE.
- No agregar JSON/XML embebido en `string` o `bytes` para representar datos
  estructurados del protocolo.
- Mantener `endpoint.multiaddr` como única autoridad de conexión.
- Verificar PeerId, DID, firma, versión, timestamp y destinatario antes de
  procesar cualquier payload.

Consulta [spec-native/ARCHITECTURE.md](ARCHITECTURE.md),
[docs/transport.md](../docs/transport.md) y
[spec-native/DECISIONS.md](DECISIONS.md).
