# Protocolo FHS v0.1

FHS significa **Federation of Sovereign Hosts** (Federación de Nodos Soberanos). Es un protocolo para que computadoras locales se descubran entre sí y compartan recursos de inteligencia artificial.

## Idea central

Una comunidad tiene varias computadoras:

- Una Mac mini con llama.cpp corriendo un modelo local.
- Una laptop con un servidor OCR.
- Una Raspberry Pi con otra herramienta.

Cada una de esas computadoras es un **nodo**. El protocolo FHS permite que esos nodos:

1. **Se registren** en un catálogo común.
2. **Anuncien** qué pueden hacer: generar texto, extraer texto de imágenes, etc.
3. **Sean descubiertos** por el chat.
4. **Sean usados** cuando el agente lo necesite.

## Las 10 reglas de FHS v0.1

### 1. Identidad verificable

Todo nodo se identifica con un identificador único:

```
did:key:macmini-raul
did:key:raspi-ocr-01
```

Para la prueba de concepto usamos nombres simples. En producción se usaría criptografía Ed25519.

### 2. Registro por arrendamiento (lease)

Un nodo no se registra una sola vez y se va. Debe renovar su registro periódicamente. Si no renueva en 30 segundos, el sistema lo marca como "perdido".

### 3. Heartbeat obligatorio

Mientras está vivo, el nodo envía un `ping` cada 10 segundos.

### 4. Servicios declarados

Un nodo dice explícitamente qué ofrece. El sistema no escanea puertos ni fuerza descubrimiento.

### 5. Capacidades, no implementaciones

No se pide "¿tienes Tesseract?". Se pide "¿tienes `document.ocr`?". Así se puede cambiar la implementación sin afectar al consumidor.

### 6. Resolución por ámbito (scope)

Cada petición lleva un ámbito de privacidad:

- `local` — solo mi máquina
- `network` — solo mi red local
- `community` — mi comunidad de confianza
- `external` — cualquier proveedor autorizado

### 7. Transparencia obligatoria

Cada respuesta del agente incluye su procedencia: qué modelo razonó, qué tool usó, qué datos viajaron y dónde.

### 8. Proveedor rechazable

El usuario puede vetar un proveedor específico. El sistema busca alternativas automáticamente.

### 9. Degradación graceful

Si no hay lo óptimo, se usa lo siguiente. Si no hay nada, se informa. Nunca se inventa una respuesta.

### 10. Registry observable, no controlador

El Registry solo sabe qué nodos existen y qué ofrecen. No ejecuta tools, no ve datos del usuario, no toma decisiones por el agente.

## Tipos de proveedores

En v0.1 hay dos tipos:

- **`llm`** — modelos de lenguaje compatibles con OpenAI API.
- **`mcp`** — servidores MCP con tools.

En el futuro se planean `embedding`, `storage`, `resource` y `agent`.

## Mensajes WebSocket

### Registro de nodo

```json
{
  "type": "hello",
  "providerId": "did:key:macmini-raul",
  "timestamp": 1719700000
}
```

Respuesta:

```json
{
  "type": "welcome",
  "registryId": "registry-001",
  "leaseSeconds": 30
}
```

### Publicar servicios

```json
{
  "type": "register",
  "providerId": "did:key:macmini-raul",
  "manifest": { /* ver manifiesto-llm.md o manifiesto-mcp.md */ },
  "timestamp": 1719700000
}
```

Respuesta:

```json
{
  "type": "registered",
  "leaseExpires": 1719700030,
  "acceptedServices": 2
}
```

### Heartbeat

```json
{ "type": "ping" }
```

Respuesta:

```json
{ "type": "pong", "timestamp": 1719700005 }
```

### Notificaciones del Registry

Cuando un nodo se conecta o se cae, el Registry notifica a los agentes:

```json
{
  "type": "node.online",
  "providerId": "did:key:raspi-ocr-01",
  "providerName": "OCR Raspberry Pi",
  "services": [
    { "kind": "mcp", "capabilities": ["document.ocr"] }
  ]
}
```

```json
{
  "type": "node.lost",
  "providerId": "did:key:raspi-ocr-01",
  "providerName": "OCR Raspberry Pi",
  "services": [
    { "kind": "mcp", "capabilities": ["document.ocr"] }
  ]
}
```

## Chat por WebSocket

El frontend se conecta a:

```
ws://<host>:8081/api/chat/ws
```

Envía:

```json
{
  "type": "start",
  "conversationId": "opcional",
  "message": { "role": "user", "content": "Extrae el texto de esta imagen" },
  "artifacts": ["data:image/png;base64,..."],
  "preferences": {
    "model": "auto",
    "scope": "community"
  }
}
```

Recibe eventos en tiempo real:

```json
{ "type": "agent.status", "data": { "status": "resolving-model", "message": "Buscando modelo..." } }
{ "type": "llm.selected", "data": { "providerId": "...", "providerName": "...", "modelId": "...", "reason": [...] } }
{ "type": "tool.selected", "data": { "capability": "document.ocr", "providerId": "...", "providerName": "..." } }
{ "type": "assistant.delta", "data": { "text": "El texto extraído es..." } }
{ "type": "assistant.completed", "data": { "provenance": { ... } } }
```
