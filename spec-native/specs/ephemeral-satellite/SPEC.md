# SPEC-EPHSAT-0001 — Ephemeral Satellite: Delegación WASM en Dispositivos Móviles

## Estado

`draft`

## Owner

Raúl Fletes (rafex)

## Vocabulario

Esta spec usa el vocabulario canónico del protocolo FHS, sin excepción:

| Término FHS        | Rol                                                                |
| ------------------ | ------------------------------------------------------------------ |
| **Star**           | Nodo de razonamiento / proveedor LLM (`provider.type: "star"`)    |
| **Satellite**      | Nodo de herramientas / proveedor de capacidades (`"satellite"`)    |
| **Nova**           | Agente con loop autónomo (`"nova"`)                                |
| **Atlas**          | Registry + peer de bootstrap; valida el Orbit de nodos             |
| **Navigator**      | Agent Runtime; despacha Missions a Stars y Satellites              |
| **Portal**         | UI de chat del usuario                                             |
| **Beacon**         | Manifiesto publicado por un nodo al entrar en Orbit                |
| **Mission**        | Unidad de trabajo correlacionada por `missionId`                   |
| **Pulse**          | Heartbeat ping/pong entre nodo y Atlas                             |
| **Orbit**          | Estado activo y registrado de un nodo en la red FHS                |
| **Envelope**       | Frame P2P que envuelve cualquier mensaje FHS (DEC-0087)            |
| **Handshake**      | Secuencia de 2 pasos para entrar en Orbit (`handshake`→`handshake_ack`) |
| **did:key**        | Identidad criptográfica Ed25519 (`did:key:z…`)                     |
| **Nodo Host**      | Star, Satellite o Nova **ya en Orbit** que publica el WASM         |
| **Ephemeral Satellite** | Satellite que ejecuta WASM desde un dispositivo móvil/navegador, delegado por un Nodo Host |
| **Token de Delegación** | Credencial firmada por el Nodo Host incluida en el Beacon del Ephemeral Satellite |
| **Cadena de Delegación** | Vínculo de confianza Host → Ephemeral Satellite validado por Atlas |

## Problema

El hardware más abundante del mundo son los teléfonos en desuso. Un usuario
con un Android de 2018 o un iPhone 6 que ya no recibe actualizaciones tiene
en la mano un procesador ARM capaz de ejecutar código WASM a 60-300 MIPS.
Si ese dispositivo puede participar en la red FHS como proveedor de
capacidades computacionales, el ecosistema escala horizontalmente sin
requerir servidores.

Sin embargo, incorporar teléfonos al protocolo sin un modelo de confianza
sólido introduce un riesgo serio: cualquier actor podría anunciarse como
Satellite, recibir Missions con datos de usuarios, y devolver resultados
manipulados o exfiltrar información.

La clave del diseño es que **el Ephemeral Satellite no es un actor
anónimo**. Es una extensión computacional de un Nodo Host que ya existe
en la red FHS, ya tiene reputación, y ya fue admitido por Atlas. El
dispositivo móvil hereda la confianza de ese nodo, no la construye desde
cero.

## Propuesta

Un **Ephemeral Satellite** es un Satellite con ciclo de vida corto
(`provider.ephemeral: true`) cuyo Beacon incluye un **Token de Delegación**
firmado criptográficamente por un Nodo Host ya en Orbit. Atlas valida esa
firma antes de admitirlo. Navigator lo trata como cualquier Satellite una
vez en Orbit, enrutando Missions normalmente.

### Principios de diseño

1. **El Nodo Host pre-existe.** El dispositivo móvil descarga el WASM de un
   Satellite, Star o Nova que ya está en Orbit, ya tiene `missionId`
   completadas y ya tiene historial de reputación en Atlas.

2. **La confianza es transitiva, no acumulativa desde cero.** El Ephemeral
   Satellite comienza con el nivel de confianza derivado de su Nodo Host,
   no con reputación vacía. Con el tiempo acumula su propia reputación
   de operador.

3. **WASM local / de desarrollo propio es posible.** Un desarrollador puede
   cargar su propio `.wasm` sin Host firmante. Se le asigna
   `TrustLevel.UNVERIFIED`. Atlas lo admite pero el Navigator y el Portal
   muestran alertas visibles al usuario antes de enrutar Missions.

4. **Todo corre sobre P2P (DEC-0086, DEC-0087).** La conexión del Ephemeral
   Satellite a Atlas usa WebSocket con Envelope. El dispositivo establece
   una conexión saliente persistente — no requiere IP pública ni NAT
   traversal desde Atlas.

