---
layout: default
title: PoC/MVP — topología operativa
description: Mapa físico y flujo operativo de la PoC/MVP galaxIA.
permalink: /docs/poc-mvp/
---

# PoC/MVP — topología operativa

Esta página resume la topología física usada para validar galaxIA. La fuente
técnica canónica y las fuentes D2 están en
[`docs/poc-mvp.md`](https://github.com/{{ site.repository }}/blob/main/docs/poc-mvp.md).

<figure class="diagram">
  <img src="{{ '/assets/diagrams/poc-mvp-topology.svg' | relative_url }}" alt="Topología física de la PoC/MVP galaxIA">
  <figcaption>Router OpenWrt, red GalaxIA y los cinco equipos de la PoC.</figcaption>
</figure>

<figure class="diagram">
  <img src="{{ '/assets/diagrams/poc-mvp-bootstrap.svg' | relative_url }}" alt="Flujo de bootstrap y descubrimiento de la PoC/MVP">
  <figcaption>El navegador descarga el Portal, entra por Atlas y abre el stream directo con Navigator.</figcaption>
</figure>

<figure class="diagram">
  <img src="{{ '/assets/diagrams/poc-mvp-mission.svg' | relative_url }}" alt="Dispatch concurrente de una Mission hacia Star, OCR, KB y RAG">
  <figcaption>Navigator distribuye una Mission concurrentemente entre los providers disponibles.</figcaption>
</figure>

## Equipos

| Equipo | Servicio principal | Dirección |
| --- | --- | --- |
| Bastion | Atlas, Navigator, Star y llama.cpp | `192.168.1.139` |
| Raspi4B | Satellite OCR | `192.168.1.167` |
| Raspi3B portal-pi | KB y RAG | `192.168.1.181` |
| ThinkPad | Portal Chat HTTPS | `192.168.1.239:8443` |
| Mac | Navegador/controlador | `192.168.1.102` |

Todos los servicios, excepto llama.cpp, corren en contenedores Podman. Atlas
solo es bootstrap; Navigator abre los streams directos con los providers.

Consulta el [documento completo en GitHub](https://github.com/{{ site.repository }}/blob/main/docs/poc-mvp.md) para redes, puertos, seguridad y límites actuales.
