# Plan de acción: runtime libp2p-first y Protobuf-only

Estado: aprobado para ejecución por fases  
Alcance: `galaxIA`, `galaxIA-SDK`, `galaxIA-Core`, `galaxIA-satellite-star` y `galaxia-parser-catalog`  
Fecha: 2026-08-03

## Objetivo

Hacer que toda comunicación del protocolo FHS entre nodos galaxIA use libp2p como único transporte de red y Protobuf como único formato de wire protocol.

No se busca retrocompatibilidad con el camino anterior. La migración será coordinada entre los repositorios y eliminará los fallbacks de HTTP, WebSocket de aplicación, WSS de aplicación, SSE, JSON y XML del camino FHS.

## Límites permitidos

Las siguientes excepciones no son transportes FHS entre nodos:

- Un proveedor externo de LLM u OCR puede exponerse por HTTP/HTTPS. El adaptador vive dentro del proveedor y convierte inmediatamente la entrada y salida a los tipos Protobuf del SDK.
- Un gateway HTTPS de IPFS externo puede usarse porque es un servicio fuera del control de galaxIA. Solo sirve como adaptación de almacenamiento/lectura de adjuntos, se valida el CID y nunca transporta mensajes FHS.
- Un IPFS que forme parte de la red galaxIA debe usar libp2p.
- `/ws` o `/wss` solo podrán aparecer como transporte subyacente de libp2p cuando sea necesario para conectar un nodo, especialmente desde navegador. Nunca serán un protocolo WebSocket de aplicación.
- JSON puede permanecer en configuración, persistencia local, catálogos y parseo de texto generado por un LLM. No puede cruzar el wire FHS.

## Estado inicial confirmado

La revisión con `codebase-memory` confirmó que el camino P2P actual es un esqueleto funcional, pero aún no es el camino único ni binario:

- `galaxIA`: el IDL canónico está en `idl/fhs-protocol.proto`, pero `ECOSYSTEM.md` todavía describe tipos TypeScript como fuente primaria.
- `galaxIA-Core`: `FHS_P2P_MODE` es opcional; Navigator registra Atlas HTTP, HTTP, WebSocket y SSE aunque active P2P. Los codecs P2P de streams, DHT y pub/sub usan JSON dentro de framing length-prefixed.
- `galaxIA-SDK`: el wire ya se genera desde Protobuf; los contratos de eventos de UI ya no forman parte del SDK. Las interfaces HTTP/WebSocket/SSE de aplicación todavía existen en algunas superficies locales y deben retirarse.
- `galaxIA-satellite-star`: cada proveedor duplica tipos P2P y codecs JSON. Los bridges LLM/OCR externos son adaptadores permitidos, pero deben quedar aislados del wire FHS.
- `galaxia-parser-catalog`: JSON y SQLite son almacenamiento y parseo local; deben tener una frontera explícita antes de producir `DynamicValue` y `ToolCall` FHS.

## Progreso de implementación

- [x] `galaxIA`: `Envelope.signature` definido como `bytes`.
- [x] `galaxIA-SDK`: mensajes generados desde el IDL canónico y codec `Envelope` + LPP binario.
- [x] `galaxIA-Core/packages/fhs-node`: streams, DHT y pub/sub reciben codecs binarios inyectables; no serializan JSON.
- [x] `galaxIA-Core/apps/navigator`: migrar el codec P2P específico y eliminar sus tipos manuales.
- [x] `galaxIA-satellite-star`: providers migrados al wire protobuf compartido; sin tipos ni codecs P2P duplicados.
- [x] `galaxia-parser-catalog`: adapter explícito de parser local a `DynamicValue`/`ToolCall`.
- [x] `galaxIA-SDK`: retirados `sse.ts`, `AgentSSEEvent` y la variante MCP `transport: "sse"`; publicado `@rafex_labs/galaxia-fhs-protocol@0.1.33`.
- [x] `galaxIA-Core/apps/navigator`: retirado el puente NATS del runtime; los eventos del Navigator ya no entran por JSON/NATS.
- [x] `galaxIA-Core`: agregado el handler de sesión Portal sobre `/fhs/v1/0.1.0`; Portal conecta directamente por libp2p y se retiraron las rutas HTTP/WebSocket/SSE de chat.
- [x] Completar en la sesión Portal los mensajes Protobuf de decisiones KB/adjuntos y `ArtifactRef`.
- [x] `galaxIA-Core/apps/portal-chat`: servidor estático y Vite de desarrollo requieren HTTPS; generan un certificado autofirmado local y no tienen fallback HTTP.

