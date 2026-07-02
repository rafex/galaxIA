+++
[session]
state = "in_progress"
agent = "unknown"
initiative = "fhs-mvp"
task = "TASK-FHS-0008"
intent = "Integrar OCR provider con ether-ocr-api via FHS WebSocket. Documentar stack completo para humanos (docs/) y agentes (spec-native/). Stack corriendo en bastion con Qwen 0.5B y OCR funcional."
last_updated = "2026-07-02T04:58:24Z"
+++

# Active Session

## Current state

Integrar OCR provider con ether-ocr-api via FHS WebSocket. Documentar stack completo para humanos (docs/) y agentes (spec-native/). Stack corriendo en bastion con Qwen 0.5B y OCR funcional.

## Next steps

1. Preparar script de demo de failover OCR para la ponencia
2. Actualizar TRACEABILITY.md al cerrar la iniciativa
3. Probar failover cuando el OCR no está disponible y el LLM responde sin tools

## Context for next agent

Stack completo desplegado en bastion 192.168.3.173:
- fhs-web :3000 (frontend con version)
- fhs-agent-server :30083→8081 (registry + runtime)
- fhs-llm-provider :30084→43111 (wrapper FHS → curl → llama.cpp Qwen 0.5B)
- fhs-ocr-provider :30085→43112 (wrapper FHS → curl -F → ether-ocr-api:8000/api/v1/ocr)
- llama.cpp :43110 (host, Qwen 2.5 0.5B)
- ether-ocr-api :8001 (container, REST + MCP)

Red: ether-ocr-api conectado a red fhs para Docker DNS.
Bridges usan curl via child_process (evita bug Undici + ws en Node.js).
Timeouts: 300s bridge, 310s gateway.

Documentación creada/actualizada:
- docs/proveedores.md (nuevo)
- docs/despliegue.md (nuevo)
- docs/arquitectura.md (actualizado)
- docs/agent-server.md (sección tools FHS)
- docs/README.md (índice actualizado)
- spec-native/ARCHITECTURE.md (OCR, redes, riesgos)
- spec-native/TRACEABILITY.md (tabla fhs-mvp)
- TODO.md (marcados items completados)
