# Atlas — el catálogo de galaxIA

Atlas es el Registry del protocolo FHS: el catálogo de nodos (Star/Satellite) disponibles y sus capacidades. Corre en `apps/atlas/` como servicio independiente desde DEC-0035 (antes vivía en el mismo proceso que Navigator).

## Qué hace Atlas

Los nodos se conectan por WebSocket a `/fhs/v1/ws` y envían:

1. `hello` — "hola, soy did:key:macmini-raul" (identidad Ed25519, DEC-0030)
2. `register` — "ofrezco esto" (con un manifiesto, validado — DEC-0013)
3. `ping` — "sigo vivo" (cada 10s)

Si un nodo deja de hacer ping (Pulse, DEC-0010), Atlas lo marca como `lost`.

**Dónde vive el código:** `apps/atlas/src/atlas/`

## Endpoints expuestos

| Ruta | Método | Descripción |
|---|---|---|
| `/health` | GET | Health check |
| `/fhs/v1/ws` | WebSocket | Registro de nodos (hello/register/ping) |
| `/api/fhs/nodes` | GET | Nodos online con sus servicios |
| `/api/fhs/providers` | GET | Providers con rating/latencia (SPEC-SATRATING-0001) |
| `/api/fhs/models` | GET | Modelos LLM disponibles |
| `/api/fhs/capabilities` | GET | Capabilities MCP disponibles |
| `/api/fhs/resolve` | POST | Resolución simple (candidato disponible) |
| `/api/fhs/metrics/sample` | POST | Escritura de una muestra de latencia/éxito — usado por Navigator (`AtlasClient`), no por el frontend |

## Cómo levantar Atlas

```bash
# Desarrollo (con hot reload)
npm run dev -w apps/atlas

# O directamente
cd apps/atlas
PORT=8081 npx tsx src/index.ts
```

### Variables de entorno

| Variable | Default | Descripción |
|---|---|---|
| `PORT` | `8081` | Puerto HTTP + WebSocket |
| `HOST` | `127.0.0.1` | Interfaz de escucha |
| `MDNS_ENABLED` | `true` | Anuncio mDNS de Atlas en la LAN (SPEC-P2P-0001) |
| `IDENTITY_KEY_PATH` | `./.fhs-identity-registry.pem` | Identidad Ed25519 propia de Atlas (DEC-0032) |
| `ATLAS_DB_PATH` | `./data/atlas-metrics.db` | Archivo SQLite (WAL) donde persiste el rating/latencia — sobrevive un reinicio (DEC-0036). El catálogo de nodos **no** persiste aquí, sigue en memoria a propósito |
| `TLS_CERT_PATH` / `TLS_KEY_PATH` | — | Opt-in de TLS/WSS (ver `docs/tls-autofirmado.md`) |

## Submódulos internos

| Archivo | Responsabilidad |
|---|---|
| `atlas/registry.ts` | Clase `Atlas` — catálogo de nodos y servicios en memoria, leases, heartbeats |
| `atlas/db.ts` | Store en memoria (`MemoryAtlasStore`) |
| `atlas/metrics.ts` | Historial de latencia/éxito y cálculo de rating (SPEC-SATRATING-0001) — persistido en SQLite+WAL (DEC-0036) |
| `atlas/ws-handler.ts` | Protocolo `/fhs/v1/ws` — hello/register/ping, verificación de firma Ed25519 |
| `atlas/manifest-validation.ts` | Validación de manifiesto (DEC-0013) |
| `atlas/identity-store.ts` / `atlas/mdns-announce.ts` | Identidad propia de Atlas y su anuncio mDNS |
| `api/providers.ts` | Endpoints REST del catálogo (lectura) |
| `api/metrics.ts` | Endpoint de escritura de métricas — el único que Navigator usa (DEC-0035) |

## Atlas es observable, no controlador

Atlas **no**:
- Ejecuta herramientas ni llama a modelos
- Ve datos del usuario ni contenido de conversaciones
- Toma decisiones de orquestación (eso es Navigator)
- Requiere autenticación en v0.1

Atlas **sí**:
- Sabe qué nodos existen y qué servicios ofrece cada uno
- Detecta caídas por lease vencido
- Acumula telemetría de latencia/éxito por nodo+capability (rating)

## Contrato con Navigator (DEC-0035)

Navigator ya no importa la clase `Atlas` en proceso — le habla por HTTP vía `apps/navigator/src/atlas-client.ts` (`AtlasClient`):
- `GET /api/fhs/providers?type=llm|mcp` — lectura, para resolver a qué nodo enrutar cada turno de chat.
- `POST /api/fhs/metrics/sample` — escritura *fire-and-forget*: si Atlas está caído o lento, Navigator no espera ni falla el turno de chat, solo pierde esa muestra de telemetría.

Los eventos `node.online`/`node.lost` viven en el `EventBus` interno de Atlas — hoy no cruzan a Navigator (nadie se suscribe a `subscribeToRuntime()` en ningún proceso; era código muerto incluso antes de la separación). No hay puente de eventos entre ambos servicios en esta iteración — queda como mejora futura, no bloqueante.
