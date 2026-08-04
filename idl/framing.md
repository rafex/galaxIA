# FHS Framing Specification

**Versión:** 1.0

**DEC:** DEC-0086 y DEC-0090

**Fecha:** 2026-08-03

## Alcance

FHS opera exclusivamente sobre un stream libp2p negociado con el protocolo
`/fhs/v1/0.1.0`. No existe un binding web, un modo JSON ni una negociación
alternativa. Portal, Navigator y cada provider son peers libp2p.

## LPP — Length-Prefix Protocol

Cada frame del stream contiene exactamente un `Envelope` FHS serializado como
Protobuf:

```text
┌──────────────────────────────────────────────────────┐
│  varint (1-10 bytes)  │  Envelope bytes               │
│  byte-length del body │  proto3 serializado           │
└──────────────────────────────────────────────────────┘
```

El varint usa la codificación estándar de Protocol Buffers (little-endian
base-128): valores 0–127 ocupan un byte; el máximo es 10 bytes para `uint64`.
La longitud codificada es el número exacto de bytes del `Envelope` que sigue.

## Longitud máxima

El límite de un frame es **16 MiB** (`16 777 216` bytes). Un receptor que
reciba un valor mayor debe cerrar el stream y emitir `ErrorMessage` con
`INTERNAL_ERROR` cuando el estado de la sesión lo permita.

## Ejemplo — frame mínimo

`PingMessage` serializado en proto3 tiene 0 bytes. Un `Envelope` con `ping` en
el oneof serializa como:

```text
field 12 (ping), wire type 2, length 0 → 0x62 0x00
```

Frame LPP completo:

```text
02 62 00
```

## Apertura del stream

```text
Peer A → Peer B: dial multiaddr libp2p
Peer A → Peer B: negociar /fhs/v1/0.1.0
Peer A → Peer B: Envelope(handshake)
Peer B → Peer A: Envelope(handshake_ack)
```

Todos los frames posteriores siguen siendo Protobuf binario con LPP. Los peers
no deben enviar texto ni cambiar de codec durante un stream activo.

## Validación del frame

El receptor debe:

1. Leer el varint sin aceptar overflow.
2. Rechazar longitudes mayores a 16 MiB.
3. Leer exactamente la cantidad indicada de bytes.
4. Deserializar un `Envelope` Protobuf válido.
5. Verificar `source_peer_id`, `dest_peer_id`, `timestamp`, versión y firma.
6. Despachar el payload del `oneof` solo después de validar el Envelope.

Un cierre de stream no sustituye un error tipado si aún es posible enviar el
`ErrorMessage` correspondiente.

## Versión en Envelope

El campo `version` (field 5) identifica la versión FHS usada por el frame. El
valor actual es `"1"` y complementa `fhsVersion` de `handshake` y
`handshake_ack`. Un peer que no soporte la versión debe rechazar el handshake
con `UNSUPPORTED_VERSION`; no debe degradar a otro transporte o codec.

## Referencias

- `idl/fhs-protocol.proto` — definición canónica de `Envelope` y payloads.
- `idl/asyncapi.yaml` — canales lógicos sobre libp2p y tópicos GossipSub.
- `docs/transport.md` — regla libp2p-only y topología de transporte.
