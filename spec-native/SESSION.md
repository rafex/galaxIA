+++
[session]
state = "in_progress"
agent = "unknown"
initiative = "fhs-mvp"
task = "TASK-FHS-0008"
intent = "Crear recubrimiento FHS del LLM provider y documentar Agent Server para humanos y agentes. El LLM ya no recibe HTTP directo desde el agent-server — toda la comunicación pasa por el protocolo FHS WebSocket (chat.request/chat.delta/chat.completed)."
last_updated = "2026-07-01T15:51:34Z"
+++

# Active Session

## Current state

Crear recubrimiento FHS del LLM provider y documentar Agent Server para humanos y agentes. El LLM ya no recibe HTTP directo desde el agent-server — toda la comunicación pasa por el protocolo FHS WebSocket (chat.request/chat.delta/chat.completed).

## Next steps

1. Probar flujo con llama.cpp real en el bastion (cambiar modelo a DeepSeek-R1-Distill-Qwen-1.5B-Q4_K_M.gguf)
2. Conectar el MCP OCR y probar failover end-to-end
3. Preparar script de demo de failover OCR para la ponencia
4. Actualizar TRACEABILITY.md al cerrar la iniciativa

## Context for next agent

Cambios realizados:
- Creado examples/llm-provider/ — nodo FHS completo que registra en Registry, expone chat FHS WebSocket (:43111), y traduce a llama.cpp internamente
- Actualizado LlmGateway (apps/agent-server/src/providers/llm-gateway.ts) — eliminado fallback HTTP, solo habla FHS WebSocket
- Extendido fhs-protocol: agregado "fhs" a EndpointInfo.protocol, nuevos tipos ChatRequest/Delta/Completed/Error en messages.ts
- Creado docs/agent-server.md — documentación humana del Agent Server
- Actualizado spec-native/ARCHITECTURE.md — flujo FHS documentado con diagrama de secuencia
- Actualizado docs/README.md con enlace a agent-server.md
- Corregidos puertos en scripts: registry en :8083 (SSH tunnel ocupa :8081)
- Prueba end-to-end exitosa con mock-llm-server
