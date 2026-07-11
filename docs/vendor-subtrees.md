# `vendor/` — subtrees de repos externos (DEC-0077)

`vendor/galaxIA-satellite-star` y `vendor/galaxia-parser-catalog` son copias del código de esos dos repos, incorporadas con `git subtree` para facilitar la integración local: poder tener el protocolo (`galaxIA`), los providers de referencia (`galaxIA-satellite-star`) y el catálogo de perfiles de parseo (`galaxia-parser-catalog`) en un solo checkout al hacer cambios que cruzan los tres — sin tener que clonar/actualizar cada uno por separado ni recordar tres directorios distintos.

## Qué NO cambia

- **`galaxIA-satellite-star` y `galaxia-parser-catalog` siguen siendo los repos fuente de verdad** — DEC-0038 (separación de repos) sigue vigente. `vendor/` es una copia de conveniencia para desarrollo local, no una fusión de repos ni un vendoring de dependencia de build.
- **No forman parte de los workspaces de npm** de este monorepo (`package.json` raíz solo declara `packages/*` y `apps/*`) — no se instalan, compilan, testean, ni lintean como parte del pipeline de `galaxIA`. Cada uno mantiene su propio `package.json`/CI/convenciones.
- **`vendor/**` está excluido de ESLint** (`eslint.config.mjs`) del monorepo raíz.

## Cómo se mantienen actualizados

`git subtree` no crea un enlace vivo — es una copia squasheada en el momento de agregarla. Para traer cambios nuevos de cualquiera de los dos repos:

```bash
just vendor-pull-satellite-star
just vendor-pull-parser-catalog
# o los dos:
just vendor-pull-all
```

Esto ejecuta `git subtree pull --prefix=vendor/<repo> <remote> main --squash` — trae los commits nuevos del repo externo como un solo commit squasheado en `galaxIA`, sin arrastrar todo su historial.

## Cómo empujar cambios hechos dentro de `vendor/` de vuelta al repo externo

Si se edita código dentro de `vendor/galaxIA-satellite-star/` o `vendor/galaxia-parser-catalog/` directamente en un checkout de `galaxIA` (por ejemplo, para probar un cambio cruzado antes de decidir en qué repo debe vivir de verdad), se puede empujar de vuelta:

```bash
just vendor-push-satellite-star
just vendor-push-parser-catalog
```

Esto ejecuta `git subtree push --prefix=vendor/<repo> <remote> <rama-nueva>` — recomendable abrir un PR normal en el repo externo desde esa rama en vez de empujar directo a `main`.

## Remotes usados

Los remotes `satellite-star-src`/`parser-catalog-src` deben existir en el checkout local (se agregan una vez):

```bash
git remote add satellite-star-src https://github.com/rafex/galaxIA-satellite-star.git
git remote add parser-catalog-src https://github.com/rafex/galaxia-parser-catalog.git
```

Un checkout fresco de `galaxIA` (ej. CI, o un clon nuevo) no los tiene por defecto — solo hacen falta para `pull`/`push` del subtree, no para trabajar con el resto del monorepo.
