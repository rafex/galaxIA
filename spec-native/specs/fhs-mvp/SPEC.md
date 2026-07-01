# SPEC-FHS-0001 — MVP FHS v0.1: ChatGPT Comunitario

## Estado

`active`

## Owner

Raúl Fletes (rafex)

## Problema

No existe un protocolo sencillo para que una comunidad federe modelos de lenguaje (LLM) y herramientas (MCP) entre equipos locales o viejas computadoras. Hoy, usar IA útil significa enviar datos a la nube. Queremos demostrar que con hardware reutilizado y un protocolo común se puede construir un chat comunitario distribuido.

## Alcance

### Dentro del alcance

- Definir el protocolo FHS v0.1 con reglas de identidad, registro, descubrimiento y selección.
- Implementar un Registry embebido en el Agent Backend usando SQLite + WebSocket.
- Implementar un Agent Runtime que coordine LLM + tools MCP.
- Implementar un adaptador OpenAI-compatible para modelos locales (llama.cpp).
- Implementar un cliente MCP para invocar tools remotas.
- Implementar un frontend web con chat, panel de actividad y provenance card.
- Preparar una demo donde un nodo OCR se apaga y el sistema usa automáticamente otro nodo OCR.

### Fuera del alcance

- Autenticación de usuarios (se pausa `SPEC-AUTH-0001`).
- Descubrimiento descentralizado real (DHT/mDNS) en v0.1.
- NAT traversal.
- Proveedores de tipo `embedding`, `storage`, `resource`, `agent` (solo se documentan).
- Firma criptográfica real (se usa DID simplificado).

## Criterios de aceptación

1. Un usuario puede abrir `apps/web`, escribir un mensaje y recibir una respuesta.
2. El agente puede resolver un LLM local (`llm` provider) y un OCR remoto (`mcp` provider).
3. El frontend muestra en tiempo real: modelo seleccionado, tools en ejecución y procedencia.
4. Si el nodo OCR seleccionado se desconecta, el agente encuentra otro automáticamente.
5. Cada respuesta final incluye provenance: modelo, proveedor de tool, datos enviados, retención declarada.
6. El protocolo define 10 reglas formales y dos manifiestos: `llm` y `mcp`.
7. Todo corre localmente en una o varias máquinas de la misma red.

## Arquitectura de despliegue

```
Máquina de la ponencia
├── localhost:3000    apps/web (Vite + vanilla TS)
├── localhost:8080    apps/agent-server (Fastify + Registry + Runtime)
└── localhost:43110   llama.cpp / llama-server (nodo LLM)

Nodos remotos (misma red local)
├── Laptop FARO 02    OCR MCP + cliente FHS WS
└── Raspberry Pi X    OCR MCP + cliente FHS WS
```

## Las 10 reglas del protocolo FHS v0.1

1. **Identidad verificable:** todo proveedor se identifica con `did:key:<nombre-simple>`.
2. **Registro por arrendamiento (lease):** el nodo debe renovar su registro antes de que expire.
3. **Heartbeat obligatorio:** ping/pong periódico para detectar caídas rápido.
4. **Servicios declarados:** el nodo publica explícitamente qué ofrece; no hay escaneo.
5. **Capacidades, no implementaciones:** se pide `document.ocr`, no "Tesseract".
6. **Resolución por scope:** local, network, community, external.
7. **Transparencia obligatoria:** cada respuesta incluye provenance.
8. **Proveedor rechazable:** el usuario puede vetar un proveedor.
9. **Degradación graceful:** si falta lo óptimo, se degrada; si no hay nada, se informa.
10. **Registry observable, no controlador:** solo cataloga y notifica; no ejecuta ni decide.

## Tecnologías

- TypeScript 5.x
- Node.js >= 20
- Vite (frontend)
- Fastify (backend)
- SQLite (Registry)
- WebSocket (registro + heartbeat)
- SSE (streaming al frontend)
- MCP SDK oficial
- llama.cpp / llama-server

## Diseño

### Manifiesto LLM

```typescript
{
  fhsVersion: "0.1",
  provider: {
    id: "did:key:macmini-raul",
    name: "Mac mini de Raúl",
    type: "llm",
    visibility: "community"
  },
  endpoint: {
    protocol: "openai-compatible",
    url: "http://192.168.1.50:43110/v1"
  },
  models: [
    {
      id: "qwen2.5-coder-3b",
      displayName: "Qwen 2.5 Coder 3B",
      capabilities: ["chat", "tool.calling"],
      contextWindow: 4096,
      toolCalling: { supported: true, format: "openai" }
    }
  ]
}
```

### Manifiesto MCP

```typescript
{
  fhsVersion: "0.1",
  provider: {
    id: "did:key:raspi-ocr-01",
    name: "OCR comunitario",
    type: "mcp",
    visibility: "community"
  },
  endpoint: {
    protocol: "mcp",
    transport: "streamable-http",
    url: "http://192.168.1.51:8082/mcp"
  },
  capabilities: [
    {
      id: "document.ocr",
      name: "Extracción de texto",
      inputMediaTypes: ["image/jpeg", "image/png", "application/pdf"]
    }
  ]
}
```

### Ciclo del agente

```
usuario
  ↓
classify intent → capacidades necesarias
  ↓
resolve LLM
  ↓
resolve tools candidatas
  ↓
LLM.generate(messages, tools)
  ↓
¿tool_calls?
  Sí  → authorize → resolve MCP provider → execute → feed result → repetir
  No  → final answer + provenance
```

## Riesgos y mitigaciones

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Modelo local no hace tool calling | Alto | Degradación graceful a prompt-template |
| Nodo MCP desconectado en medio de ejecución | Medio | Registry detecta por lease; runtime busca fallback |
| Latencia alta en hardware viejo | Medio | Mostrar tiempos y establecer expectativas en la demo |
| WebSocket cae durante la demo | Medio | Reconexión automática en el cliente FHS de cada nodo |

## Enlaces y mejoras futuras

- IPFS para compartir artefactos sin exponer origen (ver `DEC-0008`).
- Separar Registry del Agent Backend en v0.2.
- Implementar identidad Ed25519 real.
- Añadir tipos de proveedor `embedding`, `storage`, `resource`, `agent`.

## Tareas relacionadas

- TASK-FHS-0001 a TASK-FHS-0011 en `spec-native/tasks/fhs-mvp/TASKS.md`

## Decisiones relacionadas

- DEC-0001 a DEC-0006 en `spec-native/DECISIONS.md`

## Notas

- La spec `SPEC-AUTH-0001` se pausa temporalmente mientras se completa este MVP.
- El DID simplificado es deuda técnica aceptada para la PoC; se migrará a Ed25519 en v0.2.
