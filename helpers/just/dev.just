# helpers/just/dev.just — recetas de desarrollo por servicio
# Incluir con: import 'helpers/just/dev.just'

import 'common.just'

# ── Atlas (Registry) ───────────────────────────────────────────────────────

# Levanta atlas en modo dev (hot reload) — DEC-0035
dev-atlas:
    @echo "→ Atlas en http://localhost:{{ATLAS_PORT}}"
    @echo "  Registro de nodos: ws://localhost:{{ATLAS_PORT}}/fhs/v1/ws"
    PORT={{ATLAS_PORT}} npx tsx {{WS_ATLAS}}/src/index.ts

# ── Agent Server (Navigator) ───────────────────────────────────────────────

# Levanta el navigator en modo dev (hot reload) — requiere atlas corriendo
dev-agent:
    @echo "→ Navigator en http://localhost:{{AGENT_PORT}}"
    @echo "  Atlas: {{ATLAS_URL}}"
    @echo "  Chat API: ws://localhost:{{AGENT_PORT}}/api/chat/ws"
    PORT={{AGENT_PORT}} ATLAS_URL={{ATLAS_URL}} npx tsx {{WS_AGENT}}/src/index.ts

# ── Frontend Web ───────────────────────────────────────────────────────────

# Levanta el frontend en modo dev (Vite)
dev-web:
    @echo "→ Frontend Web en http://localhost:5173"
    npm run dev -w {{WS_WEB}}

# ── LLM Provider FHS ──────────────────────────────────────────────────────

# Levanta el llm-provider FHS (requiere mock-llm o llama.cpp en LLAMA_CPP_URL)
dev-llm-provider:
    @echo "→ LLM Provider FHS en ws://localhost:{{LLM_PORT}}"
    @echo "  llama.cpp: {{LLAMA_CPP_URL}}"
    @echo "  Registry: {{REGISTRY_URL}}"
    LLM_PROVIDER_PORT={{LLM_PORT}} \
    LLAMA_CPP_URL={{LLAMA_CPP_URL}} \
    REGISTRY_URL={{REGISTRY_URL}} \
    npx tsx {{WS_LLM_EX}}/src/index.ts

# ── OCR Provider FHS ───────────────────────────────────────────────────────

# Levanta el ocr-provider FHS
dev-ocr-provider:
    @echo "→ OCR Provider FHS en ws://localhost:{{OCR_PORT}}"
    @echo "  OCR Svc: {{OCR_SVC_URL}}"
    @echo "  Registry: {{REGISTRY_URL}}"
    OCR_PROVIDER_PORT={{OCR_PORT}} \
    OCR_SERVICE_URL={{OCR_SVC_URL}} \
    REGISTRY_URL={{REGISTRY_URL}} \
    npx tsx {{WS_OCR_EX}}/src/index.ts

# ── Mock LLM Server ────────────────────────────────────────────────────────

# Levanta el mock LLM server (simula llama.cpp en local)
dev-mock-llm:
    @echo "→ Mock LLM Server en http://localhost:{{MOCK_LLM_PORT}}"
    PORT={{MOCK_LLM_PORT}} npx tsx scripts/mock-llm-server.ts

# ── Mock Providers ─────────────────────────────────────────────────────────

# Registra proveedores mock en el Registry (una sola ejecución)
dev-mock-providers:
    @echo "→ Registrando mock providers en {{REGISTRY_URL}}"
    REGISTRY_URL={{REGISTRY_URL}} npx tsx scripts/mock-providers.ts

# ── Stack completo (para arranque rápido en foreground) ────────────────────

# TODO: en versiones futuras de just, usar varios comandos concurrentes.
# Por ahora se arranca cada servicio en su propia terminal con las recetas
# individuales: just dev-atlas, just dev-agent, just dev-mock-llm,
# just dev-llm-provider, etc.