5. **El lease TTL es corto.** Un Ephemeral Satellite no renueva su Orbit
   indefinidamente. Si el Pulse (ping/pong) cae o el TTL expira, Atlas
   lo saca del Orbit automáticamente sin intervención manual.

## Cadena de Delegación

```
Nodo Host (Star / Satellite / Nova)
  │ ya en Orbit, did:key:zHOST...
  │ firma con su clave privada Ed25519:
  │   { subject: did:key:zEPH..., capabilities: [...], wasmHash: "sha256:...",
  │     expiresAt: <ISO 8601>, issuer: did:key:zHOST... }
  │
  └─► Token de Delegación (incluido en el Beacon del Ephemeral Satellite)
        │
        └─► Atlas recibe el Beacon vía handshake
              │ valida: ¿issuer en Orbit? ¿firma válida? ¿TTL no expirado?
              │ asigna TrustLevel según resultado
              └─► handshake_ack → Ephemeral Satellite entra en Orbit
```

## Niveles de Confianza

| Nivel | Constante            | Condición                                                    | Comportamiento                                       |
| ----- | -------------------- | ------------------------------------------------------------ | ---------------------------------------------------- |
| 2     | `DELEGATED`          | Token de Delegación válido, Host en Orbit, firma verificada  | Navigator enruta Missions sin alerta extra           |
| 1     | `COMMUNITY`          | Host conocido pero el WASM es contribución de terceros (hash no firmado directamente por el Host) | Portal muestra badge de advertencia |
| 0     | `UNVERIFIED`         | Sin Token de Delegación, WASM local / desarrollo propio      | Portal muestra alerta explícita; reputación inicia en 0; usuario debe confirmar |

Portal **siempre** muestra el nivel de confianza en la ProvenanceInfo de cada
Mission completada por un Ephemeral Satellite.

## Campos nuevos en el Beacon

Los cambios se aplican a `schemas/beacon-base.schema.json` y
`schemas/beacon-satellite.schema.json`.

### En `beacon-base.schema.json` — bloque `provider`

```json
"ephemeral": {
  "type": "boolean",
  "description": "true si este nodo tiene ciclo de vida corto (dispositivo móvil / WASM / sesión de navegador)",
  "default": false
},
"delegatedBy": {
  "type": "string",
  "pattern": "^did:key:z",
  "description": "DID del Nodo Host que emite el Token de Delegación"
},
"leaseSeconds": {
  "type": "integer",
  "minimum": 60,
  "maximum": 86400,
  "default": 3600,
  "description": "TTL máximo de Orbit para un Ephemeral Satellite"
}
```

### Nuevo bloque `delegationToken` en el Beacon raíz

```json
"delegationToken": {
  "type": "object",
  "description": "Credencial firmada por el Nodo Host. Requerido cuando provider.ephemeral es true y provider.delegatedBy está presente.",
  "required": ["issuer", "subject", "capabilities", "wasmHash", "expiresAt", "signature"],
  "properties": {
    "issuer":       { "type": "string", "pattern": "^did:key:z" },
    "subject":      { "type": "string", "pattern": "^did:key:z" },
    "capabilities": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Lista de capability IDs que el Host delega (subconjunto de los suyos)"
    },
    "wasmHash": {
      "type": "string",
      "pattern": "^sha256:[0-9a-f]{64}$",
      "description": "Hash SHA-256 del bundle WASM firmado por el Host"
    },
    "expiresAt":  { "type": "string", "format": "date-time" },
    "signature":  {
      "type": "string",
      "description": "Firma Ed25519 en base64url sobre canonical JSON de los campos anteriores"
    }
  }
}
```

## Cambios al Protocolo FHS

### Handshake sin cambios de flujo

El Ephemeral Satellite usa el mismo handshake de 2 pasos (DEC-0087):
1. Envía `Envelope { handshake: HandshakeMessage { beacon: <BeaconEphemeral> } }`
2. Recibe `Envelope { handshake_ack: HandshakeAckMessage { ... } }`

Atlas añade la validación de la Cadena de Delegación entre los pasos 1 y 2:
- Si `provider.ephemeral == true && delegationToken` existe: valida firma, TTL, y que `issuer` esté en Orbit.
- Si la validación falla: responde `handshake_ack` con `status: "rejected"` y `reason: "delegation_invalid"`.
- Si `provider.ephemeral == true && delegationToken` ausente: admite con `TrustLevel.UNVERIFIED`.

