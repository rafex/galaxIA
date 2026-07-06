# TASKS.md

## Metadata

- Iniciativa: kb-provider
- Spec relacionada: `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001)
- Owner: Raúl Fletes (rafex)
- Estado general: `done (local)` — implementado y verificado con procesos reales en local (2026-07-06). Pendiente verificación contra hardware real, mismo bloqueo que issue #1/TASK-P2P-0006.

## Tareas

### TASK-KB-0001 - Resolver cómo se dispara una consulta a KB

- ID: TASK-KB-0001
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/DECISIONS.md` (DEC-0027), `spec-native/specs/kb-provider/SPEC.md`
- Close criteria: decisión documentada sobre qué dispara `kb_query`.
- Validation: resuelto en DEC-0027 (2026-07-06) — modo manual (`preferences.kb`) y modo recomendado (matching determinístico contra `capability.description`/`tags` + confirmación) quedan dentro de alcance; modo "mágico" (sin confirmación) documentado como premisa a futuro, explícitamente no implementado. Implementado en TASK-KB-0005/0006.

### TASK-KB-0002 - Proceso administrativo de indexado

- ID: TASK-KB-0002
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `spec-native/specs/kb-provider/SPEC.md`, `examples/kb-provider/content/README.md`
- Close criteria: ~~decisión documentada sobre cómo el operador puebla una KB (CLI, script, endpoint separado)~~ — **corregido de alcance (2026-07-06):** galaxIA define el protocolo y la interfaz (contrato de `kb_query`, manifiesto, trazabilidad), nunca cómo un operador cura o indexa su contenido — no es una decisión de este proyecto, ni siquiera para el nodo de referencia. `examples/kb-provider` carga una carpeta de archivos `.txt` al arrancar (mecanismo de prueba mínimo, documentado explícitamente como no-recomendación en `content/README.md`) exclusivamente para tener algo consultable y demostrar el contrato — cualquier operador real resuelve su propia curaduría sin que eso cambie el protocolo.
- Validation: revisión de diseño — sin código de "workflow de indexado" que implementar, la declaración de fuera-de-alcance es el cierre de esta tarea.

### TASK-KB-0003 - Agregar `capability.tags` autodeclarados al protocolo

- ID: TASK-KB-0003
- State: `done`
- Owner: rafex
- Dependencies: ninguna
- Expected files: `packages/fhs-protocol/src/types.ts` (`Signal.tags?: string[]`), `docs/protocolo-provider.md`, `docs/manifiesto-mcp.md`
- Close criteria: `Signal` (antes `Capability`) acepta un campo `tags` opcional; documentado como autodeclarado (mismo nivel de confianza que `description`, no verificado); usado como señal adicional en el matching del modo "recomendada" de `kb-provider`.
- Validation: `npm run typecheck --workspaces` limpio; `examples/kb-provider` declara `tags` reales (`constitucion, mexico, derechos humanos, ley`) y `AgentRuntime.recommendKb()` los usa junto con `description` para el matching.

Ver DEC-0028 para el diseño completo (incluye la parte de tags de comunidad, bloqueada — no se crea tarea de implementación para esa parte hasta que `SPEC-AUTH-0001` se retome).

### TASK-KB-0004 - Soporte de `kbMaxPerQuestion` > 1 (parcial)

- ID: TASK-KB-0004
- State: `partial`
- Owner: rafex
- Dependencies: TASK-KB-0006
- Expected files: `apps/navigator/src/agent/runtime.ts`, `apps/navigator/src/api/chat-ws.ts`
- Close criteria: si `preferences.kbMaxPerQuestion > 1`, consultar esa cantidad de KBs y combinar sus fragmentos; el `Portal` debe advertir explícitamente antes de permitirlo (DEC-0027).
- Validation: **no implementado en esta iteración** — solo se soporta `1` KB por pregunta. Si se pide un valor mayor, `chat-ws.ts` emite `kb.warning` informando que solo se consultó 1, en vez de fingir que se respetó el límite pedido. Queda pendiente el fan-out real a múltiples KBs y la advertencia obligatoria en el `Portal` antes de subir el valor (hoy el `Portal` ni siquiera expone un control para pedir más de 1).

### TASK-KB-0005 - Crear `examples/kb-provider/` (esqueleto FHS)

- ID: TASK-KB-0005
- State: `done`
- Owner: rafex
- Dependencies: TASK-KB-0001, TASK-KB-0002
- Expected files: `examples/kb-provider/src/index.ts`, `examples/kb-provider/src/kb-bridge.ts`, `examples/kb-provider/content/`, `containers/kb-provider/Containerfile`
- Close criteria: el provider se registra en Atlas y aparece en `/api/fhs/providers` con capability `kb.query` (incluyendo `description`/`tags`).
- Validation: verificado real — `GET /api/fhs/providers?type=mcp` muestra el provider con `kb.query`, `description` y `tags` tras un `hello`/`register` firmado (DEC-0030).

### TASK-KB-0006 - Integrar modo manual y recomendado en `chat-ws.ts`/`runtime.ts`

- ID: TASK-KB-0006
- State: `done`
- Owner: rafex
- Dependencies: TASK-KB-0003, TASK-KB-0005
- Expected files: `apps/navigator/src/agent/runtime.ts` (`recommendKb`, `queryKb`), `apps/navigator/src/api/chat-ws.ts` (`resolveKbAndChat`, mensajes `kb.recommended`/`kb.decision`), `apps/portal/src/components/chat-view.ts` (selector de KB + banner de confirmación)
- Close criteria: modo manual (`preferences.kb`) resuelve directo sin confirmación; modo recomendado compara la pregunta contra `description`/`tags` con matching determinístico (Jaccard), pide confirmación (`kb.recommended`/`kb.decision`) antes de consultar, y puede recomendar "ninguna" si no hay coincidencia razonable.
- Validation: verificado real de punta a punta en navegador (Portal + Atlas + Navigator + kb-provider + star-example + mock-llm-server reales) — modo recomendado mostró el banner de confirmación con la KB correcta para una pregunta relacionada, no recomendó nada para una pregunta no relacionada, y el modo manual (seleccionado en el dropdown) respondió sin pedir confirmación. `provenance.tools` refleja `kb.query` en ambos casos.

### TASK-KB-0007 - Declarar privacidad y actualizar documentación

- ID: TASK-KB-0007
- State: `done`
- Owner: rafex
- Dependencies: TASK-KB-0006
- Expected files: `docs/proveedores.md`, `docs/protocolo-provider.md`, `spec-native/TRACEABILITY.md`
- Close criteria: `kb-provider` documentado igual que `star-example`/`satellite-ocr-example`/`rag-provider` en `docs/proveedores.md`; `privacy.retention: "permanent-readonly"` (sin `warning`, per SPEC-KB-0001: el operador decide qué es público, no el usuario).
- Validation: manifiesto de `examples/kb-provider` declara `privacy: { retention: "permanent-readonly" }`, validado por Atlas (DEC-0013) sin campos faltantes.
