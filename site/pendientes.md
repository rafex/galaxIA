---
layout: default
title: Pendientes — galaxIA
permalink: /pendientes/
---

# Pendientes

Esto es un resumen del roadmap del proyecto. La fuente autoritativa vive en
[`spec-native/ROADMAP.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/ROADMAP.md),
junto con las decisiones de diseño numeradas en
[`spec-native/DECISIONS.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/DECISIONS.md).

## Ahora

- **`fhs-mvp`** — MVP del protocolo FHS y chat comunitario. Federar LLMs
  locales y tools MCP, frontend web vanilla, Registry embebido en el Agent
  Backend con WebSocket y SQLite. Sin bloqueos actuales.
- **Completado y verificado:** topología multi-host (core en un host,
  providers pesados de LLM/OCR en otro) y TLS/WSS de punta a punta con
  certificado autofirmado — ambos validados contra infraestructura real,
  no solo en local.
- **En spec, sin iniciar:** `rag-provider` — indexado y recuperación de
  documentos, extendiendo el patrón de ejecución determinística ya usado
  para OCR. No se inicia hasta decisión explícita.

## Después

- **Separar el Registry del Agent Backend** en un servicio independiente,
  para soportar múltiples backends y comunidades.
- **Identidad criptográfica (Ed25519)** — reemplazar el DID simplificado
  actual por firmas reales en registro y heartbeat.
- **IPFS para artefactos** — subir archivos adjuntos a IPFS y pasar solo el
  hash a los servidores de tools, para proteger el origen y permitir
  desacoplamiento temporal.
- **Autenticación de usuarios** — retomar cuando el MVP esté estable.
- **Modelo de confianza comunitaria** — reputación, vetos persistentes y
  políticas de privacidad más granulares.
- **Validar identidad en `hello`** — rechazar registro si un `providerId`
  ya tiene conexión activa, en vez de sobrescribir.
- **Dispatcher/heartbeat concurrente obligatorio** en todos los providers
  de referencia — que el heartbeat nunca dependa de que la petición en
  curso termine primero.
- **SDKs de referencia en Python, Rust y Java** — hoy solo hay
  implementación TypeScript; estos son los primeros lenguajes no-TS
  soportados oficialmente. Python es el caso de uso natural para
  providers de IA/OCR.
- **Propagar `conversationId` → `requestId`** y loggear metadata de
  trazabilidad de punta a punta — cerrar el gap de diagnóstico de errores
  sin tocar privacidad de contenido.
- **Validar el manifiesto contra los campos obligatorios del contrato de
  provider** (incluye `privacy.retention`) en el Registry, y migrar los
  providers de ejemplo a los códigos de error estandarizados.
- **Evaluar un modelo de chat general con tool calling** distinto del
  actual (Coder 3B) — suficiente para la demo de OCR, no ideal para chat
  general.

## Más adelante

- **Descubrimiento descentralizado** — reemplazar el Registry central por
  mDNS + DHT ligero (posiblemente libp2p), eliminando puntos centrales.
- **Más tipos de proveedores** — `embedding`, `storage`, `resource`,
  `agent`.
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
lenguajes o `rag-provider` — revisa
[Contribuir]({{ '/contribuir/' | relative_url }}) y abre un issue o PR.
