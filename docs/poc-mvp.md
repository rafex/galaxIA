---
title: PoC/MVP — topología operativa de galaxIA
description: Equipos, servicios y flujo de una prueba funcional de galaxIA sobre la red soberana.
tags: [arquitectura, guia, referencia, e2e]
---

# PoC/MVP — topología operativa de galaxIA

Este documento describe la topología física que se usa para validar la PoC/MVP
de galaxIA. La arquitectura lógica del protocolo FHS continúa documentada en
[`architecture.md`](./architecture.md); este documento agrega el mapa de
despliegue concreto, sus redes y el flujo operativo.

## Mapa de cinco equipos

La red principal de la PoC es GalaxIA (`192.168.1.0/24`) y está conectada al
router OpenWrt `192.168.1.1`. La red Netup se reserva para administración y
acceso controlado al portal.

| Equipo | IP GalaxIA | Arquitectura | Servicios | Puertos |
| --- | --- | --- | --- | --- |
| Bastion | `192.168.1.139` | x86_64, 8 núcleos, 15 GB | Atlas, Navigator, Star y llama.cpp | `4001`, `8081`, `4010`, `8090`, `4002`, `43110` |
| Raspi4B | `192.168.1.167` | aarch64, 7.7 GB | Satellite OCR | `4003` |
| Raspi3B portal-pi | `192.168.1.181` | aarch64, aproximadamente 1 GB | KB provider y RAG provider | `4006`, `4005` |
| ThinkPad | `192.168.1.239` | x86_64, 4 núcleos, 15 GB | Portal Chat | `8443` |
| Mac | `192.168.1.102` | arm64 | Navegador/controlador | — |

El mapa D2 versionado está en
[`docs/diagrams/poc-mvp-topology.d2`](./diagrams/poc-mvp-topology.d2). Los
diagramas operativos se conservan como fuente de texto; el sitio web genera sus
SVG durante CI.

Los diagramas renderizados se publican en la
[página de la PoC/MVP](https://galax-ia.rafex.io/docs/poc-mvp/); los SVG son
artefactos de build y no se versionan.

## Responsabilidades y ejecución

- **Bastion** es el punto de entrada SSH hacia las Raspberry Pi y el único
  equipo que concentra Atlas, Navigator y Star en esta PoC. `llama.cpp` es la
  única excepción a la política de contenedores: corre directamente en el host
  y Star lo consume por `127.0.0.1:43110`.
- **Raspi4B** ejecuta OCR dentro de un contenedor Podman y se anuncia como
  Satellite en la red FHS.
- **Raspi3B portal-pi** ejecuta KB y RAG dentro de contenedores Podman. No aloja
  Atlas ni Navigator.
- **ThinkPad** sirve el frontend del Portal Chat en HTTPS dentro de un
  contenedor Podman. El navegador no envía el chat a través del portal: usa el
  portal para descargar los estáticos y después conecta al peer FHS.
- **Mac** solo abre el portal y participa como cliente/navegador. No ejecuta
  servicios de producto ni requiere instalar componentes de la PoC.

El Bastion también es el salto administrativo: desde el Mac se entra al
Bastion y desde allí se accede a los hosts que no aceptan SSH directo. Esto no
lo convierte en proxy de Missions; en el plano FHS Atlas solo sirve como
bootstrap y Navigator despacha directamente con los providers.

## Redes y puertos

| Red | Uso |
| --- | --- |
| `192.168.1.0/24` | Comunicación de la MVP, discovery, GossipSub y streams FHS |
| `192.168.3.0/24` | SSH, administración y acceso autorizado al portal |

Las multiaddrs P2P deben anunciar direcciones de la red GalaxIA. Netup no debe
aparecer como sustituto de una dirección alcanzable en `192.168.1.0/24`.

Los puertos de servicio son:

- Bastion: Atlas `4001/8081`, Navigator `4010/8090`, Star `4002` y llama.cpp
  local `43110`.
- Raspi4B: OCR `4003`.
- Raspi3B portal-pi: RAG `4005` y KB `4006`.
- ThinkPad: Portal Chat HTTPS `8443`.

Los servicios de producto, excepto llama.cpp, corren en contenedores Podman.
El runner E2E no abre puertos ni modifica UFW; cualquier regla de forwarding o
firewall se habilita manualmente por el operador.

## Flujo de arranque y descubrimiento

El flujo completo está en
[`docs/diagrams/poc-mvp-bootstrap.d2`](./diagrams/poc-mvp-bootstrap.d2):

1. El navegador del Mac descarga el Portal Chat desde
   `https://192.168.1.239:8443/`.
2. El Portal conecta por TLS/WSS al Atlas del Bastion en `4001` para entrar al
   swarm.
3. Atlas y los demás peers publican sus anuncios en DHT/GossipSub.
4. El Portal descubre y verifica el Beacon del Navigator en `4010`.
5. El Portal abre el stream FHS directo con Navigator; Atlas no transporta las
   Missions.
6. Star, OCR, KB y RAG registran sus capacidades y quedan disponibles para el
   dispatch.

## Flujo de una Mission

El dispatch paralelo está representado en
[`docs/diagrams/poc-mvp-mission.d2`](./diagrams/poc-mvp-mission.d2):

1. El Portal envía una solicitud de chat a Navigator por el stream FHS.
2. Navigator mantiene una vista local de capacidades descubiertas y publica la
   oferta de Mission.
3. Los providers adecuados reciben la asignación en paralelo: Star genera,
   OCR extrae, KB consulta conocimiento estructurado y RAG recupera fragmentos.
4. Navigator combina los resultados respetando el alcance de la conversación y
   devuelve la respuesta al Portal.

La implementación no requiere que una Mission pase por Atlas ni por el servidor
HTTPS que sirve los estáticos.

## Seguridad y límites actuales

- La PoC usa una CA E2E única para los certificados de prueba de los servicios
  TLS/WSS. Las claves privadas de la CA no se distribuyen.
- La autenticación mutua mTLS queda en backlog; actualmente se valida la
  confianza del servidor mediante TLS y la CA configurada.
- Bastion es un punto único de falla operativo porque concentra el bootstrap,
  Navigator, Star y el acceso SSH a las Raspberry Pi.
- Este mapa documenta la PoC/MVP actual y no redefine el contrato Protobuf ni
  las reglas del protocolo FHS.

## Documentos relacionados

- [`architecture.md`](./architecture.md) — arquitectura lógica P2P.
- [`network.md`](./network.md) — DHT, GossipSub y streams FHS.
- [`mission.md`](./mission.md) — ciclo de vida de una Mission.
- [`galaxIA-E2E/docs/topologia-e2e.md`](https://github.com/rafex/galaxIA-E2E/blob/main/docs/topologia-e2e.md) — operación del runner E2E.
- [`galaxIA-E2E/docs/e2e-runbook.md`](https://github.com/rafex/galaxIA-E2E/blob/main/docs/e2e-runbook.md) — runbook de levantamiento y diagnóstico.
