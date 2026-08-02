# FHS Protocol IDL

Definiciones formales del protocolo de mensajería de **Federation of Sovereign Horizons (FHS)**.

---

## Qué hay aquí y por qué 4 formatos

El protocolo FHS tiene capas distintas que cada formato IDL describe mejor:

| Archivo | Formato | Autoritativo para |
|---------|---------|-------------------|
| [`fhs-protocol.proto`](fhs-protocol.proto) | Protobuf proto3 | Definición binaria canónica de todos los mensajes. Genera código en cualquier lenguaje con `protoc`. |
| [`asyncapi.yaml`](asyncapi.yaml) | AsyncAPI 3.0 | Canales WebSocket, direcciones de mensajes, framing y negociación de subprotocolo. |
| [`openapi.yaml`](openapi.yaml) | OpenAPI 3.1 | Endpoints REST de Atlas y Navigator (health, discovery, métricas). |
| [`framing.md`](framing.md) | Markdown | Especificación del framing LPP (Length-Prefix Protocol) para el modo binario. |
| [`flows.md`](flows.md) | Markdown + Mermaid | Diagramas de secuencia de los 5 flujos principales del protocolo. |
| [`../schemas/`](../schemas/) | JSON Schema draft-07 | Schemas de los manifiestos Beacon por tipo de nodo. |

---

## Por dónde empezar según tu objetivo

### Implementar un provider (Star o Satellite)

1. Lee [`../docs/manifiesto-llm.md`](../docs/manifiesto-llm.md) o [`../docs/manifiesto-mcp.md`](../docs/manifiesto-mcp.md) para el formato del Beacon.
2. Valida tu Beacon contra [`../schemas/beacon-star.schema.json`](../schemas/beacon-star.schema.json) o [`../schemas/beacon-satellite.schema.json`](../schemas/beacon-satellite.schema.json).
3. Lee el flujo de registro en [`flows.md`](flows.md) — diagrama 1 (Handshake 2-step, DEC-0087).
4. Genera los tipos de mensaje desde [`fhs-protocol.proto`](fhs-protocol.proto) con `protoc` para tu lenguaje.
5. Consulta [`asyncapi.yaml`](asyncapi.yaml) para el canal `/register` y el framing `fhs.v1`.

### Implementar un cliente (Portal o herramienta de desarrollo)

1. Lee el flujo de chat en [`flows.md`](flows.md) — diagrama 2 (Misión de Chat).
2. Los mensajes del canal Portal↔Navigator están en [`asyncapi.yaml`](asyncapi.yaml) (canales `/chat` y `/chat/stream`).
3. Los tipos Protobuf correspondientes son `AgentStartMessage`, `AssistantDeltaMessage`, `AssistantCompletedMessage`, etc. en [`fhs-protocol.proto`](fhs-protocol.proto).

### Consultar providers disponibles (integración REST)

1. Lee [`openapi.yaml`](openapi.yaml) — endpoints `GET /api/fhs/providers` y `GET /api/fhs/models`.
2. Para bootstrap de Atlas federados: `GET /api/fhs/atlas/peers`.

### Verificar un Beacon recibido

Usa uno de los 4 schemas en [`../schemas/`](../schemas/). El campo `provider.type` determina cuál usar:

| `provider.type` | Schema |
|-----------------|--------|
| `"star"` | [`beacon-star.schema.json`](../schemas/beacon-star.schema.json) |
| `"satellite"` | [`beacon-satellite.schema.json`](../schemas/beacon-satellite.schema.json) |
| `"nova"` | [`beacon-nova.schema.json`](../schemas/beacon-nova.schema.json) |
| `"multi"` | [`beacon-base.schema.json`](../schemas/beacon-base.schema.json) |

---

## Generar código desde el Protobuf

```bash
# Go
protoc --go_out=. --go-grpc_out=. fhs-protocol.proto

# TypeScript (via ts-proto)
protoc --plugin=protoc-gen-ts_proto --ts_proto_out=. fhs-protocol.proto

# Python
protoc --python_out=. fhs-protocol.proto

# Rust (via tonic-build, en build.rs)
tonic_build::compile_protos("idl/fhs-protocol.proto")?;
```

El package proto es `fhs.v1`. La opción `go_package` apunta a `github.com/rafex/galaxIA/idl/fhs/v1`.

---

## Modos de transporte

El protocolo soporta dos modos negociados vía `Sec-WebSocket-Protocol`:

| Modo | Header | Frames | Uso |
|------|--------|--------|-----|
| Binario (primario) | `fhs.v1` | binary + LPP + Protobuf | P2P, producción |
| JSON (compat) | `fhs.v1.json` | text + JSON | desarrollo, herramientas |

El framing LPP (`[varint-length][Envelope bytes]`) está especificado en [`framing.md`](framing.md).

---

## Versiones

| Artefacto | Versión | DECs relacionadas |
|-----------|---------|-------------------|
| `fhs-protocol.proto` | v2 | DEC-0086, DEC-0087 |
| `asyncapi.yaml` | 0.3.0 | DEC-0086, DEC-0087 |
| `openapi.yaml` | 0.2.0 | DEC-0086 |
| Beacon schemas | 1.0 | DEC-0072 (OVERLOADED) |

Historial de decisiones: [`../spec-native/DECISIONS.md`](../spec-native/DECISIONS.md)
