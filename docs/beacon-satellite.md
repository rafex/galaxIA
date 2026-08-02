# Beacon Satellite (proveedor de tools)

Un Satellite es el nodo de la red FHS que expone herramientas (capabilities) que Navigator
puede invocar durante una misión. Se une al swarm P2P publicando su Beacon en la DHT y
anunciándolo vía GossipSub (DEC-P2P-001).
El schema completo está en `schemas/beacon-satellite.schema.json`.

## Ejemplo completo

```json
{
  "fhsVersion": "1",
  "provider": {
    "id": "did:key:z6Mknq8Hk8RiACRSfkbHJbJUqtqc9W5JfHoS5JbCKBSZdJL",
    "name": "OCR Raspberry Pi",
    "type": "satellite",
    "visibility": "community"
  },
  "endpoint": {
    "url": "wss://192.168.3.173:8082",
    "multiaddr": "/ip4/192.168.3.173/tcp/8082/ws"
  },
  "capabilities": [
    {
      "id": "document.ocr",
      "name": "Extracción de texto",
      "description": "Extrae texto de imágenes y PDFs usando OCR (Tesseract)",
      "inputMediaTypes": ["image/jpeg", "image/png", "application/pdf"],
      "outputMediaTypes": ["text/plain"],
      "languages": ["es", "en"]
    }
  ],
  "privacy": {
    "retention": "none"
  }
}
```

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...`. Se firma con la clave privada del nodo.
- `provider.type`: siempre `"satellite"`.
- `provider.visibility`: acota en qué `scope` de `MissionOfferMessage` puede recibir bids — `"local"` / `"network"` / `"community"` / `"external"`.
- `endpoint.url`: WSS URL directa del Satellite (formato `^wss://`). Navigator abre el stream `/fhs/v1/0.1.0` post-assign.
- `endpoint.multiaddr`: Multiaddr libp2p publicado en el `DhtBeaconRecord` para conexión P2P directa.
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

```json
{
  "type": "tool.list.response",
  "missionId": "uuid-v4",
  "tools": [
    {
      "name": "ocr_extract",
      "description": "Extrae texto de una imagen o PDF",
      "inputSchema": {
        "type": "object",
        "properties": {
          "file_base64": {
            "type": "string",
            "description": "Archivo codificado en base64 (imagen o PDF)"
          },
          "lang": {
            "type": "string",
            "description": "Idiomas OCR separados por + (default: spa+eng)"
          }
        },
        "required": ["file_base64"]
      }
    }
  ]
}
```

## Referencia de schemas

- `schemas/beacon-satellite.schema.json` — schema completo del Beacon
- `idl/fhs-protocol.proto` — definición Protobuf de `DhtBeaconRecord` y mensajes GossipSub
