# helpers/just/common.just — variables y funciones compartidas para Justfile
# Incluir con: import 'helpers/just/common.just'

# ── Workspaces ─────────────────────────────────────────────────────────────
WS_PROTOCOL := "packages/fhs-protocol"
WS_AGENT    := "apps/agent-server"
WS_WEB      := "apps/web"
WS_LLM_EX   := "examples/llm-provider"
WS_OCR_EX   := "examples/ocr-provider"

# ── Puerto defaults (se pueden sobrescribir en .env) ───────────────────────
AGENT_PORT     := env_var_or_default("AGENT_SERVER_PORT", "8083")
WEB_PORT       := env_var_or_default("WEB_PORT", "3000")
LLM_PORT       := env_var_or_default("LLM_PROVIDER_PORT", "43111")
OCR_PORT       := env_var_or_default("OCR_PROVIDER_PORT", "43112")
MOCK_LLM_PORT  := env_var_or_default("MOCK_LLM_PORT", "43110")
REGISTRY_URL   := env_var_or_default("REGISTRY_URL", "ws://localhost:" + AGENT_PORT + "/fhs/v1/ws")
LLAMA_CPP_URL  := env_var_or_default("LLAMA_CPP_URL", "http://localhost:" + MOCK_LLM_PORT + "/v1")
OCR_SVC_URL    := env_var_or_default("OCR_SERVICE_URL", "http://localhost:8082")

# ── Contenedores ───────────────────────────────────────────────────────────
COMPOSE_FILE := "containers/compose.yaml"
COMPOSE_CMD  := `command -v podman-compose >/dev/null && echo podman-compose || echo "docker compose"`

# ── Utilidades ─────────────────────────────────────────────────────────────

# Ejecuta tsx con un workspace
[no-exit-message]
run-tsx workspace file args="":
    npx tsx {{workspace}}/{{file}} {{args}}

# Ejecuta npm script en un workspace
[no-exit-message]
npm-run workspace script args="":
    npm run {{script}} -w {{workspace}} {{args}}
