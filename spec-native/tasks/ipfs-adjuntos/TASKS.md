# TASKS — ipfs-adjuntos (SPEC-IPFS-0001, DEC-0044/0045/0046/0047/0051/0052/0053)

## TASK-IPFS-0001 — `ArtifactRef.retention` y `{ type: "artifact" }` en el protocolo

- **Estado:** `done`
- `packages/fhs-protocol/src/types.ts`: `ArtifactRef` (variante `ipfs`) gana `retention?: "ephemeral" | "reuse"`.
- `packages/fhs-protocol/src/messages.ts`: `ToolCallResultMessage.content` acepta `{ type: "artifact"; artifact: ArtifactRef }` además de `{ type: "text" }`.
- Verificado: `npm run typecheck`/`build` en `packages/fhs-protocol`. Publicado como `@rafex/galaxia-fhs-protocol@0.1.6`.

## TASK-IPFS-0002 — Cliente IPFS mínimo en Navigator

- **Estado:** `done`
- `apps/navigator/src/ipfs/ipfs-client.ts`: `uploadToIpfs`, `unpinFromIpfs` (idempotente, best-effort), `resolveGatewayUrl`, `scheduleBackstopUnpin` (TTL 3h), `isIpfsConfigured`, `getPublicGatewayUrl`. Configurado vía `IPFS_API_URL` (escritura, local), `IPFS_PUBLIC_GATEWAY_URL` (default `https://ipfs.io/ipfs`), `IPFS_PRIVATE_GATEWAY_URL`.
- Verificado: `npm run typecheck` en `apps/navigator`.

## TASK-IPFS-0003 — `file_base64` → `file: ArtifactRef` en Navigator (DEC-0047)

- **Estado:** `done`
- `apps/navigator/src/agent/runtime.ts`: nuevo helper `buildFileArtifact` (inline por default, sube a IPFS si `preferences.ipfs.enabled`); `runOcrDeterministically`/`executeToolCall` lo usan en vez de construir `file_base64` a mano. Unpin inmediato tras `tool.result`/`tool.error` cuando `retention !== "reuse"` (DEC-0053: Navigator ejecuta el unpin, no el satellite).
- `ModelPreferences.ipfs?: { enabled, network, retention }` — nuevo campo, configuración del Portal (DEC-0052).
- Verificado: `npm run typecheck`/`build` en `apps/navigator`.

## TASK-IPFS-0004 — `GET /api/ipfs-config` en Navigator

- **Estado:** `done`
- `apps/navigator/src/index.ts`: expone `{ enabled, publicGatewayUrl }` para que el Portal sepa si IPFS está disponible y muestre el gateway default antes de que el usuario elija ese transporte.

## TASK-IPFS-0005 — UI de configuración IPFS en el Portal

- **Estado:** `done`
- `apps/portal/src/components/chat-view.ts`: selector directo/IPFS, red (pública/privada), retención (efímera/reutilizar); deshabilitado si `GET /api/ipfs-config` reporta `enabled: false`; texto informativo con el gateway público.
- `apps/portal/src/types/fhs.ts`/`services/api.ts`: `ChatState`/`ApiOptions.preferences.ipfs` extendidos.
- Bug encontrado y corregido en el mismo cambio: `.settings-bar [hidden] { display: none }` — sin esta regla, `.settings-bar label { display: flex }` dejaba visibles las filas condicionales aunque tuvieran el atributo `hidden` (detectado con `getComputedStyle` vía `preview_eval`, no visible en el snapshot de accesibilidad).
- Verificado: `npm run typecheck`/`build` + Vite build; probado en `portal-dev` real (toggle directo/IPFS, visibilidad correcta tras el fix).

## TASK-IPFS-0006 — `satellite-ocr-example` resuelve `file: ArtifactRef`

- **Estado:** `done`
- `examples/satellite-ocr-example/src/index.ts`: `inputSchema` de `ocr_extract` cambia `file_base64`/`filename` por `file` (ArtifactRef); nuevo `resolveFileArtifact()` — inline usa `base64` directo, IPFS descarga desde `gatewayUrl` (o `https://ipfs.io/ipfs` si no viene ninguno). Nunca ejecuta unpin (responsabilidad de Navigator, DEC-0053).
- `rag-provider`/`kb-provider`: sin cambios — no exponen ninguna tool que reciba binarios, `file_base64` no aplicaba ahí.
- Verificado: `npm run typecheck`/`build` en todo el workspace de `galaxIA-satellite-star`. Bump a `@rafex/galaxia-fhs-protocol@0.1.6`.

## Pendiente (backlog, no bloqueante)

- Verificación E2E contra un nodo IPFS/Kubo real — no ejecutada en esta sesión, sin infraestructura IPFS disponible (mismo patrón de bloqueo que issue #1, hardware/infra no disponible en este entorno).
- TTL de respaldo no persistente a un reinicio de Navigator (`setTimeout` en memoria) — un TTL persistente (ej. SQLite) queda para una iteración futura.
- Acción de borrado bajo demanda desde el Portal para archivos en modo `reuse` — documentada como funcionalidad a futuro en `SPEC-IPFS-0001`, no implementada.
- Dirección inversa (`{ type: "artifact" }` en `ToolCallResultMessage.content`, un provider devolviendo un resultado vía IPFS) — el tipo de protocolo ya lo soporta, pero ningún provider de referencia lo usa todavía.
