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
junto con las decisiones de diseño numeradas en
[`spec-native/DECISIONS.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/DECISIONS.md).

galaxIA es un proyecto activo en fase alpha — este roadmap es la
ruta hacia mayor madurez, no una lista cerrada.

## Estado actual

- **IDL publicado (`v0.1.0-p2p-alpha`)** — Protobuf, AsyncAPI, JSON Schemas y
  documentación del protocolo FHS P2P están definidos y publicados como
  [release en GitHub](https://github.com/{{ site.repository }}/releases/tag/v0.1.0-p2p-alpha).
- **Red P2P descentralizada (DEC-P2P-001)** — el IDL migró de un modelo
  hub-and-spoke (Atlas central) a DHT Kademlia + GossipSub. Atlas es ahora
  un bootstrap peer, no un Registry central.
- **galaxIA-SDK publicado** — paquetes `@rafex/galaxia-fhs-protocol`,
  `@rafex/galaxia-satellite-capabilities` y WASM disponibles en npm.

## Ahora

- **Implementar el protocolo P2P en galaxIA-Core** — Navigator y los providers
  de referencia (Star, Satellite OCR) deben migrar del modelo WebSocket/Atlas
  al modelo libp2p (DHT + GossipSub + stream directo).
- **Actualizar galaxIA-satellite-star** — los 5 providers de referencia deben
  publicar `DhtBeaconRecord`, emitir `NodeAdvertiseMessage`, y responder al
  ciclo GossipSub offer/bid/assign.
- **`rag-provider`** — indexado y recuperación de documentos por conversación,
  con retención y privacidad declaradas en el Beacon.
- **Ephemeral Satellite (WASM en navegador)** — primer nodo que corre en un
  teléfono viejo sin instalación; lógica de capacidades ya lista en SDK.

## Después

- **SDKs de referencia en Python, Rust y Go** — hoy solo hay implementación
  TypeScript; estos son los primeros lenguajes no-TS soportados oficialmente.
  Python es el caso de uso natural para Stars/Satellites de IA/OCR.
- **`kb-provider`** — bases de conocimiento compartidas de solo lectura.
- **NAT traversal** — permitir nodos fuera de la red local vía relay libp2p.
- **Autenticación de usuarios** — retomar cuando el stack P2P esté estable.

## Más adelante

- **Más tipos de Satellite** — memoria (vector store), almacenamiento,
  puente a otro protocolo.
- **Gateway FHS en Rust** — versión ligera del protocolo para hardware
  muy limitado.
- **Marketplace de tools** — catalogar y versionar capabilities ofrecidas
  por la comunidad.

## Fuera de alcance por ahora

- Frameworks frontend pesados (React, Vue, Angular).
- Soporte multi-idioma completo en la interfaz.
- Facturación, cuotas o monetización.
- Reescribir el protocolo en otro lenguaje hasta que TypeScript demuestre validez.

## ¿Quieres ayudar?

Si alguno de estos puntos te interesa — sobre todo los SDKs en otros
lenguajes, `rag-provider` o `kb-provider` — revisa
[Contribuir]({{ '/contribuir/' | relative_url }}) y abre un issue o PR.
