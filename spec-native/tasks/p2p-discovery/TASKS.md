# TASKS.md

## Metadata

- Iniciativa: p2p-discovery
- Spec relacionada: `spec-native/specs/p2p-discovery/SPEC.md` (SPEC-P2P-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `pending` (spec en `draft`, sin implementación iniciada)

## Tareas

### TASK-P2P-0001 - Evaluar y elegir librería mDNS para Node

- ID: TASK-P2P-0001
- State: `pending`
- Owner: rafex
- Dependencies: ninguna
- Expected files: ninguno (investigación, se documenta la elección en `docs/` o en esta misma spec)
- Close criteria: comparar `bonjour-service` vs `multicast-dns` (mantenimiento, tamaño, compatibilidad con el resto del stack Node 20) y dejar la elección documentada con justificación breve.
- Validation: no aplica (decisión de diseño)

### TASK-P2P-0002 - `agent-server` anuncia `_fhs-registry._tcp.local`

- ID: TASK-P2P-0002
- State: `pending`
- Owner: rafex
- Dependencies: TASK-P2P-0001
- Expected files: `apps/agent-server/src/index.ts` (o módulo nuevo, ej. `apps/agent-server/src/registry/mdns-announce.ts`)
- Close criteria: al arrancar, si no está desactivado por variable de entorno, el agent-server anuncia el servicio con puerto, `fhsVersion` y si usa TLS. Configurable para desactivarse (ej. `MDNS_ANNOUNCE=false`).
- Validation: `npm run typecheck -w apps/agent-server` + verificar el anuncio con una herramienta de terceros (ej. `dns-sd -B` en macOS o `avahi-browse` en Linux).

### TASK-P2P-0003 - Descubrimiento mDNS en `examples/llm-provider` y `examples/ocr-provider`

- ID: TASK-P2P-0003
- State: `pending`
- Owner: rafex
- Dependencies: TASK-P2P-0001, TASK-P2P-0002
- Expected files: `examples/llm-provider/src/index.ts`, `examples/ocr-provider/src/index.ts`
- Close criteria: si `REGISTRY_URL` no está definido (o vale `auto`), el provider busca `_fhs-registry._tcp.local` por mDNS y arma la URL de conexión. Si `REGISTRY_URL` sí está definido con una URL concreta, mDNS no se intenta en absoluto.
- Validation: `npm run typecheck -w examples/llm-provider` / `-w examples/ocr-provider`

### TASK-P2P-0004 - Manejo de "ninguno o más de uno" encontrado

- ID: TASK-P2P-0004
- State: `pending`
- Owner: rafex
- Dependencies: TASK-P2P-0003
- Expected files: mismos módulos de TASK-P2P-0003
- Close criteria: si mDNS no encuentra ningún Registry, o encuentra más de uno, el provider falla al arrancar con un mensaje claro pidiendo `REGISTRY_URL` manual — nunca elige uno arbitrariamente ni se queda esperando en silencio.
- Validation: prueba manual simulando 0 y 2+ Registries anunciados en la misma LAN.

### TASK-P2P-0005 - Documentación

- ID: TASK-P2P-0005
- State: `pending`
- Owner: rafex
- Dependencies: TASK-P2P-0002, TASK-P2P-0003, TASK-P2P-0004
- Expected files: `docs/despliegue-multi-host.md` (sección nueva) o `docs/descubrimiento-mdns.md` (nuevo, a decidir en implementación)
- Close criteria: documentado cómo activar/desactivar mDNS, su límite de alcance (no cruza redes, no resuelve el caso de un dispositivo de red remota en sitio), y cómo depurar si no encuentra el Registry.
- Validation: revisión de que el documento cubre los criterios de aceptación de la SPEC.

### TASK-P2P-0006 - Verificación end-to-end contra los 3 equipos reales

- ID: TASK-P2P-0006
- State: `pending`
- Owner: rafex
- Dependencies: TASK-P2P-0002, TASK-P2P-0003, TASK-P2P-0004
- Expected files: ninguno (verificación, no código)
- Close criteria: en la misma LAN de la demo (laptop + bastion + Raspberry Pi), quitar `REGISTRY_URL` explícito de al menos un satélite y confirmar que se registra igual vía mDNS. Confirmar también que los otros dos, con `REGISTRY_URL` explícito, siguen funcionando sin tocar mDNS.
- Validation: logs de cada satélite mostrando "Conectado al Registry" + `curl /api/fhs/providers` confirmando el registro.
