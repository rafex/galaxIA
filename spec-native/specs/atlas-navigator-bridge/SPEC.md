# SPEC-BRIDGE-0001 — Puente de eventos Atlas↔Navigator vía NATS

## Estado

`proposed` — solo documentado, sin implementar. Decisión de tecnología registrada en `spec-native/DECISIONS.md` DEC-0036.

## Owner

Raúl Fletes (rafex)

## Vocabulario

Esta spec usa **Atlas** (Registry) y **Navigator** (Agent Runtime) como los dos servicios separados desde DEC-0035 — ver `docs/atlas.md`/`docs/navigator.md`. No aplica a Star/Satellite directamente.

## Problema

DEC-0035 separó Atlas de Navigator en dos procesos independientes. Al hacerlo, se confirmó un hallazgo: los eventos `node.online`/`node.lost` que `Atlas` (`registry.ts`) publica vía `this.eventBus.broadcastToRuntimes(...)` **nunca tuvieron un consumidor real** — ningún código en todo el repo llama `EventBus.subscribeToRuntime()`. Antes de DEC-0035 esto ya era código muerto (mismo proceso, sin nadie suscrito); después de DEC-0035 sigue siendo inerte, pero además esos eventos ahora están estructuralmente atrapados en el `EventBus` interno de Atlas, sin ningún mecanismo para cruzar al proceso de Navigator aunque alguien quisiera consumirlos.

El síntoma concreto que esto deja sin resolver: el Portal no se entera en vivo cuando un Star/Satellite se conecta o cae. Hoy la única forma de ver el estado actual del catálogo es una consulta REST puntual (`GET /api/fhs/providers` vía Atlas) — no hay push. Para conversaciones en curso, `AgentRuntime` igual resuelve el catálogo en el momento de cada turno (vía `AtlasClient.getProviders()`), así que el chat funciona correctamente sin esto — es una mejora de experiencia (notificaciones en vivo en el Portal), no una dependencia funcional del pipeline de chat.

## Propuesta

Usar **NATS** como bus de mensajería entre Atlas y Navigator:

- Atlas publica a subjects `fhs.node.online` / `fhs.node.lost` en el mismo punto donde hoy llama `broadcastToRuntimes(...)` (`apps/atlas/src/atlas/registry.ts`, dentro de `registerOrUpdate()`/`markLost()`).
- Navigator se suscribe a esos subjects al arrancar y reinyecta cada evento recibido en su propio `EventBus` (`apps/navigator/src/sse/event-bus.ts`) — el mismo mecanismo que hoy ya distribuye eventos de conversación al Portal por `/api/chat/ws`. Así el Portal sigue teniendo un solo canal de eventos (WebSocket a Navigator), sin necesidad de una segunda conexión directa a Atlas.
- **NATS core (pub/sub simple) vs. JetStream (durable, con replay):** queda como decisión de diseño abierta, no resuelta en esta spec. JetStream tendría sentido si Navigator puede reiniciarse y quiere "ponerse al día" del estado actual sin perder el evento que pasó mientras estaba caído — pero eso también se puede resolver con un `GET /api/fhs/providers` a Atlas al arrancar (snapshot inicial) + NATS core solo para los cambios en vivo después. La spec no compromete cuál de las dos rutas se toma.

## Por qué NATS (y no otra cosa)

- Cliente Node (`nats.js`) maduro y con soporte activo.
- JetStream KV soporta **TTL nativo** — si más adelante se quisiera modelar el lease de conexión (`leaseExpires`, hoy solo en el `Map` de `MemoryAtlasStore`) como estado compartido en vez de solo dentro de Atlas, NATS KV con TTL mapea casi literal a ese concepto. Esto es una posibilidad a futuro, no parte del alcance de esta spec.
- Si el proyecto alguna vez crece hacia federación entre comunidades (múltiples Atlas, múltiples redes locales que quieren verse entre sí), pub/sub es exactamente el patrón que NATS resuelve bien — a diferencia de una solución ad-hoc de polling o webhooks punto a punto.

## Explícitamente fuera de alcance de esta spec

- Implementación de código — esto es diseño, no una tarea lista para ejecutar.
- Elección final NATS core vs. JetStream (ver arriba).
- Migrar el lease/estado de conexión de nodos a NATS KV — eso es un cambio de arquitectura de Atlas en sí, separado del problema de "cómo cruza un evento de un proceso a otro" que esta spec cubre.
- Cualquier persistencia — eso ya se resolvió para el rating con SQLite+WAL (DEC-0036, ver también `spec-native/specs/satelite-rating/SPEC.md`). Esta spec es puramente sobre mensajería entre procesos, no sobre almacenamiento.
- Requerir NATS como dependencia obligatoria del despliegue — si se implementa, debe ser opt-in (igual que mDNS, TLS, etc.) para no romper el despliegue de un solo proceso/sin NATS que ya funciona hoy.

## Preguntas abiertas (para cuando se priorice implementar)

1. ¿NATS corre como contenedor nuevo en `containers/compose.yaml` (cuarto servicio del core, junto a atlas/navigator/portal), o es opcional/externo?
2. ¿Snapshot inicial al arrancar Navigator (REST a Atlas) + solo deltas por NATS después, o Navigator espera el primer evento sin snapshot?
3. ¿Este mismo bus sirve también para que el Portal reciba notificaciones sin pasar por Navigator, o Navigator sigue siendo el único punto de contacto del Portal (como hoy)?
4. ¿Vale la pena esto antes o después de tener autenticación de usuarios (`SPEC-AUTH-0001`, pausada) — un Portal sin sesión de usuario real ya muestra notificaciones globales de nodo a cualquiera conectado, lo cual puede ser aceptable o no según el modelo de privacidad que se decida más adelante?
