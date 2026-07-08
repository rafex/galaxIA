# CI.md

Integracion continua del proyecto.

## Objetivo

Describir que validaciones corren automaticamente, en que momento
y que debe pasar antes de que un cambio pueda mergearse.

## Cuando actualizar este archivo

Actualizar cuando cambie un gate, se agregue una nueva validacion
automatica o se modifique la plataforma de CI.

### Plataforma

- Plataforma de CI: GitHub Actions.
- Archivo de configuración: `.github/workflows/ci.yml`.
- Dónde ver resultados: pestaña "Actions" del repo, o directamente en los checks del Pull Request (bloquean el merge si fallan y hay branch protection configurada — ver "Política de falla").

### Triggers

| Evento | Pipeline que se ejecuta |
| --- | --- |
| Pull request abierto/actualizado contra `main` | `ci.yml`: typecheck + build + lint |
| Push a `main` | `ci.yml` (mismo pipeline, más los pipelines de CD de `CD.md` si aplica) |
| `workflow_dispatch` manual | `ci.yml` bajo demanda |
| Release publicado | N/A — no hay releases formales todavía |

Corridas concurrentes del mismo PR se cancelan entre sí (`concurrency` con `cancel-in-progress: true`, agrupado por número de PR o rama) — solo importa el resultado del último push.

### Gates obligatorios

Estos checks deben pasar antes de mergear cualquier cambio:

| Gate | Herramienta | Comando local |
| --- | --- | --- |
| Typecheck | `tsc --noEmit` | `npm run typecheck --workspaces` |
| Build | `tsc` (+ `vite build` en portal) | `npm run build --workspaces` (no el script raíz `npm run build` — ver nota abajo) |
| Lint | placeholder, sin linter configurado | `npm run lint --workspaces` (hoy solo imprime "No linter configurado todavía" en todos los workspaces — pasa siempre, pero corre en CI para que el día que se configure un linter real, ya esté en el gate) |
| Verificación end-to-end real | manual, sin herramienta, no cubierto por CI | Ver regla derivada en `spec-native/TRACEABILITY.md` ("registrado no es probado") — ninguna integración se marca `done` sin al menos una ejecución real de punta a punta. CI valida que el código compile y tipe correctamente, no que el protocolo funcione de punta a punta con procesos reales — eso sigue siendo una verificación manual documentada en cada `DECISIONS.md`/`TASKS.md`.

**Nota sobre `npm run build --workspaces` vs. `npm run build`:** el script raíz `build` (`package.json`) solo compila `packages/fhs-protocol` + `apps/navigator` + `apps/portal-chat` — se le olvidó `apps/atlas` cuando Atlas se separó de Navigator en DEC-0035 (un gap real, encontrado al armar este CI). `ci.yml` usa `--workspaces` a propósito para que si alguien rompe la compilación de Atlas, el PR falle — con el script raíz no se habría detectado.

**Por qué `ci.yml` compila `packages/fhs-protocol` antes del typecheck (paso "Compilar fhs-protocol"):** `main`/`types` en `packages/fhs-protocol/package.json` apuntan a `dist/` — que está gitignored (es un artefacto de build, no se versiona). En un checkout limpio (como el de un runner de CI, o cualquier clon nuevo) `dist/` no existe todavía, así que `tsc --noEmit` en `apps/atlas`/`navigator`/`portal` falla con `Cannot find module '@rafex/galaxia-fhs-protocol'` aunque el código de esos workspaces esté perfectamente bien — el error es por la ausencia del build previo, no por un bug real. Esto se detectó en la primera corrida real de `ci.yml` en producción (falló) y se reprodujo/confirmó clonando el repo desde cero dos veces (`git clone` a un directorio temporal, sin arrastrar ningún `dist/` ya compilado de una sesión anterior) antes de agregar el paso de build previo.

### Gates opcionales o informativos

| Gate | Herramienta | Observaciones |
| --- | --- | --- |
| Tests unitarios/integración | ninguna | No hay suite de tests automatizada en el repo todavía |
| Cobertura de tests | ninguna | No aplica sin tests |
| Análisis de seguridad | Dependabot (GitHub, automático) | Solo alerta de dependencias vulnerables — no bloquea merges, se revisa manualmente (ver alertas en la pestaña Security del repo) |

### Política de falla

- Si `ci.yml` falla en un PR, el check aparece en rojo en la pestaña de checks del PR — quien lo abrió es responsable de corregirlo antes de pedir review/merge.
- **Nota:** este workflow define los checks, pero no hay *branch protection rule* configurada todavía en GitHub que los haga obligatorios para poder mergear (technically se puede mergear con el check en rojo). Configurar esa regla (Settings → Branches → protección de `main`, "Require status checks to pass") es un paso manual pendiente, fuera del alcance de un archivo de workflow.
- No hay excepción/override documentado — si un gate falla legítimamente por algo fuera de control (ej. un servicio externo caído durante el build), se reintenta el run (`workflow_dispatch` o un nuevo push), no se saltea el check.

### Relación con tareas

Un agente no debe marcar una tarea como `done` solo porque `ci.yml` pasa en verde — ver la regla derivada en `spec-native/TRACEABILITY.md` ("Lección de esta iniciativa: registrado no es probado"): se requiere al menos una ejecución end-to-end real antes de cerrar una tarea de integración nueva (provider, capability, modelo). CI verifica que el código compile, no que el protocolo funcione con procesos reales.
