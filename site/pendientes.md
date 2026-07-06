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

galaxIA es una PoC activa, no un producto terminado — este roadmap es la
ruta hacia mayor madurez, no una lista cerrada.

## Ahora

- **`fhs-mvp`** — MVP del protocolo FHS y chat comunitario. Federar Stars
  (LLM) y Satellites (herramientas), frontend web vanilla, Atlas (Registry)
  embebido en el Navigator (Agent Backend). Sin bloqueos actuales.
- **Completado y verificado contra infraestructura real:** topología
  multi-host (core en un host, providers pesados en otro), TLS/WSS de
  punta a punta con certificado autofirmado, y Pulse de transporte
  (ping/pong nativo de WebSocket) para detectar conexiones rotas más
  rápido que el lease de aplicación.
- **Completado (verificación local, pendiente contra los 3 equipos reales
  de la demo):** rating de nodos — `dispatch.ack` + historial de latencia
  por Star/Satellite, expuesto en el Atlas.
- **Diseño cerrado, listo para código:** `rag-provider` — indexado y
  recuperación de documentos por conversación, con retención y privacidad
  declaradas explícitamente en el manifiesto.
- **En spec, diseño abierto:** `kb-provider` — bases de conocimiento
  compartidas de solo lectura (para contenido público reutilizado por
  muchos usuarios, a diferencia de RAG que es siempre privado y por
  conversación).

## Después

- **Separar el Atlas (Registry) del Navigator** en un servicio
  independiente, para soportar múltiples backends y comunidades.
- **Identidad criptográfica (Ed25519)** — reemplazar el DID simplificado
  actual por firmas reales en registro y Pulse.
- **IPFS para artefactos** — subir archivos adjuntos a IPFS y pasar solo el
  hash a los Satellites, para proteger el origen y permitir
  desacoplamiento temporal.
- **Autenticación de usuarios** — retomar cuando el MVP esté estable.
- **Modelo de confianza comunitaria** — reputación, vetos persistentes y
  políticas de privacidad más granulares.
- **SDKs de referencia en Python, Rust y Java** — hoy solo hay
  implementación TypeScript; estos son los primeros lenguajes no-TS
  soportados oficialmente. Python es el caso de uso natural para
  Stars/Satellites de IA/OCR.
- **Propagar `conversationId` → `requestId`** y loggear metadata de
  trazabilidad de punta a punta — cerrar el gap de diagnóstico de errores
  sin tocar privacidad de contenido.
- **Validar el manifiesto (Beacon) contra los campos obligatorios del
  contrato de provider** (incluye `privacy.retention`) en el Atlas, y
  migrar los providers de ejemplo a los códigos de error estandarizados.
- **Evaluar un modelo de chat general con tool calling** distinto del
  actual (Coder 3B) — suficiente para la demo de OCR, no ideal para chat
  general.

## Más adelante

- **Descubrimiento descentralizado** — autodescubrimiento del Atlas por
  mDNS en la LAN, como complemento opcional (no reemplazo) del Registry
  central; DHT/libp2p fuera de la LAN queda como fase posterior, sin spec
  todavía.
- **Más tipos de Satellite** — memoria (vector store), almacenamiento,
  puente a otro protocolo.
- **NAT traversal** — permitir nodos fuera de la red local.
- **Gateway FHS en Rust** — versión ligera del protocolo para equipos
  pequeños.
- **Marketplace de tools** — catalogar y versionar capacidades ofrecidas
  por la comunidad.

## Fuera de alcance por ahora

- Frameworks frontend pesados (React, Vue, Angular) en el MVP.
- Soporte multi-idioma completo en la interfaz.
- Facturación, cuotas o monetización.
- Versionado de schemas de tools fuera del alcance del protocolo.
- Reescribir el protocolo en otro lenguaje hasta que TypeScript demuestre validez.

## ¿Quieres ayudar?

Si alguno de estos puntos te interesa — sobre todo los SDKs en otros
lenguajes, `rag-provider` o `kb-provider` — revisa
[Contribuir]({{ '/contribuir/' | relative_url }}) y abre un issue o PR.
