#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE_DIR="${D2_SOURCE_DIR:-${ROOT_DIR}/docs/diagrams}"
OUTPUT_DIR="${D2_OUTPUT_DIR:-${ROOT_DIR}/site/assets/diagrams}"
D2_BIN="${D2_BIN:-d2}"

if ! command -v "${D2_BIN}" >/dev/null 2>&1 && [[ ! -x "${D2_BIN}" ]]; then
  echo "D2 no está disponible. Instala D2 v0.9.0 o define D2_BIN con su ruta." >&2
  exit 1
fi

mkdir -p "${OUTPUT_DIR}"
found=0
for source in "${SOURCE_DIR}"/*.d2; do
  [[ -e "${source}" ]] || continue
  found=1
  name="$(basename "${source}" .d2)"
  output="${OUTPUT_DIR}/${name}.svg"
  "${D2_BIN}" --layout=elk "${source}" "${output}"
  echo "D2: ${source} -> ${output}"
done

if [[ "${found}" -eq 0 ]]; then
  echo "No se encontraron fuentes .d2 en ${SOURCE_DIR}" >&2
  exit 1
fi
