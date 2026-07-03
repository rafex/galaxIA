---
layout: default
title: galaxIA — IA federada y soberana
---

<section class="hero">
  <span class="eyebrow">● PoC activa — protocolo FHS v0.1</span>
  <h1>Inteligencia artificial federada y soberana</h1>
  <p class="tagline">
    galaxIA conecta el hardware que tu comunidad ya tiene — una Mac mini con
    un LLM local, una laptop con OCR, una Raspberry Pi con otra herramienta —
    en una sola red de IA. Sin nube, sin suscripciones, sin un dueño único
    que decida qué pasa con tus datos.
  </p>
  <div class="cta">
    <a class="btn btn-primary" href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>
    <a class="btn btn-secondary" href="{{ '/integrar/' | relative_url }}">Integra tu tool o LLM</a>
  </div>
</section>

<div class="stats">
  <div class="stat"><strong>10</strong><span>reglas del protocolo FHS</span></div>
  <div class="stat"><strong>2</strong><span>tipos de provider: llm / mcp</span></div>
  <div class="stat"><strong>0</strong><span>servidores centrales de terceros</span></div>
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
  <p>Cada nodo se registra, anuncia lo que ofrece, y queda disponible para que el chat lo use cuando corresponda:</p>

  ```mermaid
  flowchart LR
      subgraph Comunidad["Tu comunidad"]
          N1["🖥️ Nodo A<br/>LLM local (llama.cpp)"]
          N2["💻 Nodo B<br/>OCR / documentos"]
          N3["🍓 Nodo C<br/>tu próxima herramienta"]
      end
      N1 -- "hello / register" --> R[("Registry<br/>Agent Backend")]
      N2 -- "hello / register" --> R
      N3 -- "hello / register" --> R
      U["👤 Usuario"] -- "chat" --> W["Web"]
      W --> R
      R -- "resuelve provider<br/>según scope y privacidad" --> N1
      R -- "resuelve provider" --> N2
  ```

  <p>
    El Registry solo sabe <em>quién existe</em> y <em>qué ofrece</em> — no
    ejecuta tools, no ve el contenido de las conversaciones, no decide por el
    agente. Cada petición declara un ámbito de privacidad (<code>scope</code>)
    que acota qué proveedores pueden resolverla, y cada respuesta trae su
    propia procedencia auditable: qué modelo razonó, qué herramienta se usó,
    a dónde viajaron los datos. Detalle completo en
    <a href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>.
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
      <h3><a href="{{ '/integrar/' | relative_url }}">Sé un LLM provider</a></h3>
      <p>Conecta tu modelo local (llama.cpp, Ollama, vLLM) y ponlo a disposición de la comunidad.</p>
    </div>
    <div class="card">
      <span class="tag">Aportar capacidades</span>
      <h3><a href="{{ '/integrar/' | relative_url }}">Integra tu tool o servicio</a></h3>
      <p>OCR, búsqueda, un servicio interno — expón cualquier capacidad como provider federado.</p>
    </div>
    <div class="card">
      <span class="tag">Aportar código</span>
      <h3><a href="{{ '/contribuir/' | relative_url }}">Contribuye al protocolo</a></h3>
      <p>Hay SDKs por escribir en Python, Rust y Java, y features abiertas en el roadmap.</p>
    </div>
  </div>
</section>

<section>
  <h2>Explora el sitio</h2>
  <div class="grid">
    <div class="card">
      <h3><a href="{{ '/protocolo/' | relative_url }}">Protocolo</a></h3>
      <p>Qué es FHS, por qué existe, y cómo funciona el ciclo de vida de un nodo y un mensaje de chat.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/integrar/' | relative_url }}">Integrar</a></h3>
      <p>Cómo sumar tu propia herramienta/servicio o ser un LLM provider en la red.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/docs/' | relative_url }}">Documentación</a></h3>
      <p>Referencia técnica completa: arquitectura, despliegue, contenedores, TLS.</p>
    </div>
    <div class="card">
      <h3><a href="{{ '/pendientes/' | relative_url }}">Pendientes</a></h3>
      <p>Qué falta, qué está en spec sin iniciar, y dónde ayudar.</p>
    </div>
  </div>
</section>

<section>
  <h2>Piezas del proyecto</h2>
  <div class="grid">
    <div class="card">
      <h3>agent-server</h3>
      <p>Registry + Runtime + API de chat, en Fastify. El núcleo que federa providers y conversaciones.</p>
    </div>
    <div class="card">
      <h3>web</h3>
      <p>Chat web vanilla con Vite. Adjunta documentos, confirma el uso de OCR, conversa con el LLM.</p>
    </div>
    <div class="card">
      <h3>llm-provider</h3>
      <p>Provider de referencia sobre <code>llama.cpp</code>, con soporte de tool calling.</p>
    </div>
    <div class="card">
      <h3>ocr-provider</h3>
      <p>Provider de referencia para extracción de texto de documentos vía OCR.</p>
    </div>
  </div>
</section>

<section>
  <h2>Empezar</h2>
  <pre><code>git clone https://github.com/{{ site.repository }}.git
cd galaxIA
just container-up-core
just container-up-llm
just container-up-ocr</code></pre>
  <p>Guía completa de despliegue en <a href="{{ '/docs/' | relative_url }}">la documentación</a>.</p>
</section>
