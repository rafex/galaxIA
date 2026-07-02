+++
[session]
state = "idle"
agent = "claude"
initiative = "fhs-mvp"
task = "none"
intent = "PoC funcional end-to-end: chat + OCR determinístico + confirmación de usuario, verificado contra el bastion real."
last_updated = "2026-07-02T15:35:00Z"
+++

# Active Session

## Current state

`idle` — no hay trabajo en curso. La PoC está funcional: subir un documento (imagen o PDF), ver el texto OCR extraído, confirmar su uso, y recibir una respuesta del LLM basada en ese texto, todo verificado end-to-end contra el bastion (192.168.3.173).

## Qué se completó en esta sesión (2026-07-02)

- Soporte de PDF en el frontend (antes solo imágenes).
- Reescritura de `McpHost` para hablar FHS WebSocket real (antes usaba el SDK MCP-HTTP y nunca conectaba) — DEC-0014.
- Corrección del matching de capability por tokens compartidos (antes comparaba substrings completos y nunca coincidía) — DEC-0015.
- Cambio de modelo a Qwen 2.5 Coder 3B con tool calling, con fallback de parseo en `llm-bridge.ts` para cuando `llama-server` no llena `tool_calls` nativo — DEC-0016, DEC-0017.
- Configuración de modelo movida de hardcodeado a variables de entorno (`MODEL_ID`, `MODEL_TOOL_CALLING_SUPPORTED`, etc.) — DEC-0019.
- Aislamiento de eventos por `conversationId` en el EventBus (antes se mezclaban entre conversaciones concurrentes) — DEC-0018, verificado con dos inferencias reales en paralelo.
- **Ejecución determinística de OCR**: ya no depende de que el LLM decida invocar la tool — se ejecuta directo al adjuntar un archivo — DEC-0020.
- **Flujo de confirmación de OCR** (SPEC-OCRCONFIRM-0001): burbuja colapsada con el texto extraído + botones "Usar documento"/"Descartar", sin gastar una llamada al LLM hasta que el usuario decide. Sienta el precedente de estado por conversación en `chat-ws.ts`.
- Indicador visual de "pensando" (dots animados) mientras se espera la respuesta del LLM.
- Documentación extensa: `docs/protocolo.md` con diagramas Mermaid, `docs/protocolo-provider.md` (contrato plug-and-play para providers nuevos), `docs/implementacion-multilenguaje.md` (Python/Rust/Java/TS).
- Spec de `rag-provider` documentada (SPEC-RAG-0001), sin implementar — próxima iniciativa candidata.
- Pase de actualización de toda la documentación en `docs/` y `spec-native/` para eliminar referencias obsoletas (Qwen 0.5B, puerto 43110, `containers/ocr-mcp` en Python, SDK MCP).

## Next steps (candidatos, sin iniciativa activa)

1. `rag-provider` (SPEC-RAG-0001) — indexado y recuperación de documentos largos, reutilizando el estado por conversación que ya existe en `chat-ws.ts`.
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
