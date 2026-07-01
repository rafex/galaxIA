# TASKS.md — Iniciativa fhs-mvp

## Especificación relacionada

- `spec-native/specs/fhs-mvp/SPEC.md` (SPEC-FHS-0001)

## Tareas

### TASK-FHS-0001 — Crear estructura del monorepo

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Crear carpetas y archivos base de `apps/web`, `apps/agent-server` y `packages/fhs-protocol`. Incluye `package.json`, `tsconfig.json`, `vite.config.ts` e `index.html`.
- **Criterios de aceptación:**
  - Estructura de carpetas existe y es consistente con `ARCHITECTURE.md`.
  - Cada paquete/app tiene su `package.json` con scripts de desarrollo.
  - TypeScript compila sin errores básicos.

### TASK-FHS-0002 — Definir contratos del protocolo FHS v0.1

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Implementar en `packages/fhs-protocol` los tipos compartidos: manifiestos LLM/MCP, mensajes WebSocket, tipos de eventos SSE, constantes del protocolo.
- **Criterios de aceptación:**
  - Existe `manifest.ts` con `LlmProviderManifest`, `McpProviderManifest` y `MultiProviderManifest`.
  - Existe `messages.ts` con tipos `HelloMessage`, `RegisterMessage`, `RegisteredMessage`, `PingMessage`, `PongMessage`, `NodeLostMessage`, `NodeOnlineMessage`, `NodeUpdatedMessage`.
  - Existe `types.ts` con `ProviderType`, `ServiceStatus`, `PrivacyScope`, `ModelInfo`, `Capability`.
  - Existe `constants.ts` con `FHS_VERSION`, `DEFAULT_LEASE_SECONDS`, `HEARTBEAT_INTERVAL_SECONDS`.

### TASK-FHS-0003 — Implementar Registry embebido

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** En `apps/agent-server/src/registry/`, implementar SQLite schema, handler WebSocket, lógica de lease, heartbeat y notificación a Agent Runtimes.
- **Criterios de aceptación:**
  - Un nodo puede conectarse por WebSocket y registrarse.
  - El Registry almacena nodo, servicios y modelos en SQLite.
  - El nodo debe renovar antes de que expire el lease.
  - Si un nodo no renueva en `leaseSeconds`, se marca como `lost` y se emite `node.lost`.
  - Existen endpoints REST `/api/fhs/nodes`, `/api/fhs/providers`, `/api/fhs/models`, `/api/fhs/capabilities`.

### TASK-FHS-0004 — Implementar LLM Gateway

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Adaptador OpenAI-compatible para conectar con `llama.cpp` / `llama-server`. Soportar generación y streaming.
- **Criterios de aceptación:**
  - Recibe un `LlmProvider` y un `GenerateRequest`.
  - Devuelve `GenerateResponse` con `message` y opcionalmente `toolCalls`.
  - Soporta streaming de tokens vía SSE interno.
  - Detecta si el modelo declara `tool.calling` nativo o requiere prompt-template.

### TASK-FHS-0005 — Implementar MCP Host

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Cliente MCP que se conecta a un servidor MCP remoto, lista tools, carga esquemas y ejecuta llamadas.
- **Criterios de aceptación:**
  - Dado un `McpProvider`, puede listar tools disponibles.
  - Puede cargar esquemas JSON de tools.
  - Puede ejecutar una tool con argumentos y devolver el resultado.
  - Maneja errores de conexión y proveedor no disponible.

### TASK-FHS-0006 — Implementar Agent Runtime

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Ciclo principal del agente: clasificar intención, resolver LLM, resolver tools, ejecutar bucle de tool calling y devolver respuesta final con provenance.
- **Criterios de aceptación:**
  - Procesa un mensaje de usuario de extremo a extremo.
  - Clasifica intención (keyword-based para MVP).
  - Selecciona LLM según scope y preferencias.
  - Selecciona tools candidatas según capacidades.
  - Ejecuta bucle LLM → tool → LLM hasta respuesta final.
  - Soporta failover si un proveedor de tool desaparece durante el ciclo.
  - Emite eventos SSE en cada cambio de estado.

### TASK-FHS-0007 — Implementar API REST + SSE

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** En `apps/agent-server/src/api/`, exponer endpoints REST y SSE. Integrar con Agent Runtime.
- **Criterios de aceptación:**
  - `POST /api/chat` inicia un ciclo de agente.
  - `GET /api/chat/:id/events` devuelve stream SSE de eventos.
  - Endpoints FHS: `/api/fhs/nodes`, `/api/fhs/providers`, `/api/fhs/models`, `/api/fhs/capabilities`, `/api/fhs/resolve`.
  - El SSE emite todos los eventos definidos en `packages/fhs-protocol`.

### TASK-FHS-0008 — Implementar Frontend Chat

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Chat web en Vite + vanilla TS + HTML5 + CSS3. Componentes: chat-view, message-bubble, composer, agent-activity, provenance-card, model-selector, privacy-scope, provider-panel.
- **Criterios de aceptación:**
  - El usuario puede escribir y enviar mensajes.
  - El usuario puede adjuntar imágenes.
  - Se muestra streaming de respuesta del asistente.
  - Se muestra actividad del agente en tiempo real (modelo, tool, tiempos).
  - Se muestra provenance de cada respuesta.
  - Se puede seleccionar modelo manual o automático y scope de privacidad.
  - Se conecta a `/api/chat/:id/events` vía SSE.

### TASK-FHS-0009 — Documentar protocolo FHS v0.1

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Documentar las 10 reglas, manifiestos, mensajes WebSocket, eventos SSE y flujos. Dejar listo para copiar a diapositivas.
- **Criterios de aceptación:**
  - Existe documento con las 10 reglas, ejemplos de manifiesto LLM y MCP, y diagramas de secuencia.
  - Se describe el ciclo del agente.
  - Se mencionan tipos futuros (`embedding`, `storage`, `agent`).

### TASK-FHS-0010 — Preparar demo de failover OCR

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Crear scripts/documentación para levantar dos nodos OCR, ejecutar una consulta, apagar uno y verificar que el chat usa el segundo.
- **Criterios de aceptación:**
  - Demo ensayada al menos una vez.
  - El failover ocurre sin intervención del usuario.
  - El frontend muestra claramente el cambio de proveedor OCR.

### TASK-FHS-0011 — [Técnica pendiente] Separar Registry del Agent Backend

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** En v0.2, convertir el Registry en un servicio independiente para soportar múltiples Agent Backends.
- **Criterios de aceptación:**
  - No implementar en v0.1; solo documentar en `ROADMAP.md` y `DECISIONS.md`.
  - Tener claro el punto de corte cuando se decida migrar.

### TASK-FHS-0012 — [Técnica pendiente] Integrar IPFS para artefactos

- **Estado:** `todo`
- **Owner:** rafex
- **Descripción:** Evaluar e integrar IPFS para subir archivos adjuntos y pasar solo el hash a los servidores MCP, protegiendo el origen del archivo.
- **Criterios de aceptación:**
  - No implementar en v0.1; documentar en `ROADMAP.md`, `DECISIONS.md` y spec.
  - Tener claro el diseño del `IPFSGateway` y los cambios en el protocolo.

## Notas generales

- Las tareas 0001-0010 son parte del MVP v0.1.
- La tarea 0011 es deuda técnica planificada para v0.2.
- Se pausa `SPEC-AUTH-0001` mientras se completan estas tareas.
