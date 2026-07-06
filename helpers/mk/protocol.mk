# helpers/mk/protocol.mk — automatización de publicación de
# @rafex/galaxia-fhs-protocol a GitHub Packages
# Depende de: helpers/mk/common.mk, helpers/mk/node.mk
# Incluir con: include helpers/mk/protocol.mk
#
# Estos targets envuelven helpers/shell/verify-protocol-package.sh y
# helpers/python/bump_protocol_version.py — ver esos archivos para el detalle
# de qué hacen y por qué existen (DEC-0040, DEC-0041). Usados tanto por
# desarrolladores locales como por .github/workflows/publish-fhs-protocol.yml.

include helpers/mk/common.mk

.PHONY: protocol-bump-check
protocol-bump-check:
	$(call section,Verificando si hace falta subir la versión del protocolo)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_protocol_version.py --check

.PHONY: protocol-bump
protocol-bump:
	$(call section,Subiendo versión del protocolo si ya está publicada)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_protocol_version.py
	$(call ok,Bump de versión completo (o no hacía falta))

.PHONY: protocol-verify
protocol-verify:
	$(call section,Verificando contenido del paquete del protocolo)
	@sh helpers/shell/verify-protocol-package.sh
	$(call ok,Paquete verificado)

.PHONY: protocol-publish
protocol-publish: protocol-bump protocol-verify
	$(call section,Publicando @rafex/galaxia-fhs-protocol a GitHub Packages)
	npm publish -w packages/fhs-protocol
	$(call ok,Publicado)
