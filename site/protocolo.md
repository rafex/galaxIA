---
layout: default
title: Protocolo FHS — galaxIA
permalink: /protocolo/
---

# Cómo funciona el protocolo

**FHS** significa **Federation of Sovereign Hosts** (Federación de Nodos
Soberanos). Es el protocolo que hace posible que computadoras de una
comunidad — una Mac mini con un modelo local, una laptop con OCR, una
Raspberry Pi con otra herramienta — se descubran entre sí y compartan
capacidades de IA sin depender de un servidor central de terceros.

```mermaid
flowchart LR
    subgraph Comunidad
        N1[Mac mini<br/>llama.cpp]
        N2[Laptop<br/>OCR]
        N3[Raspberry Pi<br/>otra tool]
    end
    N1 -- "hello / register" --> R[(Registry<br/>Agent Backend)]
    N2 -- "hello / register" --> R
    N3 -- "hello / register" --> R
    U[Usuario] -- "chat" --> W[Web]
    W --> R
    R -- "resuelve provider" --> N1
    R -- "resuelve provider" --> N2
```

## Por qué existe

La mayoría de asistentes de IA hoy implican mandar tus datos a la nube de
un proveedor, pagar una suscripción, y confiar en que ese proveedor
respeta lo que promete. **galaxIA busca lo contrario**: que una comunidad
— un equipo, un vecindario, un grupo de investigación — pueda armar su
propia red de IA con el hardware que ya tiene, sin ceder control de sus
datos ni depender de un dueño único.

El objetivo concreto de este protocolo es que:

- Cualquier persona con una computadora capaz de correr un modelo o una
  herramienta pueda **sumarla a la red** como un nodo más, sin pedirle
  permiso a un operador central.
- El chat (o cualquier cliente) pueda **descubrir qué hay disponible** y
  usarlo, sin necesitar saber de antemano qué máquina exacta responde.
- Cada nodo pueda **irse o fallar** sin tumbar el resto de la red — el
  Registry solo observa quién está disponible, no controla ni depende de
  ningún nodo en particular.
- **La privacidad sea parte del protocolo, no un aviso legal aparte**: cada
  petición declara su ámbito (`scope`), cada proveedor declara qué hace
  con los datos que recibe (`retention`), y cada respuesta trae su propia
  procedencia auditable.

## Las 10 reglas de FHS v0.1

1. **Identidad verificable** — todo nodo tiene un identificador único (`did:key:...`).
2. **Registro por arrendamiento (lease)** — un nodo debe renovar su registro cada 30s o se considera perdido.
3. **Heartbeat obligatorio** — cada nodo vivo envía un `ping` cada 10s, incluso mientras procesa otra petición.
4. **Servicios declarados** — un nodo dice explícitamente qué ofrece; nadie escanea puertos ni fuerza descubrimiento.
5. **Capacidades, no implementaciones** — se pide `document.ocr`, no "¿tienes Tesseract?"; la implementación es intercambiable.
6. **Resolución por ámbito (scope)** — `local` / `network` / `community` / `external` acotan quién puede resolver cada petición.
7. **Transparencia obligatoria** — cada respuesta declara qué modelo razonó, qué tool se usó y a dónde viajaron los datos.
8. **Proveedor rechazable** — el usuario puede vetar un proveedor específico; el sistema busca alternativas.
9. **Degradación graceful** — si no hay lo óptimo se usa lo siguiente disponible; si no hay nada, se informa. Nunca se inventa una respuesta.
10. **Registry observable, no controlador** — el Registry solo sabe qué nodos existen y qué ofrecen; no ejecuta tools ni ve datos del usuario.

Detalle completo, con todos los mensajes JSON, en
[`docs/protocolo.md`](https://github.com/{{ site.repository }}/blob/main/docs/protocolo.md).

## Ciclo de vida de un nodo

```mermaid
sequenceDiagram
    participant P as Provider
    participant R as Registry (Agent Backend)

    P->>R: hello { providerId, timestamp }
    R-->>P: welcome { registryId, leaseSeconds: 30 }
    P->>R: register { providerId, manifest }
    R-->>P: registered { leaseExpires, acceptedServices }
    R->>R: broadcast node.online a runtimes activos

    loop cada 10s mientras el provider esté vivo
        P->>R: ping
        R-->>P: pong { timestamp }
        R->>R: touchConnection(providerId) — renueva el lease
    end

    Note over R: Si no llega ping en 30s (lease vencido)
    R->>R: markLost(providerId)
    R->>R: broadcast node.lost a runtimes activos
```

## Flujo de un mensaje de chat (con tool call)

Cuando el usuario adjunta un documento o hace una pregunta que requiere una
herramienta, el agente resuelve un LLM y, si hace falta, una tool federada,
todo dentro del `scope` de privacidad de la petición:

```mermaid
sequenceDiagram
    participant U as Usuario (Web)
    participant AS as Agent Server
    participant REG as Registry
    participant LLM as LLM Provider (FHS)
    participant OCR as OCR Provider (FHS)

    U->>AS: start { message, artifacts, preferences.scope }
    AS->>REG: resolver LLM y tools candidatas (scope)
    REG-->>AS: providers disponibles dentro del scope
    AS-->>U: agent.status "resolving-model"
    AS-->>U: llm.selected { providerId, modelId }

    AS->>LLM: chat.request { requestId, messages, tools }
    LLM-->>AS: chat.completed { requestId, toolCalls }

    alt el LLM pide una tool
        AS-->>U: tool.selected { capability: "document.ocr" }
        AS->>OCR: tool.call { requestId, toolName, arguments: { file_base64 } }
        OCR-->>AS: tool.result { requestId, content }
        AS-->>U: tool.completed { name, duration }
        AS->>LLM: chat.request { requestId nuevo, messages + tool result }
        LLM-->>AS: chat.completed { requestId, response final }
    end

    AS-->>U: assistant.delta { text }
    AS-->>U: assistant.completed { provenance }
```

## Privacidad, en corto

- **`scope`** condiciona qué proveedores puede resolver el Registry
  (`local` < `network` < `community` < `external`) — nunca es solo una
  preferencia, es un techo.
- **`privacy.retention`** en el manifiesto de cada proveedor declara qué
  hace con los datos (`"none"`, `"session"`, u otro valor documentado
  explícitamente). El agente prefiere `"none"` cuando hay más de un
  candidato.
- **`provenance`** viaja en cada `assistant.completed`: qué modelo razonó,
  qué tool se ejecutó, y a dónde fueron los datos — para que el usuario
  pueda auditar cada respuesta.
- **Trazabilidad ≠ retención de contenido**: todo `requestId` debe poder
  seguirse extremo a extremo como metadata (proveedor, duración,
  éxito/error), sin que eso implique guardar el contenido de la
  conversación.

Detalle completo (tablas, checklist, y el gap conocido en trazabilidad —
DEC-0012) en
[`docs/protocolo.md`](https://github.com/{{ site.repository }}/blob/main/docs/protocolo.md).

## Siguiente paso

Si quieres sumar tu propia herramienta, servicio o modelo a la red, ve a
[**Integra tu tool o LLM**]({{ '/integrar/' | relative_url }}).
