# Manifiesto Satellite (proveedor de tools)

Un Satellite es el nodo de la red FHS que expone herramientas (tools) que el agente Navigator
puede invocar durante una misión. Se registra ante el Atlas enviando su Beacon en el mensaje
`handshake` del protocolo FHS (DEC-0087).

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
    "url": "wss://192.168.3.173:8082/register",
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

El schema completo está en `schemas/beacon-satellite.schema.json`.

## Campos importantes

- `provider.id`: DID Ed25519 del nodo en formato `did:key:z...` (DEC-0030).
- `provider.type`: siempre `"satellite"`.
- `endpoint.url`: FHS WebSocket URL del Satellite (donde Navigator conecta para misiones).
- `endpoint.multiaddr`: Multiaddr para conexión P2P directa (DEC-0086).
- `capabilities[].id`: identificador de la capability (ej. `document.ocr`).
- `capabilities[].inputMediaTypes`: media types aceptados como entrada.
- `capabilities[].outputMediaTypes`: media types que produce la capability.

## Cómo registrarse (protocolo FHS, DEC-0087)

El Satellite conecta al Atlas por WebSocket y envía un `handshake`:

```
WebSocket: wss://atlas-host:8081/register
Sec-WebSocket-Protocol: fhs.v1
```

Primer mensaje (dentro de un Envelope firmado):

```json
{
  "messageId": "uuid-v4",
  "sourcePeerId": "did:key:z6Mknq8Hk8RiACRSfkbHJbJUqtqc9W5JfHoS5JbCKBSZdJL",
  "timestamp": 1722620400000,
  "version": "1",
  "signature": "base64-ed25519...",
  "type": "handshake",
  "fhsVersion": "1",
  "listenAddrs": ["/ip4/192.168.3.173/tcp/8082/ws"],
  "beacon": { "...": "el manifiesto completo de arriba" }
}
```

## Tool expuesta al Navigator

Cuando Navigator envía `tool.list` al Satellite, este responde con la definición de cada tool
en formato JSON Schema. Ejemplo de `tool.list.response` para el OCR:

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
          "filename": {
            "type": "string",
            "description": "Nombre del archivo (determina la extensión/tipo)"
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

> El nombre del parámetro es `file_base64`, no `image_base64` — la tool acepta tanto imágenes
> (`image/png`, `image/jpeg`) como PDF (`application/pdf`), ver `inputMediaTypes` del Beacon.

## Implementación de referencia

Ver `examples/satellite-ocr-example/` — es un wrapper FHS que recibe `tool.call` por WebSocket
y llama a `ether-ocr-api` (Tesseract por debajo) vía REST. No implementa OCR propio.

La implementación del Satellite define el comportamiento de su backend (Tesseract, una API REST
externa, un script local, etc.). El protocolo FHS no dicta cómo se implementa la capability,
solo cómo se anuncia (Beacon) y cómo se invoca (`tool.call` → `tool.result`).
