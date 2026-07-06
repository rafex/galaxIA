# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Sube la version patch de packages/fhs-protocol/package.json si la version
actual ya esta publicada en GitHub Packages.

Por que existe: publicar una version nueva de @rafex/galaxia-fhs-protocol
requiere subir el campo "version" en package.json ANTES de mergear a main
(spec-native/pipelines/CD.md) -- si se olvida, el workflow de publicacion
simplemente no hace nada (detecta que la version ya existe y se salta el
publish). Este script automatiza ese paso: consulta GitHub Packages, y si
la version actual ya fue publicada, sube el patch automaticamente.

Uso:
    uv run helpers/python/bump_protocol_version.py [--check]

    --check   solo reporta si haria falta un bump, no escribe nada
              (exit code 1 si la version actual ya esta publicada)

Variables de entorno:
    GH_TOKEN   token con permiso read:packages (requerido -- GitHub
               Packages exige autenticacion incluso para paquetes publicos)
"""

from __future__ import annotations

import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

PACKAGE_NAME = "@rafex/galaxia-fhs-protocol"
REGISTRY = "https://npm.pkg.github.com"
ROOT = Path(__file__).resolve().parents[2]
PACKAGE_JSON_PATH = ROOT / "packages" / "fhs-protocol" / "package.json"


def read_version(package_json: dict) -> tuple[int, int, int]:
    match = re.fullmatch(r"(\d+)\.(\d+)\.(\d+)", package_json["version"])
    if not match:
        raise ValueError(f"Version no es semver simple: {package_json['version']!r}")
    return tuple(int(g) for g in match.groups())  # type: ignore[return-value]


def is_version_published(version: str, token: str) -> bool:
    """Consulta GitHub Packages directamente (no via npm view) para no
    depender de que el .npmrc local ya este configurado con el registro."""
    encoded_name = PACKAGE_NAME.replace("/", "%2f")
    url = f"{REGISTRY}/{encoded_name}"
    req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.load(resp)
    except urllib.error.HTTPError as err:
        if err.code == 404:
            return False
        raise
    return version in data.get("versions", {})


def main() -> int:
    check_only = "--check" in sys.argv[1:]

    token = os.environ.get("GH_TOKEN")
    if not token:
        print("✗ ERROR: falta la variable de entorno GH_TOKEN (ver docstring).", file=sys.stderr)
        return 2

    package_json = json.loads(PACKAGE_JSON_PATH.read_text())
    major, minor, patch = read_version(package_json)
    current_version = f"{major}.{minor}.{patch}"

    published = is_version_published(current_version, token)

    if not published:
        print(f"✓ {current_version} todavía no está publicada — no hace falta bump.")
        return 0

    next_version = f"{major}.{minor}.{patch + 1}"

    if check_only:
        print(f"✗ {current_version} ya está publicada — haría falta subir a {next_version}.", file=sys.stderr)
        return 1

    package_json["version"] = next_version
    PACKAGE_JSON_PATH.write_text(json.dumps(package_json, indent=2) + "\n")
    print(f"→ {current_version} ya estaba publicada — version subida a {next_version}.")

    # También refleja el bump en package-lock.json si existe, para que
    # `npm ci` no se queje de desincronización.
    lock_path = ROOT / "package-lock.json"
    if lock_path.exists():
        subprocess.run(
            ["npm", "install", "--package-lock-only", "-w", "packages/fhs-protocol"],
            cwd=ROOT,
            check=True,
        )
        print("→ package-lock.json actualizado.")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
