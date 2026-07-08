# TODO.md — Tablero de tareas activo

## Active — MVP FHS v0.1 (ChatGPT Comunitario)

- [x] Aprobar plan de estructura y protocolo FHS MVP
- [x] Actualizar documentos base del repositorio (PRODUCT, ARCHITECTURE, STACK, CONVENTIONS, ROADMAP, DECISIONS)
- [x] Crear spec `fhs-mvp` en `spec-native/specs/fhs-mvp/SPEC.md`
- [x] Crear tareas `fhs-mvp` en `spec-native/tasks/fhs-mvp/TASKS.md`
- [x] Crear estructura de monorepo (`apps/`, `packages/`)
- [x] Crear `packages/fhs-protocol` (contratos del protocolo)
- [x] Crear `apps/agent-server` (Registry + LLM Gateway + MCP Host + Agent Runtime)
- [x] Crear `apps/web` (Vite + vanilla TS + CSS3 + WebSocket)
- [x] Crear infraestructura de contenedores (`containers/`)
- [x] Cambiar frontend de SSE a WebSocket
- [x] Crear endpoint WebSocket para chat en agent-server
- [x] Crear carpeta `docs/` con documentación humana del protocolo FHS
- [x] Actualizar SpecNative con IPFS como mejora futura
- [x] Conectar llama.cpp del bastion vía túnel SSH
- [x] Crear recubrimiento FHS del LLM provider (`examples/llm-provider/`)
- [x] Migrar LlmGateway a FHS WebSocket (eliminar HTTP directo a LLM)
- [x] Documentar Agent Server en `docs/agent-server.md` y `spec-native/ARCHITECTURE.md`
- [x] Probar flujo FHS WebSocket end-to-end (Registry → LlmGateway → llm-provider → LLM)
- [x] Crear recubrimiento FHS del OCR provider (`examples/ocr-provider/`)
- [x] Agregar mensajes FHS de tool call al protocolo (`tool.list`, `tool.call`, `tool.result`)
- [x] Cambiar a modelo Qwen 2.5 0.5B (DeepSeek R1 demasiado lento en Mac mini)
- [x] Probar flujo chat end-to-end con Qwen 0.5B en el bastion
- [x] Agregar versionado con hash del commit en frontend y backend
- [x] Probar flujo OCR end-to-end via FHS (ocr-provider → ether-ocr-api) — validado solo hasta el provider, NO a través del Agent Runtime completo (ver corrección abajo)
- [x] Documentar providers FHS en docs/proveedores.md
- [x] Documentar despliegue en docs/despliegue.md
- [x] Agregar soporte de PDF en el chat (frontend + inyección de artifact en runtime)
- [x] Corregir `McpHost`: hablaba MCP-HTTP nativo en vez de FHS WebSocket real, nunca conectaba con providers `mcp` (DEC-0014)
- [x] Corregir matching de capability por nombre de tool (substring completo nunca coincidía con nombres reales, DEC-0015)
- [x] Probar flujo OCR end-to-end a través del Agent Runtime completo (chat → LLM → tool call → OCR → resultado) — validado 2026-07-02 con LLM mock de tool-calling; pipeline correcto
- [x] Resolver bloqueo de producción: cambiar a Qwen 2.5 Coder 3B con tool calling real (DEC-0016), corregir fallback de parseo de `tool_calls` en `llm-bridge.ts` (DEC-0017)
- [x] Ejecución determinística de OCR: ya no depende de que el LLM decida invocar la tool (DEC-0020)
- [x] Flujo de confirmación de OCR: burbuja colapsada + botones "Usar documento"/"Descartar" antes de llamar al LLM (SPEC-OCRCONFIRM-0001)
- [x] Aislar eventos por `conversationId` en el EventBus — verificado con dos conversaciones concurrentes reales (DEC-0018)
- [x] Indicador visual de "pensando" mientras se espera la respuesta del LLM
- [x] Documentar spec de `rag-provider` (SPEC-RAG-0001) — sin implementar, próxima iniciativa candidata
- [x] Actualizar toda la documentación (`docs/`, `spec-native/`) para eliminar referencias obsoletas (Qwen 0.5B, puerto 43110, `containers/ocr-mcp` en Python, SDK MCP)
- [x] Preparar script de demo de failover OCR para la ponencia
- [x] Actualizar TRACEABILITY.md al cerrar la iniciativa

## Notas

- Iniciativa: `fhs-mvp` — PoC funcional, sesión idle (ver `spec-native/SESSION.md`)
- Alcance: federar `provider.type = "llm"` y `provider.type = "mcp"`
- Identidad: DID simplificado (`did:key:<nombre-simple>`) para PoC; Ed25519 documentado como deuda técnica
- Registry: almacenamiento en memoria para la PoC
- Demo: usa WebSocket para streaming de eventos del chat, aislados por `conversationId`
- IPFS: identificado como mejora futura para privacidad de artefactos
- LLM: Qwen 2.5 Coder 3B en bastion, `llama-server` en `192.168.3.173:8080` (gestionado fuera de este repo, con `--jinja`). Modelo configurable por env vars, no hardcodeado (DEC-0019)
- Protocolo FHS: el Agent Server ya no hace HTTP directo a LLM ni usa el SDK MCP nativo. `LlmGateway` y `McpHost` hablan FHS WebSocket puro.
- Puertos locales: agent-server en :8083, llm-provider en :43111, mock-llm en :43110, SSH tunnel ocupa :8081
- Próxima iniciativa candidata: `rag-provider` (SPEC-RAG-0001, sin implementar)
