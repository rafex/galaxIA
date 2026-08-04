#!/usr/bin/env bash
set -euo pipefail

log_info() { printf "\033[34mℹ\033[0m  %s\n" "$1"; }
log_ok()   { printf "\033[32m✅\033[0m %s\n" "$1"; }
log_err()  { printf "\033[31m❌\033[0m %s\n" "$1" >&2; }
die()      { log_err "$1"; exit 1; }