### Nuevo mensaje: `mission.feedback`

**Propósito:** Navigator informa a Atlas sobre la calidad de una Mission
completada por un Ephemeral Satellite (extensión de SPEC-SATRATING-0001).

**Adición a `fhs-protocol.proto`:**

```proto
// Reputación post-Mission para Ephemeral Satellites  [90]
MissionFeedbackMessage mission_feedback = 90;

message MissionFeedbackMessage {
  string mission_id       = 1;   // correlaciona con la Mission completada
  string satellite_did    = 2;   // DID del Ephemeral Satellite evaluado
  float  latency_ms       = 3;   // latencia real de la Mission
  bool   success          = 4;   // true = completó sin error
  string error_code       = 5;   // vacío si success = true
  string delegated_by     = 6;   // DID del Nodo Host (para actualizar reputación derivada)
}
```

**Adición a `asyncapi.yaml`:**

Canal `/orbit/feedback` (Navigator → Atlas):

```yaml
satellite.missionFeedback:
  description: Navigator informa la calidad de una Mission completada por un Ephemeral Satellite.
  payload:
    type: object
    required: [type, missionId, satelliteDid, latencyMs, success]
    properties:
      type:         { type: string, const: satellite.missionFeedback }
      missionId:    { type: string, format: uuid }
      satelliteDid: { type: string, pattern: "^did:key:z" }
      latencyMs:    { type: number }
      success:      { type: boolean }
      errorCode:    { type: string }
      delegatedBy:  { type: string, pattern: "^did:key:z" }
```

### Mensajes futuros (Fase 2)

Los siguientes mensajes se **documentan aquí como reservados** pero no se
implementan en esta fase. Requieren P2P completo (libp2p + DHT):

- **`mission.offer`** — Navigator difunde una Mission al DHT cuando necesita
  capacidad efímera no preregistrada. Formato: `{ missionId, capabilities[], scope, ttlSeconds }`.
- **`mission.claim`** — Ephemeral Satellite responde a un `mission.offer`
  que puede ejecutar. Formato: `{ missionId, satelliteDid, delegatedBy, trustLevel }`.

## Lógica en Atlas

Atlas debe implementar los siguientes cambios (repo galaxIA-Core):

### Validación del Token de Delegación (registro)

```
Al recibir handshake con Beacon ephemeral:
  1. Leer delegationToken.issuer
  2. Verificar que issuer esté en Orbit (tabla providers con status = 'active')
  3. Verificar firma Ed25519: verify(canonical_json(token sin .signature), token.signature, issuer.publicKey)
  4. Verificar token.expiresAt > now()
  5. Verificar token.subject == beacon.provider.id
  6. Asignar TrustLevel según resultado
  7. Registrar en providers con trust_level y expires_at = min(token.expiresAt, now() + leaseSeconds)
```

### Mantenimiento del Orbit efímero

- Atlas no extenderá el lease de un Ephemeral Satellite más allá de `delegationToken.expiresAt`.
- Si el Nodo Host sale del Orbit (heartbeat caído, lease expirado), **todos sus Ephemeral Satellites
  activos son expulsados automáticamente** del Orbit y se les envía un Envelope de cierre.

### Propagación de reputación

Al recibir `mission.feedback`:
- Actualiza `metrics` del Ephemeral Satellite (`satellite_did`).
- Si `delegatedBy` está presente, actualiza también un contador de
  "delegaciones exitosas" del Nodo Host (nuevo campo en la tabla `metrics`,
  extiende SPEC-SATRATING-0001).

## Modelo WASM en el Navegador / Dispositivo Móvil

El Ephemeral Satellite carga y ejecuta el WASM dentro de un **Web Worker**
(aislamiento de hilo principal) usando la API estándar de WebAssembly:

```
Web Worker (dispositivo)
├── Carga el .wasm desde URL publicada por el Nodo Host
├── Verifica hash SHA-256 del bundle contra delegationToken.wasmHash
├── Si hash no coincide → rechaza la ejecución, reporta error a Portal
├── WebAssembly.instantiate(buffer)
├── Exporta funciones string-in / string-out (interfaz de capability)
└── Escucha tool.call desde Navigator vía WebSocket → ejecuta → devuelve tool.result
```

