# helpers/mk/common.mk — variables y funciones compartidas para Makefile
# Incluir con: include helpers/mk/common.mk

# ── Colores ────────────────────────────────────────────────────────────────
C_RESET   := \033[0m
C_BOLD    := \033[1m
C_RED     := \033[31m
C_GREEN   := \033[32m
C_YELLOW  := \033[33m
C_BLUE    := \033[34m
C_CYAN    := \033[36m

# ── Workspaces ─────────────────────────────────────────────────────────────
WS_PROTOCOL := packages/fhs-protocol
WS_AGENT    := apps/agent-server
WS_WEB      := apps/web
WS_LLM_EX   := examples/llm-provider
WS_OCR_EX   := examples/ocr-provider

WS_ALL      := $(WS_PROTOCOL) $(WS_AGENT) $(WS_WEB) $(WS_LLM_EX) $(WS_OCR_EX)

# ── Contenedores ───────────────────────────────────────────────────────────
CONTAINER_DIR := containers
COMPOSE_FILE  := $(CONTAINER_DIR)/compose.yaml
COMPOSE_CMD   := $(shell command -v podman-compose 2>/dev/null || echo docker compose)

# ── Funciones ──────────────────────────────────────────────────────────────

# info <mensaje>
define info
	@printf "$(C_BLUE)[INFO]$(C_RESET)  %s\n" "$(1)"
endef

# ok <mensaje>
define ok
	@printf "$(C_GREEN)[OK]$(C_RESET)    %s\n" "$(1)"
endef

# warn <mensaje>
define warn
	@printf "$(C_YELLOW)[WARN]$(C_RESET)  %s\n" "$(1)"
endef

# err <mensaje>
define err
	@printf "$(C_RED)[ERROR]$(C_RESET) %s\n" "$(1)"
endef

# section <título>
define section
	@printf "\n$(C_CYAN)$(C_BOLD)━━━ %s ━━━$(C_RESET)\n\n" "$(1)"
endef
