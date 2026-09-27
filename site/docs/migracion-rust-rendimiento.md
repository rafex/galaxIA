---
layout: default
title: Migración Rust/WASM y rendimiento
description: Ruta de migración backend y criterios medibles para WASM en el Portal.
permalink: /docs/migracion-rust-rendimiento/
---

# Ruta de migración Rust/WASM y rendimiento

Navigator Rust/Rig ya opera en Bastion. La migración obligatoria sigue con el
SDK FHS compartido, Star, KB/RAG, OCR y Atlas. Cambiar a Rust no se considera
automáticamente una mejora de velocidad: cada comparación debe separar TTFT,
tiempo de providers, despacho de Missions y generación de `llama.cpp`.

<figure class="diagram">
  <img src="{{ '/assets/diagrams/rust-migration-critical-path.svg' | relative_url }}" alt="Ruta crítica de una respuesta FHS y puntos de medición">
  <figcaption>La inferencia del modelo se mide aparte del overhead de los runtimes.</figcaption>
</figure>

<figure class="diagram">
  <img src="{{ '/assets/diagrams/rust-migration-phases.svg' | relative_url }}" alt="Fases de migración backend y evaluación condicionada de WASM">
  <figcaption>El piloto WASM solo se acepta si el p95 mejora tanto en ThinkPad como en Android.</figcaption>
</figure>

El RAG local conserva Transformers.js/WebGPU para embeddings. El primer kernel
candidato a Rust/WASM es el ranking top-K del fallback IndexedDB, después de
optimizar y medir TypeScript. La UI, DOM, red y embeddings no se pasan a WASM
sin evidencia técnica específica.

La línea canónica, metodología A/B, criterios de aceptación y fases completas
están en [`docs/migracion-rust-rendimiento.md`](https://github.com/{{ site.repository }}/blob/main/docs/migracion-rust-rendimiento.md).