La verificación del hash antes de ejecutar el WASM es **obligatoria**. Un
Ephemeral Satellite que omite esta verificación viola el protocolo FHS y
Atlas puede revocar su Orbit si lo detecta en un `mission.feedback` con error
`"wasm_hash_mismatch"`.

## WASM Local / Desarrollo Propio (TrustLevel.UNVERIFIED)

Un desarrollador puede cargar su propio `.wasm` sin Token de Delegación:

1. El Beacon no incluye `delegationToken` ni `provider.delegatedBy`.
2. Atlas admite el Ephemeral Satellite con `TrustLevel.UNVERIFIED`.
3. Navigator elige este Satellite para Missions **solo si** el Navigator fue
   configurado explícitamente para ello (`allowUnverified: true` en su config)
   o si el usuario lo aprueba manualmente en el Portal.
4. Portal muestra un banner de alerta antes de la primera Mission.
5. Cada Mission completada genera `mission.feedback` con `delegatedBy: ""`,
   que Atlas acumula en el perfil de reputación del `did:key` del Ephemeral
   Satellite. Con suficientes Missions exitosas, el operador puede solicitar
   que un Nodo Host emita un Token de Delegación retroactivo.

## Huella de Dispositivo (Census)

Opcional. Un Ephemeral Satellite puede incluir en su Beacon un campo
`device.fingerprint`:

```json
"device": {
  "type": "object",
  "properties": {
    "fingerprint": {
      "type": "string",
      "description": "Hash no reversible del hardware del dispositivo (CPU ABI, RAM tier, screen DPI hash) — no PII"
    },
    "platform": {
      "type": "string",
      "enum": ["android", "ios", "browser", "desktop"]
    },
    "wasmTier": {
      "type": "string",
      "enum": ["baseline", "simd", "threads"],
      "description": "Capacidades WASM del dispositivo"
    }
  }
}
```

**`fingerprint` es un hash unidireccional**, no un identificador personal
reversible. Su propósito es evitar que un mismo dispositivo se registre
repetidamente bajo DIDs distintos para manipular estadísticas de reputación
(Sybil resistance básico). No se almacena el fingerprint en claro — Atlas
guarda únicamente el hash. El usuario puede optar por no incluirlo
(`privacy.retention: "none"` ya existente en el Beacon).

## Flujo Completo (Fase 1)

```
Portal (navegador móvil)
  │ 1. Carga página publicada por Nodo Host (Satellite ya en Orbit)
  │    La página incluye: URL del .wasm + delegationToken pre-firmado
  │ 2. Web Worker descarga el .wasm y verifica SHA-256
  │ 3. Genera un did:key:z... efímero (Ed25519 nuevo en localStorage)
  │ 4. Construye Beacon con:
  │      provider.ephemeral: true
  │      provider.delegatedBy: "<did del Nodo Host>"
  │      delegationToken: { issuer: hostDID, subject: ephDID, ... }
  │
  └─► Atlas
        │ 5. Valida Cadena de Delegación (issuer en Orbit, firma válida, TTL)
        │ 6. Asigna TrustLevel.DELEGATED
        │ 7. handshake_ack → Ephemeral Satellite en Orbit
        │ 8. Registra en tabla providers con expires_at = delegationToken.expiresAt
        │
        └─► Navigator (cuando llega una Mission que requiere la capability)
              │ 9. Resuelve el Ephemeral Satellite por capability (mismo routing existente)
              │ 10. Envía tool.call con missionId
              │ 11. Ephemeral Satellite ejecuta WASM en Web Worker
              │ 12. Responde tool.result
              │ 13. Navigator envía mission.feedback a Atlas
              └─► Portal muestra ProvenanceInfo con TrustLevel visible
```

## Relación con Specs Existentes

| Spec                   | Relación                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------- |
| SPEC-SATRATING-0001    | Esta spec **extiende** el modelo de reputación existente con `delegatedBy` y `mission.feedback` |
| SPEC-P2P-0001          | Reutiliza la identidad Ed25519 del Nodo Host para validar la firma del Token de Delegación  |
| DEC-0086 (LPP framing) | El Ephemeral Satellite usa el mismo framing binario que cualquier nodo FHS                |
| DEC-0087 (Envelope)    | La conexión del Ephemeral Satellite usa Envelope; el handshake es idéntico                |
| DEC-0072 (maxConcurrentRequests) | `availability.maxConcurrentRequests` en el Beacon del Ephemeral Satellite es crítico — un teléfono no debería aceptar más de 1-2 Missions simultáneas |

## Fuera del Alcance (Fase 1)

