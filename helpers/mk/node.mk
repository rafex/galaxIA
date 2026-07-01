# helpers/mk/node.mk — targets de build Node.js / npm workspaces
# Depende de: helpers/mk/common.mk
# Incluir con: include helpers/mk/node.mk

include helpers/mk/common.mk

.PHONY: install
install:
	$(call section,Instalando dependencias)
	npm ci
	$(call ok,Dependencias instaladas)

.PHONY: build
build: build-protocol build-agent build-web
	$(call section,Build de ejemplos)
	npm run build -w $(WS_LLM_EX)
	npm run build -w $(WS_OCR_EX)
	$(call ok,Build completo terminado)

.PHONY: build-protocol
build-protocol:
	$(call info,Compilando fhs-protocol)
	npm run build -w $(WS_PROTOCOL)
	$(call ok,fhs-protocol compilado)

.PHONY: build-agent
build-agent: build-protocol
	$(call info,Compilando agent-server)
	npm run build -w $(WS_AGENT)
	$(call ok,agent-server compilado)

.PHONY: build-web
build-web: build-protocol
	$(call info,Compilando web)
	npm run build -w $(WS_WEB)
	$(call ok,web compilado)

.PHONY: build-examples
build-examples: build-protocol
	$(call info,Compilando llm-provider)
	npm run build -w $(WS_LLM_EX)
	$(call ok,llm-provider compilado)
	$(call info,Compilando ocr-provider)
	npm run build -w $(WS_OCR_EX)
	$(call ok,ocr-provider compilado)

.PHONY: typecheck
typecheck:
	$(call section,Typecheck)
	npm run typecheck --workspaces
	$(call ok,Typecheck pasado)

.PHONY: lint
lint:
	$(call section,Lint)
	npm run lint --workspaces
	$(call ok,Lint pasado)

.PHONY: clean
clean:
	$(call section,Limpiando artefactos)
	@for ws in $(WS_ALL); do \
		printf "$(C_BLUE)[CLEAN]$(C_RESET) $$ws\n"; \
		rm -rf $$ws/dist $$ws/.tsbuildinfo 2>/dev/null || true; \
	done
	rm -rf node_modules/.cache 2>/dev/null || true
	$(call ok,Artefactos eliminados)
