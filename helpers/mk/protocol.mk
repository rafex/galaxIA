# helpers/mk/protocol.mk — automatización de publicación de los 4 paquetes
# distribuibles (@rafex/galaxia-fhs-protocol, @rafex/galaxia-atlas,
# @rafex/galaxia-navigator, @rafex/galaxia-portal-chat) a GitHub Packages.
# Depende de: helpers/mk/common.mk, helpers/mk/node.mk
# Incluir con: include helpers/mk/protocol.mk
#
# Estos targets envuelven helpers/shell/verify-package.sh y
# helpers/python/bump_package_version.py (generalizados de
# verify-protocol-package.sh/bump_protocol_version.py, antes solo para el
# protocolo — ver esos archivos para el detalle de qué hacen y por qué
# existen, DEC-0040/DEC-0041). Usados tanto por desarrolladores locales
# como por .github/workflows/publish-*.yml.
#
# "protocol-*" se mantiene como el nombre histórico para
# packages/fhs-protocol (primer paquete publicado, DEC-0040/0041); los
# demás paquetes usan su propio nombre de app.

include helpers/mk/common.mk

.PHONY: protocol-bump-check protocol-bump protocol-verify protocol-publish
protocol-bump-check:
	$(call section,Verificando si hace falta subir la versión de @rafex/galaxia-fhs-protocol)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py packages/fhs-protocol --check

protocol-bump:
	$(call section,Subiendo versión de @rafex/galaxia-fhs-protocol si ya está publicada)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py packages/fhs-protocol
	$(call ok,Bump de versión completo (o no hacía falta))

protocol-verify:
	$(call section,Verificando contenido del paquete de fhs-protocol)
	@sh helpers/shell/verify-package.sh packages/fhs-protocol
	$(call ok,Paquete verificado)

protocol-publish: protocol-bump protocol-verify
	$(call section,Publicando @rafex/galaxia-fhs-protocol a GitHub Packages)
	npm publish -w packages/fhs-protocol
	$(call ok,Publicado)

.PHONY: atlas-bump-check atlas-bump atlas-verify atlas-publish
atlas-bump-check:
	$(call section,Verificando si hace falta subir la versión de @rafex/galaxia-atlas)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/atlas --check

atlas-bump:
	$(call section,Subiendo versión de @rafex/galaxia-atlas si ya está publicada)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/atlas
	$(call ok,Bump de versión completo (o no hacía falta))

atlas-verify:
	$(call section,Verificando contenido del paquete de atlas)
	@sh helpers/shell/verify-package.sh apps/atlas
	$(call ok,Paquete verificado)

atlas-publish: atlas-bump atlas-verify
	$(call section,Publicando @rafex/galaxia-atlas a GitHub Packages)
	npm publish -w apps/atlas
	$(call ok,Publicado)

.PHONY: navigator-bump-check navigator-bump navigator-verify navigator-publish
navigator-bump-check:
	$(call section,Verificando si hace falta subir la versión de @rafex/galaxia-navigator)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/navigator --check

navigator-bump:
	$(call section,Subiendo versión de @rafex/galaxia-navigator si ya está publicada)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/navigator
	$(call ok,Bump de versión completo (o no hacía falta))

navigator-verify:
	$(call section,Verificando contenido del paquete de navigator)
	@sh helpers/shell/verify-package.sh apps/navigator
	$(call ok,Paquete verificado)

navigator-publish: navigator-bump navigator-verify
	$(call section,Publicando @rafex/galaxia-navigator a GitHub Packages)
	npm publish -w apps/navigator
	$(call ok,Publicado)

.PHONY: portal-chat-bump-check portal-chat-bump portal-chat-verify portal-chat-publish
portal-chat-bump-check:
	$(call section,Verificando si hace falta subir la versión de @rafex/galaxia-portal-chat)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/portal-chat --check

portal-chat-bump:
	$(call section,Subiendo versión de @rafex/galaxia-portal-chat si ya está publicada)
	@GH_TOKEN=$${GH_TOKEN:?"GH_TOKEN requerido — export GH_TOKEN=\$$(gh auth token)"} \
		uv run helpers/python/bump_package_version.py apps/portal-chat
	$(call ok,Bump de versión completo (o no hacía falta))

portal-chat-verify:
	$(call section,Verificando contenido del paquete de portal-chat)
	@sh helpers/shell/verify-package.sh apps/portal-chat
	$(call ok,Paquete verificado)

portal-chat-publish: portal-chat-bump portal-chat-verify
	$(call section,Publicando @rafex/galaxia-portal-chat a GitHub Packages)
	npm publish -w apps/portal-chat
	$(call ok,Publicado)
