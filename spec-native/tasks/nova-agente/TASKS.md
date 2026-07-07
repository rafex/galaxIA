# TASKS — nova-agente (SPEC-NOVA-0001, DEC-0055)

## TASK-NOVA-0001 — Protocolo: `NodeType: "agent"`, `NovaBeacon`, `maxReasoningSteps`/`reasoningSteps`

- **Estado:** `done`
- `packages/fhs-protocol/src/types.ts`: `NodeType` gana `"agent"`.
- `packages/fhs-protocol/src/manifest.ts`: `NovaBeacon` (mismo patrón que `StarBeacon` + `reasoning.maxSteps`); `Beacon`/`flattenManifest` extendidos.
- `packages/fhs-protocol/src/llm.ts`: `GenerateRequest.maxReasoningSteps?`, `GenerateResponse.reasoningSteps?`.
- Verificado: `npm run typecheck`/`build` en `packages/fhs-protocol`, y `npm run typecheck` en `apps/atlas`/`apps/navigator`/`apps/portal` sin romper nada (cambio puramente aditivo).

## TASK-NOVA-0002 — Nova de referencia en `galaxIA-satellite-star`

- **Estado:** pendiente — siguiente paso de esta iniciativa.
- Debe reutilizar el patrón de parser tolerante ya validado (DEC-0050/DEC-0054) en cada ronda de su loop interno, con un límite duro de pasos además del sugerido en `maxReasoningSteps`.
- A probar contra hardware real disponible esta sesión vía `~/.ssh/config` (`laptop-lan`, `raspi4b-lan`, alcanzables vía `bastion-wifi` — acceso agregado 2026-07-07, sin las limitantes de hardware previas de este proyecto).

## Pendiente (backlog, no bloqueante)

- Que Navigator prefiera automáticamente un Nova sobre un Star para ciertas tareas — decisión de implementación futura, no resuelta aún.
- Streaming de pasos intermedios del loop hacia el Portal — fuera de alcance de SPEC-NOVA-0001.
