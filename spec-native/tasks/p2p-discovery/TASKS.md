# TASKS.md

## Metadata

- Iniciativa: p2p-discovery
- Spec relacionada: `spec-native/specs/p2p-discovery/SPEC.md` (SPEC-P2P-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `done (local)` — implementado y verificado en local (DEC-0032); pendiente TASK-P2P-0005 (documentación) y TASK-P2P-0006 (bloqueada por hardware, igual que issue #1)

## Tareas

### TASK-P2P-0001 - Evaluar y elegir librería mDNS para Node

- ID: TASK-P2P-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/DECISIONS.md` (DEC-0032)
- Close criteria: comparar `bonjour-service` vs `multicast-dns` (mantenimiento, tamaño, compatibilidad con el resto del stack Node 20) y dejar la elección documentada con justificación breve.
- Validation: resuelto en DEC-0032 (2026-07-06) con datos reales (descargas npm, bindings nativos, tipos TS, mantenimiento) — `bonjour-service` elegido, `mdns`/`dnssd` descartados por bindings nativos (node-gyp). Probado en real (publish + find con TXT records) antes de integrarlo.

### TASK-P2P-0002 - `agent-server` anuncia `_fhs-registry._tcp.local`

- ID: TASK-P2P-0002
- State: `done`
- Owner: rafex
- Dependencies: TASK-P2P-0001
- Expected files: `apps/agent-server/src/registry/mdns-announce.ts` (nuevo), `apps/agent-server/src/registry/identity-store.ts` (nuevo), `apps/agent-server/src/index.ts`
- Close criteria: al arrancar, si no está desactivado por variable de entorno, el agent-server anuncia el servicio con puerto, `fhsVersion` y si usa TLS. Configurable para desactivarse (`MDNS_ENABLED=false`).
- Validation: `npm run typecheck -w apps/agent-server` — OK. Verificado real: log "Anunciando Registry por mDNS (did: ...)" al arrancar. El anuncio va firmado con la identidad Ed25519 propia del Registry (DEC-0032, más allá del alcance original de esta tarea).

### TASK-P2P-0003 - Descubrimiento mDNS en `examples/llm-provider` y `examples/ocr-provider`

- ID: TASK-P2P-0003
- State: `done`
- Owner: rafex
- Dependencies: TASK-P2P-0001, TASK-P2P-0002
- Expected files: `examples/{llm,ocr}-provider/src/index.ts`, `examples/{llm,ocr}-provider/src/registry-discovery.ts` (nuevos)
- Close criteria: si `REGISTRY_URL` no está definido (o vale `auto`), el provider busca `_fhs-registry._tcp.local` por mDNS y arma la URL de conexión. Si `REGISTRY_URL` sí está definido con una URL concreta, mDNS no se intenta en absoluto.
- Validation: `npm run typecheck` limpio en ambos. Verificado real end-to-end: `llm-provider` sin `REGISTRY_URL` descubre el Registry, verifica su firma, arma la URL y se registra — confirmado con `GET /api/fhs/providers`.

### TASK-P2P-0004 - Manejo de "ninguno o más de uno" encontrado

- ID: TASK-P2P-0004
- State: `done`
- Owner: rafex
- Dependencies: TASK-P2P-0003
- Expected files: mismos módulos de TASK-P2P-0003
- Close criteria: si mDNS no encuentra ningún Registry (o ninguno con firma válida/`REGISTRY_EXPECTED_DID` coincidente), o encuentra más de uno, el provider falla al arrancar con un mensaje claro pidiendo `REGISTRY_URL` manual — nunca elige uno arbitrariamente ni se queda esperando en silencio.
- Validation: probado real con `REGISTRY_EXPECTED_DID` apuntando a un `did` inexistente — el provider rechaza y sale con `process.exit(1)` y mensaje claro, en vez de conectarse a ciegas.

### TASK-P2P-0005 - Documentación

- ID: TASK-P2P-0005
- State: `done`
- Owner: rafex
- Dependencies: TASK-P2P-0002, TASK-P2P-0003, TASK-P2P-0004
- Expected files: `docs/despliegue-multi-host.md`
- Close criteria: documentado cómo activar/desactivar mDNS, `REGISTRY_EXPECTED_DID`, su límite de alcance (no cruza redes, no resuelve el caso de un dispositivo de red remota en sitio), y cómo depurar si no encuentra el Registry.
- Validation: sección nueva "Descubrimiento automático del Registry por mDNS (opcional, SPEC-P2P-0001)" agregada, cubre los 5 puntos anteriores.

### TASK-P2P-0006 - Verificación end-to-end contra los 3 equipos reales

- ID: TASK-P2P-0006
- State: `blocked` (sin acceso a hardware físico en este entorno de trabajo — mismo bloqueo que issue #1/TASK-SATRATING-0008, no bloqueante para el resto del roadmap)
- Owner: rafex
- Dependencies: TASK-P2P-0002, TASK-P2P-0003, TASK-P2P-0004
- Expected files: ninguno (verificación, no código)
- Close criteria: en la misma LAN de la demo (laptop + bastion + Raspberry Pi), quitar `REGISTRY_URL` explícito de al menos un nodo y confirmar que se registra igual vía mDNS. Confirmar también que los otros dos, con `REGISTRY_URL` explícito, siguen funcionando sin tocar mDNS.
- Validation: logs de cada nodo mostrando "Conectado al Registry" + `curl /api/fhs/providers` confirmando el registro.
