# helpers/just/status.just — diagnóstico del estado de servicios
# Incluir con: import 'helpers/just/status.just'

import 'common.just'

# ── Status ─────────────────────────────────────────────────────────────────

# Muestra estado de servicios: qué puertos están ocupados y por quién
status:
    @echo "=== Estado de servicios galaxIA ==="
    @echo ""
    helpers/scripts/shell/process-status.sh

# ── Kill All ───────────────────────────────────────────────────────────────

# Mata todos los procesos del proyecto (tsx, node de los workspaces)
kill-all:
    @echo "→ Matando procesos del proyecto..."
    @for port in {{AGENT_PORT}} {{LLM_PORT}} {{OCR_PORT}} {{MOCK_LLM_PORT}}; do \
        helpers/scripts/shell/kill-by-port.sh $$port; \
    done
    @echo "  Listo."

# ── Logs ───────────────────────────────────────────────────────────────────

# Tail de logs del agent-server (cuando redirigido a archivo)
log-agent file="/tmp/agent-server.log":
    tail -f {{file}}

# Tail de logs de contenedores
log-containers:
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} logs -f

# ── Port Check ─────────────────────────────────────────────────────────────

# Verifica si un puerto específico está libre
check-port port:
    helpers/scripts/shell/port-check.sh {{port}}

# ── Esperar servicio ──────────────────────────────────────────────────────

# Espera hasta que un servicio HTTP responda
wait-for url timeout="30":
    helpers/scripts/shell/wait-for-service.sh {{url}} {{timeout}}
