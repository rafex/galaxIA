# ARCHITECTURE.md — arquitectura vigente

> **Contrato actual (DEC-0090, DEC-0091 y DEC-0092):** FHS es libp2p-only y
> Protobuf-only. Los flujos HTTP, HTTPS, WebSocket, WSS, SSE, REST y OpenAPI
> que aparezcan en documentos históricos describen PoC anteriores y no deben
> implementarse como transporte FHS.

## Visión general

FHS descubre, autentica, selecciona y consume capacidades de IA distribuidas
entre peers soberanos. Todos los nodos —Portal, Navigator, Atlas, Star,
Satellite y Nova— participan en la red libp2p. Atlas puede actuar como peer de
bootstrap, pero no es un registro central, proxy ni punto obligatorio de paso
para una Mission.

Este repositorio es actualmente IDL/documentación y herramientas de validación;
los runtimes de las aplicaciones viven en repositorios separados. La
arquitectura normativa de esos runtimes es la siguiente.

## Capas normativas

| Necesidad | Implementación FHS | Serialización |
|---|---|---|
| Descubrimiento y presencia | DHT Kademlia + `DhtBeaconRecord` | Protobuf firmado |
| Ofertas, bids, asignaciones y reputación | GossipSub | Protobuf firmado |
| Handshake, Pulse, chat y tools | Stream libp2p `/fhs/v1/0.1.0` | Envelope Protobuf + LPP |
| Identidad | Ed25519, `did:key` y PeerId libp2p | Campos tipados Protobuf |

`endpoint.multiaddr` es la única dirección de conexión que se anuncia en un
Beacon. No existe `endpoint.url` como ruta normativa ni se transportan mensajes
FHS por un endpoint web.

## Flujo de una Mission

1. Portal y Navigator se conectan como peers libp2p.
2. Navigator descubre capacidades mediante DHT/GossipSub y verifica Beacon,
   PeerId, firma, versión, timestamp y destinatario.
3. Navigator publica una oferta de Mission y recibe bids por GossipSub.
4. Tras asignar un provider, abre directamente el stream libp2p
   `/fhs/v1/0.1.0`.
5. Handshake, Pulse, `chat.*`, `tool.*` y los resultados viajan como Envelopes
   Protobuf con framing LPP.
6. La reputación posterior se publica como mensaje Protobuf firmado en
   GossipSub o como record DHT según corresponda.

## Serialización

`idl/fhs-protocol.proto` es la fuente wire canónica. Beacon, esquemas de tools,
argumentos, resultados, records DHT, mensajes GossipSub y Envelopes son tipos
Protobuf. No se embebe JSON, XML ni otro formato textual en campos `string` o
`bytes` para representar datos estructurados del protocolo.

Los archivos JSON Schema que permanecen en `schemas/` son artefactos auxiliares
para documentación y validación local. No son wire format ni requisito de
interoperabilidad.

## Fronteras de integración externa

Las dependencias externas pueden imponer sus propios protocolos; eso no cambia
el transporte FHS entre peers:

- Un provider puede adaptar localmente un motor LLM/OCR externo que solo ofrezca
  HTTP/HTTPS. Ese HTTP/HTTPS queda dentro del adaptador y nunca lleva mensajes
  FHS entre nodos.
- Un gateway HTTP/HTTPS de IPFS externo puede usarse solo para leer un CID cuando
  el servicio externo no ofrece acceso libp2p y galaxIA no puede imponerle otro
  transporte. Es una frontera de adaptación de datos, no un canal FHS.
- Si el IPFS pertenece a la red galaxIA o es operado por un nodo de galaxIA, la
  recuperación y publicación deben usar el acceso IPFS/libp2p nativo. El
  gateway web no puede sustituir esa ruta interna.

El gateway externo debe ser explícito, de lectura, verificarse contra el CID y
no puede aparecer como `multiaddr`, Beacon, ruta de descubrimiento, despacho,
heartbeat, chat o tool call. Ver DEC-0092 y
`spec-native/specs/ipfs-adjuntos/SPEC.md`.

## Restricciones

- No se implementan REST, OpenAPI, HTTP, HTTPS, WebSocket, WSS ni SSE como
  transporte o adaptador FHS.
- Todo nodo FHS debe poder participar como peer libp2p; un cliente que solo
  pueda usar HTTP no es una implementación FHS conforme.
- La distribución de documentación, código o artefactos estáticos fuera de la
  red no forma parte del protocolo.
- Las interfaces locales de administración, health checks y configuración no
  deben confundirse con el plano FHS ni anunciarse en Beacons.

Consulta [docs/transport.md](../docs/transport.md), [docs/network.md](../docs/network.md),
[idl/framing.md](../idl/framing.md) y [docs/p2p.md](../docs/p2p.md).
