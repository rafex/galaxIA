# Manifiesto de proveedor MCP

Un proveedor MCP (Model Context Protocol) expone tools que el agente puede invocar. También se publica con un manifiesto JSON.

## Ejemplo completo

```json
{
  "fhsVersion": "0.1",
  "provider": {
    "id": "did:key:raspi-ocr-01",
    "name": "OCR Raspberry Pi",
    "type": "mcp",
    "visibility": "community"
  },
  "endpoint": {
    "protocol": "mcp",
    "transport": "streamable-http",
    "url": "http://192.168.3.173:8082/mcp"
  },
  "capabilities": [
    {
      "id": "document.ocr",
      "name": "Extracción de texto",
      "inputMediaTypes": ["image/jpeg", "image/png", "application/pdf"],
      "languages": ["es", "en"]
    }
  ],
  "privacy": {
    "retention": "none"
  }
}
```

## Campos importantes

- `provider.id`: identificador único.
- `provider.type`: siempre `"mcp"`.
- `endpoint.protocol`: `"mcp"`.
- `endpoint.transport`: `"streamable-http"`.
- `endpoint.url`: URL del servidor MCP.
- `capabilities`: lista de capacidades que ofrece.
- `capabilities[].id`: identificador de la capacidad (ej. `document.ocr`).

## Tool expuesta por el servidor MCP

El servidor MCP debe responder a:

- `initialize`
- `notifications/initialized`
- `tools/list`
- `tools/call`

Ejemplo de tool:

```json
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
        "description": "Nombre del archivo, opcional (determina la extensión/tipo)"
      },
      "lang": {
        "type": "string",
        "description": "Idiomas OCR separados por + (default: spa+eng)"
      }
    },
    "required": ["file_base64"]
  }
}
```

> El nombre del parámetro es `file_base64`, no `image_base64` — la tool acepta tanto imágenes (`image/png`, `image/jpeg`) como PDF (`application/pdf`), ver `inputMediaTypes` del manifiesto arriba.

## Cómo enviar el manifiesto

```json
{
  "type": "register",
  "providerId": "did:key:raspi-ocr-01",
  "manifest": { /* ... el manifiesto ... */ },
  "timestamp": 1719700000
}
```

## Implementación de referencia

Revisa `examples/ocr-provider/` para ver la implementación de referencia en TypeScript — es un wrapper FHS, no un servidor MCP nativo (ver `docs/protocolo-provider.md`). Traduce `tool.call` (FHS WebSocket) a una petición REST contra `ether-ocr-api` (Tesseract por debajo), no implementa OCR propio.
