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
    @echo "→ Levantando atlas + navigator + portal..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      atlas navigator portal

container-up-atlas:
    @echo "→ Levantando atlas (Registry)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      atlas

container-up-llm:
    @echo "→ Levantando star (Star/LLM provider FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      star

container-up-ocr:
    @echo "→ Levantando satellite-ocr (Satellite/OCR provider FHS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      satellite-ocr

container-up-rag:
    @echo "→ Levantando rag-provider (SPEC-RAG-0001)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      rag-provider

# Detiene y elimina un contenedor específico
container-rm service:
    @echo "→ Eliminando {{service}}..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} rm -sf {{service}}

# Logs de un contenedor específico
container-logs service="":
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} logs -f {{service}} --tail=50

# ── TLS (certificado autofirmado, ver docs/tls-autofirmado.md) ─────────────

TLS_COMPOSE_FILE := justfile_directory() + "/containers/compose.tls.yaml"

# Genera el certificado autofirmado (una vez por máquina, o copiar el mismo
# par a laptop y bastion). Ejemplo: just tls-gen-cert 192.168.3.137 192.168.3.173
tls-gen-cert ip_laptop="127.0.0.1" ip_bastion="127.0.0.1":
    helpers/scripts/shell/generate-dev-cert.sh {{ip_laptop}} {{ip_bastion}}

# Levanta atlas + navigator + portal con TLS (requiere tls-gen-cert antes)
container-up-core-tls:
    @echo "→ Levantando atlas + navigator + portal (TLS)..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} -f {{TLS_COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      atlas navigator portal

# Levanta star (Star/LLM provider) con TLS
container-up-llm-tls:
    @echo "→ Levantando star con TLS..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} -f {{TLS_COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      star

# Levanta satellite-ocr (Satellite/OCR provider) con TLS
container-up-ocr-tls:
    @echo "→ Levantando satellite-ocr con TLS..."
    {{COMPOSE_CMD}} -f {{COMPOSE_FILE}} -f {{TLS_COMPOSE_FILE}} up -d --build \
      --build-arg COMMIT_HASH={{commit-hash}} \
      --build-arg BUILD_DATE={{build-date}} \
      satellite-ocr
