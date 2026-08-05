# TASK-CURP-0001 — Servicio CURP local en WASM

## Estado

`in_progress`

## Owner

Codex / Raúl Fletes

## Criterio de cierre

La página CURP funciona desde el celular por HTTPS, las pruebas TS/WASM y el
smoke del despliegue pasan, y los cambios quedan publicados en `main` de los
repositorios tocados.

## Tareas

- [x] Revisar el Instructivo Normativo compartido y delimitar validación local.
- [x] Completar construcción de 18 posiciones y validación estructural TS.
- [x] Completar exportaciones WASM y ejecutarlas en Web Worker.
- [x] Crear UI de creación y validación sin envío de datos.
- [x] Agregar contenedor HTTPS del frontend.
- [x] Integrar el contenedor y puerto 8444 al runner E2E.
- [ ] Ejecutar build/despliegue E2E y prueba funcional desde el celular.
- [ ] Commit y push en `main` de SDK, E2E y galaxIA.
