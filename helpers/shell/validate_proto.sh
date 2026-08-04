#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
source "$SCRIPT_DIR/_common.sh"

log_info "Validating Protobuf syntax — idl/fhs-protocol.proto"

protoc \
  --proto_path=idl \
  --descriptor_set_out=/dev/null \
  idl/fhs-protocol.proto \
  || die "Proto syntax error in idl/fhs-protocol.proto"

log_ok "Proto syntax valid"
