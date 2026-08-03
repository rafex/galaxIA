---
layout: default
title: Contribuir — galaxIA
permalink: /contribuir/
---

# Contribuir a galaxIA

galaxIA es un proyecto comunitario en fase **alpha**. Su objetivo es demostrar que una red de IA soberana, descentralizada y construida sobre hardware modesto es posible. Cada contribución — hardware, código, documentación, feedback — acerca esa demostración a la realidad.

## ¿Cómo empezar?

1. Lee [Cómo funciona el protocolo]({{ '/protocolo/' | relative_url }}) y
   [Integra tu tool o LLM]({{ '/integrar/' | relative_url }}) — entiende el contrato antes de proponer un cambio.
2. Revisa [Pendientes]({{ '/pendientes/' | relative_url }}) — hay puntos marcados explícitamente como abiertos.
3. Abre un issue o PR describiendo el problema o el cambio, acotado a un solo propósito.
4. Si el cambio afecta el protocolo, un contrato de provider, o una decisión de arquitectura ya documentada, actualiza
   [`spec-native/DECISIONS.md`](https://github.com/{{ site.repository }}/blob/main/spec-native/DECISIONS.md)
   como parte del PR.
5. Verifica de punta a punta — build/typecheck pasan; una prueba real contra el stack también.

Las guías completas viven en
[`CONTRIBUTING.md`](https://github.com/{{ site.repository }}/blob/main/CONTRIBUTING.md).

<div class="cta">
  <a class="btn btn-primary" href="https://github.com/{{ site.repository }}/blob/main/CONTRIBUTING.md">Leer CONTRIBUTING.md</a>
  <a class="btn btn-secondary" href="https://github.com/{{ site.repository }}/issues">Ver issues abiertos</a>
</div>

---

## Áreas donde más se necesita ayuda

<div class="grid">
  <div class="card">
    <span class="tag">Alta prioridad</span>
    <h3>SDKs en otros lenguajes</h3>
    <p>Go, Python y Rust son los primeros lenguajes objetivo. El IDL Protobuf ya está publicado — falta la librería de cliente libp2p que lo implemente. Python es el caso de uso natural para Stars/Satellites de IA.</p>
  </div>
  <div class="card">
    <span class="tag">Alta prioridad</span>
    <h3>Implementar P2P en galaxIA-Core</h3>
    <p>Navigator y los providers de referencia todavía usan el modelo WebSocket centralizado. Deben migrar a DHT + GossipSub + stream directo según el IDL ya definido.</p>
  </div>
  <div class="card">
    <span class="tag">Media prioridad</span>
    <h3>Ephemeral Satellite</h3>
    <p>El Satellite WASM que corre en un teléfono viejo sin instalación. La lógica de capacidades (aritmética, CURP) ya está en el SDK — falta el wiring con el protocolo FHS.</p>
  </div>
  <div class="card">
    <span class="tag">Media prioridad</span>
    <h3>rag-provider y kb-provider</h3>
    <p>Providers de recuperación de documentos y bases de conocimiento compartidas. El diseño está abierto — buena entrada para quien quiera definir el comportamiento desde cero.</p>
  </div>
</div>

---

## Aportar sin escribir código

- **Hardware**: si tienes una computadora con capacidad de cómputo (incluso modesta), puedes sumarte como Star o Satellite de prueba.
- **Documentación**: mejorar ejemplos, agregar traducciones, clarificar el vocabulario.
- **Feedback**: probar el protocolo y reportar qué rompe, qué confunde, qué falta.
- **Diseño**: el sitio web y el Portal Chat necesitan trabajo de UX/UI.

---

## Contacto directo

Si quieres contribuir, tienes una pregunta que no es un issue, o simplemente quieres decir que el proyecto te parece interesante — escribe a:

<div style="text-align:center; margin: 2rem 0;">
  <a class="btn btn-primary" href="mailto:rafex@rafex.dev">rafex@rafex.dev</a>
</div>

Los issues y PRs en GitHub son el canal principal para cambios concretos; el correo es para conversaciones más abiertas.
