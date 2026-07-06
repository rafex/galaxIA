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
	$(call section,Levantando atlas + navigator + portal)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build atlas navigator portal
	$(call ok,Core arriba)

.PHONY: container-up-atlas
container-up-atlas:
	$(call section,Levantando atlas (Registry))
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build atlas
	$(call ok,Atlas arriba)

.PHONY: container-up-llm
container-up-llm:
	$(call section,Levantando star (Star/LLM) FHS)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build star
	$(call ok,Star arriba)

.PHONY: container-up-ocr
container-up-ocr:
	$(call section,Levantando satellite-ocr (Satellite/OCR) FHS)
	$(COMPOSE_CMD) -f $(COMPOSE_FILE) up -d --build satellite-ocr
	$(call ok,Satellite OCR arriba)

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
