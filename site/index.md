---
layout: default
title: galaxIA — IA federada y soberana
---

<section class="hero">
  <span class="eyebrow">● Alpha — protocolo FHS P2P (DEC-P2P-001)</span>
  <h1>Inteligencia artificial federada y soberana</h1>
  <p class="tagline">
    galaxIA conecta el hardware que tu comunidad ya tiene — una Mac mini con
    un LLM local, una laptop con OCR, una Raspberry Pi con otra herramienta —
    en una sola red P2P descentralizada. Sin nube, sin suscripciones, sin un
    servidor central que decida qué pasa con tus datos.
  </p>
  <div class="cta">
    <a class="btn btn-primary" href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>
    <a class="btn btn-secondary" href="{{ '/integrar/' | relative_url }}">Integra tu tool o LLM</a>
  </div>
</section>

<div class="stats">
  <div class="stat"><strong>10</strong><span>reglas del protocolo FHS</span></div>
  <div class="stat"><strong>2</strong><span>tipos de provider: star / satellite</span></div>
  <div class="stat"><strong>0</strong><span>servidores centrales obligatorios</span></div>
  <div class="stat"><strong>MIT</strong><span>licencia abierta</span></div>
</div>

<section>
  <h2>Por qué existe galaxIA</h2>
  <p>
    La mayoría de asistentes de IA hoy dependen de mandar tus datos a la nube
    de un proveedor, pagar una suscripción, y confiar ciegamente en que ese
    proveedor respeta lo que promete. Eso concentra el poder de la IA en
    unas pocas empresas y deja a cada comunidad — un equipo, un vecindario,
    un grupo de investigación, una escuela — sin control real sobre su
    propia infraestructura de inteligencia.
  </p>
  <p>
    <strong>El objetivo de galaxIA es demostrar que existe otro camino:</strong>
    una red donde cualquiera con una computadora capaz de correr un modelo o
    una herramienta puede sumarla, donde el chat descubre qué hay disponible
    sin depender de una máquina específica, donde cada nodo puede irse o
    fallar sin tumbar el resto, y donde la privacidad — quién ve qué, qué se
    retiene, a dónde viajan los datos — es parte del protocolo desde el
    diseño, no un aviso legal que se agrega después.
  </p>
</section>

<section markdown="1">
  <h2>Cómo se arma la red</h2>
  <p>Cada nodo se une al swarm P2P, anuncia lo que ofrece en la DHT, y queda disponible para que Navigator lo asigne cuando corresponda:</p>

  ```mermaid
  flowchart LR
      subgraph "Swarm P2P"
          AT["Atlas\n(bootstrap)"]
          N1["🖥️ Star\nLLM local"]
          N2["💻 Satellite\nOCR / documentos"]
          N3["🍓 Satellite\ntu próxima tool"]
          NAV["Navigator"]
      end
      U["👤 Usuario"] -- "chat" --> W["Portal"]
      W --> NAV
      NAV -->|"GossipSub: offer/bid/assign"| N1
      NAV -->|"stream directo"| N1
      NAV -->|"GossipSub: offer/bid/assign"| N2
      NAV -->|"stream directo"| N2
      AT -.->|"bootstrap"| N1
      AT -.->|"bootstrap"| NAV
  ```

  <p>
    No hay un servidor central que controle la red. Navigator descubre
    recursos disponibles en la DHT y via GossipSub; cada petición declara un
    ámbito de privacidad (<code>scope</code>) que acota qué providers pueden
    responder, y cada respuesta trae su propia procedencia auditable. Detalle
    completo en <a href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>.
  </p>
</section>

<section>
  <h2>Estrellas y satélites</h2>
  <p>
    galaxIA es una galaxia soberana de IA donde equipos reutilizados se
    convierten en <strong>Stars</strong> y <strong>Satellites</strong>.
    Cada Star aporta razonamiento; cada Satellite aporta una capacidad —
    OCR, búsqueda, memoria o automatización. El Navigator los descubre
    en la red P2P y los combina en un agente comunitario.
  </p>
</section>

<section>
  <h2>Súmate</h2>
  <p>
    galaxIA crece con cada nodo, cada tool y cada persona que se suma. Si
    tienes una computadora con capacidad de cómputo, un servicio interno que
    quieras exponer como herramienta federada, o simplemente ganas de ayudar
    a construir esto, hay un lugar para ti:
  </p>
  <div class="grid">
    <div class="card">
      <span class="tag">Aportar hardware</span>
      <h3><a href="{{ '/integrar/' | relative_url }}">Sé un Star (LLM)</a></h3>
      <p>Conecta tu modelo local (llama.cpp, Ollama, vLLM) y ponlo a disposición de la comunidad.</p>
    </div>
    <div class="card">
      <span class="tag">Aportar capacidades</span>
      <h3><a href="{{ '/integrar/' | relative_url }}">Sé un Satellite (tool)</a></h3>
      <p>OCR, búsqueda, un servicio interno — expón cualquier capacidad como provider federado.</p>
    </div>
    <div class="card">
      <span class="tag">Aportar código</span>
      <h3><a href="{{ '/contribuir/' | relative_url }}">Contribuye al protocolo</a></h3>
      <p>Hay SDKs por escribir en Python, Rust y Go, y features abiertas en el roadmap.</p>
    </div>
  </div>
</section>

<section>
  <h2>Explora el sitio</h2>
  <div class="grid">
    <div class="card">
      <h3><a href="{{ '/protocolo/' | relative_url }}">Protocolo</a></h3>
      <p>Qué es FHS, por qué existe, y cómo funciona el ciclo de vida de un nodo y una Mission.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/integrar/' | relative_url }}">Integrar</a></h3>
      <p>Cómo sumar tu propia herramienta/servicio o ser un LLM provider en la red.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/docs/' | relative_url }}">Documentación</a></h3>
      <p>Referencia técnica: protocolo, Beacons, implementación multi-lenguaje, vocabulario.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/pendientes/' | relative_url }}">Pendientes</a></h3>
      <p>Qué falta, qué está en spec sin iniciar, y dónde ayudar.</p>
    </div>
  </div>
</section>

<section>
  <h2>Piezas del ecosistema</h2>
  <div class="grid">
    <div class="card">
      <h3>galaxIA (este repo)</h3>
      <p>IDL del protocolo FHS: Protobuf, AsyncAPI, JSON Schemas y documentación del protocolo.</p>
    </div>
    <div class="card">
      <h3>galaxIA-Core</h3>
      <p>Apps: Navigator, Atlas, Portal Chat, Portal TUI, Log Agent y providers de ejemplo.</p>
    </div>
    <div class="card">
      <h3>galaxIA-SDK</h3>
      <p>Paquetes npm: <code>fhs-protocol</code>, <code>satellite-capabilities</code>, WASM.</p>
    </div>
    <div class="card">
      <h3>galaxIA-satellite-star</h3>
      <p>Providers de referencia: Star (LLM), Satellite OCR, RAG, KB y Nova (agente).</p>
    </div>
  </div>
</section>

<section>
  <h2>Empezar</h2>
  <pre><code>git clone https://github.com/{{ site.repository }}.git
cd galaxIA
# Ver idl/, protocol/, docs/ para el protocolo completo
# Para las apps e implementación, ver galaxIA-Core</code></pre>
  <p>Documentación del protocolo en <a href="{{ '/docs/' | relative_url }}">Documentación</a>. Implementación de apps en <a href="https://github.com/{{ site.repository | split: '/' | first }}/galaxIA-Core">galaxIA-Core</a>.</p>
</section>
