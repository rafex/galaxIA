# galaxIA — Justfile de orquestación
# Responsabilidad: coordinar procesos y flujos de desarrollo
# Para construcción: usar make (ver Makefile)

import 'helpers/just/common.just'
import 'helpers/just/dev.just'
import 'helpers/just/test.just'
import 'helpers/just/status.just'

# ── Default ────────────────────────────────────────────────────────────────

default:
    @just --list

# ── Versión ────────────────────────────────────────────────────────────────

commit-hash := `git rev-parse --short HEAD 2>/dev/null || echo unknown`
build-date := `date -u +%Y-%m-%dT%H:%M:%SZ`

# ── Contenedores ───────────────────────────────────────────────────────────

container-up:
    @echo "→ Levantando todos los contenedores..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}}

container-down:
    @echo "→ Deteniendo todos los contenedores..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} down

container-build:
    @echo "→ Construyendo imágenes..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}}

container-restart: container-down container-up

# ── Contenedores individuales ──────────────────────────────────────────────

container-up-core:
    @echo "→ Levantando agent-server + web..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      agent-server web

container-up-llm:
    @echo "→ Levantando llm-provider (wrapper FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      llm-provider

container-up-ocr:
    @echo "→ Levantando ocr-provider (wrapper FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      ocr-provider

# Detiene y elimina un contenedor específico
container-rm service:
    @echo "→ Eliminando {{service}}..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} rm -sf {{service}}

# Logs de un contenedor específico
container-logs service="":
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} logs -f {{service}} --tail=50
