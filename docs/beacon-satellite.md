# Beacon Satellite (proveedor de tools)

Un Satellite es el nodo de la red FHS que expone herramientas (capabilities) que Navigator
puede invocar durante una misión. Se une al swarm P2P publicando su Beacon Protobuf en la
DHT y anunciándolo vía GossipSub (DEC-P2P-001).
La definición wire canónica está en `idl/fhs-protocol.proto`; el schema JSON es solo
validación documental.

## Ejemplo completo

```protobuf
Beacon {
  fhs_version: "1"
  provider: { id: "did:key:z...", name: "OCR Raspberry Pi", type: PROVIDER_TYPE_SATELLITE, visibility: VISIBILITY_COMMUNITY }
  endpoint: { multiaddr: "/ip4/192.168.3.173/tcp/8444/p2p/<peerId>" }
  capabilities: { id: "document.ocr", name: "Extracción de texto", description: "Extrae texto de imágenes y PDFs usando OCR", input_media_types: "image/jpeg", input_media_types: "image/png", input_media_types: "application/pdf", output_media_types: "text/plain", languages: "es", languages: "en" }
  privacy: { retention: RETENTION_NONE }
}
```

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...`. Se firma con la clave privada del nodo.
- `provider.type`: siempre `"satellite"`.
- `provider.visibility`: acota en qué `scope` de `MissionOfferMessage` puede recibir bids — `"local"` / `"network"` / `"community"` / `"external"`.
- `endpoint.multiaddr`: Única dirección libp2p normativa publicada en el `DhtBeaconRecord`. Navigator abre el stream `/fhs/v1/0.1.0` post-assign mediante esta dirección.
- `capabilities[].id`: identificador de la capability (ej. `document.ocr`). Navigator filtra providers por este campo en `MissionOfferMessage.requiredCapabilities`.
- `capabilities[].inputMediaTypes`: media types aceptados como entrada.
- `capabilities[].outputMediaTypes`: media types que produce la capability.
- `privacy.retention`: obligatorio. Qué hace el Satellite con los datos recibidos.

## Cómo unirse al swarm P2P (DEC-P2P-001)

```
1. Conectar a bootstrap peer (Atlas u otro conocido)
2. Kademlia Join → publicar DhtBeaconRecord { did, beacon, multiaddrs, expiresAt, signature }
3. Suscribir a fhs/v1/nodes/advertise, fhs/v1/missions/offer y fhs/v1/missions/assign
4. Publicar NodeAdvertiseMessage cada 30s (TTL 60s)
5. Al recibir MissionOfferMessage con requiredCapabilities que se pueden satisfacer → publicar MissionBidMessage
6. Si se recibe MissionAssignMessage con nuestro DID → aceptar stream /fhs/v1/0.1.0 del Navigator
```

Ver `protocol/p2p.md` y `idl/gossipsub.md` para el flujo completo.

## Tool expuesta al Navigator (post-assign)

Cuando Navigator abre el stream directo post-assign, puede enviar `tool.list` para obtener el schema de cada tool:

```protobuf
ToolListResponse {
  mission_id: "uuid-v4"
  tools: {
    name: "ocr_extract"
    description: "Extrae texto de una imagen o PDF"
    input_schema: {
      properties: {
        name: "file"
        description: "Referencia ArtifactRef inline o IPFS"
      }
      properties: {
        name: "lang"
        description: "Idiomas OCR separados por + (default: spa+eng)"
      }
      required: "file"
    }
  }
}
```

## Referencia de schemas

- `idl/fhs-protocol.proto` — `Beacon` y `CapabilityDescriptor` wire
- `idl/fhs-protocol.proto` — definición Protobuf de `DhtBeaconRecord` y mensajes GossipSub
