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

# ── Contenedores ───────────────────────────────────────────────────────────

container-up:
    @echo "→ Levantando todos los contenedores..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build

container-down:
    @echo "→ Deteniendo todos los contenedores..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} down

container-build:
    @echo "→ Construyendo imágenes..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} build

container-restart: container-down container-up

# ── Contenedores individuales ──────────────────────────────────────────────

# Levanta solo agent-server + web (sin providers)
container-up-core:
    @echo "→ Levantando agent-server + web..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build agent-server web

# Levanta solo el llm-provider (wrapper FHS de llama.cpp)
container-up-llm:
    @echo "→ Levantando llm-provider (wrapper FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build llm-provider

# Levanta solo el ocr-provider (wrapper FHS de OCR)
container-up-ocr:
    @echo "→ Levantando ocr-provider (wrapper FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build ocr-provider

# Detiene y elimina un contenedor específico
container-rm service:
    @echo "→ Eliminando {{service}}..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} rm -sf {{service}}

# Logs de un contenedor específico
container-logs service="":
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} logs -f {{service}} --tail=50
