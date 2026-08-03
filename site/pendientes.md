---
layout: default
title: Pendientes — galaxIA
permalink: /pendientes/
---

# Pendientes

Esto es un resumen del roadmap del proyecto. La fuente autoritativa vive en
[`spec-native/ROADMAP.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/ROADMAP.md)
y en el tablero público
[galaxIA — Roadmap](https://github.com/users/{{ site.repository | split: '/' | first }}/projects/9),
junto con las decisiones de diseño en
[`spec-native/DECISIONS.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/DECISIONS.md).

galaxIA es un proyecto activo en fase **alpha** — este roadmap es la ruta hacia mayor madurez, no una lista cerrada. Si algo te interesa, abre un issue o escribe a [rafex@rafex.dev](mailto:rafex@rafex.dev).

---

## Estado actual (agosto 2026)

| Componente | Estado |
|---|---|
| IDL del protocolo FHS P2P (Protobuf + AsyncAPI) | ✅ Publicado `v0.1.0-p2p-alpha` |
| JSON Schemas (Beacon Star / Satellite / Base) | ✅ Publicados |
| Documentación del protocolo (`docs/`) | ✅ Actualizada al modelo P2P |
| SDK TypeScript (`@rafex/galaxia-fhs-protocol`) | ✅ Publicado en npm |
| SDK TypeScript (`@rafex/galaxia-satellite-capabilities`) | ✅ Publicado en npm |
| SDK WASM (`@rafex/galaxia-satellite-capabilities-wasm`) | ✅ Publicado en npm |
| Implementación de Navigator con P2P (libp2p) | ⏳ Pendiente |
| Providers de referencia con ciclo P2P completo | ⏳ Pendiente |

---

## Ahora — implementar el protocolo P2P

El IDL está definido y publicado. El siguiente paso es que las apps lo implementen:

### Migrar galaxIA-Core al modelo P2P

- **Navigator**: migrar de WebSocket/Atlas centralizado a DHT + GossipSub + stream directo.
  Navigator debe publicar su propio `DhtBeaconRecord`, emitir `NodeAdvertiseMessage`, y
  publicar `MissionOfferMessage` en GossipSub para dispatch descentralizado.
- **Star y Satellite de referencia**: migrar los providers de `galaxIA-satellite-star` del
  ciclo `hello/register/ping` al ciclo P2P (bootstrap → DHT join → NodeAdvertise → bid/assign → stream).
- **Atlas**: simplificar a pure bootstrap peer — ya no maneja registro, solo ayuda a unirse al swarm.

### TODOs del SDK

- **Generar bindings Protobuf desde el IDL** en cada lenguaje objetivo:
  - Go: `protoc --go_out=.` desde `idl/fhs-protocol.proto`
  - Python: `protoc --python_out=.` desde `idl/fhs-protocol.proto`
  - Rust: `tonic-build` en `build.rs`
- **Publicar SDK Go** (`github.com/rafex/galaxia-fhs`) — wrapper sobre `go-libp2p` con los tipos generados.
- **Publicar SDK Python** (`galaxia-fhs-python`) — wrapper sobre `py-libp2p` (o fallback WebSocket directo).
- **Publicar SDK Rust** (`galaxia-fhs`) — wrapper sobre `rust-libp2p`.
- **CLI de bootstrap** — herramienta de línea de comandos para levantar un bootstrap peer
  (Atlas) con un solo comando, sin configuración adicional.
- **Bump de versión semántica post-migración** — cuando Navigator y los providers implementen
  el ciclo P2P completo y pase una prueba end-to-end real, publicar `v0.2.0-p2p`.

---

## Después

- **Ephemeral Satellite (WASM en navegador)** — el teléfono viejo como nodo de la red.
  La lógica de capacidades ya está en el SDK; falta el wiring con el protocolo FHS:
  DHT join desde el navegador, GossipSub sobre WebTransport, stream directo.
- **`rag-provider`** — indexado y recuperación de documentos por conversación, con
  retención y privacidad declaradas en el Beacon.
- **`kb-provider`** — bases de conocimiento compartidas de solo lectura.
- **NAT traversal** — nodos fuera de la LAN via relay libp2p.
- **Autenticación de usuarios** — retomar cuando el stack P2P esté estable.

---

## Más adelante

- **Más tipos de Satellite**: memoria (vector store), almacenamiento, puentes a otros protocolos.
- **Gateway FHS en Rust** — versión ligera para hardware muy limitado (< 512 MB RAM).
- **Marketplace de capabilities** — catalogar y versionar lo que ofrece la comunidad.
- **Soporte multi-comunidad** — múltiples swarms independientes con pasarelas opcionales entre sí.

---

## Fuera de alcance por ahora

- Frameworks frontend pesados (React, Vue, Angular).
- Soporte multi-idioma completo en la interfaz.
- Facturación, cuotas o monetización.
- Reescribir el protocolo en otro lenguaje hasta que TypeScript demuestre validez.

---

## ¿Quieres ayudar?

Si alguno de estos puntos te interesa — sobre todo los SDKs en otros lenguajes —
revisa [Contribuir]({{ '/contribuir/' | relative_url }}) o escribe directamente a
[rafex@rafex.dev](mailto:rafex@rafex.dev).
