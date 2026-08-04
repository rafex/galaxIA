.PHONY: proto-check build

proto-check:
	@bash helpers/shell/validate_proto.sh

build: proto-check
	@echo "  Build complete"
