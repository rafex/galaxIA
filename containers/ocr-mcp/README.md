# OCR MCP Provider

Servidor MCP mínimo que expone la tool `ocr_extract` para extraer texto de imágenes usando Tesseract.

## Variables de entorno

| Variable | Descripción | Default |
|---|---|---|
| `PORT` | Puerto HTTP del servidor MCP | `8082` |
| `REGISTRY_URL` | WebSocket del Registry FHS | `ws://agent-server:8081/fhs/v1/ws` |
| `PROVIDER_ID` | DID del proveedor | `did:key:ocr-container-01` |
| `PROVIDER_NAME` | Nombre legible | `OCR Container` |

## Endpoints

- `POST /mcp` — JSON-RPC MCP (initialize, tools/list, tools/call)

## Tool `ocr_extract`

Input:
```json
{
  "image_base64": "data:image/png;base64,iVBORw0KGgo..."
}
```

Output:
```json
{
  "content": [
    {"type": "text", "text": "texto extraído..."}
  ]
}
```