La migración de `FloodSub` a `GossipSub` quedó completada en Core y satellite-star con `@libp2p/gossipsub@16.1.1`, compatible con `@libp2p/interface@3`. La dependencia anterior `@chainsafe/libp2p-gossipsub` y el paquete `@libp2p/floodsub` ya no forman parte de esos repositorios.

### Avance aplicado en Core — 2026-08-03

El commit `92b474f` de `galaxIA-Core` dejó el camino P2P del Navigator en modo obligatorio:

- `stream-codec.ts` codifica y decodifica `FhsProto.Envelope` con Protobuf + LPP; ya no existe `{ type, payload }` en JSON.
- Handshake, chat y tool calls usan los mensajes generados y `DynamicValue` para argumentos/resultados.
- Presence, mission offer/bid/assign y beacon DHT usan codecs protobuf inyectados en pubsub/DHT.
- `AtlasClient` quedó como interfaz de descubrimiento; Navigator usa `P2pAtlasClient` y no conserva cliente Atlas HTTP.
- Se eliminaron los gateways FHS WebSocket/WSS del runtime y el fallback `FHS_P2P_MODE`; los providers P2P son el único camino de ejecución.
- Se eliminaron los tipos manuales P2P duplicados; `FhsProto` es la fuente de los mensajes transmitidos.
- `Envelope`, anuncios, misiones y beacons DHT se firman/verifican con Ed25519; el DID usa el multicodec `0xed01` requerido por `verifySignature`.
- JSON permanece únicamente en identidad local y en la frontera explícita del modelo de aplicación (`tool.function.arguments`), antes/después de convertirse a `DynamicValue`.
- `fhs-node` y Navigator usan GossipSub como único pub/sub; la validación dirigida de `fhs-node` pasa 5 pruebas y el typecheck/build de Core pasa.

La UI de chat ya no usa interfaces HTTP/SSE/WebSocket de aplicación; su conexión FHS es un stream libp2p. La sesión ya transporta adjuntos `ArtifactRef`, preferencias, OCR, recomendaciones KB y decisiones mediante Protobuf; el SDK valida ese ciclo con round-trip binario y queda la verificación E2E con providers reales.

### Avance aplicado en satellite-star — 2026-08-04

El commit `5a4687d` de `galaxIA-satellite-star` añadió `@galaxia/fhs-wire`, una frontera compartida para los cinco providers de referencia:

- Streams directos: Protobuf `Envelope` con framing LPP.
- Pubsub: anuncios y ciclo de misión codificados con los schemas generados.
- DHT: `DhtBeaconRecord` codificado con Protobuf.
- Los adapters locales conservan JSON solo al interactuar con LLM/OCR/parser, configuración, identidad o modelos legacy internos.

El commit `ea53adb` completó la migración directa del stream en los cinco providers:

- `decodeStream` entrega `FhsProto.Envelope` firmado y verificado; los handlers discriminan por `payload.case`.
- Los mensajes de respuesta se envían como mensajes protobuf generados; el framing LPP y la firma siguen en la frontera compartida.
- Los argumentos de tools se convierten de `DynamicValue` al modelo local solo al entrar al adapter de cada provider.
- `stream-codec.ts` dejó de exportar `FhsEnvelope` y ya no existe una fachada `{ type, payload }` para el stream.

La migración del wire ya se completó con `c5fa076` y `ea1d487`:

