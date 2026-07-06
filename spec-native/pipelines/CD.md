# CD.md

Entrega continua del proyecto.

## Objetivo

Describir como el codigo pasa de un cambio mergeado a produccion:
ambientes, gates de promocion, proceso de deploy y rollback.

## Cuando actualizar este archivo

Actualizar cuando cambie un ambiente, se modifiquen los gates de
promocion o cambie el proceso de release.

## Pipelines activos

### 1. Publicar `@rafex/galaxia-fhs-protocol` a GitHub Packages

- **Plataforma de CD:** GitHub Actions.
- **Archivo de configuración:** `.github/workflows/publish-fhs-protocol.yml`.
- **Dónde ver el estado:** pestaña "Actions" del repo (workflow "Publish @rafex/galaxia-fhs-protocol to GitHub Packages"); paquete publicado visible en la pestaña "Packages" de `github.com/rafex/galaxIA`.
- **Trigger:** push a `main` que modifique `packages/fhs-protocol/**`, o `workflow_dispatch` manual.
- **Qué hace (DEC-0041):**
  1. `make protocol-bump` — si la versión de `package.json` ya está publicada en GitHub Packages, la sube automáticamente (patch) usando `helpers/python/bump_protocol_version.py` (`uv run`). Ya no depende de que quien mergea se acuerde de subir el `version` a mano.
  2. Si el bump modificó `package.json`/`package-lock.json`, los commitea y pushea a `main` (`chore: bump ... [skip ci]`).
  3. `make protocol-verify` — compila y corre `npm pack --dry-run`, verificando con `helpers/shell/verify-protocol-package.sh` que el tarball incluya `dist/*.js` (guarda contra el bug de la versión `0.1.0`, ver DEC-0040).
  4. `npm publish -w packages/fhs-protocol`.
- **Auth:** usa el `GITHUB_TOKEN` automático de Actions (`permissions.contents: write` + `packages: write` declarados en el workflow) — no requiere un secret adicional. El bump/commit son intra-repo, por eso no hace falta un PAT con alcance a otros repos.
- **Consumo hoy:** `galaxIA-satellite-star` ya consume `@rafex/galaxia-fhs-protocol` vía GitHub Packages (migrado en DEC-0040, ya no la rama git `fhs-protocol-dist`) — pero **sincronizar la versión nueva ahí sigue siendo manual** (ver "Proceso de release" abajo). Automatizar solo `galaxIA` fue una decisión explícita del usuario en DEC-0041 para no requerir un secret con permiso de escritura sobre un repo externo.

### 2. Sitio público (`galax-ia.rafex.io`)

- **Plataforma de CD:** GitHub Actions + GitHub Pages.
- **Archivo de configuración:** `.github/workflows/jekyll-gh-pages.yml`.
- **Dónde ver el estado:** pestaña "Actions"; sitio publicado en `galax-ia.rafex.io`.
- **Trigger:** push a `main`, o `workflow_dispatch` manual.
- **Qué hace:** construye `site/` con Jekyll y lo despliega a GitHub Pages. Sin ambientes intermedios (staging) ni aprobación manual — cualquier push a `main` que afecte el sitio se publica de inmediato.

## Ambientes

| Ambiente | Rama o tag | Deploy automático | Aprobación requerida |
| --- | --- | --- | --- |
| GitHub Packages (`@rafex/galaxia-fhs-protocol`) | `main` (cuando cambia `packages/fhs-protocol/`) | Sí | No |
| Sitio público (GitHub Pages) | `main` | Sí | No |
| Core (Atlas/Navigator/Portal) | N/A | No — despliegue manual (`just container-up`/`podman-compose`) contra el bastion/laptop del operador | No aplica, es despliegue manual |
| Providers (`galaxIA-satellite-star`) | N/A | No — despliegue manual, mismo mecanismo que el core | No aplica |

No hay ambiente de "staging" — el proyecto es una PoC de un solo operador (no un servicio SaaS multiusuario todavía), así que el único destino real de los contenedores del core/providers es la topología multi-host laptop+bastion descrita en `docs/despliegue-multi-host.md`.

## Proceso de release (paquete `@rafex/galaxia-fhs-protocol`)

1. Cambiar `packages/fhs-protocol/src/*`.
2. Mergear a `main` — **ya no hace falta subir `version` a mano** (DEC-0041): el workflow lo hace automáticamente si detecta que la versión actual ya está publicada.
3. El workflow `publish-fhs-protocol.yml` corre, sube la versión si hace falta (y commitea ese bump de vuelta a `main`), verifica el contenido del paquete, y publica a GitHub Packages.
4. (Pendiente, manual por ahora — alcance explícito de DEC-0041) Si `galaxIA-satellite-star` necesita la versión nueva: ir a ese repo, subir el rango en el `package.json` de los providers si hace falta (`^0.1.0` ya cubre cualquier `0.1.x` automáticamente), y correr `npm install` con `GH_TOKEN` exportado.

### Comandos locales equivalentes (`make`)

```bash
export GH_TOKEN=$(gh auth token)
make protocol-bump-check   # solo reporta si haría falta subir versión
make protocol-bump         # sube la versión si ya está publicada
make protocol-verify       # build + verifica que el tarball incluya dist/
make protocol-publish      # bump + verify + npm publish
```

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
