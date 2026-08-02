---
layout: default
title: Documentación — galaxIA
permalink: /docs/
---

# Documentación del protocolo FHS

Esta es la documentación técnica del protocolo, mantenida junto al IDL en
[`docs/`](https://github.com/{{ site.repository }}/tree/main/docs) del
repositorio.

> Para la documentación de las implementaciones (apps, despliegue, contenedores),
> ver el repo [`galaxIA-Core`](https://github.com/{{ site.repository | split: '/' | first }}/galaxIA-Core).

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo.md">Protocolo FHS</a>
    <p>Las 10 reglas del protocolo P2P: DHT, GossipSub, dispatch de Missions, privacidad y reputación distribuida.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo-provider.md">Protocolo para providers</a>
    <p>Contrato P2P que todo provider debe cumplir: bootstrap, NodeAdvertise, bid/assign, stream directo, Pulse.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/implementacion-multilenguaje.md">Implementación multi-lenguaje</a>
    <p>Cómo implementar providers FHS en Go, Python, Rust y TypeScript con libp2p.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/beacon-star.md">Beacon Star (proveedor LLM)</a>
    <p>Campos del Beacon, ejemplo completo y ciclo de vida P2P de un Star.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/beacon-satellite.md">Beacon Satellite (proveedor de tools)</a>
    <p>Campos del Beacon, ejemplo completo y ciclo de vida P2P de un Satellite.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/vocabulario.md">Vocabulario</a>
    <p>Glosario del vocabulario espacial de producto: Star, Satellite, Atlas, Navigator, Portal, Mission y más.</p>
  </li>
</ul>

## Definiciones formales (IDL)

Las definiciones canónicas del protocolo viven en [`idl/`](https://github.com/{{ site.repository }}/tree/main/idl)
y [`schemas/`](https://github.com/{{ site.repository }}/tree/main/schemas):

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/fhs-protocol.proto">fhs-protocol.proto</a>
    <p>Definición Protobuf de todos los mensajes: GossipSub, DHT records, stream directo, handshake.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/gossipsub.md">gossipsub.md</a>
    <p>Especificación de tópicos GossipSub, schemas de mensajes y TTLs.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/flows.md">flows.md</a>
    <p>Diagramas de secuencia de los 5 flujos principales del protocolo.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/asyncapi.yaml">asyncapi.yaml</a>
    <p>Canales y bindings de la API asíncrona FHS.</p>
  </li>
</ul>
