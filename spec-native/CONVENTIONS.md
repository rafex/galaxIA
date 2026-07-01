# CONVENTIONS.md

## Código

- Preferir cambios pequeños y locales.
- Evitar duplicación accidental.
- Seguir la estructura definida en `ARCHITECTURE.md`.
- Usar TypeScript estricto (`strict: true`) en todos los paquetes y aplicaciones.

## Naming

- **Archivos y carpetas:** `kebab-case` (ej. `llm-gateway.ts`, `event-bus.ts`).
- **Funciones y variables:** `camelCase`.
- **Tipos e interfaces:** `PascalCase`.
- **Constantes exportadas:** `SCREAMING_SNAKE_CASE`.
- **Componentes frontend:** archivos con sufijo `-component.ts` o nombres descriptivos en kebab-case.

## Frontend

- Vanilla TypeScript. No se usan frameworks de componentes.
- Los componentes deben ser funciones puras que reciban un contenedor del DOM y devuelvan métodos de actualización.
- Los estilos viven en `styles/main.css`. CSS puro, sin preprocesadores en el MVP.
- El API client vive en `services/api.ts`.

## Backend

- Un archivo por responsabilidad. Evitar archivos monolíticos.
- Las rutas Fastify viven en `api/*.ts`.
- La lógica de negocio del agente vive en `agent/`.
- El acceso a SQLite vive en `registry/db.ts`.
- Los tipos compartidos se importan desde `packages/fhs-protocol`.

## Tests

- Cada cambio relevante debe definir su estrategia de validación.
- En el MVP, los tests se centran en:
  - Ciclo del agente con respuestas simuladas.
  - Detección de caída de nodo por lease expirado.
  - Parseo y validación de manifiestos FHS.
- Los tests deben vivir cerca del código: `*.test.ts` junto al módulo.

## Documentación

- Los `README.md` indexan.
- Los archivos en MAYÚSCULAS contienen contexto fuente de verdad.
- No duplicar hechos entre documentos sin una razón fuerte.
- Actualizar el documento fuente si cambia una verdad compartida.

## Agentes

- Antes de editar, leer el `README.md` de la carpeta.
- Actualizar el documento fuente si cambia una verdad compartida.
- No cerrar una tarea sin estado final y evidencia de validación.
- No ejecutar una iniciativa sin referencia explícita a una spec.
- Mantener `TODO.md` y `SESSION.md` actualizados durante el trabajo.
