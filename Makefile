# galaxIA — Makefile de construcción
# Responsabilidad: producir artefactos (build, clean, install, typecheck)
# Para orquestación de servicios: usar just (ver Justfile)

include helpers/mk/common.mk
include helpers/mk/node.mk
include helpers/mk/container.mk

.DEFAULT_GOAL := help

.PHONY: help
help:
	@echo "$(C_CYAN)$(C_BOLD)galaxIA — Makefile de construcción$(C_RESET)"
	@echo ""
	@echo "$(C_BOLD)Construcción:$(C_RESET)"
	@echo "  make build              Build completo (protocol → apps → examples)"
	@echo "  make build-protocol     Solo fhs-protocol"
	@echo "  make build-agent        Solo agent-server"
	@echo "  make build-web          Solo web frontend"
	@echo "  make build-examples     Solo llm-provider + ocr-provider"
	@echo ""
	@echo "$(C_BOLD)Verificación:$(C_RESET)"
	@echo "  make typecheck          TypeScript typecheck en todos los workspaces"
	@echo "  make lint               Lint en todos los workspaces"
	@echo ""
	@echo "$(C_BOLD)Utilidades:$(C_RESET)"
	@echo "  make install            npm ci"
	@echo "  make clean              Eliminar dist/ en todos los workspaces"
	@echo ""
	@echo "$(C_BOLD)Contenedores:$(C_RESET)"
	@echo "  make container-build    Construir imágenes"
	@echo "  make container-up       Levantar contenedores"
	@echo "  make container-down     Detener contenedores"
	@echo "  make container-logs     Ver logs de contenedores"
	@echo "  make container-restart  Reiniciar contenedores"
	@echo ""
	@echo "$(C_BOLD)Orquestación:$(C_RESET) usar $(C_CYAN)just$(C_RESET) (ver Justfile o ejecutar 'just --list')"
