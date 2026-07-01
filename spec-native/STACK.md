# STACK.md

## Runtime

- **Lenguaje:** TypeScript
- **Versión:** >= 5.0
- **Entorno:** Node.js >= 20

## Frameworks

- **Frontend:** Vite + vanilla TypeScript + HTML5 + CSS3
  - Sin React, Vue ni frameworks pesados para mantener el PoC ligero.
  - Componentes nativos o funciones puras de manipulación de DOM.
- **Backend:** Fastify
  - Ligero, rápido y con buen soporte para WebSocket y SSE.
- **MCP Client:** SDK oficial de Model Context Protocol para TypeScript (`@modelcontextprotocol/sdk`)
- **HTTP Client para LLM:** `undici` o `node-fetch` nativo de Node.js 20

## Infraestructura

- **Base de datos:** almacenamiento en memoria para la PoC (interfaz `RegistryStore` preparada para SQLite u otro backend).
- **Contenedores:** Podman / Docker Compose en `containers/compose.yaml`. Cada servicio tiene su propio `Containerfile`:
  - `containers/agent-server/` — Agent Backend
  - `containers/web/` — Frontend con Nginx
  - `containers/ocr-mcp/` — Proveedor MCP OCR en Python
- **Hosting (PoC):** local o en el host `192.168.3.173` con Podman; cada nodo puede correr en su propia máquina.
- **CI/CD:** a definir (por ahora manual para la ponencia).
- **Observabilidad:** logs por consola en `agent-server`; panel de actividad en `apps/web`.

## Integraciones

- **llama.cpp / llama-server:** proveedor LLM local, expuesto como servidor HTTP compatible con OpenAI API.
- **Servidor MCP OCR (Python):** proveedor de capacidad `document.ocr`. Corre en nodo separado.
- **WebSocket:** conexión entre proveedores y Registry embebido.
- **SSE:** streaming de eventos del agente hacia el frontend.

## Restricciones

- **Restricción de versión:** Node.js >= 20 para usar `fetch` nativo y APIs modernas.
- **Restricción de plataforma:** v0.1 se prueba en macOS y Linux. Windows puede requerir ajustes menores.
- **Restricción de red:** se asume red local o VPN comunitaria. No se incluye NAT traversal.
