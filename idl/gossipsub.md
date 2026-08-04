# GossipSub — Tópicos FHS

Especificación de los tópicos libp2p GossipSub usados por el protocolo FHS.
Los mensajes de GossipSub NO son Envelopes — llevan su propia firma Ed25519.

Ver también `docs/p2p.md` para el modelo de red completo y `idl/fhs-protocol.proto`
para las definiciones Protobuf de cada mensaje.

---

## Principios

1. **Sin coordinador central.** Cualquier nodo puede publicar y suscribirse a cualquier tópico.
2. **Auto-autenticación.** Cada mensaje lleva `did` del emisor + firma Ed25519 sobre el payload. El receptor verifica sin PKI externa (la clave pública está embebida en `did:key:z...`).
3. **TTL explícito.** Los mensajes de presencia (`NodeAdvertiseMessage`) incluyen `ttlSeconds`. Si un nodo deja de publicar antes del TTL, se considera offline.
4. **Backpressure local.** Cada receptor decide qué tópicos procesar. Un nodo con pocos recursos puede no suscribirse a `fhs/v1/missions/bid` si no quiere recibir trabajo.

---

## Tópicos

| Tópico | Mensaje | Publicado por | Se suscriben |
| ------ | ------- | ------------- | ------------ |
| `fhs/v1/nodes/advertise` | `NodeAdvertiseMessage` | Todos los nodos | Todos |
| `fhs/v1/missions/offer` | `MissionOfferMessage` | Navigator | Stars, Satellites, Novas |
| `fhs/v1/missions/bid` | `MissionBidMessage` | Stars/Satellites/Novas | Navigators |
| `fhs/v1/missions/assign` | `MissionAssignMessage` | Navigator | Stars, Satellites, Novas |
| `fhs/v1/reputation/update` | `ReputationUpdateMessage` | Navigator | Todos |

---

## fhs/v1/nodes/advertise

### Propósito

Reemplaza `node.online` / `node.lost` del modelo centralizado en Atlas.
Cada nodo activo publica periódicamente su presencia. Si deja de publicar
antes de que expire su TTL, los demás lo marcan como offline.

### Frecuencia recomendada

Publicar cada `ttlSeconds / 2` segundos. Default: cada 30 segundos (TTL = 60s).

### Campos del mensaje (Protobuf: `NodeAdvertiseMessage`)

```
did           string  — DID del nodo (did:key:z...)
beacon        Beacon  — Beacon tipado en Protobuf
multiaddrs    []string — Multiaddrs libp2p del nodo
timestamp     int64   — Unix ms
ttlSeconds    int32   — Tiempo de vida del anuncio (default 60)
ephemeral     bool    — true si es Ephemeral Satellite
delegatedBy   string  — DID del Nodo Host; solo si ephemeral = true
trustLevel    string  — "standard" | "delegated" | "community" | "unverified"
signature     bytes   — Ed25519 del encoding Protobuf determinista de los campos 1-8
```

### Verificación del receptor

1. Extraer clave pública Ed25519 del campo `did` (prefijo `z` = base58btc de la clave).
2. Verificar `signature` sobre la serialización Protobuf determinista de los campos 1-8.
3. Verificar `timestamp` ≤ now + 30s (anti-replay).
4. Si `ephemeral = true`: verificar que `delegatedBy` esté presente y en el caché local de nodos conocidos.
5. Actualizar caché local con `ttlSeconds` como expiración.

---

## fhs/v1/missions/offer

### Propósito

Navigator anuncia que necesita un provider. Reemplaza el dispatch centralizado
por Atlas. Los providers que pueden satisfacer la oferta responden en `fhs/v1/missions/bid`.

### Campos del mensaje (Protobuf: `MissionOfferMessage`)

```
missionId             string  — UUID de la misión
navigatorDid          string  — DID del Navigator
navigatorMultiaddrs   []string — Multiaddrs para stream directo post-assign
missionType           string  — "chat" | "tool_call" | "agent"
requiredCapabilities  []string — IDs de capabilities necesarias
preferredModel        string  — Modelo LLM preferido (para missionType = "chat")
scope                 string  — "local" | "network" | "community" | "external"
bidDeadlineMs         int64   — Unix ms límite para recibir bids
timestamp             int64
signature             bytes   — Ed25519 sobre los campos anteriores
```

### Filtro de providers elegibles

Un provider publica un bid si y solo si:
1. Tiene TODAS las `requiredCapabilities` (intersección exacta).
2. Para `missionType = "chat"`: `preferredModel` está disponible (o `preferredModel` está vacío).
3. El `scope` de la oferta es compatible con su visibilidad declarada en el Beacon.
4. No está al 100% de su `availability.maxConcurrentRequests`.
5. `bidDeadlineMs > now()` (aún hay tiempo).

