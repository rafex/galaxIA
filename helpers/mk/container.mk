# helpers/mk/container.mk — targets de contenedores Podman/Docker
# Depende de: helpers/mk/common.mk
# Incluir con: include helpers/mk/container.mk

include helpers/mk/common.mk

.PHONY: container-build
container-build:
	$(call section,Construyendo imágenes)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) build
	$(call ok,Imágenes construidas)

.PHONY: container-up
container-up:
	$(call section,Levantando todos los contenedores)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build
	$(call ok,Contenedores arriba)

.PHONY: container-up-core
container-up-core:
	$(call section,Levantando agent-server + web)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build agent-server web
	$(call ok,Core arriba)

.PHONY: container-up-llm
container-up-llm:
	$(call section,Levantando llm-provider FHS)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build llm-provider
	$(call ok,LLM Provider arriba)

.PHONY: container-up-ocr
container-up-ocr:
	$(call section,Levantando ocr-provider FHS)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build ocr-provider
	$(call ok,OCR Provider arriba)

.PHONY: container-down
container-down:
	$(call section,Deteniendo todos los contenedores)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) down
	$(call ok,Contenedores detenidos)

.PHONY: container-logs
container-logs:
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) logs -f

.PHONY: container-ps
container-ps:
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) ps

.PHONY: container-restart
container-restart: container-down container-up
