# COMMANDS.md

Lista de comandos operativos del proyecto.

## Setup

```bash
just setup
```

Ejecuta `uv sync` en `helpers/python/`, configura `core.hookspath` a `.githooks/`,
y hace ejecutables los hooks.

## Desarrollo

```bash
# validación rápida — solo proto
make proto-check

# lint completo — proto + schemas + asyncapi
just lint

# CI completo
just ci
```

## Lint

| Comando | Validación | Herramienta |
|---|---|---|
| `just lint-proto` | Sintaxis Protobuf | `protoc` |
| `just lint-schemas` | JSON Schema draft-07 + `$ref` | Python `jsonschema` + `referencing` (UV) |
| `just lint-asyncapi` | AsyncAPI 3.0 | `npx @asyncapi/cli validate` |
| `just lint` | Los tres anteriores | — |

## CI

```bash
just ci
```

Equivalente a `just lint`. Bloquea si cualquier validación falla.

El hook `.githooks/pre-push` ejecuta `just ci` antes de cada push.
El workflow `.github/workflows/ci-idl.yml` ejecuta `just ci` en GitHub Actions.

## Build

```bash
make build        # proto-check (extensible a proto-gen)
make proto-check  # solo sintaxis proto
```

## Estructura de helpers

```
helpers/
├── shell/
│   ├── _common.sh              # logging, colores, die()
│   ├── validate_proto.sh       # protoc compile-check
│   └── validate_asyncapi.sh    # npx @asyncapi/cli validate --fail-severity error
├── python/
│   ├── pyproject.toml          # UV: jsonschema + pyyaml
│   └── validate_schemas.py     # meta-validation draft-07 + $ref resolution
├── mk/
│   └── build.mk                # build/construcción (include por Makefile)
└── just/
    ├── lint.just               # lint-proto, lint-schemas, lint-asyncapi, lint
    ├── ci.just                 # ci (lint completo)
    └── setup.just              # uv sync + git hooks config
```

### Reglas de responsabilidad

| Archivo | Rol | Puede llamar a |
|---------|-----|---------------|
| `Makefile` | build/construcción | `.mk` → shell/python |
| `Justfile` | task-manager | `.just` → shell/python, **y** `make` |

`just` puede llamar a `make`. `make` nunca llama a `just`.

### Flujo

```
Developer → just ci / make proto-check
Git push  → .githooks/pre-push → just ci
GitHub CI → .github/workflows/ci-idl.yml → just setup → just ci
```
