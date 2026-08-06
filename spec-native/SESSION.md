+++
[session]
state = "active"
agent = "claude"
initiative = "curp-wasm-service"
task = "implement-curp-wasm-service"
intent = "Implementar el servicio local de creación y validación estructural de CURP en WASM, servido por HTTPS desde un contenedor y accesible por la red GalaxIA."
last_updated = "2026-08-05T14:35:00-06:00"
+++

# Active Session

## Current state

`active` — servicio CURP local implementado en SDK y preparado para su despliegue E2E. La lógica corre en WASM/Web Worker en el celular; mTLS permanece fuera de alcance.

## Iniciativa actual (2026-08-05)

- **CURP local en WASM**: se implementó la construcción de 18 posiciones, el
  dígito verificador público y la validación estructural en TS/AssemblyScript.
- **Privacidad**: la página no usa API de aplicación ni persistencia; los datos
  se procesan en el teléfono dentro de un Web Worker.
- **Despliegue**: el frontend se empaqueta como imagen HTTPS estática y el
  runner E2E lo publica en el puerto 8444 de la laptop, sobre la red GalaxIA.
- **Alcance normativo**: la asignación oficial, unicidad, vigencia y existencia
  en RENAPO/BDNCURP quedan explícitamente fuera de la validación local.

La prueba funcional desde el celular y la publicación en `main` siguen siendo
las tareas de cierre de `SPEC-CURP-0001`.

## Qué se completó en esta sesión (2026-07-02)

- Soporte de PDF en el frontend (antes solo imágenes).
- Reescritura de `McpHost` para hablar FHS WebSocket real (antes usaba el SDK MCP-HTTP y nunca conectaba) — DEC-0014.
- Corrección del matching de capability por tokens compartidos (antes comparaba substrings completos y nunca coincidía) — DEC-0015.
- Cambio de modelo a Qwen 2.5 Coder 3B con tool calling, con fallback de parseo en `llm-bridge.ts` para cuando `llama-server` no llena `tool_calls` nativo — DEC-0016, DEC-0017.
- Configuración de modelo movida de hardcodeado a variables de entorno (`MODEL_ID`, `MODEL_TOOL_CALLING_SUPPORTED`, etc.) — DEC-0019.
- Aislamiento de eventos por `conversationId` en el EventBus (antes se mezclaban entre conversaciones concurrentes) — DEC-0018, verificado con dos inferencias reales en paralelo.
- **Ejecución determinística de OCR**: ya no depende de que el LLM decida invocar la tool — se ejecuta directo al adjuntar un archivo — DEC-0020.
- **Flujo histórico de confirmación de OCR** (SPEC-OCRCONFIRM-0001): fue superseded; el flujo vigente es OCR automático, vista previa y `DocumentContext` temporal por conversación.
- Indicador visual de "pensando" (dots animados) mientras se espera la respuesta del LLM.
- Documentación extensa: `docs/protocolo.md` con diagramas Mermaid, `docs/protocolo-provider.md` (contrato plug-and-play para providers nuevos), `docs/implementacion-multilenguaje.md` (Python/Rust/Java/TS).
- Spec de `rag-provider` documentada (SPEC-RAG-0001), sin implementar — próxima iniciativa candidata.
- Pase de actualización de toda la documentación en `docs/` y `spec-native/` para eliminar referencias obsoletas (Qwen 0.5B, puerto 43110, `containers/ocr-mcp` en Python, SDK MCP).
- `DocumentContext` formalizado en Protobuf; confirmación OCR manual retirada; `galaxIA-E2E` ejecutó y pasó PDF + pregunta inicial + pregunta de seguimiento el 2026-08-05.

## Iniciativa browser-rag (2026-08-05)

- Spec activa: `SPEC-BROWSER-RAG-0001`.
- Decisión: `DEC-0093` — SQLite WASM + `sqlite-vec` + OPFS en Web Worker,
  fallback IndexedDB/coseno y embeddings locales para conservar contexto al
  cambiar de LLM.
- Implementación iniciada en `galaxIA-Core/apps/portal-chat`: chunking,
  embeddings, almacenamiento vectorial local, recuperación por conversación y
  documento, e integración automática después de OCR.
- Validación actual: tests de chunking/aislamiento, typecheck y build del
  Portal pasan; falta la prueba E2E funcional con PDF y seguimiento.

## Next steps (candidatos, sin iniciativa activa)

1. Completar `browser-rag` (SPEC-BROWSER-RAG-0001), incluida la prueba E2E
   automatizada con PDF + pregunta inicial + seguimiento.
2. Propagar `conversationId` → `requestId` y loggear metadata de trazabilidad (DEC-0012, sigue `proposed`).
3. Validar manifiesto contra campos obligatorios del contrato de provider en el Registry (DEC-0013, sigue `proposed`).
4. Evaluar un modelo de chat general (no-Coder) con tool calling para el caso de uso de chat genérico, distinto de OCR.
5. Script de demo de failover OCR para la ponencia (pendiente desde antes de esta sesión).

## Context for next agent

Stack desplegado en bastion 192.168.3.173:
- `fhs-web` :3000
- `fhs-agent-server` :30083→8081
- `fhs-llm-provider` :30084→43111 → `llama-server` :8080 (Qwen2.5-Coder-3B, `--jinja`, gestionado fuera de este repo en `PoC-Llama.cpp`)
- `fhs-ocr-provider` :30085→43112 → `ether-ocr-api` :8000

Antes de dar por hecho que algo "funciona": ver `docs/protocolo-provider.md` sección "Lecciones de integración" y `spec-native/TRACEABILITY.md` sección "registrado no es probado" — varios bugs de esta sesión eran invisibles hasta correr una prueba end-to-end real contra el bastion.
