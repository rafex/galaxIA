# FHS Framing Specification

**Versión:** 1.0  
**DEC:** DEC-0086  
**Fecha:** 2026-08-02

## Contexto

El protocolo FHS puede operar en dos modos sobre un WebSocket:

| Modo | `Sec-WebSocket-Protocol` | Frame type | Formato |
|------|--------------------------|------------|---------|
| **Primario** (P2P) | `fhs.v1` | binary | LPP + Protobuf |
| **Compat** (JSON) | `fhs.v1.json` | text | JSON plano |

Si el cliente no envía el header de subprotocolo, el servidor elige el modo por defecto
(JSON compat para compatibilidad con implementaciones anteriores a DEC-0086).

---

## LPP — Length-Prefix Protocol (modo binario)

Cada frame WebSocket binary contiene exactamente **un mensaje FHS**:

```
┌──────────────────────────────────────────────────────┐
│  varint (1-10 bytes)  │  FhsMessage bytes             │
│  byte-length del body │  proto3 serializado           │
└──────────────────────────────────────────────────────┘
```

### Varint encoding

Usa la codificación varint estándar de Protocol Buffers (little-endian base-128):

- Valores 0–127: 1 byte (`0xxxxxxx`)
- Valores 128–16383: 2 bytes (`1xxxxxxx 0xxxxxxx`)
- Máximo: 10 bytes (suficiente para un `uint64`)

El varint codifica el número de bytes del `FhsMessage` serializado que sigue inmediatamente.

### Longitud máxima de frame

**16 MiB** (16 × 1024 × 1024 = 16 777 216 bytes).

Un receptor que reciba un frame con varint > 16 MiB DEBE cerrar la conexión con código
WebSocket `1009` (Message Too Big) y emitir un `ErrorMessage` con código `INTERNAL_ERROR`
antes de cerrar (si el estado de la sesión lo permite).

### Ejemplo — frame mínimo (PingMessage)

`PingMessage` serializado en proto3 tiene 0 bytes (mensaje vacío).  
`FhsMessage` con `ping` en el oneof serializa como:

```
field 17 (ping), wire type 2 (length-delimited), length 0 → 0x8A 0x01 0x00
```

Frame LPP completo: `03 8A 01 00` (varint `3`, luego los 3 bytes del FhsMessage).

---

## Negotiation flow

```
Client → Server:   GET /register HTTP/1.1
                   Upgrade: websocket
                   Sec-WebSocket-Protocol: fhs.v1, fhs.v1.json

Server → Client:   HTTP/1.1 101 Switching Protocols
                   Sec-WebSocket-Protocol: fhs.v1
```

Si el servidor elige `fhs.v1`, todos los frames subsecuentes son binary + LPP.  
Si elige `fhs.v1.json`, todos los frames son text + JSON (modo compat).  
El servidor NO DEBE mezclar modos en una misma conexión.

---

## Modo JSON compat

En modo `fhs.v1.json`, el frame WebSocket es **text** y el contenido es un objeto JSON:

```json
{ "type": "hello", "providerId": "did:key:z...", "timestamp": 1722620400000, ... }
```

El campo `type` es el discriminador equivalente al `oneof` de `FhsMessage`.
La tabla de equivalencias está en `idl/fhs-protocol.proto` (comentarios de cada mensaje).

---

## Implementación en distintos transportes

El framing LPP es deliberadamente independiente del transporte WebSocket.
El mismo esquema funciona sobre:

| Transporte | Notas |
|-----------|-------|
| WebSocket binary | Frame WebSocket = 1 mensaje LPP |
| TCP stream | Lectura continua; parsear varint, leer N bytes, repetir |
| QUIC stream | Igual que TCP; QUIC ofrece multiplexado nativo de streams |
| libp2p stream | Protocolo `/fhs/1.0.0`; misma codificación LPP |
| Unix socket | Para comunicación local Navigator↔Atlas en mismo host |

---

## Versión del protocolo en FhsMessage

El campo `version` (field 22, `string`, fuera del `oneof payload`) en `FhsMessage`
identifica la versión del protocolo usada por quien emite el frame. Valor esperado: `"1"`.

Este campo complementa la negociación de `fhsVersion` en `hello`/`welcome`:
- `fhsVersion` (en `hello`/`welcome`): versión del protocolo que soporta el nodo.
- `FhsMessage.version`: versión usada en este frame específico (para debugging y routing).

Receptores que no reconozcan la versión DEBEN ignorar el frame (forward compat).

---

## Referencias

- `idl/fhs-protocol.proto` — definición completa de `FhsMessage` y todos los tipos
- `idl/asyncapi.yaml` — canales, mensajes y bindings WebSocket
- `spec-native/DECISIONS.md` DEC-0086 — decisión arquitectónica completa