- **`mission.offer` / `mission.claim`** (Fase 2): requiere DHT/libp2p para
  difusión a Satellites que no preregistraron.
- **NAT traversal real** (STUN/TURN): el Ephemeral Satellite hace conexión
  saliente a Atlas — no requiere port forwarding. Llamadas directas Navigator↔Ephemeral
  sin relay quedan para Fase 3.
- **Revocación de tokens**: en Fase 1 el Token de Delegación se invalida por
  expiración de TTL. Revocación activa (Host → Atlas: "cancela este DID") queda para Fase 2.
- **Múltiples Nodos Host en cadena** (A firma a B firma a C): solo se admite
  una delegación de nivel (Host → Ephemeral). Cadenas más largas quedan indefinidas.
- **Compilación AOT para mobile nativo**: AssemblyScript → WASM → navegador
  es el objetivo de Fase 1. Integración en app nativa (React Native, Flutter)
  queda para Fase 3.

## Criterios de Aceptación (Fase 1)

1. Un dispositivo móvil puede cargar una página publicada por un Nodo Host y
   completar el handshake con Atlas, apareciendo en Orbit como Ephemeral Satellite.
2. Navigator enruta al menos una Mission real (`tool.call`) al Ephemeral Satellite
   y recibe un `tool.result` válido.
3. Atlas rechaza un Ephemeral Satellite con Token de Delegación expirado o con
   firma inválida (`status: "rejected"`, `reason: "delegation_invalid"`).
4. Si el Nodo Host sale del Orbit, todos sus Ephemeral Satellites activos
   son expulsados automáticamente en menos de 2× el intervalo de Pulse.
5. Portal muestra `TrustLevel.DELEGATED` en la ProvenanceInfo de la Mission.
6. Un WASM con hash diferente al declarado en `delegationToken.wasmHash`
   genera `mission.feedback` con `success: false, errorCode: "wasm_hash_mismatch"`.
7. `npm run typecheck`/`lint`/`test` limpios en galaxIA-Core y galaxIA-SDK
   tras los cambios de Atlas y de los schemas JSON.

## Tareas de Implementación

Las tareas de código viven en los repos que les corresponden:

| Repo                    | Trabajo                                                                               |
| ----------------------- | ------------------------------------------------------------------------------------- |
| **galaxIA** (IDL)       | Actualizar `schemas/beacon-base.schema.json` y `schemas/beacon-satellite.schema.json`; añadir `MissionFeedbackMessage` a `fhs-protocol.proto` y `asyncapi.yaml` |
| **galaxIA-SDK**         | Añadir campos nuevos a `packages/fhs-protocol/src/messages.ts`; regenerar schema JSON |
| **galaxIA-Core**        | Validación de Cadena de Delegación en `apps/atlas`; propagación de reputación; expulsión automática por salida del Host |
| **galaxIA-SDK**         | Nuevo paquete `packages/satellite-ephemeral`: generación de did:key efímero, verificación de hash WASM, Web Worker wrapper, conexión WebSocket a Atlas |
| **galaxIA-satellite-star** | Demo de Nodo Host que emite Token de Delegación y publica página de descarga WASM |

Ver `spec-native/tasks/` de cada repo para el desglose en tareas ejecutables.

## Decisiones Pendientes

Estas preguntas requieren decisión explícita (nueva DEC) antes de implementar:

1. **¿El `did:key` efímero se guarda en `localStorage` o se regenera por sesión?**
   - `localStorage`: el dispositivo mantiene identidad entre sesiones → reputación acumulable
   - Por sesión: más privado, reputación no persiste por dispositivo
   - Impacta el valor del fingerprint de Sybil resistance

2. **¿Atlas almacena el fingerprint del dispositivo o solo verifica unicidad?**
   - Almacenarlo: permite analytics de flota (cuántos Android, cuántos iOS)
   - Solo verificar: más privado, menos dato en Atlas

3. **¿El Token de Delegación se genera server-side en el Nodo Host o en el cliente?**
   - Server-side: el Host tiene que estar up cuando el usuario carga la página
   - Pre-generado (con TTL largo): funciona offline pero ventana de revocación más amplia

4. **¿Cuál es el TTL máximo aceptable para `leaseSeconds`?**
   - Propuesta inicial: 3600 s (1 hora)
   - Un turno de juego de 8 horas podría necesitar 28800 s

---

*Refs: DEC-0086, DEC-0087, SPEC-SATRATING-0001, SPEC-P2P-0001*
