---
layout: default
title: Contribuir — galaxIA
permalink: /contribuir/
---

# Contribuir

galaxIA es un proyecto comunitario. Las guías completas viven en
[`CONTRIBUTING.md`](https://github.com/{{ site.repository }}/blob/main/CONTRIBUTING.md)
en la raíz del repositorio. Resumen:

1. Lee [Cómo funciona el protocolo]({{ '/protocolo/' | relative_url }}) y
   [Integra tu tool o LLM]({{ '/integrar/' | relative_url }}) antes de
   proponer un cambio.
2. Revisa [Pendientes]({{ '/pendientes/' | relative_url }}) — hay puntos
   marcados explícitamente como abiertos para quien quiera aportar
   (SDKs en Python/Rust/Java, `rag-provider`, entre otros).
3. Abre un issue o un PR describiendo el problema o el cambio, acotado a
   un solo propósito.
4. Si el cambio afecta el protocolo, un contrato de provider, o una
   decisión de arquitectura ya documentada, actualiza
   [`spec-native/DECISIONS.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/DECISIONS.md)
   como parte del PR.
5. Verifica el cambio de punta a punta contra el stack real, no solo con
   build/typecheck.

<div class="cta">
  <a class="btn btn-primary" href="https://github.com/{{ site.repository }}/blob/main/CONTRIBUTING.md">Leer CONTRIBUTING.md completo</a>
  <a class="btn btn-secondary" href="https://github.com/{{ site.repository }}/issues">Ver issues abiertos</a>
</div>
