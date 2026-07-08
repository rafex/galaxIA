# CD.md

Entrega continua del proyecto.

## Objetivo

Describir como el codigo pasa de un cambio mergeado a produccion:
ambientes, gates de promocion, proceso de deploy y rollback.

## Cuando actualizar este archivo

Actualizar cuando cambie un ambiente, se modifiquen los gates de
promocion o cambie el proceso de release.

## Pipelines activos

### 1. Publicar los 4 paquetes distribuibles a GitHub Packages

- **Plataforma de CD:** GitHub Actions.
- **Archivo de configuración:** `.github/workflows/publish-packages.yml` (generalizado de `publish-fhs-protocol.yml` en DEC-0061/0062, fases 2-3 del plan de distribución — antes solo `packages/fhs-protocol` se publicaba).
- **Paquetes:** `@rafex/galaxia-fhs-protocol` (`packages/fhs-protocol`), `@galaxia/atlas`, `@galaxia/navigator`, `@galaxia/portal-chat`.
- **Dónde ver el estado:** pestaña "Actions" del repo (workflow "Publish packages to GitHub Packages"); paquetes publicados visibles en la pestaña "Packages" de `github.com/rafex/galaxIA`.
- **Trigger:** push a `main` que modifique cualquiera de los 4 workspaces, o `workflow_dispatch` manual (con un input `package` para publicar solo uno, o los 4 por default).
- **Qué hace (DEC-0041, generalizado en DEC-0062):**
  1. Determina qué paquetes cambiaron realmente en el push (`git diff` contra el commit anterior) — un push que solo toca `apps/atlas` no dispara bump/publish de los otros 3.
  2. Para cada paquete cambiado, en un solo job secuencial (no en paralelo, para no competir por el mismo push a `main`): `helpers/python/bump_package_version.py <workspace>` (sube el patch si la versión actual ya está publicada), commit+push si hubo bump, `helpers/shell/verify-package.sh <workspace>` (verifica que el tarball incluya `dist/*.js`, guarda contra el bug de la versión `0.1.0` de fhs-protocol, ver DEC-0040), y `npm publish -w <workspace>`.
- **Auth:** usa el `GITHUB_TOKEN` automático de Actions (`permissions.contents: write` + `packages: write` declarados en el workflow) — no requiere un secret adicional. El bump/commit son intra-repo, por eso no hace falta un PAT con alcance a otros repos.
- **Consumo hoy:** `galaxIA-satellite-star` ya consume `@rafex/galaxia-fhs-protocol` vía GitHub Packages (migrado en DEC-0040, ya no la rama git `fhs-protocol-dist`). Cómo y cuándo ese repo (u otro operador instalando `@galaxia/atlas`/`navigator`/`portal-chat` vía `npx`) actualiza su dependencia **no es responsabilidad de `galaxIA`** — es el mismo principio de DEC-0026/DEC-0037 (el protocolo define el contrato, nunca gestiona a sus consumidores) llevado al ciclo de publicación: `galaxIA` publica versiones a un registro público, cualquier consumidor decide solo cuándo y cómo actualizarse.

### 2. Imágenes de contenedor a GHCR (Atlas/Navigator/portal-chat)

- **Plataforma de CD:** GitHub Actions + GitHub Container Registry.
- **Archivo de configuración:** `.github/workflows/publish-containers.yml` (DEC-0063, fase 4 del plan de distribución).
- **Dónde ver el estado:** pestaña "Actions" (workflow "Publish container images to GHCR"); imágenes en `ghcr.io/rafex/galaxia-{atlas,navigator,portal-chat}`.
- **Trigger:** push de un tag `v*`, o `workflow_dispatch` manual (con un input `tag` opcional para probar sin esperar a un tag real).
- **Qué hace:** build multi-arch (`linux/amd64` + `linux/arm64`, en runners nativos `ubuntu-24.04-arm` para arm64, no QEMU — la topología real de este proyecto usa hardware ARM, `raspi4b-lan`) de las 3 `Containerfile` del core, por digest en un job `build` (matriz app×plataforma), fusionados en una manifest list con tags `:latest`/`:<tag>` en un job `merge`. A diferencia de la publicación npm (continua, en cada push a `main`), esto solo corre en un release explícito — evita saturar GHCR con builds de cada commit.
- **Auth:** `secrets.GITHUB_TOKEN` (permiso `packages: write`), sin secret adicional.
- **Cortar un release:** `make release-tag` (helpers/mk/release.mk, DEC-0065) crea y pushea el siguiente tag `vX.Y.Z-beta.N` — sube N automáticamente a partir del último tag existente (o `v0.1.0-beta.1` si no hay ninguno).

### 3. Sitio público (`galax-ia.rafex.io`)

