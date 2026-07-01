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
  "description": "Extrae texto de una imagen",
  "inputSchema": {
    "type": "object",
    "properties": {
      "image_base64": {
        "type": "string",
        "description": "Imagen codificada en base64"
      }
    },
    "required": ["image_base64"]
  }
}
```

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

Revisa `containers/ocr-mcp/ocr_server.py` para ver un servidor MCP mínimo en Python con OCR basado en Tesseract.
