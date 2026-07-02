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
- **Cliente de tools:** FHS WebSocket propio (`apps/agent-server/src/providers/mcp-host.ts`), **no** el SDK oficial de MCP — se removió como dependencia tras DEC-0014 (nunca conectaba con los providers reales de este repo, que hablan FHS, no MCP nativo).
- **HTTP Client:** `curl` vía `child_process.execFile` en los bridges de los providers (evita un conflicto de event loop entre `ws` y Undici, ver `spec-native/DECISIONS.md`).

## Infraestructura

- **Base de datos:** almacenamiento en memoria para la PoC (interfaz `RegistryStore` preparada para SQLite u otro backend).
- **Contenedores:** Podman / Docker Compose en `containers/compose.yaml`. Cada servicio tiene su propio `Containerfile`:
  - `containers/agent-server/` — Agent Backend
  - `containers/web/` — Frontend con Nginx
  - `containers/llm-provider/` — Wrapper FHS hacia llama.cpp
  - `containers/ocr-provider/` — Wrapper FHS hacia ether-ocr-api (TypeScript; ya no existe una implementación propia en Python)
- **Hosting (PoC):** local o en el host `192.168.3.173` con Podman; cada nodo puede correr en su propia máquina.
- **CI/CD:** a definir (por ahora manual para la ponencia).
- **Observabilidad:** logs por consola en `agent-server`; panel de actividad en `apps/web`.

## Integraciones

- **llama.cpp / llama-server:** proveedor LLM local, expuesto como servidor HTTP compatible con OpenAI API. Se gestiona fuera de este repo (proyecto `PoC-Llama.cpp` en el bastion).
- **ether-ocr-api:** servicio REST de OCR (Tesseract por debajo), proveedor de capacidad `document.ocr` vía `examples/ocr-provider/`. Corre en su propio contenedor.
- **WebSocket:** conexión entre proveedores y Registry embebido, y entre Agent Server y providers (FHS).
- **SSE:** streaming de eventos del agente hacia el frontend, filtrado por `conversationId`.

## Restricciones

- **Restricción de versión:** Node.js >= 20 para usar `fetch` nativo y APIs modernas.
- **Restricción de plataforma:** v0.1 se prueba en macOS y Linux. Windows puede requerir ajustes menores.
- **Restricción de red:** se asume red local o VPN comunitaria. No se incluye NAT traversal.
