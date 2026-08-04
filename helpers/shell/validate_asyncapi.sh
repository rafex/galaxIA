#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log_info "Validating AsyncAPI — idl/asyncapi.yaml"

npx --yes @asyncapi/cli validate idl/asyncapi.yaml \
  --fail-severity error \
  || die "AsyncAPI validation failed"

log_ok "AsyncAPI valid"