- Presencia, mission cycle y DHT usan mensajes `FhsProto` generados, firmados y verificados.
- Se eliminaron los cinco `fhs-p2p-types.ts` y los cinco `stream-codec.ts` locales.
- `fhs-wire` solo conserva conversiones locales explícitas para JSON de configuración/modelo hacia `ToolInputSchema` y `DynamicValue`; ningún JSON cruza el wire.
- Los cinco providers importan directamente el wire compartido.
- `satellite-ocr-example` ya no anuncia ni acepta `fileBase64`; la tool exige `file: ArtifactRef` y resuelve `inline` o un CID IPFS mediante el gateway externo declarado.

La representación formal de `ArtifactRef`, la limpieza de la API SSE del SDK, la sustitución de la UI HTTP/WebSocket/SSE por una sesión libp2p y los mensajes Portal de OCR/KB/decisiones ya quedaron resueltos. Permanece pendiente la prueba E2E entre Navigator, Portal y providers.

### Avance aplicado en parser-catalog — 2026-08-04

El commit `dc5120f` añadió `toFhsToolCall`: el catálogo puede seguir interpretando JSON producido localmente por el LLM, pero expone una salida `FhsProto.ToolCall` con argumentos `DynamicValue` antes de entrar a una misión. La prueba de integración verifica que `function.arguments` deja de ser string en la representación de protocolo. El JSON queda limitado a la frontera del parser/modelo.

## Fases de ejecución

### Fase 0 — contrato y decisiones bloqueantes

Repositorio principal: `galaxIA`.

1. Mantener `idl/fhs-protocol.proto` como única fuente de verdad.
2. [x] Resolver la representación formal de `ArtifactRef` como `oneof` Protobuf dentro de `DynamicValue`, con variantes `inline` e `ipfs`.
3. Fijar el generador y runtime Protobuf para Node y navegador.
4. Definir serialización determinista para firmas, validación de timestamps y prevención de replay.
5. Actualizar `ECOSYSTEM.md`, `DIAGNOSE.md` y documentación de implementación para reflejar el contrato real.
6. Añadir fixtures binarios para `Envelope`, handshake, beacon, chat, tools, mission cycle, DHT, reputación y adjuntos.

### Fase 1 — SDK ejecutable

Repositorio: `galaxIA-SDK`.

1. Generar los tipos y codecs desde `fhs-protocol.proto`.
2. Publicar helpers para encode/decode de `Envelope`, DHT, pub/sub y framing length-prefixed.
3. Sustituir campos string estructurados:
   - `beacon: string` → `Beacon`.
   - `inputSchema: string` → `ToolInputSchema`.
   - `function.arguments: string` → `DynamicValue`.
   - `result: string` → `DynamicValue`.
   - `signature: string` → `bytes`.
4. [x] Eliminar de la API pública `messages.ts`, `sse.ts`, `fhs.v1.json` y `Sec-WebSocket-Protocol`.
5. Eliminar los tipos manuales duplicados del wire; conservar solo tipos locales de UI, configuración o adapters que no se transmitan.
6. Publicar una versión coordinada del paquete sin capa de compatibilidad.
7. Añadir pruebas de vectores binarios y de round-trip.

El SDK `0.1.33` genera `ArtifactRef`, `InlineArtifact`, `IpfsArtifact` y los mensajes de sesión Portal desde el IDL; ya no exporta contratos SSE y expone subpaths seguros para navegador. Los eventos de Navigator y Portal son tipos locales de aplicación. Los adaptadores de Navigator y `fhs-wire` convierten el shape local `ArtifactRef` a ese `oneof` y de regreso sin serializar JSON en el wire.

### Fase 2 — Core y nodo libp2p

Repositorio: `galaxIA-Core`.

1. Hacer obligatorio el arranque libp2p y eliminar `FHS_P2P_MODE` como fallback.
2. Migrar `apps/navigator/src/p2p/stream-codec.ts` y `packages/fhs-node/src/stream.ts` de JSON a Envelope Protobuf con framing binario.
3. Migrar DHT y pub/sub a valores Protobuf firmados.
4. Verificar firmas antes de aceptar beacons, anuncios, misiones y reputación.
5. [x] Sustituir FloodSub por GossipSub compatible con la versión actual de libp2p.
6. Eliminar `any`, tipos locales P2P y casts a interfaces heredadas.
7. Migrar `P2pLlmGateway`, `P2pMcpHost`, discovery y mission cycle al SDK generado.
8. [x] Eliminar del plano FHS las rutas de chat, eventos, providers, métricas y WebSocket de aplicación.
9. [x] Convertir Portal Chat a cliente libp2p; cualquier `/ws` o `/wss` restante es exclusivamente transporte libp2p.
10. Separar el almacenamiento IPFS interno libp2p del adapter de gateway externo.

