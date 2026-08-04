# Identidad — DID, Ed25519, Envelope Signature

## Identidad de Nodo

Cada nodo FHS tiene un par de claves Ed25519 y expresa su identidad pública como:

```
did:key:z<base58-multicodec-pubkey>
```

El prefijo `z` indica codificación base58btc. El multicodec prefix para Ed25519 es `0xed01`. Ejemplo:

```
did:key:z6MkhaXgBZDvotDkL5257faiztiGiC2QtKLGpbnnEGta2doK
```

**Propiedades clave de `did:key`:**
- La clave pública Ed25519 está **embebida en el DID** — no hay PKI externa, no hay lookup de clave.
- Dado un DID `did:key:z...`, cualquier verificador puede derivar la clave pública en O(1) sin red.
- Los DIDs son self-sovereign — ninguna autoridad central los emite.

## Envelope y Autenticación

Cada mensaje FHS viaja dentro de un `Envelope`. La autenticación es **por frame**, no por sesión:

```protobuf
message Envelope {
  string message_id     = 1;  // UUID único — deduplicación en P2P
  string source_peer_id = 2;  // DID del emisor (did:key:z...)
  string dest_peer_id   = 3;  // DID del destino; vacío = broadcast
  int64  timestamp      = 4;  // Unix ms — anti-replay (±30 000 ms)
  string version        = 5;  // "1"
  bytes signature       = 6;  // Ed25519 sobre sha256(fields 1-5 + payload)
  oneof payload { ... }
}
```

### Cálculo de la Firma

```
firma = Ed25519.sign(
  privKey,
  sha256(
    message_id + ":" + source_peer_id + ":" + dest_peer_id + ":" +
    timestamp_str + ":" + hex(payload_proto_bytes)
  )
)
```

El receptor verifica:
1. `source_peer_id` es un `did:key:z...` bien formado → extrae clave pública.
2. Recalcula el hash con los campos del Envelope recibido.
3. Verifica la firma Ed25519 con la clave pública derivada del DID.
4. Verifica que `timestamp` esté dentro de la ventana ±30 000 ms (anti-replay).
5. Verifica que `message_id` no haya sido visto antes (deduplicación, opcional por nodo).

**No hay otro mecanismo de autenticación** — ni API key, ni JWT, ni CallerAuth (eliminado en DEC-0087).

## Generación de Claves

Para nodos persistentes (Star, Satellite, Nova, Atlas, Navigator):
```bash
# Generar par Ed25519 y codificar como did:key
openssl genpkey -algorithm Ed25519 -out node.pem
# El DID se deriva de la clave pública
```

Para Ephemeral Satellites (browser/móvil):
```typescript
// Web Crypto API — genera par efímero
const keyPair = await crypto.subtle.generateKey(
  { name: "Ed25519" },
  true,
  ["sign", "verify"]
);
// El DID se construye codificando la clave pública como did:key:z<base58btc(0xed01 + pubKeyBytes)>
```

## Seguridad de las Claves Privadas

> **Las claves privadas (`.pem`, `.key`) NUNCA se commitean en ningún repositorio.**
> `.gitignore` las excluye explícitamente. Son archivos del servidor, no del código.

Para Ephemeral Satellites, la clave puede persistir en `localStorage` o generarse por sesión — ver Decisiones Pendientes en `spec-native/specs/ephemeral-satellite/SPEC.md`.
