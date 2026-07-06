# galaxIA — Documentación para humanos

Bienvenido a la documentación de **galaxIA**, un prototipo de **Federation of Sovereign Horizons (FHS)**.

Esta documentación explica, en lenguaje humano, qué es el proyecto, cómo funciona el protocolo y cómo usarlo.

> Si buscas el contexto técnico detallado para agentes de IA, revisa la carpeta [`spec-native/`](../spec-native/).

## ¿Qué es galaxIA?

galaxIA es un experimento para construir un **chat de IA comunitario**. La idea es simple:

- Cualquier persona puede aportar a la red su propio hardware viejo.
- Ese hardware puede ofrecer un modelo de lenguaje (LLM), una herramienta (OCR, transcripción, etc.) o ambas cosas.
- El chat usa esos recursos federados como si fueran un solo sistema.

El objetivo es demostrar que no hace falta depender de la nube para tener IA útil. Con un protocolo común y hardware reutilizado, una comunidad puede construir su propio "ChatGPT comunitario".

## Documentos disponibles

| Documento | Contenido |
|---|---|
| [`protocolo.md`](./protocolo.md) | Las reglas del protocolo FHS v0.1, con diagramas y privacidad/trazabilidad |
| [`protocolo-provider.md`](./protocolo-provider.md) | Contrato plug-and-play que todo provider debe cumplir |
| [`implementacion-multilenguaje.md`](./implementacion-multilenguaje.md) | Cómo implementar FHS en Python, Rust, Java y TypeScript |
| [`arquitectura.md`](./arquitectura.md) | Cómo están organizados los componentes |
| [`atlas.md`](./atlas.md) | El catálogo (Atlas/Registry): registro de nodos, endpoints REST, métricas |
| [`navigator.md`](./navigator.md) | El orquestador (Navigator): Agent Runtime y Chat API — servicio separado de Atlas desde DEC-0035 |
| [`proveedores.md`](./proveedores.md) | Nodos FHS: LLM Provider + OCR Provider |
| [`despliegue.md`](./despliegue.md) | Cómo desplegar el stack en un solo host (bastion) |
| [`despliegue-multi-host.md`](./despliegue-multi-host.md) | Cómo desplegar el core en una laptop y los providers pesados (LLM/OCR) en el bastion, dos máquinas reales en la misma LAN |
| [`tls-autofirmado.md`](./tls-autofirmado.md) | Cómo cifrar todo el protocolo FHS con HTTPS/WSS y un certificado autofirmado |
| [`como-usar.md`](./como-usar.md) | Cómo levantar el stack y probarlo |
| [`contenedores.md`](./contenedores.md) | Cómo desplegar con Podman/Docker |
| [`manifiesto-llm.md`](./manifiesto-llm.md) | Cómo publicizar un modelo LLM |
| [`manifiesto-mcp.md`](./manifiesto-mcp.md) | Cómo publicizar un servidor MCP de tools |
| [`vocabulario.md`](./vocabulario.md) | Vocabulario espacial de producto (Star/Satellite/Atlas/Portal/...) — solo documentación, no cambia el protocolo |

## En una frase

> **galaxIA federación recursos de IA locales: modelos y herramientas se descubren, seleccionan y usan desde un chat web, sin depender de proveedores centralizados.**