### Fase 3 — proveedores satélite

Repositorio: `galaxIA-satellite-star`.

1. [x] Eliminar `fhs-p2p-types.ts` y `stream-codec.ts` duplicados.
2. [x] Usar el SDK generado y la fábrica libp2p compartida.
3. [x] Migrar handshake, chat, tools, anuncios, DHT y pub/sub a Protobuf.
4. [x] Usar `DynamicValue` para argumentos y resultados, sin `JSON.stringify` en mensajes FHS.
5. [x] Representar adjuntos según el contrato canónico; no enviar `fileBase64` como formato de wire.
6. [x] Mantener HTTP/HTTPS de LLM/OCR solo como adapters externos aislados.
7. [ ] Añadir pruebas por proveedor y una prueba Navigator → Star/Nova/OCR/RAG/KB.

### Fase 4 — parser catalog

Repositorio: `galaxia-parser-catalog`.

1. Mantener JSON y SQLite únicamente para configuración, perfiles y parseo local.
2. Convertir el resultado del parser a `DynamicValue`/`ToolCall` del SDK antes de entrar al protocolo.
3. Prohibir que el JSON producido por el LLM llegue directamente a un stream FHS.
4. Añadir fixtures que distingan JSON local de wire Protobuf.

### Fase 5 — limpieza y verificación cross-repo

1. Eliminar fallbacks HTTP/WS/SSE y exports heredados.
2. Actualizar READMEs, `DIAGNOSE.md`, `ECOSYSTEM.md` y tareas SpecNative.
3. Ejecutar builds y tests en los cinco repositorios.
4. Ejecutar pruebas de dos nodos reales con discovery, misión, chat, tool call, DHT y reputación.
5. Verificar que el flujo completo funcione sin Atlas HTTP ni Registry HTTP.

## Orden de dependencias

```text
galaxIA: IDL y fixtures
        ↓
galaxIA-SDK: código generado y codecs
        ↓
galaxIA-Core: nodo, streams, DHT, pub/sub, Navigator
        ↓
galaxIA-satellite-star: proveedores
        ↓
galaxia-parser-catalog: adapter local → DynamicValue
        ↓
Portal Chat y pruebas end-to-end
```

## Criterios de aceptación

- No existe fallback HTTP para mensajes FHS.
- No existe WebSocket de aplicación ni SSE para chat, eventos, discovery o tools.
- `/ws` y `/wss` solo aparecen como transporte libp2p.
- No existe JSON dentro de streams, DHT, pub/sub o envelopes FHS.
- No existe XML en el wire protocol.
- No existen `beacon: string`, `inputSchema: string`, `arguments: string` ni `result: string` en los contratos transmitidos.
- Todas las firmas son binarias, deterministas y verificables.
- Todos los repositorios consumen el mismo paquete generado del SDK.
- IPFS interno usa libp2p; el gateway IPFS externo queda aislado y documentado.
- JSON restante está limitado a configuración, persistencia, catálogo, parser local y adapters externos.
- Los cinco repositorios compilan y pasan sus pruebas de integración.

## Riesgos y puertas de decisión

- La conectividad libp2p desde navegador puede requerir transporte WebSocket de libp2p, WebRTC o relay; esto no cambia el wire protocol.
- La selección del generador Protobuf debe producir artefactos compatibles entre Node y navegador.
- `ArtifactRef` debe resolverse antes de implementar adjuntos.
- La migración coordinada del SDK y sus consumidores es un cambio incompatible intencional.
- Los cambios locales existentes en los repositorios dependientes deben preservarse durante la implementación.
