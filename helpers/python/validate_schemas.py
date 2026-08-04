#!/usr/bin/env python3
"""Validate JSON Schema draft-07 files with $ref resolution between schemas.

Checks:
1. Each schema file is valid JSON
2. Each schema validates against the draft-07 meta-schema
3. All $ref pointers resolve correctly between schema files
4. No orphan $refs (every ref points to an existing $id)
"""

import json
import sys
from pathlib import Path
from urllib.parse import urljoin

import jsonschema
from referencing import Registry
from referencing.exceptions import NoSuchResource
from referencing.jsonschema import DRAFT7

ROOT = Path(__file__).resolve().parents[2]
SCHEMAS_DIR = ROOT / "schemas"


def load_schema(path: Path) -> dict:
    with open(path) as f:
        return json.load(f)


def build_registry(schemas: dict[str, dict]) -> Registry:
    registry = Registry()
    for schema_id, schema in schemas.items():
        resource = DRAFT7.create_resource(schema)
        registry = registry.with_resource(schema_id, resource)
    return registry


def validate_meta(schema: dict, filepath: str) -> None:
    try:
        jsonschema.Draft7Validator.check_schema(schema)
    except jsonschema.SchemaError as e:
        raise SystemExit(f"  Meta-schema validation failed:\n    {e}")


def validate_refs(schema: dict, registry: Registry, base_uri: str) -> bool:
    """Walk the schema tree and verify all $ref targets exist in the registry."""
    ok = True

    def _walk(node, path="", current_base=None):
        nonlocal ok
        if isinstance(node, dict):
            if "$id" in node:
                current_base = node["$id"]
            if "$ref" in node:
                ref = node["$ref"]
                resolved = urljoin(current_base or base_uri, ref)
                try:
                    registry.get_or_retrieve(resolved)
                except NoSuchResource as e:
                    print(
                        f"  Unresolved $ref '{ref}' → '{resolved}' "
                        f"at {path}$ref: {e}",
                        file=sys.stderr,
                    )
                    ok = False
            for key, value in node.items():
                _walk(value, f"{path}{key}.", current_base)
        elif isinstance(node, list):
            for i, item in enumerate(node):
                _walk(item, f"{path}[{i}].", current_base)

    _walk(schema, f"{base_uri}#/")
    return ok


def main():
    schema_files = sorted(SCHEMAS_DIR.glob("*.schema.json"))
    if not schema_files:
        print("No schema files found in schemas/", file=sys.stderr)
        sys.exit(1)

    loaded_schemas: dict[str, dict] = {}
    for sf in schema_files:
        try:
            schema = load_schema(sf)
        except json.JSONDecodeError as e:
            print(f"  Invalid JSON: {sf.name} — {e}", file=sys.stderr)
            sys.exit(1)
        sid = schema.get("$id")
        if not sid:
            print(f"  Missing $id in {sf.name}", file=sys.stderr)
            sys.exit(1)
        loaded_schemas[sid] = schema

    registry = build_registry(loaded_schemas)

    errors = 0
    for sf in schema_files:
        schema = load_schema(sf)
        print(f"  {sf.name}")

        try:
            validate_meta(schema, sf.name)
        except SystemExit as e:
            print(str(e), file=sys.stderr)
            errors += 1
            continue

        if not validate_refs(schema, registry, schema.get("$id", "")):
            errors += 1

    if errors > 0:
        print(f"\n  {errors} schema(s) with errors", file=sys.stderr)
        sys.exit(1)

    print(f"\n  All {len(schema_files)} JSON Schemas valid")


if __name__ == "__main__":
    main()
