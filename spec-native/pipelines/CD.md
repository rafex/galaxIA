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
- **Qué hace:** compila `packages/fhs-protocol` (`tsc`) y publica el resultado a `npm.pkg.github.com` bajo el scope `@rafex`. Antes de publicar, verifica si la versión de `package.json` ya existe en el registro — si ya existe, no hace nada (no falla el run, solo lo reporta). Para publicar una versión nueva, hay que subir el campo `version` en `packages/fhs-protocol/package.json` antes de mergear a `main`.
- **Auth:** usa el `GITHUB_TOKEN` automático de Actions (permiso `packages: write` declarado en el workflow) — no requiere un secret adicional.
- **Consumo hoy:** este pipeline es nuevo (2026-07-06) y coexiste con el mecanismo previo — `galaxIA-satellite-star` sigue consumiendo el protocolo vía una dependencia git a la rama `fhs-protocol-dist` (subtree split manual, ver DEC-0038). Migrar esa dependencia a `@rafex/galaxia-fhs-protocol` vía GitHub Packages es un paso futuro, no automático — requiere que los consumidores configuren un `.npmrc` con el scope `@rafex` apuntando a `npm.pkg.github.com` y un token con permiso `read:packages` (GitHub Packages exige autenticación incluso para paquetes públicos, a diferencia del registro público de npm).

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
2. Subir el campo `version` en `packages/fhs-protocol/package.json` (sin esto, el workflow detecta que la versión ya existe y no publica nada).
3. Mergear a `main`.
4. El workflow `publish-fhs-protocol.yml` corre automáticamente y publica la nueva versión a GitHub Packages.
5. (Pendiente, manual por ahora) Si `galaxIA-satellite-star` necesita la versión nueva, actualizar su dependencia — hoy eso significa reconstruir la rama `fhs-protocol-dist` (ver `spec-native/DECISIONS.md` DEC-0038); tras migrar a GitHub Packages, sería un simple bump de versión en su `package.json`.

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