---

## fhs/v1/missions/bid

### Propósito

Un provider anuncia que puede ejecutar una Mission ofertada. Navigator recoge
bids hasta `bid_deadline_ms` y selecciona el mejor.

### Campos del mensaje (Protobuf: `MissionBidMessage`)

```
missionId             string  — UUID de la misión ofertada
providerDid           string  — DID del provider
providerMultiaddrs    []string — Multiaddrs para stream directo post-assign
providerType          string  — "star" | "satellite" | "nova"
offeredCapabilities   []string — Capabilities que ofrece para esta Mission
offeredModel          string  — Modelo LLM que usará (para tipo "chat")
reputationScore       float   — Score local (0.0 - 1.0)
estimatedLatencyMs    int32   — Latencia estimada
trustLevel            string  — Trust level del provider
timestamp             int64
signature             bytes
```

### Criterio de selección del Navigator

Navigator ordena los bids recibidos por:
1. `trustLevel` (delegated > standard > community > unverified)
2. `reputationScore` (descendente)
3. `estimatedLatencyMs` (ascendente)

El primer bid de la lista ganadora recibe la asignación.

### Timeout sin bids

Si `bid_deadline_ms` expira sin bids recibidos → Navigator emite `error`
con código `BID_TIMEOUT` hacia el Portal.

---

## fhs/v1/missions/assign

### Propósito

Navigator confirma la asignación. Todos los providers que hicieron bid
pueden liberar recursos reservados si no son el ganador.

### Campos del mensaje (Protobuf: `MissionAssignMessage`)

```
missionId         string  — UUID de la misión
navigatorDid      string  — DID del Navigator
assignedProvider  string  — DID del provider ganador
timestamp         int64
signature         bytes
```

### Flujo post-assign

```
Navigator publica MissionAssignMessage
    ↓
Navigator abre stream /fhs/v1/0.1.0 hacia assignedProvider (vía multiaddrs del bid)
    ↓
Handshake (HandshakeMessage → HandshakeAckMessage)
    ↓
Mission execution (chat.request / tool.call / etc.)
    ↓
Navigator publica ReputationUpdateMessage (fhs/v1/reputation/update)
```

---

## fhs/v1/reputation/update

### Propósito

Navigator publica la evaluación de un provider después de completar una Mission.
Reemplaza `mission.feedback` punto-a-punto con Atlas.

Todos los nodos suscritos actualizan su caché local de reputación.
Los nodos que mantienen `DhtReputationRecord` actualizados en la DHT
también usan este feed para publicar el record con la nueva información.

### Campos del mensaje (Protobuf: `ReputationUpdateMessage`)

```
missionId     string  — UUID de la Mission completada
providerDid   string  — DID del provider evaluado
navigatorDid  string  — DID del Navigator que evalúa
latencyMs     float   — Latencia real de la Mission (ms)
success       bool    — true = completó sin error
errorCode     string  — FhsErrorCode como string; vacío si success = true
delegatedBy   string  — DID del Nodo Host; solo para Ephemeral Satellites
timestamp     int64
signature     bytes   — Ed25519 del navigatorDid sobre los campos anteriores
```

---

## DHT Kademlia — Records

Los records DHT no son mensajes GossipSub — se almacenan en la DHT libp2p.

### DhtBeaconRecord

- **Key**: DID del nodo (`did:key:z...`)
- **Publicado por**: el nodo mismo al unirse a la red
- **TTL**: definido en `expiresAt` (recomendado: 24h, renovar cada 12h)
- **Uso**: cualquier peer busca en DHT para obtener Beacon + multiaddrs de un DID conocido

### DhtReputationRecord

- **Key**: `"reputation/" + DID del provider`
- **Publicado por**: Navigators después de misiones completadas
- **TTL**: sin expiración fija (es un registro acumulativo)
- **Múltiples evaluadores**: cada Navigator publica su propio record bajo la misma key.
  Los nodos con más recursos pueden mantener un record agregado (media ponderada de los
  records de múltiples Navigators).

---

## Bootstrap — El rol de Atlas

Atlas es un nodo FHS especial cuyo DID y multiaddrs se incluyen en la configuración
por defecto de todos los nodos nuevos. Su único rol especial es:

1. **Ser un bootstrap peer conocido** para unirse al DHT swarm.
2. **Participar en GossipSub** como cualquier otro nodo (no tiene rol especial en los tópicos).
3. **Mantener uptime alto** para que los nodos nuevos puedan conectarse en cualquier momento.

Un nodo nuevo puede usar CUALQUIER peer conocido como bootstrap (no solo Atlas).
Una vez en el swarm DHT, el nodo puede descubrir todos los demás sin pasar por Atlas.
