# CI.md

Integracion continua del proyecto.

## Objetivo

Describir que validaciones corren automaticamente, en que momento
y que debe pasar antes de que un cambio pueda mergearse.

## Cuando actualizar este archivo

Actualizar cuando cambie un gate, se agregue una nueva validacion
automatica o se modifique la plataforma de CI.

## Estado actual: sin CI automatizado de validación de PRs

No existe todavía un workflow de GitHub Actions que corra typecheck/lint/tests en cada pull request o push — los dos workflows que sí existen (`.github/workflows/publish-fhs-protocol.yml`, `.github/workflows/jekyll-gh-pages.yml`) son de **entrega** (CD, ver `CD.md`), no de validación. Todos los gates de abajo son manuales: se corren localmente antes de commitear/mergear, no hay un check obligatorio de GitHub que bloquee un PR si fallan.

Este es un hueco real, no una decisión de diseño — queda anotado como pendiente en `spec-native/ROADMAP.md`.

### Plataforma

- Plataforma de CI: ninguna todavía (candidata: GitHub Actions, ya en uso para CD).
- Archivo de configuración: N/A.
- Dónde ver resultados: no aplica — correr los comandos de la sección siguiente localmente.

### Triggers

| Evento | Pipeline que se ejecuta |
| --- | --- |
| Pull request abierto | Ninguno automatizado — revisar manualmente |
| Push a rama principal | Ninguno automatizado (excepto los pipelines de CD de `CD.md`) |
| Release publicado | N/A — no hay releases formales todavía |

### Gates obligatorios (hoy: manuales, no automatizados)

Estos checks deben pasar antes de mergear cualquier cambio — hoy es responsabilidad de quien mergea correrlos localmente:

| Gate | Herramienta | Comando local |
| --- | --- | --- |
| Typecheck | `tsc --noEmit` | `npm run typecheck --workspaces` |
| Build | `tsc` (por workspace) | `npm run build` (ver `Makefile`/`Justfile`) o `npm run build --workspaces` |
| Lint | placeholder, sin linter configurado | `npm run lint --workspaces` (hoy solo imprime "No linter configurado todavía" en la mayoría de workspaces) |
| Verificación end-to-end real | manual, sin herramienta | Ver regla derivada en `spec-native/TRACEABILITY.md` ("registrado no es probado") — ninguna integración se marca `done` sin al menos una ejecución real de punta a punta |

### Gates opcionales o informativos

| Gate | Herramienta | Observaciones |
| --- | --- | --- |
| Tests unitarios/integración | ninguna | No hay suite de tests automatizada en el repo todavía |
| Cobertura de tests | ninguna | No aplica sin tests |
| Análisis de seguridad | Dependabot (GitHub, automático) | Solo alerta de dependencias vulnerables — no bloquea merges, se revisa manualmente (ver alertas en la pestaña Security del repo) |

### Política de falla

- Como no hay gates automatizados, no hay un "check rojo" de GitHub que bloquee un PR — el criterio de calidad depende de que quien revisa/mergea haya corrido `npm run typecheck --workspaces` y, si aplica, una verificación end-to-end real antes de aprobar.
- Si se agrega CI automatizado en el futuro, actualizar esta sección con la plataforma real, el archivo de configuración y la política de falla correspondiente.

### Relación con tareas

Un agente no debe marcar una tarea como `done` solo porque el build/typecheck local pasa — ver la regla derivada en `spec-native/TRACEABILITY.md` ("Lección de esta iniciativa: registrado no es probado"): se requiere al menos una ejecución end-to-end real antes de cerrar una tarea de integración nueva (provider, capability, modelo).
