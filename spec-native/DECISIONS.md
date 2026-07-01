# DECISIONS.md

## Cuándo registrar aquí

Registrar una decisión cuando cambie algo que futuras iniciativas o agentes deban respetar: arquitectura del sistema, convención de código, tecnología o dependencia base, tradeoff que condicione trabajo futuro.

## DEC-0001 — Protocolo de federación: Registry HTTP + WebSocket

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** Se evaluaron tres alternativas para el protocolo de descubrimiento de proveedores: (1) Registry HTTP + SSE, (2) Registry HTTP + WebSocket, (3) DHT + mDNS libp2p. La alternativa 3 era demasiado compleja para una PoC de ponencia. SSE era más simple pero no detecta desconexiones inmediatas ni permite heartbeat bidireccional.
- **Decisión:** Usar la alternativa 2: un Registry embebido en el Agent Backend que expone WebSocket para registro, lease y heartbeat de nodos proveedores.
- **Consecuencias:**
  - Permite detectar caídas de nodo en segundos con ping/pong.
  - El Registry notifica al Agent Runtime en tiempo real (`node.online`, `node.lost`, `node.updated`).
  - Punto central de descubrimiento en v0.1; se separará como servicio independiente en v0.2.
  - Curva de implementación moderada, adecuada para un MVP de una semana.

## DEC-0002 — TypeScript como stack del MVP

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** Se necesita compartir tipos entre frontend, agente, registry y protocolo. TypeScript permite usar un solo lenguaje para toda la pila del PoC.
- **Decisión:** Usar TypeScript para el protocolo, el agent-server y el frontend. Python para el servidor MCP OCR de ejemplo (porque vive fuera de este repositorio, en nodos separados).
- **Consecuencias:**
  - Velocidad de desarrollo alta y tipos compartidos desde `packages/fhs-protocol`.
  - El backend corre en Node.js >= 20.
  - No es la opción más ligera para equipos pequeños; se evaluará Rust u otro lenguaje en el futuro.

## DEC-0003 — FHS federará LLM y MCP como capacidades unificadas

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** El usuario quería originalmente federar solo tools MCP. Sin embargo, el agente necesita tanto razonamiento (LLM) como acción (tools). Una red soberana debe ofrecer ambos recursos.
- **Decisión:** FHS v0.1 federará dos tipos de proveedores: `provider.type = "llm"` para modelos de lenguaje y `provider.type = "mcp"` para servidores de tools MCP. Cada uno se publica, descubre y selecciona a través del Registry.
- **Consecuencias:**
  - El chat puede elegir entre múltiples modelos y múltiples proveedores de la misma tool.
  - El protocolo es consistente para ambos tipos de capacidad.
  - No implementa otros tipos (`embedding`, `storage`, `agent`) en v0.1; se documentan como futuros.

## DEC-0004 — Identidad de nodos: DID simplificado para PoC, Ed25519 para producción

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** El protocolo requiere identidad verificable de cada nodo. Ed25519 ofrece criptografía asimétrica robusta pero añade complejidad de configuración, gestión de claves y dependencias criptográficas que ralentizan el MVP.
- **Decisión:** Para la PoC v0.1 usamos identificadores `did:key:<nombre-simple>` (ej. `did:key:macmini-raul`) **sin firma criptográfica**. La confianza es implícita en la red local/comunidad. Se documenta la migración obligatoria a Ed25519 antes de desplegar en redes no controladas.
- **Consecuencias:**
  - Reduce el time-to-demo de días a minutos.
  - Elimina la necesidad de distribuir claves antes de la ponencia.
  - La seguridad depende del perímetro de red, no de criptografía.
  - Es deuda técnica explícita: cualquier versión productiva debe reemplazarlo.
- **Ed25519 completo implica:**
  - Generar par de claves criptográficas (privada/pública) por nodo.
  - Firmar cada mensaje de registro y heartbeat con la clave privada.
  - Que el Registry verifique la firma con la clave pública antes de aceptar el registro.
  - Usar librerías como `tweetnacl` o `noble-ed25519`.
  - Manejar rotación de claves, revocación y expiración.

## DEC-0005 — Registry embebido en Agent Backend para v0.1

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** Para simplificar despliegue en la ponencia se evaluó si el Registry debía ser un servicio separado o vivir junto al Agent Backend.
- **Decisión:** En v0.1 el Registry se ejecuta embebido en el mismo proceso Fastify que el Agent Runtime. Se documenta la separación como tarea pendiente.
- **Consecuencias:**
  - Menos procesos que levantar durante la demo.
  - Un solo puerto (`localhost:8080`) expone API REST, SSE y WebSocket de registro.
  - Limita a un backend por Registry; se corregirá en v0.2.

## DEC-0006 — Frontend vanilla sin frameworks

- **Fecha:** 2026-06-30
- **Estado:** `accepted`
- **Contexto:** El usuario quiere una demo ligera, fácil de explicar, con poco código más que lo esencial.
- **Decisión:** El frontend se construye con Vite + vanilla TypeScript + HTML5 + CSS3. Sin React, Vue ni frameworks de componentes.
- **Consecuencias:**
  - Menor cantidad de dependencias y bundle pequeño.
  - Código más directo para explicar en diapositivas.
  - Se sacrifica algo de ergonomía de desarrollo a cambio de simplicidad.

## DEC-0007 — Contenedores para aislar desarrollo y despliegue

- **Fecha:** 2026-07-01
- **Estado:** `accepted`
- **Contexto:** El usuario quiere desplegar el MVP en una máquina remota (`192.168.3.173`) administrada remotamente mediante Podman, para no desgastar recursos locales. Se requiere una forma portable y reproducible de levantar el stack.
- **Decisión:** Usar contenedores con Podman/Docker. Crear carpeta `containers/` con subcarpetas semánticas (`agent-server`, `web`, `ocr-mcp`, `llama-provider`) y un `compose.yaml` que orqueste el stack completo.
- **Consecuencias:**
  - Cada componente puede desarrollarse, probarse y desplegarse de forma aislada.
  - El frontend se sirve con Nginx y proxya `/api` al agent-server.
  - El OCR corre en su propio contenedor con Tesseract instalado.
  - llama.cpp se asume nativo en el host remoto (`:43110`) para la PoC; se documenta cómo contenerizar si se desea.
  - Se añade `.containerignore` para evitar copiar archivos innecesarios a las imágenes.

## DEC-0008 — IPFS para compartir artefactos sin exponer origen

- **Fecha:** 2026-07-01
- **Estado:** `proposed`
- **Contexto:** Cuando el usuario adjunta una imagen para OCR, el servidor MCP recibe el archivo completo y potencialmente ve metadata de origen (IP, sesión, etc.). IPFS permite que el MCP reciba solo un hash, sin saber quién subió el archivo ni desde dónde.
- **Decisión:** Evaluar la integración de IPFS en FHS v0.2+ para artefactos. El flujo sería: frontend sube el archivo a un nodo IPFS local, obtiene un hash, y envía solo `ipfs://<hash>` al agente. El servidor MCP descarga el archivo del gateway IPFS usando el hash.
- **Consecuencias:**
  - Mejora la privacidad: el MCP no ve origen del archivo.
  - Permite desacoplamiento temporal: el archivo persiste en IPFS.
  - Deduplicación natural: archivos idénticos generan el mismo hash.
  - Requiere un nodo IPFS en la red local o un gateway confiable.
  - Es una mejora post-MVP; se documenta en roadmap y spec.
