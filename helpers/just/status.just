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

# ── Logs con lnav (despliegue multi-host) ───────────────────────────────────
#
# Cada máquina de la PoC (ver docs/despliegue-multi-host.md) corre un
# checkout de este mismo repo pero levanta contenedores distintos según su
# rol: laptop = core (agent-server+web), bastion = llm-provider, raspi4b =
# ocr-provider+ether-ocr-api. Estas recetas combinan los logs de los
# contenedores de CADA rol en una sola vista de lnav (colores, filtro en
# vivo con "/", salto entre errores con "e"/"E") — usa la que corresponda
# a la máquina en la que estás parado, `podman logs -f` funciona igual sin
# importar si el contenedor se levantó con compose o con `podman run` suelto.

# Logs del core (laptop): agent-server + web
logs-core:
    #!/usr/bin/env bash
    set -euo pipefail
    exec lnav \
      <(podman logs -f --tail=200 fhs-agent-server 2>&1 | sed -u 's/^/[agent-server] /') \
      <(podman logs -f --tail=200 fhs-web 2>&1 | sed -u 's/^/[web] /')

# Logs del LLM (bastion): llm-provider (wrapper FHS)
logs-llm:
    #!/usr/bin/env bash
    set -euo pipefail
    exec lnav \
      <(podman logs -f --tail=200 fhs-llm-provider 2>&1 | sed -u 's/^/[llm-provider] /')

# Logs del OCR (raspi4b): ocr-provider (wrapper FHS) + ether-ocr-api
logs-ocr:
    #!/usr/bin/env bash
    set -euo pipefail
    exec lnav \
      <(podman logs -f --tail=200 fhs-ocr-provider 2>&1 | sed -u 's/^/[ocr-provider] /') \
      <(podman logs -f --tail=200 ether-ocr-api 2>&1 | sed -u 's/^/[ether-ocr-api] /')

# Logs de contenedores arbitrarios en lnav (uno o más nombres separados por espacio)
# Ejemplo: just logs-lnav fhs-agent-server fhs-web
logs-lnav *containers:
    #!/usr/bin/env bash
    set -euo pipefail
    if [ -z "{{containers}}" ]; then
      echo "Uso: just logs-lnav <contenedor> [contenedor2 ...]" >&2
      exit 1
    fi
    args=()
    for c in {{containers}}; do
      args+=("<(podman logs -f --tail=200 \"$c\" 2>&1 | sed -u \"s/^/[$c] /\")")
    done
    eval exec lnav "${args[@]}"

# ── Estado real de la PoC (anti-trampa) ─────────────────────────────────────
#
# Muestra qué está REALMENTE corriendo en esta máquina — contenedores FHS
# (con su estado real de podman, no lo que dice el Justfile) y procesos
# nativos como llama-server (que no corre en contenedor). Pensado para
# correr en cualquiera de las tres máquinas de la topología (ver
# docs/despliegue-multi-host.md) y ver de un vistazo si de verdad hay algo
# levantado ahí, sin fiarte de "ya lo dejé corriendo" de memoria.

# Contenedores y procesos reales de la PoC en ESTA máquina
poc-status:
    #!/usr/bin/env bash
    set -uo pipefail
    echo "=== Contenedores FHS/OCR en $(hostname) ==="
    # Sin --format Go-template de podman a propósito: just interpola llaves
    # dobles en el cuerpo de la receta (incluso dentro de comentarios), así
    # que cualquier sintaxis de plantilla de podman rompería el parseo del
    # Justfile. La tabla por defecto de "podman ps" ya alcanza.
    found=$(podman ps -a --filter "name=fhs-agent-server" --filter "name=fhs-web" \
      --filter "name=fhs-llm-provider" --filter "name=fhs-ocr-provider" \
      --filter "name=ether-ocr-api" --noheading 2>/dev/null)
    if [ -z "$found" ]; then
      echo "(ninguno de los contenedores conocidos de la PoC existe en esta máquina)"
    else
      podman ps -a --filter "name=fhs-agent-server" --filter "name=fhs-web" \
        --filter "name=fhs-llm-provider" --filter "name=fhs-ocr-provider" \
        --filter "name=ether-ocr-api" 2>/dev/null
    fi
    echo ""
    echo "=== Procesos nativos (fuera de contenedor) ==="
    if pgrep -f "llama-server -m" >/dev/null 2>&1; then
      pgrep -fa "llama-server -m"
    else
      echo "(llama-server no está corriendo nativamente en esta máquina)"
    fi
    echo ""
    echo "=== Registry visto desde acá (si el agent-server corre en esta máquina) ==="
    if podman ps --filter "name=fhs-agent-server" --filter "status=running" --noheading 2>/dev/null | grep -q fhs-agent-server; then
      curl -sk --max-time 5 https://localhost:30083/api/fhs/providers 2>/dev/null \
        || curl -s --max-time 5 http://localhost:30083/api/fhs/providers 2>/dev/null \
        || echo "(agent-server corriendo pero no respondió health/providers)"
      echo ""
    else
      echo "(el agent-server no corre en esta máquina — usa 'just poc-status' en la laptop para ver el Registry)"
    fi

# ── Port Check ─────────────────────────────────────────────────────────────

# Verifica si un puerto específico está libre
check-port port:
    helpers/scripts/shell/port-check.sh {{port}}

# ── Esperar servicio ──────────────────────────────────────────────────────

# Espera hasta que un servicio HTTP responda
wait-for url timeout="30":
    helpers/scripts/shell/wait-for-service.sh {{url}} {{timeout}}
