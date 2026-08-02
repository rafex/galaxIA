# FHS Protocol — Documentación de Protocolo

Federation of Sovereign Horizons (FHS) — protocolo de comunicación P2P para redes
federadas de nodos de inteligencia artificial.

## Índice

| Documento | Contenido |
| --------- | --------- |
| [architecture.md](architecture.md) | Topología de red, nodos, roles y modelo de federación |
| [transport.md](transport.md) | Capa de transporte: P2P + Protobuf primario, cuándo se justifica WSS |
| [identity.md](identity.md) | Identidad criptográfica: `did:key`, Ed25519, Envelope signature |
| [handshake.md](handshake.md) | Protocolo de conexión: 2-step handshake + ciclo de vida en Orbit |
| [mission.md](mission.md) | Ciclo de vida de una Mission: chat, tool dispatch, cancellation |
| [ephemeral-satellite.md](ephemeral-satellite.md) | Ephemeral Satellite: WASM en dispositivos móviles, delegación, confianza |
| [trust.md](trust.md) | Modelo de confianza: niveles, Cadena de Delegación, reputación |

## Principio base

> **El transporte canónico del protocolo FHS es P2P WebSocket con Protobuf binario (DEC-0086).**
> Usar WSS (TLS sobre WebSocket) o REST requiere justificación explícita.
> Ver [transport.md](transport.md).

## Versión del protocolo

`fhs.v1` — definida en `idl/fhs-protocol.proto` y `idl/asyncapi.yaml`.
