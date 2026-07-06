---
layout: default
title: Documentación — galaxIA
permalink: /docs/
---

# Documentación

Esta es la documentación técnica del proyecto, mantenida junto al código en
[`docs/`](https://github.com/{{ site.repository }}/tree/main/docs) del
repositorio.

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/arquitectura.md">Arquitectura</a>
    <p>Visión general de los componentes y cómo se relacionan.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo.md">Protocolo FHS</a>
    <p>Ciclo de vida hello/register/ping, chat y llamado a tools.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo-provider.md">Protocolo para providers</a>
    <p>Cómo implementar un provider FHS (LLM, OCR u otra capacidad).</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/implementacion-multilenguaje.md">Implementación multi-lenguaje</a>
    <p>Guía para implementar providers en Python, Rust o Java.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/atlas.md">Atlas</a>
    <p>El catálogo (Registry): registro de nodos y endpoints REST.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/navigator.md">Navigator</a>
    <p>El orquestador: Agent Runtime y API de chat.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/proveedores.md">Proveedores</a>
    <p>Cómo se anuncian capacidades y se descubren nodos.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/manifiesto-llm.md">Manifiesto LLM</a>
    <p>Contrato del provider de modelos de lenguaje.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/manifiesto-mcp.md">Manifiesto MCP</a>
    <p>Contrato de los providers de herramientas (tools).</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/como-usar.md">Cómo usar</a>
    <p>Guía práctica para levantar y usar el chat.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/contenedores.md">Contenedores</a>
    <p>Imágenes, compose y recetas de despliegue con Podman.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/despliegue.md">Despliegue</a>
    <p>Despliegue de un solo host.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/despliegue-multi-host.md">Despliegue multi-host</a>
    <p>Topología real con el core en un host y los providers en otro.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/tls-autofirmado.md">TLS autofirmado</a>
    <p>Cifrado de punta a punta del protocolo FHS con certificado autofirmado.</p>
  </li>
</ul>