- **Plataforma de CD:** GitHub Actions + GitHub Pages.
- **Archivo de configuración:** `.github/workflows/jekyll-gh-pages.yml`.
- **Dónde ver el estado:** pestaña "Actions"; sitio publicado en `galax-ia.rafex.io`.
- **Trigger:** push a `main`, o `workflow_dispatch` manual.
- **Qué hace:** construye `site/` con Jekyll y lo despliega a GitHub Pages. Sin ambientes intermedios (staging) ni aprobación manual — cualquier push a `main` que afecte el sitio se publica de inmediato.

## Ambientes

| Ambiente | Rama o tag | Deploy automático | Aprobación requerida |
| --- | --- | --- | --- |
| GitHub Packages (fhs-protocol/atlas/navigator/portal-chat) | `main` (cuando cambia el workspace correspondiente) | Sí | No |
| GHCR (imágenes atlas/navigator/portal-chat) | tag `v*` | Sí | No |
| Sitio público (GitHub Pages) | `main` | Sí | No |
| Core (Atlas/Navigator/Portal) | N/A | No — despliegue manual (`just container-up`/`podman-compose`, o `npx @galaxia/atlas`/`navigator`/`portal-chat`) contra el bastion/laptop del operador | No aplica, es despliegue manual |
| Providers (`galaxIA-satellite-star`) | N/A | No — despliegue manual, mismo mecanismo que el core | No aplica |

No hay ambiente de "staging" — el proyecto es una PoC de un solo operador (no un servicio SaaS multiusuario todavía), así que el único destino real de los contenedores del core/providers es la topología multi-host laptop+bastion descrita en `docs/despliegue-multi-host.md`.

## Proceso de release (cualquiera de los 4 paquetes)

1. Cambiar código en `packages/fhs-protocol/src/*`, `apps/atlas/src/*`, `apps/navigator/src/*`, o `apps/portal-chat/src/*`.
2. Mergear a `main` — **ya no hace falta subir `version` a mano** (DEC-0041): el workflow lo hace automáticamente si detecta que la versión actual ya está publicada, solo para el/los paquete(s) que cambiaron en ese push.
3. El workflow `publish-packages.yml` corre, sube la versión si hace falta (y commitea ese bump de vuelta a `main`), verifica el contenido del paquete, y publica a GitHub Packages.
4. (Pendiente, manual por ahora — alcance explícito de DEC-0041) Si `galaxIA-satellite-star` necesita la versión nueva de `@rafex/galaxia-fhs-protocol`: ir a ese repo, subir el rango en el `package.json` de los providers si hace falta (`^0.1.0` ya cubre cualquier `0.1.x` automáticamente), y correr `npm install` con `GH_TOKEN` exportado.

### Comandos locales equivalentes (`make`)

```bash
export GH_TOKEN=$(gh auth token)
make protocol-bump-check   # solo reporta si haría falta subir versión
make protocol-bump         # sube la versión si ya está publicada
make protocol-verify       # build + verifica que el tarball incluya dist/
make protocol-publish      # bump + verify + npm publish
```

Mismo patrón con `atlas-*`, `navigator-*`, `portal-chat-*` en vez de `protocol-*` para los otros 3 paquetes (ver `helpers/mk/protocol.mk`).

## Gates de promoción

No hay gates de promoción automatizados (no hay ambientes intermedios que atravesar) — el único gate real antes de publicar es que `npm run build -w packages/fhs-protocol` (parte del workflow) tenga éxito. No hay tests automatizados en este pipeline todavía (ver `CI.md` — no existe un workflow de CI de validación de PRs en este repo por ahora).

## Variables y secretos

- El workflow de publicación usa `secrets.GITHUB_TOKEN`, provisto automáticamente por GitHub Actions — no requiere configurar ningún secret manualmente en el repo.
- No hay otras variables de entorno relevantes para estos pipelines.

## Rollback

- **GitHub Packages:** no hay "rollback" automatizado — los paquetes publicados en un registro npm son inmutables por versión. Para revertir un cambio problemático, publicar una versión nueva (patch) que corrija el problema; no se puede "despublicar" una versión ya consumida sin romper a quien la instaló.
- **Sitio público:** revertir el commit problemático en `main` y dejar que el workflow vuelva a desplegar automáticamente.
- **Core/providers (despliegue manual):** `just container-restart` o `podman-compose down && git checkout <commit-anterior> && podman-compose up --build` en la máquina afectada — no hay automatización de rollback, es responsabilidad del operador que hace el despliegue manual.

## Relación con specs y tareas

Antes de considerar completa una iniciativa que cambia `packages/fhs-protocol`, verificar que el workflow de publicación corrió exitosamente (o que se subió la versión si se esperaba una publicación nueva) — no basta con que el build/typecheck local pase.
