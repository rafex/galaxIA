---
layout: default
title: Guía sencilla del proyecto
description: Qué hace cada pieza de galaxIA y cómo recorre la red una petición.
permalink: /docs/guia-del-proyecto/
---

# Guía sencilla del proyecto galaxIA

Esta guía sirve para recuperar el mapa mental del proyecto: primero explica
las responsabilidades, luego los repositorios y al final sigue una pregunta
desde el navegador hasta el provider que la resuelve.

<figure class="diagram">
  <img src="{{ '/assets/diagrams/ecosistema-piezas.svg' | relative_url }}" alt="Responsabilidades de los repositorios del ecosistema galaxIA">
  <figcaption>Contrato → bibliotecas y runtimes → operación. Navigator Rust/Rig ya es el agente activo.</figcaption>
</figure>

<figure class="diagram">
  <img src="{{ '/assets/diagrams/ciclo-solicitud.svg' | relative_url }}" alt="Recorrido de una petición a través del Portal, Navigator y providers FHS">
  <figcaption>El chat usa el stream directo de FHS; Atlas ayuda a entrar, pero no retransmite cada conversación.</figcaption>
</figure>

## La idea en breve

galaxIA es una federación de computadoras: algunas ejecutan un modelo de
lenguaje, otras ofrecen herramientas. El Portal recibe la pregunta; Navigator
elige y coordina; Star genera lenguaje; los Satellites hacen tareas como OCR,
RAG y KB. FHS define el formato y las reglas para comunicarse entre ellas.

- **galaxIA** define el contrato FHS: IDL Protobuf, especificaciones y
  decisiones. No contiene el chat runtime.
- **galaxIA-Core** contiene Atlas, Portal Chat y otros clientes; conserva el
  Navigator TypeScript como referencia histórica.
- **galaxIA-SDK** distribuye bibliotecas compartidas de protocolo/capacidades y
  una implementación Rust compilada a WASM para la demo Satellite.
- **galaxIA-satellite-star** tiene los providers de referencia: Star, OCR,
  RAG, KB y Nova.
- **galaxia-parser-catalog** adapta las tool calls expresadas como texto por
  algunos modelos a la representación tipada que usa FHS.
- **galaxIA-agent** es el Navigator Rust/Rig operativo en Bastion.
- **PoC-Llama.cpp** prepara el motor de inferencia; Star lo consume.
- **galaxIA-E2E** despliega/prueba el laboratorio; **galaxIA-gitops** ayuda con
  diagnóstico y demostraciones remotas.

## Flujo de una pregunta

1. HTTPS descarga la página Portal desde ThinkPad. Es la entrega de la interfaz,
   no el transporte de las Missions.
2. El navegador entra a la red FHS usando Atlas como bootstrap cuando es
   necesario.
3. El Portal abre una conexión FHS directa a Navigator.
4. Navigator aplica privacidad, límites y selección antes de llamar a
   proveedores.
5. Si hay un archivo, OCR puede extraer texto. Si se requiere contexto, se
   elige RAG local en el navegador **o** RAG de la red mediante Mission. La
   opción “ambos” no forma parte del MVP actual.
6. Navigator encarga a Star la generación. Star consulta `llama-server` y
   devuelve el resultado por FHS.
7. Navigator devuelve al Portal la respuesta y su procedencia.

Los documentos grandes no deben enviarse completos al LLM: la idea de
recuperación es indexar y enviar solo fragmentos relevantes y acotados. El RAG
y KB actual son implementaciones iniciales con recuperación simple, no motores
semánticos maduros.

## Estado que no hay que confundir

El camino activo de la PoC es `galaxIA-agent` Rust/Rig; la implementación
TypeScript de `galaxIA-Core` es de referencia y no debe operar en paralelo con
la identidad Rust. La siguiente ruta obligatoria migra los otros runtimes
backend en orden medido y evalúa kernels WASM del chat solo si las pruebas en
ThinkPad y Android muestran una mejora real. La guía canónica está en
[`docs/migracion-rust-rendimiento.md`](https://github.com/{{ site.repository }}/blob/main/docs/migracion-rust-rendimiento.md).

En el laboratorio, todo servicio corre en un contenedor Podman salvo
`llama-server`. La Mac solo usa el navegador y no requiere instalar nada.
Consulta el detalle de máquinas/IP/puertos en la
[topología PoC/MVP]({{ '/docs/poc-mvp/' | relative_url }}).

## Guía completa

La [versión completa en Markdown](https://github.com/{{ site.repository }}/blob/main/docs/guia-del-proyecto.md)
define cada término, explica cuándo cambiar cada repositorio, distingue RAG
local de RAG en la red e incluye los diagramas Mermaid y las referencias a sus
fuentes D2.
