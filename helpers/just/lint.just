lint-proto:
    bash helpers/shell/validate_proto.sh

lint-schemas:
    cd helpers/python && uv run python validate_schemas.py

lint-asyncapi:
    bash helpers/shell/validate_asyncapi.sh

lint: lint-proto lint-schemas lint-asyncapi
    @echo "  All lint checks passed"
