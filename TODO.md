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
- [ ] Cambiar al modelo DeepSeek-R1-Distill-Qwen-1.5B en el bastion
- [ ] Probar flujo WebSocket end-to-end con OCR real
- [ ] Preparar script de demo de failover OCR para la ponencia
- [ ] Actualizar TRACEABILITY.md al cerrar la iniciativa

## Notas

- Iniciativa: `fhs-mvp`
- Estado SpecNative: sesión activa (TASK-FHS-0008)
- Alcance: federar `provider.type = "llm"` y `provider.type = "mcp"`
- Identidad: DID simplificado (`did:key:<nombre-simple>`) para PoC; Ed25519 documentado como deuda técnica
- Registry: almacenamiento en memoria para la PoC
- Demo: usa WebSocket para streaming de eventos del chat
- IPFS: identificado como mejora futura para privacidad de artefactos
- LLM: DeepSeek-R1-Distill-Qwen-1.5B en bastion `192.168.3.173:43110`
- Protocolo FHS: el Agent Server ya no hace HTTP directo a LLM. El `LlmGateway` habla FHS WebSocket (`chat.request`/`chat.delta`/`chat.completed`). El provider LLM (`examples/llm-provider/`) es el único que traduce FHS → HTTP a llama.cpp.
- Puertos locales: agent-server en :8083, llm-provider en :43111, mock-llm en :43110, SSH tunnel ocupa :8081
