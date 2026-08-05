# SPEC-CURP-0001 — Servicio CURP local en WASM

## Estado

`active`

## Objetivo

Ofrecer desde un celular conectado a la red GalaxIA una página HTTPS para
construir y validar estructuralmente una CURP usando el procesador del propio
celular, sin enviar datos personales a un backend.

## Alcance

- Construir las 18 posiciones descritas por el Instructivo Normativo DOF
  18-10-2021.
- Validar longitud, forma, fecha, sexo, catálogo de entidad y dígito
  verificador local.
- Ejecutar la lógica en AssemblyScript/WASM dentro de un Web Worker.
- Servir solamente archivos estáticos por HTTPS desde un contenedor Podman.
- Mantener explícito que la asignación, unicidad, vigencia y existencia oficial
  requieren RENAPO y no se pueden demostrar offline.

## Fuera de alcance

- API HTTP/REST, WebSocket o SSE para el cálculo.
- Persistencia de nombres, apellidos o fechas en el servidor.
- Alta o consulta de la BDNCURP.
- Sustituir la autoridad emisora de la CURP.

## Criterios de aceptación

1. Desde `https://192.168.1.195:8444/` el celular puede abrir el formulario.
2. Crear una CURP ejecuta el WASM en un Web Worker y muestra la clave y sus
   advertencias de alcance.
3. Validar una CURP correcta e incorrecta produce estados distintos sin red de
   aplicación.
4. El build E2E sirve el frontend por HTTPS en un contenedor y añade TCP 8444
   a la documentación de puertos.
5. Los tests TS y WASM cubren el caso del instructivo, checksum, fecha inválida
   y validación completa.

## Implementación

- Núcleo TS/WASM: `galaxIA-SDK/packages/satellite-capabilities*`.
- Página: `galaxIA-SDK/apps/satellite-web`.
- Imagen HTTPS: `galaxIA-SDK/containers/satellite-web`.
- Orquestación multihost: `galaxIA-E2E/scripts/e2e-multihost.sh`.
