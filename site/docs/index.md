---
layout: default
title: Documentación — galaxIA
permalink: /docs/
---

# Documentación del protocolo FHS

Documentación técnica del protocolo, mantenida junto al IDL en
[`docs/`](https://github.com/{{ site.repository }}/tree/main/docs) del repositorio.

> Para documentación de apps, despliegue y contenedores: [`galaxIA-Core`](https://github.com/{{ site.repository | split: '/' | first }}/galaxIA-Core).

---

## Para empezar

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo.md">Protocolo FHS</a>
    <p>Las 10 reglas del protocolo P2P: DHT, GossipSub, dispatch de Missions, privacidad y reputación distribuida. El punto de entrada para entender el sistema.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/protocolo-provider.md">Contrato de provider</a>
    <p>Qué debe implementar todo nodo para participar en la red: bootstrap, NodeAdvertise, bid/assign, stream directo, Pulse.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/vocabulario.md">Vocabulario</a>
    <p>Glosario del vocabulario espacial: Star, Satellite, Nova, Atlas, Navigator, Portal, Mission, Orbit, Beacon y más.</p>
  </li>
</ul>

---

## Implementar un provider

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/implementacion-multilenguaje.md">Implementación multi-lenguaje</a>
    <p>Cómo implementar providers FHS en Go, Python, Rust y TypeScript con libp2p. Incluye librerías recomendadas y snippet de bootstrap.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/beacon-star.md">Beacon Star (LLM provider)</a>
    <p>Campos del Beacon Protobuf y ciclo de vida P2P de un Star.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/beacon-satellite.md">Beacon Satellite (tool provider)</a>
    <p>Campos del Beacon Protobuf y ciclo de vida P2P de un Satellite.</p>
  </li>
</ul>

---

## Especificación técnica del protocolo

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/architecture.md">Arquitectura</a>
    <p>Topología de red, nodos, roles (Star/Satellite/Nova/Navigator/Atlas/Portal) y modelo de federación.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/p2p.md">Red P2P (libp2p)</a>
    <p>DHT Kademlia, GossipSub, descubrimiento de peers, DhtBeaconRecord, NodeAdvertiseMessage y reputación distribuida.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/identity.md">Identidad</a>
    <p>DID Ed25519, generación de claves, Envelope signature y verificación sin PKI.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/handshake.md">Handshake</a>
    <p>Stream directo <code>/fhs/v1/0.1.0</code>: HandshakeMessage/Ack, Orbit lease, Pulse y cierre graceful.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/mission.md">Mission</a>
    <p>Ciclo de vida de una tarea: MissionOffer/Bid/Assign, chat, tool dispatch, cancelación y errores.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/trust.md">Confianza y reputación</a>
    <p>Niveles de confianza (standard/delegated/community/unverified), DelegationToken, reputación en DHT.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/transport.md">Transporte</a>
    <p>Libp2p + Protobuf como único transporte del protocolo.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/network.md">Red — mapa de protocolos</a>
    <p>Mapa completo de la topología libp2p: DHT, GossipSub y streams FHS.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/docs/ephemeral-satellite.md">Ephemeral Satellite</a>
    <p>WASM en dispositivos móviles: cómo un teléfono viejo se une al swarm sin instalación, delegación y confianza.</p>
  </li>
</ul>

---

## Definiciones formales (IDL)

Las definiciones canónicas del protocolo viven en [`idl/`](https://github.com/{{ site.repository }}/tree/main/idl)
y [`schemas/`](https://github.com/{{ site.repository }}/tree/main/schemas):

<ul class="doc-list">
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/fhs-protocol.proto">fhs-protocol.proto</a>
    <p>Definición Protobuf de todos los mensajes: GossipSub, DHT records, stream directo, handshake. Fuente de verdad para generación de código.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/gossipsub.md">gossipsub.md</a>
    <p>Especificación de tópicos GossipSub, schemas de mensajes y TTLs.</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/flows.md">flows.md</a>
    <p>Diagramas de secuencia de los 5 flujos principales del protocolo (bootstrap, chat, tool, handshake, errores).</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/asyncapi.yaml">asyncapi.yaml</a>
    <p>Canales y bindings de la API asíncrona FHS (GossipSub + streams directos).</p>
  </li>
  <li>
    <a href="https://github.com/{{ site.repository }}/blob/main/idl/network.md">idl/network.md</a>
    <p>Stack de red: libp2p transports, multiplexors, security, DHT config y GossipSub params.</p>
  </li>
</ul>
