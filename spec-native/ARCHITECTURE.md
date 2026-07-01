# ARCHITECTURE.md

## Visión general

FHS es un protocolo para descubrir, autenticar, seleccionar y consumir capacidades de IA distribuidas entre nodos soberanos. La implementación del MVP consta de un chat web, un agente backend y un protocolo compartido. El backend descubre proveedores locales o comunitarios, selecciona un modelo LLM, invoca tools MCP cuando el modelo las solicita y devuelve la respuesta al usuario con transparencia total de procedencia.

## Módulos principales

### `packages/fhs-protocol`
- **Responsabilidad:** definir los contratos del protocolo FHS v0.1.
- **Inputs:** manifiestos de proveedores, mensajes WebSocket.
- **Outputs:** tipos TypeScript, esquemas de manifiesto, mensajes de registro.
- **Límites:** no contiene lógica de red ni runtime. Solo contratos.

### `apps/agent-server`
- **Responsabilidad:** host del agente. Expone API REST + WebSocket para chat, mantiene el Registry embebido y ejecuta el ciclo del agente. Es el orquestador central: toda comunicación con proveedores pasa por él.
- **Inputs:** mensajes del chat vía WebSocket, registro de nodos vía FHS WebSocket, preferencias de privacidad.
- **Outputs:** eventos tipados FHS al frontend, llamadas a LLM vía FHS WebSocket, invocación de tools MCP.
- **Límites:** no ejecuta directamente el OCR ni el modelo; delega a proveedores externos registrados en el Registry.

#### Submódulos internos

- **`registry/`**: mantiene el catálogo de nodos y servicios en memoria (MemoryRegistryStore), gestiona leases (30s) y heartbeats (10s) por WebSocket en `/fhs/v1/ws`. Expone `getProviders(type)` para que el runtime resuelva LLM y tools.
- **`agent/`**: ejecuta el ciclo del agente: clasificar intención, resolver LLM desde Registry, resolver tools MCP desde Registry, generar vía LlmGateway, ejecutar tools vía McpHost, responder con procedencia.
- **`providers/llm-gateway.ts`**: **habla exclusivamente el protocolo FHS.** Abre un WebSocket al LLM provider y envía `chat.request` con el `GenerateRequest`. Recibe `chat.delta` (streaming) y `chat.completed` (respuesta final). No conoce OpenAI API. El provider LLM es un nodo FHS completo (`examples/llm-provider/`) que traduce `chat.request` → llama.cpp internamente. Esto permite demostrar el protocolo end-to-end.
- **`providers/mcp-host.ts`**: mantiene clientes MCP contra servidores de tools. Carga tools por capability, ejecuta y extrae resultados.
- **`api/`**: endpoints REST (`/api/fhs/providers`, `/api/fhs/models`) y WebSocket (`/api/chat/ws` para chat, `/fhs/v1/ws` para Registry).
- **`sse/`**: bus de eventos (`EventBus`) que distribuye eventos tipados FHS a los runtimes y al frontend.

### `apps/web`
- **Responsabilidad:** interfaz de chat. Permite enviar mensajes, adjuntar archivos, elegir modelo y ámbito de privacidad, y ver actividad/procedencia del agente.
- **Inputs:** teclado, archivos, selección de usuario.
- **Outputs:** llamadas a la API REST, suscripción SSE.
- **Límites:** no conecta directamente a nodos; todo pasa por `agent-server`.

## Flujo principal

1. El usuario envía un mensaje desde `apps/web` vía WebSocket a `/api/chat/ws`.
2. `agent-server` recibe el mensaje y el Agent Runtime clasifica las capacidades necesarias.
3. El runtime consulta al Registry (`getProviders("llm")`) y resuelve el mejor LLM (prefiere tool calling nativo).
4. El runtime consulta al Registry (`getProviders("mcp")`) y resuelve tools MCP candidatas.
5. El LlmGateway **abre un WebSocket FHS** al LLM provider (`chat.request`) con historial + tools.
6. Si el LLM responde con tool calls, el runtime:
   - verifica permisos con el policy engine,
   - resuelve el proveedor MCP desde el Registry,
   - ejecuta la tool vía McpHost,
   - reinyecta el resultado en el LLM con una segunda llamada FHS.
7. El LLM genera la respuesta final (`chat.completed`) y el runtime emite `assistant.delta` + `assistant.completed` al frontend vía EventBus.
8. El frontend muestra la respuesta junto con su procedencia completa (qué LLM, qué tools, qué datos viajaron).

### Protocolo FHS en la capa LLM

```
Agent Runtime          LlmGateway           LLM Provider (FHS node)      llama.cpp
     │                     │                        │                      │
     │ generate(sel, req)  │                        │                      │
     ├────────────────────►│                        │                      │
     │                     │ WebSocket FHS          │                      │
     │                     │ chat.request ─────────►│                      │
     │                     │                        │ HTTP /chat/completions
     │                     │                        ├─────────────────────►│
     │                     │                        │◄─────────────────────┤
     │                     │◄── chat.delta ─────────┤                      │
     │                     │◄── chat.completed ─────┤                      │
     │◄────────────────────┤                        │                      │
```

El Agent Server no conoce la API de llama.cpp. Solo habla FHS. El provider LLM (`examples/llm-provider/`) es el único que traduce FHS → HTTP internamente.

## Restricciones

- **Dependencias prohibidas:** el frontend no puede llamar directamente a proveedores LLM o MCP; todo debe pasar por `agent-server`.
- **Acoplamientos a evitar:** el runtime no debe conocer implementaciones concretas de LLM ni de tools. Solo usa adaptadores.
- **Límites de infraestructura:** v0.1 asume red local o comunidad de confianza. NAT traversal y DHT quedan para versiones posteriores.
- **DID simplificado:** en la PoC se usa `did:key:<nombre-simple>` sin criptografía. Esto es deuda técnica documentada en `DECISIONS.md`.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un modelo local no soporta tool calling nativo | Alto | Implementar degradación graceful: prompt-template o ejecución manual |
| Nodo MCP se desconecta durante una conversación | Medio | Registry detecta la caída por lease y el runtime busca alternativa |
| El Registry embebido se convierte en cuello de botella | Medio | Documentar separación como tarea pendiente v0.2 |
| Usuario espera latencia de nube en hardware viejo | Medio | Mostrar tiempos y proveedores; establecer expectativas en la demo |
