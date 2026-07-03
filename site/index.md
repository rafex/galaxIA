---
layout: default
title: galaxIA — IA federada y soberana
---

<section class="hero">
  <h1>galaxIA</h1>
  <p class="tagline">
    Inteligencia artificial federada y soberana. Conecta equipos reutilizados
    donde cada nodo aporta capacidades: LLMs locales con <code>llama.cpp</code>
    u herramientas como OCR vía MCP. Sin nube, suscripciones ni dueño.
  </p>
  <div class="cta">
    <a class="btn btn-primary" href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>
    <a class="btn btn-secondary" href="{{ '/integrar/' | relative_url }}">Integra tu tool o LLM</a>
  </div>
</section>

<section>
  <h2>¿Qué es FHS?</h2>
  <p>
    <strong>FHS (Federation of Sovereign Hosts)</strong> es el protocolo que
    conecta esta red: un Registry lleva el descubrimiento de nodos, cada
    provider (LLM, OCR, y los que la comunidad quiera sumar) se conecta por
    WebSocket y anuncia sus capacidades, y el chat web combina razonamiento y
    acción respetando reglas de privacidad explícitas por nodo. Detalle
    completo en <a href="{{ '/protocolo/' | relative_url }}">Cómo funciona el protocolo</a>.
  </p>
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
