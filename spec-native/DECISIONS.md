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

## DEC-0009 — Validar identidad en `hello` antes de aceptar registro

- **Fecha:** 2026-07-01
- **Estado:** `proposed` (parte de identidad: `accepted` e implementada — ver nota abajo; parte de dispatcher sigue `proposed`, en spec como `satelite-rating`)
- **Contexto:** `ws-handler.ts` acepta cualquier `providerId` en el mensaje `hello` sin validación. Si dos conexiones distintas envían el mismo `providerId`, la segunda sobrescribe silenciosamente la conexión de la primera en el Registry. Con DID simplificado (nombre de texto sin firma, ver DEC-0004) esto permite que cualquier nodo suplante la identidad de otro con solo conectarse y reutilizar su `providerId`.
- **Decisión:** Antes de aceptar un `hello`, el Registry debe verificar si el `providerId` ya tiene una conexión activa (no expirada). Si la tiene, rechazar el nuevo `hello` (o exigir prueba de identidad, cuando exista Ed25519 según DEC-0004) en vez de sobrescribir.
- **Consecuencias:**
  - Cierra el vector de suplantación trivial mientras la identidad siga sin firma criptográfica.
  - Requiere definir el mensaje de rechazo (`type: "hello.rejected"` o similar) y cómo el provider legítimo recupera su slot si perdió conexión sin que el Registry lo detectara aún.
  - Complementa, no sustituye, la migración a Ed25519 de DEC-0004.
- **Adicional — heartbeat gestionado por el provider:** cada provider (`llm-provider`, `ocr-provider`, y cualquier futuro) debe implementar un despachador ("mosquito"/dispatcher) interno que gestione las peticiones entrantes de forma concurrente y responda cada una en su propio momento, sin bloquear el heartbeat (`ping`) ni las respuestas a otras peticiones en curso. Esto evita que un provider ocupado en una tarea larga (ej. OCR de un documento grande) deje de enviar `ping` y sea marcado `lost` por el Registry (lease de 30s, DEC-0001) mientras sigue vivo. **Esta parte no se implementó aquí** — queda formalizada como `dispatch.ack` en `satelite-rating` (SPEC-SATRATING-0001), todavía en `draft`.

- **Implementado y verificado (2026-07-05):** la parte de validación de identidad quedó resuelta usando el mensaje `error` ya existente (`{ type: "error", data: { code, message } }`), en vez de inventar un `hello.rejected` nuevo — mismo formato que ya usaba `NOT_IDENTIFIED`, código nuevo `ALREADY_REGISTERED`. `Registry.hasActiveConnection(providerId)` verifica el `readyState` real del socket previo (no solo su presencia en el mapa): si está `OPEN`/`CONNECTING` rechaza el `hello` nuevo con `ALREADY_REGISTERED` y cierra el socket entrante (código 4009); si el socket previo ya está `CLOSED`/`CLOSING` (proceso remoto murió sin cerrar limpio), permite el registro nuevo sin bloquear una reconexión legítima. Verificado con dos pruebas reales contra el agent-server local: (1) dos conexiones simultáneas con el mismo `providerId` — la segunda recibe `ALREADY_REGISTERED` y es cerrada, la primera sigue intacta; (2) una conexión terminada abruptamente (`ws.terminate()`, sin close limpio) seguida de una reconexión con el mismo `providerId` — se acepta sin rechazo. `examples/llm-provider` y `examples/ocr-provider` ahora loggean el mensaje `error` del Registry en vez de ignorarlo en silencio.

## DEC-0010 — Pulse: ¿el servidor también debe sondear a los nodos? (heartbeat de transporte vs. de aplicación)

- **Fecha:** 2026-07-01 (propuesta) — resuelta 2026-07-05
- **Estado:** `accepted`
- **Contexto:** Hoy solo los providers envían `ping` cada 10s (`HEARTBEAT_INTERVAL_SECONDS`, `packages/fhs-protocol/src/constants.ts`) y el Registry únicamente responde `pong` — heartbeat de **aplicación** (mensaje JSON FHS). El Registry detecta nodos caídos de forma pasiva: si no llega `ping` en 30s (lease), marca el nodo `lost`. La propuesta original planteaba dos opciones: (a) dejarlo unidireccional, o (b) que el servidor también emita un `ping` de aplicación hacia cada provider — ambas evaluadas sin distinguir un punto clave: WebSocket (RFC 6455) ya define control frames `ping`/`pong` a nivel de **transporte**, independientes de cualquier mensaje JSON, que cualquier extremo puede iniciar y que la librería (`ws`) responde automáticamente sin código de aplicación. Ninguna de las dos opciones originales consideraba esto.
- **Decisión — tres partes:**
  1. **Pulse de transporte, bidireccional:** el Registry usa el ping/pong **nativo de WebSocket** (`socket.ping()` / evento `'pong'` de la librería `ws`) hacia cada nodo conectado, cada `HEARTBEAT_INTERVAL_SECONDS`, terminando la conexión si no responde durante `MISSED_PONG_THRESHOLD` (3) ciclos seguidos — no 1, ver "Corrección" abajo. Casi sin código nuevo (implementado en `apps/agent-server/src/registry/ws-handler.ts`), sin tocar el protocolo FHS ni sus tipos — resuelve la detección de conexión rota más rápido que el lease de 30s, sin la complejidad de un segundo mensaje de aplicación que planteaba la Opción (b) original.
  2. **El heartbeat de aplicación (`ping`/`pong` JSON) se mantiene unidireccional, sin cambios** — sigue siendo la señal de negocio para el lease y el rating (`satelite-rating`). No se agrega ningún mensaje de "progreso" (`mission.progress` o similar) para saber si un nodo está atendiendo correctamente una Mission larga — se decide explícitamente que **es responsabilidad del propio nodo (Star/Satellite) resolver internamente si se atoró**, no del protocolo ofrecer una señal intermedia. Mantiene al Registry simple (DEC-0005). **Límite reconocido:** ni el Pulse nativo ni el dispatcher concurrente ("mosquito", DEC-0009) distinguen "atorado" de "ocupado pero progresando" — el dispatcher garantiza que en algún momento se responderá una petición sin bloquear el resto, pero no garantiza *cuándo*. Si el event loop del nodo está genuinamente bloqueado, tampoco responde al Pulse nativo — converge al mismo síntoma, solo que detectado más rápido.
  3. **Timeout configurable del lado del cliente:** se agrega `preferences.maxWaitMs` (opcional) en `ModelPreferences` (`apps/agent-server/src/agent/runtime.ts`) — quien inicia una conversación puede pedir esperar menos que el default fijo del stack (~300s/310s, `CALL_TIMEOUT_MS` en `mcp-host.ts`, timeout equivalente en `llm-gateway.ts`). Es un límite de paciencia del cliente ("kill" de la espera), no una señal de salud del nodo — si se cumple, el Agent Server abandona esa espera y libera la conversación sin importar si el nodo sigue procesando (no hay mensaje de cancelación en el protocolo — el nodo puede seguir gastando recursos en la petición ya abandonada). **Recomendación de rango:** dado el hardware comunitario que federa esta red (equipos reutilizados, sin GPU dedicada), el rango razonable de `maxWaitMs` es de varios minutos, no segundos — un valor bajo (10-30s) es indistinguible de cancelar la petición, no una opción realista de "impaciencia legítima". Cualquier UI sobre este campo debe partir de un piso cercano al default (~300s) hacia arriba.
- **Por qué no un mensaje de progreso (`mission.progress`):** se consideró y se descarta explícitamente — habría requerido un tipo de mensaje FHS nuevo, y el valor (saber que un nodo "sigue trabajando, no atorado") no justifica la complejidad para el volumen de esta PoC. El timeout configurable del punto 3 ya da al cliente una forma de no quedar esperando indefinidamente, sin necesitar que el nodo reporte progreso.
- **Corrección (2026-07-05, misma sesión):** la primera implementación terminaba la conexión tras solo 1 ciclo sin `pong` (~10-20s) — más estricto que el lease de aplicación de 30s que el Pulse nativo complementa, con riesgo real de desconectar a un nodo legítimamente ocupado en un cómputo bloqueante breve. Corregido a `MISSED_PONG_THRESHOLD = 3` (~30s de tolerancia real, equivalente al lease existente) antes de considerar esta decisión cerrada.
- **Consecuencias:**
  - `HEARTBEAT_INTERVAL_SECONDS` se reutiliza para el Pulse de transporte — un solo intervalo de configuración, no dos.
  - Vocabulario: "heartbeat" se nombra **Pulse** en documentación/producto (DEC-0024); el nombre de los mensajes de protocolo (`ping`/`pong` JSON) no cambia.
  - `docs/protocolo.md` actualizado con el comportamiento explícito de las tres partes, incluyendo el límite reconocido del punto 2 y la recomendación de rango del punto 3.
  - Riesgo conocido, no resuelto: un resultado que llega después de que `maxWaitMs` ya limpió la espera se descarta en silencio (`apps/agent-server/src/providers/mcp-host.ts`, `if (!entry) return`) — sin log ni métrica. Aceptable para el volumen de esta PoC; documentado como limitación, no oculto.
  - Pendiente no bloqueante: exponer `maxWaitMs` como control visible en la barra de configuración del `Portal` (mismo patrón que `ocrMode`, DEC-0021) — hoy solo es un campo de `preferences` aceptado por el backend, sin UI todavía.

## DEC-0011 — FHS es un protocolo de mensajes, no una librería TypeScript

- **Fecha:** 2026-07-01
- **Estado:** `accepted`
- **Contexto:** TypeScript es el stack del MVP (DEC-0002), pero eso no debe leerse como que el protocolo FHS depende de Node.js o TypeScript. El objetivo es que cualquier comunidad pueda federar nodos escritos en el lenguaje que ya tienen (Python para IA/OCR, Rust para hardware limitado, Java para sistemas existentes), sin reescribir nada en TypeScript.
- **Decisión:** FHS se documenta explícitamente como JSON sobre WebSocket, independiente de lenguaje. Se agrega `docs/implementacion-multilenguaje.md` como guía oficial de soporte, con **Python, Rust y Java** como los primeros lenguajes soportados después de TypeScript/JavaScript (implementación de referencia), en ese orden de prioridad. `packages/fhs-protocol` sigue siendo la fuente de verdad de los tipos, pero como referencia de mensajes, no como dependencia obligatoria para implementar un provider.
- **Consecuencias:**
  - Ningún provider comunitario está obligado a usar Node.js.
  - Los campos de privacidad (`scope`, `privacy.retention`, `privacy.trainingUse`, `provenance`) son parte del contrato del protocolo, no de la implementación TypeScript — deben respetarse igual en cualquier lenguaje.
  - Falta implementar y publicar SDKs/ejemplos de referencia reales en Python, Rust y Java (hoy solo hay guía + snippets, no un provider funcional fuera de TypeScript). Se documenta como pendiente en ROADMAP.

## DEC-0012 — Trazabilidad operacional obligatoria, separada de la privacidad de contenido

- **Fecha:** 2026-07-01 — implementada del lado del Agent Server 2026-07-05
- **Estado:** `accepted`
- **Contexto:** El protocolo genera un `requestId` por cada `chat.request`/`tool.call` (ver `llm-gateway.ts`, `mcp-host.ts`), pero hasta ahora no se loggeaba en ningún punto ni se correlacionaba con el `conversationId` de la conversación que lo originó. Si un usuario reporta un fallo ("mi OCR falló ayer"), no había forma de reconstruir qué pasó — no por la privacidad (que solo restringe contenido), sino porque nunca se guardaba ni siquiera la metadata de la operación. Confundir "no retener contenido" con "no registrar nada" deja al sistema sin capacidad de diagnóstico.
- **Decisión:** Distinguir explícitamente dos capas: **contenido** (texto, archivos, respuestas — sujeto a `privacy.retention` de cada provider) y **metadata de trazabilidad** (`conversationId`, `requestId`, `providerId`, capability/modelo, timestamp, duración, resultado/código de error — siempre se registra, no es negociable). Documentado en `docs/protocolo.md` (sección Privacidad → Trazabilidad operacional) y `docs/protocolo-provider.md` (checklist plug-and-play).
- **Implementado (2026-07-05):**
  - `apps/agent-server/src/observability/trace.ts` — `logTrace(entry)`, una línea JSON estructurada por resolución de Mission/chat (`conversationId`, `requestId`, `providerId`, `capability`, `dispatchMs`, `totalMs`, `success`, `errorCode`).
  - `apps/agent-server/src/providers/mcp-host.ts` — `TraceContext` (opcional, ausente para llamadas internas de gestión como `tool.list`) hilado desde `callTool()`/`sendAndWait()`; loggea en éxito, error del nodo (`tool.error`), timeout y cierre de conexión inesperado (`CONNECTION_CLOSED`).
  - `apps/agent-server/src/providers/llm-gateway.ts` — mismo patrón (`TraceContext`) en `generate()`/`fhsGenerate()`; loggea en `chat.completed`, `chat.error`, timeout y error de WebSocket.
  - `apps/agent-server/src/agent/runtime.ts` — pasa `{ conversationId: this.conversationId, capabilityId/capability }` en los 3 puntos de despacho (OCR determinístico, `executeToolCall`, `callLlm`) — ya tenía `conversationId` como campo privado, no fue necesario propagarlo desde más arriba.
  - Verificado end-to-end con `agent-server` + `llm-provider` reales contra un LLM mock: línea de traza con `conversationId`/`requestId`/`providerId`/`capability`/`dispatchMs`/`totalMs`/`success` correctos, correlacionados con el `conversationId` real de la sesión de chat.
- **Consecuencias:**
  - No cambia ninguna garantía de privacidad existente: el contenido sigue gobernado por `retention`. Solo agrega una capa de metadata que siempre existe.
  - Pendiente no bloqueante: que cada provider de ejemplo (`llm-provider`, `ocr-provider`) también loggee su propia metadata local por `requestId` — hoy solo el Agent Server lo hace, que es donde vive la correlación con `conversationId`.
  - Se usa `console.log(JSON.stringify(...))` directo, no el logger de Fastify (`app.log`/pino) — evita tener que inyectar el logger en `McpHost`/`LlmGateway`/`AgentRuntime`, que hoy se instancian sin acceso a la instancia de Fastify. Aceptable para el volumen de esta PoC; si se necesita niveles/transportes de log más adelante, migrar a pino es un cambio aislado.

## DEC-0013 — Contrato formal de provider ("protocolo-provider") para plug-and-play

- **Fecha:** 2026-07-01 — validación y migración implementadas 2026-07-06
- **Estado:** `accepted`
- **Contexto:** `examples/llm-provider` y `examples/ocr-provider` cumplen el protocolo FHS de mensajes, pero cada uno reimplementa desde cero su propio manejo de conexión, heartbeat y códigos de error. Sin un contrato explícito, cada provider nuevo tiende a "personalizarse" en detalles que deberían ser uniformes, obligando a conocimiento especial en el Agent Server por proveedor en vez de por tipo (`llm`/`mcp`).
- **Decisión:** Definir `docs/protocolo-provider.md` como el contrato obligatorio de implementación de cualquier provider: ciclo de vida de 5 estados (`Connecting → Identifying → Registering → Ready → Reconnecting`), dispatcher concurrente que no bloquea el heartbeat (relacionado con DEC-0009), manifiesto con campos obligatorios (incluyendo privacidad), tabla de códigos de error estandarizados, y checklist de trazabilidad obligatoria (DEC-0012). Cumplir este contrato es lo que permite que un provider nuevo se conecte sin cambios en `apps/agent-server`.
- **Implementado (2026-07-06):**
  - `packages/fhs-protocol/src/constants.ts` — `FHS_ERROR_CODES` (`NOT_IDENTIFIED`, `INVALID_MANIFEST`, `ALREADY_REGISTERED`, `UPSTREAM_UNAVAILABLE`, `UPSTREAM_TIMEOUT`, `INVALID_ARGUMENTS`, `UNSUPPORTED_CAPABILITY`, `INTERNAL_ERROR`, `PARSE_ERROR`) — canónico pero no un tipo cerrado a nivel de protocolo (DEC-0026: no se mandata implementación a otros lenguajes).
  - `apps/agent-server/src/registry/manifest-validation.ts` (nuevo) — `validateManifest()` verifica `fhsVersion`, `provider.id/type/visibility`, `privacy.retention`, `privacy.trainingUse` (si `type: "llm"`), y `endpoint`/`services[].endpoint` según el tipo. Conectado en `ws-handler.ts`: un manifiesto incompleto se rechaza con `INVALID_MANIFEST` y el detalle de qué falta, sin registrar el nodo.
  - `examples/llm-provider` y `examples/ocr-provider` migrados a `FHS_ERROR_CODES` (`UNSUPPORTED_CAPABILITY` en vez de `UNKNOWN_TOOL`, `UPSTREAM_UNAVAILABLE` en vez de `EXECUTION_ERROR`/`LLM_ERROR` para fallos del servicio real detrás del provider).
  - **Hallazgo real al activar la validación**: ninguno de los dos providers de referencia declaraba `privacy` en su propio manifiesto — la validación los habría rechazado a ellos mismos. Corregido: `llm-provider` declara `{ retention: "none", trainingUse: false }`, `ocr-provider` declara `{ retention: "none" }` (coincide con lo ya documentado en `docs/manifiesto-llm.md`/`docs/manifiesto-mcp.md`, nunca implementado en el código real). Mismo patrón que la lección de DEC-0016/DEC-0017: "documentado" no es "implementado" hasta que se verifica con una ejecución real.
- **Verificación:** `npm run typecheck` limpio en los 4 paquetes tocados. Prueba real: un manifiesto sin `privacy.retention` es rechazado con `INVALID_MANIFEST` y el detalle de campos faltantes; `llm-provider` real (con el fix de privacidad) se registra y completa un chat E2E contra un LLM mock sin problemas.
- **Consecuencias:**
  - Facilita que futuros SDKs en Python/Rust/Java (DEC-0011) implementen el contrato una sola vez, verificable contra el Registry real, en vez de adivinar el comportamiento leyendo el código TypeScript de referencia.
  - Pendiente no bloqueante: `ChatErrorMessage.code`/`ToolCallErrorMessage.code` siguen tipados como `string` libre (no como unión literal de `FHS_ERROR_CODES`) — deliberado, para no sobre-restringir a providers en otros lenguajes con códigos propios no cubiertos por la lista canónica.

## DEC-0014 — `McpHost` hablaba MCP-HTTP nativo en vez de FHS WebSocket (bug crítico, corregido)

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Al probar el flujo OCR end-to-end en el bastion (`just container-up-core` + `just container-up-llm/ocr`), el agent-server nunca lograba invocar `document.ocr`. El log mostraba `Failed to connect MCP provider did:key:ocr-provider-01: TypeError: fetch failed ... unknown scheme`. Causa raíz: `apps/agent-server/src/providers/mcp-host.ts` usaba el **SDK oficial de MCP** (`Client` + `StreamableHTTPClientTransport`), que espera un endpoint `http://`/`https://`. Pero `examples/ocr-provider` (y cualquier provider `mcp` de este repo) **no es un servidor MCP nativo** — es un wrapper FHS que expone su propio WebSocket (`ws://ocr-provider:43112/fhs/v1/tools`) hablando `tool.list`/`tool.call`/`tool.result`, tal como documenta `docs/proveedores.md` desde el principio. El código de `mcp-host.ts` nunca coincidió con lo documentado; nadie lo notó porque el flujo completo de OCR nunca se había probado de punta a punta contra el bastion real, solo por partes.
- **Decisión:** Reescribir `mcp-host.ts` para hablar el protocolo FHS de tools directamente sobre `ws` (mismo patrón que `llm-gateway.ts`), con conexión persistente por provider, correlación de peticiones por `requestId`, y sin depender de `@modelcontextprotocol/sdk` (se removió esa dependencia de `apps/agent-server/package.json`, ya no se usa en ningún punto del agent-server).
- **Cómo se previene en el futuro:** el nombre de la clase (`McpHost`) y del tipo (`ProviderManifest.type = "mcp"`) sugiere fuertemente "hablar MCP nativo", pero el protocolo real es FHS. Cualquiera que integre una pieza nueva de tipo `mcp` debe leer `docs/protocolo-provider.md` (no solo el nombre del tipo) antes de asumir el transporte. Se agregó un comentario explícito en `mcp-host.ts` aclarando esta distinción. **Regla general: ningún componente de este repo debe agregarse sin al menos una prueba end-to-end real contra el bastion** (no solo build/typecheck) antes de darlo por completo — este bug pasó desapercibido porque nunca se ejecutó el flujo completo con un archivo real adjunto.

## DEC-0015 — Matching de capability por substring completo nunca coincidía con nombres de tool reales (bug, corregido)

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Tras corregir DEC-0014, el tool call llegaba al provider correcto pero con `file_base64` vacío — el agent-server nunca inyectaba el artifact real. Causa raíz: `McpHost.matchCapabilityId()` comparaba si el nombre de la tool normalizado (`"ocrextract"`) contenía completo el id de capability normalizado (`"documentocr"`) o viceversa. Ninguna de las dos cadenas es substring de la otra aunque conceptualmente son la misma capacidad — el heurístico de substring completo era demasiado estricto para el caso real de producción (`ocr_extract` vs `document.ocr`), y nadie lo había notado porque nunca se había ejecutado una tool call real hasta este punto.
- **Decisión:** Cambiar el matching a comparación por **tokens compartidos** (dividir ambas cadenas en palabras por separadores no alfanuméricos y verificar intersección: `{ocr, extract}` ∩ `{document, ocr}` = `{ocr}` → coincide). Además, si el provider solo declara una capability, se usa directamente sin heurística — es el caso más común y elimina la ambigüedad por completo.
- **Cómo se previene en el futuro:** cualquier heurística de matching por nombre entre dos catálogos independientes (nombre de tool vs id de capability) es inherentemente frágil — funciona en los ejemplos que se probaron a mano y falla en producción real. Al integrar una pieza nueva con más de una capability por provider, **verificar explícitamente con un log o test que `tool.capabilityId` resuelve al valor esperado antes de asumir que el flujo funciona**. Ver checklist de `docs/protocolo-provider.md`: se agregó como ítem implícito la necesidad de una tool call real de prueba, no solo el registro del manifiesto.

## DEC-0016 — Ningún modelo LLM registrado soportaba tool calling (limitación conocida, resuelta parcialmente el 2026-07-02)

- **Fecha:** 2026-07-02 (actualizada el mismo día tras cambiar de modelo)
- **Estado:** `accepted`
- **Contexto:** Con DEC-0014 y DEC-0015 corregidos, el pipeline de OCR se probó exitosamente end-to-end usando un LLM mock con `toolCalling.supported: true` (contenedor temporal en la red `fhs` del bastion, revertido tras la prueba). Pero el único modelo real registrado en producción en ese momento, `qwen2.5-0.5b-instruct`, declaraba `toolCalling.supported: false`. El agente resolvía el modelo con `reason: ["available"]` (fallback, no `"tool-calling"`) y respondía con una disculpa genérica en vez de invocar OCR.
- **Resolución:** el mismo día, con acceso a más modelos en el bastion (hardware: i7-3615QM, 4 núcleos/8 hilos, sin GPU útil para llama.cpp), se probaron candidatos con `curl` directo contra `llama-server --jinja` (sin tocar el wiring FHS) antes de cambiar el manifiesto — siguiendo la lección de DEC-0014/DEC-0015: **verificar con una llamada real antes de declarar algo resuelto**. `qwen2.5-1.5b-instruct` no generó `tool_calls` (respondió conversacionalmente). `qwen2.5-coder-3b-instruct` sí decidió llamar la tool, pero expuso un problema distinto — ver DEC-0017. Con ese problema corregido, `qwen2.5-coder-3b-instruct` fue registrado como modelo de producción con `toolCalling.supported: true` y verificado end-to-end.
- **Consecuencias:**
  - `examples/llm-provider/src/index.ts` ahora lee `MODEL_ID`, `MODEL_DISPLAY_NAME`, `MODEL_CONTEXT_WINDOW` y `MODEL_TOOL_CALLING_SUPPORTED` de variables de entorno en vez de tenerlos hardcodeados — el modelo hardcodeado fue precisamente lo que causó que nadie notara este gap hasta probar end-to-end. Cambiar de modelo en el futuro ya no requiere editar código fuente, solo `containers/compose.yaml`.
  - `containers/compose.yaml` apunta `LLAMA_CPP_URL` a `http://host.containers.internal:8080/v1` (el puerto real de `llama-server` en el bastion, gestionado por `/opt/llama.cpp/current/scripts/start-server.sh` con `--jinja`), reemplazando el `:43110` de la config anterior/mock.
  - Sigue pendiente evaluar si `qwen2.5-coder-3b-instruct` es la mejor opción de calidad conversacional para chat general (es un modelo de código, no de chat general) — para la demo de OCR es suficiente, pero para el "ChatGPT comunitario" completo valdría la pena probar `qwen2.5-3b-chat-q4` (chat genérico, no coder) con el mismo procedimiento de verificación.
  - Alternativa de diseño no implementada: permitir que `classifyIntent()` dispare la tool directamente por keyword sin depender de que el LLM la solicite — sigue siendo una opción válida para hardware aún más limitado que no pueda correr ni siquiera un 3B a velocidad aceptable (126s por respuesta en este hardware, ver DEC-0017).

## DEC-0017 — `llama-server --jinja` no siempre llena `tool_calls`; se agregó un parser de fallback (corregido)

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Al verificar `qwen2.5-coder-3b-instruct` con una llamada real (`curl` con `tools` array contra `llama-server --jinja`), el modelo sí decidió invocar `ocr_extract` — pero la respuesta llegó como `finish_reason: "stop"` con el JSON de la llamada (`{"name": "ocr_extract", "arguments": {...}}`) escrito como texto plano dentro de `content`, **no** en el campo estructurado `tool_calls` que espera el formato OpenAI-compatible. `examples/llm-provider/src/llm-bridge.ts` solo leía `message.tool_calls` literal (`const toolCalls = message.tool_calls || []`), así que en la práctica seguía viendo `toolCalls: []` y el runtime nunca ejecutaba la tool — mismo síntoma que DEC-0016, causa distinta. Esto ocurre porque `--jinja` activa el chat template del modelo pero no garantiza que `llama-server` parsee correctamente ese texto hacia el array `tool_calls` para todos los templates/versiones.
- **Decisión:** Agregar un fallback en `llm-bridge.ts` (`tryParseFallbackToolCall`): cuando `tool_calls` viene vacío pero la petición sí incluía `tools` y `content` es un JSON parseable con forma `{"name": "...", "arguments": {...}}` cuyo `name` coincide con una tool realmente ofrecida, se sintetiza un `ToolCall` válido. Solo se activa si el nombre coincide con una tool conocida — evita falsos positivos con texto conversacional que por casualidad empiece con `{`.
- **Consecuencias:**
  - El fix vive en el provider (`llm-bridge.ts`), no en el agent-server — correcto según la arquitectura: el provider es responsable de traducir la respuesta cruda del servicio real a la forma FHS tipada (`docs/proveedores.md`, `docs/protocolo-provider.md`).
  - Cualquier futuro provider LLM (Python, Rust, Java — ver DEC-0011) que envuelva `llama-server` u otro motor con soporte de tool-calling poco confiable debe implementar el mismo tipo de fallback — se documenta como advertencia en `docs/protocolo-provider.md`.
  - Riesgo residual: si un modelo genuinamente conversacional responde con un JSON que por coincidencia tiene forma `{"name": ..., "arguments": ...}` y el nombre coincide con una tool ofrecida, se ejecutaría la tool por error. Se considera aceptable para el PoC; en producción real convendría preferir modelos donde `llama-server` sí llene `tool_calls` nativamente y tratar este fallback como red de seguridad, no como mecanismo primario.

## DEC-0018 — El EventBus difunde eventos de una conversación a TODAS las conexiones activas (bug encontrado y corregido)

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Al validar el pipeline de OCR corriendo dos pruebas seguidas (una con PDF inválido, otra con PDF válido, cada una su propio WebSocket/`conversationId`), la segunda prueba recibió el `assistant.delta`/`assistant.completed` de la **primera** conversación — que seguía procesándose en el servidor (126 segundos de inferencia) cuando la segunda conexión ya estaba abierta. El script de prueba, al ver un `assistant.completed` que interpretó como propio, cerró la conexión prematuramente, antes de que su propio `tool.call` real llegara a ejecutarse (confirmado con los logs de `ocr-provider`, que sí muestran el `tool.call` de la segunda conversación ocurriendo *después*). Causa raíz: `apps/agent-server/src/sse/event-bus.ts` → `EventBus.emit()` itera sobre **todos** los clientes suscritos y les manda el evento sin ningún filtro; `apps/agent-server/src/api/chat-ws.ts` tiene un comentario que dice "Solo reenviar eventos de la conversación activa" pero el código nunca implementó ese filtro. De los 12 tipos de `AgentSSEEvent` (`packages/fhs-protocol/src/sse.ts`), solo `SessionEvent` lleva `conversationId` — el resto (`agent.status`, `llm.selected`, `tool.*`, `assistant.*`, `error`) no lo llevan, así que ni siquiera hay campo para filtrar hoy.
- **Por qué es grave, no solo cosmético:** con dos o más chats concurrentes (dos pestañas del navegador, o dos usuarios distintos de la comunidad), cada uno ve en su panel de actividad y en su respuesta los eventos de la conversación de otro. Para un proyecto cuyo pilar es la privacidad y la procedencia auditable por usuario, que la respuesta de otra persona se mezcle con la propia es una contradicción directa con `docs/protocolo.md` (sección Privacidad).
- **Solución implementada:**
  1. Se agregó `conversationId` a todos los eventos conversation-scoped en `packages/fhs-protocol/src/sse.ts` (`agent.status`, `llm.selected`, `tool.selected`, `tool.running`, `tool.completed`, `tool.error`, `assistant.delta`, `assistant.completed`, `error` — este último con `conversationId` opcional, ausente solo en errores de parseo previos a cualquier conversación). Los eventos verdaderamente globales (`node.online`, `node.lost`) quedan sin ese campo, correctamente.
  2. `AgentRuntime.emit()` (`apps/agent-server/src/agent/runtime.ts`) ahora inyecta `this.conversationId` automáticamente en **todo** evento que pasa por él — no se dejó como responsabilidad de cada call site individual, precisamente para no repetir el patrón de "alguien se olvida de un caso" que originó DEC-0014/DEC-0015/DEC-0016.
  3. En `chat-ws.ts`, el `send` que se pasa a `eventBus.subscribe(...)` filtra: reenvía el evento solo si no tiene `conversationId` (global) o si coincide con el `conversationId` de ese socket.
- **Verificación:** probado con dos conversaciones concurrentes reales contra el bastion (`qwen2.5-coder-3b-instruct`, dos inferencias en paralelo compitiendo por los mismos 4 núcleos físicos — no un test artificial). Ambos clientes recibieron únicamente sus propios eventos, incluidos `assistant.delta`/`assistant.completed`, sin ninguna fuga cruzada. Confirma que el fix funciona bajo concurrencia real, no solo en el caso feliz de una sola conversación.
- **Consecuencias:** ya no hay riesgo de actividad cruzada entre conversaciones en demos con múltiples usuarios simultáneos. Relacionado pero distinto de DEC-0012 (que es sobre *loggear* metadata para diagnóstico, no sobre *aislar* eventos entre clientes).

## DEC-0019 — Configuración de modelo por variables de entorno en vez de hardcodeada (mantenibilidad)

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Hasta este punto, `examples/llm-provider/src/index.ts` tenía el modelo del manifiesto (`id`, `displayName`, `contextWindow`, `toolCalling.supported`) escrito directamente en el código fuente. Este hardcode fue precisamente lo que hizo que el bug de DEC-0016 (ningún modelo con tool calling) pasara desapercibido tanto tiempo: cambiar de modelo en el bastion (algo que ya pasó varias veces — de DeepSeek R1 a Qwen 0.5B, y ahora a Qwen2.5-Coder-3B) requería editar código TypeScript y reconstruir la imagen del contenedor, en vez de ser un cambio de configuración. Nada forzaba a que el manifiesto declarado coincidiera con el modelo realmente cargado en `llama-server`.
- **Decisión:** El manifiesto de `llm-provider` ahora lee `MODEL_ID`, `MODEL_DISPLAY_NAME`, `MODEL_CONTEXT_WINDOW` y `MODEL_TOOL_CALLING_SUPPORTED` de variables de entorno (con defaults razonables en el código), configuradas en `containers/compose.yaml`. Cambiar de modelo — incluyendo si soporta tool calling o no — ya no requiere tocar `examples/llm-provider/src/index.ts` ni reconstruir la imagen por ese motivo.
- **Consecuencias:**
  - `containers/compose.yaml` es ahora la única fuente de verdad de qué modelo está sirviendo `llm-provider`; debe mantenerse sincronizado manualmente con lo que realmente corre en `llama-server` en el bastion (no hay verificación automática todavía — ver punto siguiente).
  - Reduce, pero no elimina, el riesgo de DEC-0016/DEC-0017: sigue siendo posible declarar `MODEL_TOOL_CALLING_SUPPORTED=true` para un modelo que en la práctica no lo soporta de forma confiable. La única defensa real contra eso es la disciplina de verificar con `curl` antes de cambiar la variable (documentado en `docs/protocolo-provider.md`, "Lecciones de integración").
  - Patrón a replicar: cualquier dato que describa "qué está corriendo realmente" (modelo, versión, capacidades) debe vivir en configuración desplegable, no en código fuente que solo cambia mediante rebuild — aplica igual a futuros providers en Python/Rust/Java (DEC-0011).

## DEC-0020 — Ejecución determinística de OCR: no depender de que el LLM decida invocar la tool

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Pruebas end-to-end repetidas (DEC-0016, DEC-0017) mostraron que `qwen2.5-coder-3b-instruct` invoca `ocr_extract` de forma **inconsistente**: en una corrida sí generó el tool call correctamente, en otra respondió conversacionalmente pidiendo el archivo, y en otra regurgitó el schema JSON de la tool como texto plano. El mismo modelo, la misma petición estructural, tres comportamientos distintos. Esto hace que la funcionalidad de OCR — el caso de uso central de la demo — no sea confiable para producción, sin importar qué tan bien esté implementado el resto del pipeline (DEC-0014, DEC-0015 ya corregidos).

  Se evaluaron varias alternativas:
  1. **Reintentar la llamada al LLM** si no invoca la tool — no soluciona el problema de raíz, solo reduce la probabilidad de fallo; sigue siendo no-determinístico y duplica latencia (ya de por sí alta: 30s–300s por llamada en este hardware).
  2. **Grammar/constrained decoding** en `llama-server` para forzar el formato de tool call — técnicamente posible (GBNF grammars), pero el build actual de `llama-server` en el bastion es antiguo (`b1-fd1a057`) y no hay certeza de soporte completo; añade complejidad significativa para un problema que tiene una solución más simple.
  3. **Cambiar a un modelo más grande y confiable** (ej. Hermes-2-Pro-8B) — descartado: en este hardware (CPU sin GPU) sería aún más lento que los 30-300s ya observados con 3B.
  4. **Ejecución determinística**: cuando el usuario adjunta un archivo, la intención de usar OCR ya es inequívoca — no hace falta que el LLM "decida" nada. `classifyIntent()` ya resuelve la capability por keyword; si además hay un artifact adjunto y existe un provider de `document.ocr`, se ejecuta directamente.
- **Decisión:** Implementar la opción 4. En `apps/agent-server/src/agent/runtime.ts`, antes de la primera llamada al LLM: si hay artifacts y se resolvió un provider `document.ocr`, se ejecuta la tool inmediatamente (`runOcrDeterministically`), se remueve esa tool de las `toolDefinitions` ofrecidas al LLM (para no ofrecerla dos veces ni confundirlo), y el texto extraído se antepone al mensaje del usuario como contexto (`[Texto extraído automáticamente del archivo adjunto mediante OCR]\n<texto>\n\n[Pregunta del usuario]\n<mensaje>`). El LLM ya no necesita tool calling para usar OCR — solo necesita leer texto y responder, algo que sí hace de forma confiable.
- **Consecuencias:**
  - **Una sola llamada al LLM en vez de dos** para el caso de uso de OCR (antes: llamada con tools → tool call → llamada final sin tools). Reduce la latencia total a la mitad en el caso más común, además de eliminar la fuente principal de no-determinismo.
  - Si el OCR falla (proveedor caído, archivo corrupto), se degrada con gracia: se informa en el mensaje al LLM (`"No se pudo extraer texto del archivo adjunto."`) en vez de fallar la conversación completa — cumple la regla 9 del protocolo (`docs/protocolo.md`).
  - Este patrón — **ejecución determinística de una capability cuando la intención del usuario ya es inequívoca por la acción que tomó (adjuntar un archivo), en vez de delegarla al LLM** — se adopta como precedente para diseñar `rag-provider` (ver spec en `spec-native/specs/rag-provider/SPEC.md`): la recuperación de contexto (retrieval) también debe ser un paso determinístico del pipeline, no una tool que el LLM decide usar o no.
  - Sigue habiendo tools ofrecidas al LLM para otras capabilities que si dependen de una decisión genuina (no disparada por una acción explícita del usuario como adjuntar un archivo) — el tool calling nativo no se elimina del protocolo, solo se evita para el caso donde ya no aporta nada (la decisión ya está tomada por el usuario).
- **Verificación:** probado end-to-end contra el bastion real tras el fix. Primer intento reveló un segundo problema: la ejecución determinística seguía dependiendo de que `classifyIntent()` detectara palabras clave ("ocr"/"texto"/"imagen") en el mensaje del usuario — una pregunta como "¿Qué dice este documento?" no las contiene, así que no se resolvía ningún provider y el flujo determinístico nunca se activaba. Corregido: si hay `artifacts`, se agrega `document.ocr` a las capabilities resueltas sin importar el texto del mensaje. Con ambos fixes, la prueba final mostró `tool.selected → tool.running → tool.completed (100ms, success: true)` disparados sin ninguna decisión del LLM, con una sola llamada al LLM (no dos) para la respuesta final.

## DEC-0021 — Modo de OCR configurable: `confirm` (default) vs `auto`

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** SPEC-OCRCONFIRM-0001 introdujo un paso de confirmación explícita antes de que el LLM use el texto OCR — más transparente, pero agrega una vuelta extra a la conversación. Algunos usos (demo controlada, usuario que confía en la calidad del OCR) prefieren el comportamiento original de DEC-0020: una sola llamada, sin fricción.
- **Decisión:** Agregar `preferences.ocrMode: "confirm" | "auto"` (`ModelPreferences` en `apps/agent-server/src/agent/runtime.ts`). En `apps/agent-server/src/api/chat-ws.ts`, si `ocrMode === "auto"`, el turno con `artifacts` llama directo a `runtime.run(message, preferences, artifacts)` (comportamiento DEC-0020, sin el paso de `extractOcrText` + confirmación de SPEC-OCRCONFIRM-0001). El default (`"confirm"`, o el campo ausente) mantiene el flujo de confirmación. Selector visible en la barra de configuración del chat web.
- **Consecuencias:**
  - Ninguna de las dos rutas es "la correcta" — son un trade-off explícito entre velocidad/fricción que el usuario elige, no una decisión que el sistema tome por él.
  - No se agregó lógica nueva de ejecución: `auto` simplemente reutiliza la rama de `AgentRuntime.run()` que ya existía antes de SPEC-OCRCONFIRM-0001 y que se mantuvo intacta para no duplicar código.
  - Verificado end-to-end: en modo `auto`, `tool.completed` (OCR) y `assistant.delta` llegan en la misma respuesta del WebSocket, sin `ocr.extracted` ni pausa — confirmado con un PDF real contra el bastion.

## DEC-0022 — Topología multi-host: core en laptop, providers pesados en bastion

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Todo el stack corría en un solo host (el bastion), lo cual demuestra el protocolo pero no la federación real que es el pitch del proyecto — "hardware distinto aportando capacidades distintas". Se decide separar en dos máquinas de la misma LAN: **laptop** (core — `apps/web` + `apps/agent-server`, incluyendo el Registry) y **bastion** (providers pesados — `examples/llm-provider` + `llama-server`, `examples/ocr-provider` + `ether-ocr-api`). Ambas máquinas están en la misma LAN, alcanzables por IP directa; el bastion es además el punto de entrada SSH habitual, pero eso no afecta el tráfico del protocolo FHS, que va directo por la LAN.
- **Problema técnico encontrado antes de documentar el despliegue:** `containers/compose.yaml` tenía el `REGISTRY_URL` y el hostname que cada provider anuncia en su manifiesto **hardcodeados** a nombres de Docker DNS (`ws://agent-server:8081/...`, `LLM_PROVIDER_HOST=llm-provider`) — funcionan solo cuando todo corre en el mismo host compartiendo la red `fhs` de Docker. Imposible de usar para un despliegue de dos máquinas sin editar el archivo cada vez.
- **Decisión:**
  1. `LLM_PROVIDER_HOST`/`OCR_PROVIDER_HOST` y `REGISTRY_URL` (renombrado en compose a `PROVIDER_REGISTRY_URL`, ver más abajo) se vuelven sobreescribibles vía `${VAR:-default}` en `compose.yaml`, preservando el comportamiento de un solo host sin tocar nada si no se sobreescriben.
  2. Se usa `PROVIDER_REGISTRY_URL`, no `REGISTRY_URL`, a propósito: el `.env` del repo ya define `REGISTRY_URL` para desarrollo local sin contenedores (apunta a `localhost`), y `podman-compose`/`docker compose` cargan `.env` automáticamente — reusar el mismo nombre habría hecho que ese valor de desarrollo local se colara silenciosamente en el despliegue de contenedores, rompiendo el default de un solo host. Confirmado con `podman-compose config` antes y después del cambio.
  3. Se removió `depends_on: agent-server` de `llm-provider`/`ocr-provider` en `compose.yaml` — con esa dependencia, levantar solo `llm-provider` en el bastion (`just container-up-llm`) intentaba también construir/levantar `agent-server` localmente ahí, sin sentido cuando `agent-server` vive en otra máquina.
  4. Documentado en `docs/despliegue-multi-host.md` con diagramas Mermaid: topología, ciclo de registro entre hosts, tabla de puertos/firewall, pasos de despliegue por máquina, y checklist de verificación end-to-end.
- **Consecuencias:**
  - Nuevo punto único de fallo: si la laptop se apaga o pierde red, el Registry desaparece y ambos providers del bastion quedan sin poder registrarse (antes el Registry vivía en el bastion, la máquina "siempre encendida"). No resuelto en esta iteración — queda como riesgo documentado, relacionado con "Separar Registry del Agent Backend" en `spec-native/ROADMAP.md`.
  - El agent-server de la laptop debe escuchar en `0.0.0.0`, no solo `127.0.0.1` — ya es el default en `containers/compose.yaml`, pero hay que verificarlo explícitamente en modo dev sin contenedores.
  - Ningún cambio de código en `apps/agent-server`, `apps/web`, `examples/llm-provider` o `examples/ocr-provider` — el protocolo FHS ya estaba diseñado para esto (los providers inician la conexión hacia el Registry, nunca al revés). El único cambio fue de configuración desplegable, siguiendo el mismo patrón de DEC-0019.
  - Pendiente: ejecutar el despliegue real en las dos máquinas y correr el checklist de verificación de `docs/despliegue-multi-host.md` — este DEC documenta la decisión y el cambio de código, no una verificación end-to-end multi-host todavía (no se dispone de una segunda máquina real en este entorno de trabajo).

- **Verificación real (2026-07-02, sesión posterior):** desplegado en las dos máquinas reales (laptop `192.168.3.137` con `agent-server`+`web`; bastion `192.168.3.173` con `llm-provider`+`ocr-provider`+`ether-ocr-api`). Aparecieron dos problemas nuevos, ninguno relacionado con el protocolo FHS en sí:
  1. **Mapeo de puertos inconsistente**: `llm-provider`/`ocr-provider` publicaban `30084:43111`/`30085:43112` (remapeados), pero el manifiesto que cada provider anuncia usa `LLM_PROVIDER_PORT`/`OCR_PROVIDER_PORT` (el puerto **interno**, 43111/43112) tanto para escuchar como para el endpoint publicado. En un solo host esto no importaba (Docker DNS iba directo al puerto interno, sin pasar por el mapeo). Entre dos hosts, el agent-server de la laptop habría intentado conectarse al puerto equivocado. Corregido: se quitó el remapeo en `containers/compose.yaml` (`"43111:43111"`, `"43112:43112"`) — host, contenedor y manifiesto ahora usan el mismo puerto siempre.
  2. **UFW bloqueaba las conexiones entrantes** en ambas máquinas — no fail2ban (0 IPs baneadas, se descartó esa hipótesis con `fail2ban-client status`), sino reglas UFW/nftables con policy `DROP` en `INPUT` y solo `tcp dport 22` explícitamente permitido. Diagnosticado con `sudo nft list ruleset` (mostró las chains `ufw-user-input` con solo SSH permitido). Resuelto agregando reglas UFW específicas, acotadas a la LAN (no a "Anywhere"):
     ```bash
     # En la laptop
     sudo ufw allow from 192.168.3.0/24 to any port 30083 proto tcp comment 'FHS agent-server (Registry+Chat)'
     # En el bastion
     sudo ufw allow from 192.168.3.0/24 to any port 43111 proto tcp comment 'FHS llm-provider'
     sudo ufw allow from 192.168.3.0/24 to any port 43112 proto tcp comment 'FHS ocr-provider'
     ```
  - Tras ambos fixes: providers registrados correctamente (`/api/fhs/providers` desde la laptop muestra ambos con sus endpoints reales del bastion), chat simple funcionando cross-host, y flujo completo de OCR (adjuntar → `ocr.extracted` → confirmar → respuesta del LLM usando el texto) verificado con un PDF real, cruzando ambas máquinas de punta a punta.
  - **Lección**: "el Registry ve el provider como código = 200 en `/health`" no es la misma verificación que "dos máquinas distintas realmente pueden hablarse" — el firewall de host es una capa completamente aparte del protocolo FHS y hay que probarla explícitamente, no asumir que basta con que los servicios estén arriba (mismo principio de `docs/protocolo-provider.md`, "Lecciones de integración", aplicado ahora a la capa de red en vez de a la capa de aplicación).

## DEC-0023 — TLS con certificado autofirmado en todo el protocolo FHS

- **Fecha:** 2026-07-02
- **Estado:** `accepted`
- **Contexto:** Con la topología multi-host (DEC-0022) validada, todo el tráfico FHS entre `agent-server` (laptop) y los providers (bastion) viajaba en texto plano por la LAN real — antes, en un solo host, esto era tráfico interno de Docker sin exposición a la red. Último ajuste de la PoC: cifrar ese tráfico con TLS/WSS, usando un certificado autofirmado (sin CA — el objetivo es cifrar el canal, no probar identidad ante terceros; eso ya lo cubre el DID del protocolo).
- **Decisión:** Habilitar TLS de forma **opt-in** (no rompe el despliegue actual sin TLS):
  - `apps/agent-server`: `TLS_CERT_PATH`/`TLS_KEY_PATH` activan `https` en Fastify — cubre Registry y Chat API con el mismo servidor.
  - `examples/llm-provider`, `examples/ocr-provider`: mismas variables activan un `https.createServer` para su propio servidor (chat/tools) y cambian el esquema anunciado en el manifiesto a `wss://`.
  - Clientes WebSocket (`llm-gateway.ts`, `mcp-host.ts`, clientes de Registry en ambos providers): `{ rejectUnauthorized: false }` cuando la URL es `wss://` — necesario porque no hay CA que Node reconozca para un cert autofirmado.
  - `apps/web`: `containers/web/nginx-tls.conf` (archivo separado, no reemplaza `nginx.conf`) termina TLS para el navegador y reenvía a `agent-server` por HTTPS con `proxy_ssl_verify off`.
  - Despliegue vía overlay `containers/compose.tls.yaml`, sumado a `compose.yaml` (no lo modifica) — `podman-compose -f compose.yaml -f compose.tls.yaml up`. Certificado generado con `helpers/scripts/shell/generate-dev-cert.sh <ip-laptop> <ip-bastion>` (SAN cubre ambas IPs + localhost), gitignored.
- **Consecuencias:**
  - Cero riesgo para el despliegue existente: sin las variables `TLS_CERT_PATH`/`TLS_KEY_PATH` ni el overlay de compose, todo se comporta exactamente igual que antes (`ws://`/`http://`).
  - `rejectUnauthorized: false` acepta cualquier certificado autofirmado, no solo el propio — aceptable para una PoC en LAN de confianza, pero es una debilidad real si se usara fuera de ese contexto (documentado explícitamente en `docs/tls-autofirmado.md`, no se disimula).
  - Verificado en local (no en el despliegue real multi-host de esta sesión, por tiempo): `agent-server` sirve `https://` y `/api/fhs/providers` responde correctamente vía TLS; `llm-provider` y `ocr-provider` se registran contra un Registry `wss://` y publican su propio endpoint como `wss://`; ambos verificados de forma aislada (arranque + registro), no con el pipeline completo de OCR sobre TLS.
  - Pendiente: aplicar el overlay TLS en el despliegue real (laptop + bastion) y repetir el checklist de verificación end-to-end de `docs/despliegue-multi-host.md` sobre el canal cifrado.

- **Verificación real (2026-07-02, misma sesión, después):** aplicado el overlay TLS sobre el despliegue multi-host real. Aparecieron tres problemas nuevos, todos de infraestructura/entorno, ninguno del código TLS en sí:
  1. **Bind-mount de `../certs` no resuelve en el host remoto**: el bastion se administra vía conexión remota de podman (`bastion-tunnel`) sin checkout del repo ahí — la ruta relativa del volumen se resuelve en el cliente (esta máquina), no en el host que ejecuta el contenedor. Corregido: `containers/compose.tls.yaml` usa `${CERTS_DIR:-../certs}` (default sin cambios para el caso local/laptop; override a una ruta absoluta cuando se administra remotamente).
  2. **Puerto 443 privilegiado**: podman rootless no puede exponer puertos `<1024` sin ajustar `net.ipv4.ip_unprivileged_port_start` o correr con `sudo`. Cambiado a `8443:443` — puerto ya presente en la whitelist UFW del bastion de despliegues previos ("Apps").
  3. **Túnel SSH del socket de podman se cayó a mitad de la operación** (coincidiendo con una caída momentánea de SSH al bastion, causa externa no diagnosticada — se recuperó sola en segundos). El túnel (`ssh -L 18080:/run/user/1000/podman/podman.sock bastion`) no se reconecta solo; hubo que recrearlo manualmente. No es un problema del código de esta PoC, pero vale la pena anotar como fragilidad operativa del entorno de trabajo, no del protocolo FHS.
  - Tras los tres fixes: `agent-server` y `web` corriendo con TLS en la laptop (`https://192.168.3.137:30083`, `https://192.168.3.137:8443`); `llm-provider`/`ocr-provider` registrados desde el bastion contra el Registry por `wss://`, con sus endpoints publicados correctamente como `wss://192.168.3.173:43111` y `:43112`. **Chat simple y flujo completo de OCR (adjuntar → extraer → confirmar → responder) verificados de punta a punta sobre el canal cifrado**, cruzando ambas máquinas reales — mismo resultado que la verificación sin TLS (DEC-0022), ahora con todo el tráfico FHS cifrado.

## DEC-0024 — Vocabulario espacial: "Star" para LLM, "Satellite" para tools, "nodo" como término neutro

- **Fecha:** 2026-07-05
- **Estado:** `accepted`
- **Contexto:** `spec-native/specs/satelite-rating/SPEC.md` había adoptado "satélite" como término de producto para *cualquier* nodo de la red (LLM u OCR/tool, sin distinción), reutilizado luego en `spec-native/specs/p2p-discovery/SPEC.md`. El usuario propuso después un vocabulario espacial más completo (`spec-native/specs/vocabulario-espacial/SPEC.md`, SPEC-VOCAB-0001) que reserva "Star" para nodos de razonamiento (LLM) y "Satellite" solo para nodos de herramientas — en conflicto directo con el uso genérico ya adoptado.
- **Decisión:** Se elige explícitamente reservar los términos:
  - **"Star" (estrella)** — nodo de razonamiento/generación (LLM). Metáfora: en una galaxia, las estrellas son la fuente de energía.
  - **"Satellite" (satélite)** — nodo de herramientas/capacidades específicas (OCR, búsqueda, etc.). Metáfora: orbitan y aportan una función.
  - **"Node" (nodo)** — término neutro cuando algo aplica a cualquier tipo de nodo por igual (ej. el dispatcher/mosquito, el heartbeat, el descubrimiento por mDNS) — nunca "satélite" como paraguas.
  - Sin cambios en el protocolo FHS ni en el código: `provider`, `providerId`, `provider.type`, `capability`, `manifest`, `registry` siguen exactamente igual. Es vocabulario de documentación/UI/marca únicamente (mismo principio ya establecido para "satélite" en `satelite-rating`).
- **Consecuencias:**
  - `spec-native/specs/satelite-rating/SPEC.md` y `spec-native/specs/p2p-discovery/SPEC.md` (ambas en `draft`, sin código implementado) se actualizaron para reemplazar el uso genérico de "satélite" por "nodo", reservando "estrella"/"satélite" para cuando la distinción LLM/tool importa. Se decidió ahora, antes de implementar `satelite-rating`, porque el costo de cambiar de opinión después habría sido mucho mayor (rating, métricas y menciones ya habrían usado el nombre viejo).
  - `spec-native/ROADMAP.md` y `spec-native/TRACEABILITY.md` actualizados para reflejar el vocabulario nuevo.
  - Pendiente (no bloqueante): documento canónico `docs/vocabulario.md` con la tabla completa, y la frase de posicionamiento (ES/EN) incorporada al portal web (`site/index.md`) — ver TASK-VOCAB-0002 y TASK-VOCAB-0004 en `spec-native/tasks/vocabulario-espacial/TASKS.md`.

## DEC-0025 — Separar memoria de conversación / RAG / KB; retención generalizada y disparo determinístico de RAG

- **Fecha:** 2026-07-05
- **Estado:** `accepted`
- **Contexto:** `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001, `draft`) mezclaba bajo el nombre "RAG" tres capacidades con superficies de riesgo y ciclos de vida distintos: (1) memoria de conversación, limitada a lo que el nodo la ofrezca; (2) RAG propiamente — trocear+embeber+guardar contenido aportado por el usuario, con retención acotada (sesión/horas/días/meses); (3) bases de conocimiento (KB) — contenido curado por el operador, de solo lectura, persistente y compartido entre conversaciones. El manifiesto FHS solo distinguía `privacy.retention: "none" | "session"`, insuficiente para expresar TTLs arbitrarios o contenido permanente de solo lectura. Además, quedaban dos riesgos de diseño abiertos en el SPEC: dónde vive el estado "conversación X tiene documento indexado" (dado que `AgentRuntime` se recrea por mensaje, no por conversación) y si conviene compartir/reutilizar un RAG entre usuarios que suben el mismo documento (caso de ejemplo: la Constitución de México subida por N usuarios).
- **Decisión:**
  1. **Tres capacidades de protocolo, no una:**
     - **Memoria de conversación** — capability opcional de un nodo (puede no ofrecerla); su ausencia se trata como caso normal, no como error.
     - **RAG** — capability `document.index`/`document.retrieve`, alcance por `conversationId`, contenido siempre privado por defecto, **nunca compartido ni deduplicado entre conversaciones** (ni siquiera si el hash del documento coincide) — compartir estado rompería el modelo de retención por conversación (¿de quién es el TTL si dos conversaciones referencian el mismo chunk?).
     - **KB** — capability nueva `kb.query`, de solo lectura para quien consulta, poblada por el operador del nodo **fuera de banda** (no a través del flujo de chat de un usuario), sin TTL (retención `"permanent-readonly"`). Es el mecanismo correcto para contenido público reutilizable (ejemplo: la Constitución de México) — no una feature de RAG. Draft en `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001).
  2. **`privacy.retention` se generaliza** de enum fijo a valor declarado: `"none" | "session" | { ttl: string (ISO 8601 duration) } | "permanent-readonly"` — debe ser público en el manifiesto para que quien use el nodo sepa cuánto vive lo que sube antes de decidir confiar en él.
  3. **`privacy.warning` obligatorio** para cualquier nodo con retención `"session"` o `ttl`: texto que el `Portal` (web) está obligado a mostrar antes de aceptar el primer adjunto (ej. "no compartas información sensible aquí"). No es texto libre a discreción del provider — es un campo requerido del contrato (`docs/protocolo-provider.md`).
  4. **Disparo de indexado en RAG: solo por evento explícito y confirmado** — adjunto de archivo ya confirmado por el usuario (mismo paso que `ocr-confirmacion`, SPEC-OCRCONFIRM-0001), o resultado de un futuro servicio de websearch. Nunca especulativo ni en cada mensaje. Esto hace a RAG agnóstico a la fuente del texto: el contrato `document_index(text, conversationId)` no cambia si mañana el origen es websearch en vez de OCR.
  5. **Estado "conversación con RAG activo" vive en `apps/agent-server/src/api/chat-ws.ts`**, en el mismo lugar y con el mismo patrón que `pendingAttachments` (ya introducido por `ocr-confirmacion`) — un flag ligero (`Set<conversationId>` o equivalente) que se marca en el momento del evento de indexado confirmado. `runtime.ts` solo llama a `document_query` para conversaciones marcadas — evita tanto preguntar siempre (costo de cómputo innecesario) como reintroducir un riesgo de estado en el `rag-provider` que la spec original dejaba sin resolver.
  6. **Recuperación en turnos posteriores es silenciosa** — sin UI nueva que muestre los fragmentos recuperados turno a turno (se descarta esa idea por simplicidad). La confirmación de adjunto ya existente se mantiene sin cambios, porque ahora cumple doble función: aprobación del usuario + disparo de indexado. Trazabilidad de qué se recuperó, si hace falta a futuro, se resuelve vía DEC-0012 (loggear `requestId`↔`conversationId`), no en la interfaz de chat.
  7. **Modelo de embeddings como proceso aparte**: `rag-provider` habla por HTTP a un `llama-server --embedding` externo (mismo patrón que `llm-provider`/`ocr-provider` hablan con su propio motor de inferencia vía bridge) — no lo administra como subproceso interno. Mantiene consistente la separación "nodo FHS delgado" vs "motor de inferencia".
- **Consecuencias:**
  - `spec-native/specs/rag-provider/SPEC.md` se reescribe para reflejar 4, 5, 6 y 7 — ya no queda ningún riesgo de diseño sin resolver antes de implementar.
  - Nuevo draft `spec-native/specs/kb-provider/SPEC.md` (SPEC-KB-0001), sin implementar, para el caso de solo lectura compartido.
  - `docs/protocolo-provider.md` requiere actualización futura (no bloqueante) para documentar `privacy.retention` generalizado y `privacy.warning` como campos del contrato — no se hace en este DEC porque ninguna de las dos capacidades tiene código todavía; se hará junto con la primera implementación (RAG o KB) que la necesite.
  - Promoción automática de un documento de RAG a KB (ej. detectar que muchos usuarios suben el mismo hash) queda explícitamente fuera de alcance — la promoción es una decisión de curaduría manual del operador, no una feature del protocolo.
  - **Corrección posterior (ver DEC-0026):** el punto 7 de esta decisión ("modelo de embeddings como proceso aparte hablando a `llama-server --embedding`") se reformula — el protocolo nunca debe mandatar un motor de inferencia específico. Ese punto pasa a ser una guía de implementación sugerida, no un requisito de alcance.

## DEC-0026 — El protocolo nunca mandata el motor detrás de una capability; solo define el contrato

- **Fecha:** 2026-07-05
- **Estado:** `accepted`
- **Contexto:** DEC-0025 (punto 7) y el primer borrador de `SPEC-RAG-0001` describían el "trocea + embebe + guarda" de RAG como implementado necesariamente vía un `llama-server --embedding` externo. El usuario señaló que esto contradice un principio ya implícito en el resto del proyecto (`docs/protocolo-provider.md`, sección "Lecciones de integración", punto 4: "cualquier provider LLM que envuelva un motor de inferencia de terceros — llama.cpp, Ollama, vLLM, etc. — debe verificar el formato real de la respuesta", nunca asumido ni fijado por el protocolo): el nodo que ofrece una capability decide libremente cómo la implementa — `llama-server --embedding`, un script Python con una librería de embeddings, un wrapper a una API de terceros, lo que sea. El protocolo FHS (`docs/protocolo-provider.md`) define el contrato (tools expuestas, parámetros, manifiesto, ciclo de vida hello/register/ping) — nunca el lenguaje, framework o motor detrás.
- **Decisión:**
  - Se declara explícitamente como principio de protocolo (aplica a **todo tipo de nodo**, no solo `rag-provider`): el operador de un nodo (Star o Satellite) decide libremente su implementación interna — motor de inferencia, lenguaje, si envuelve una API de terceros con API key, etc. El protocolo solo exige que el nodo cumpla el contrato de manifiesto/capability/tool y el ciclo de vida `hello`/`register`/`ping` (`docs/protocolo-provider.md`).
  - Cualquier mención a una tecnología concreta (`llama-server --embedding`, `llama.cpp`, etc.) en un SPEC es **guía de implementación sugerida, no parte del alcance vinculante** — debe quedar marcada como tal explícitamente, para no confundir "cómo lo hace el ejemplo de referencia" con "qué exige el protocolo".
  - `SPEC-RAG-0001` se corrige: la sección "Alcance" ya no menciona `llama-server --embedding` como requisito; se mueve a una nueva sección "Guía de implementación sugerida (no vinculante)".
- **Consecuencias:**
  - Ningún cambio de código — es una aclaración de diseño y de cómo se redactan los SPECs de aquí en adelante.
  - `docs/protocolo-provider.md` ya reflejaba este principio de forma implícita para providers LLM (DEC-0017); esta decisión lo hace explícito y lo extiende formalmente a cualquier tipo de capability (RAG, KB, futuras).
  - Al redactar `spec-native/specs/kb-provider/SPEC.md` u otros specs futuros, cualquier tecnología de referencia mencionada debe marcarse igual de forma explícita como sugerencia, no requisito.

## DEC-0027 — Disparador de kb-provider: manual y recomendado ahora; "mágico" documentado pero no implementado

- **Fecha:** 2026-07-06
- **Estado:** `accepted`
- **Contexto:** `SPEC-KB-0001` quedó con un riesgo de diseño abierto (TASK-KB-0001): a diferencia de RAG, no hay un evento de "adjuntar" que dispare determinísticamente una consulta a una KB — hace falta decidir cómo el usuario o el sistema eligen cuál KB consultar. Se plantearon tres mecanismos: (1) selección manual explícita antes de conversar, (2) recomendación del sistema según la `description` de cada KB disponible, con confirmación del usuario, y (3) selección automática ("mágica") donde el modelo elige sin preguntar.
- **Decisión:**
  1. **Se implementan los modos (1) manual y (2) recomendado.** El modo (3) "mágico" queda **documentado como premisa/objetivo a futuro, explícitamente no implementado en esta iteración** — ver razón abajo.
  2. **Por qué no el modo "mágico" todavía:** dejar que el LLM de chat decida sin preguntar cuál KB usar reintroduce el mismo riesgo que DEC-0020 resolvió para OCR — los modelos que corren en este hardware comunitario (`qwen2.5-coder-3b`, 3B, sin GPU) no son confiables tomando decisiones de este tipo vía tool-calling (DEC-0016/DEC-0017: ni siquiera llenaban `tool_calls` de forma consistente, necesitaron un parser de respaldo). La consecuencia de una KB mal elegida es **peor** que la de una tool mal invocada: un `tool.error` es un fallo visible; una KB equivocada elegida "con confianza" produce una respuesta que suena autorizada pero viene del dominio incorrecto — un fallo silencioso que el usuario no puede detectar sin conocer la respuesta de antemano. Si en el futuro se implementa un modo automático, el *routing* (qué KB elegir) debe seguir siendo determinístico/reproducible (heurística de texto o embeddings contra `capability.description`, nunca una decisión de tool-calling del LLM principal) — solo la *ausencia de confirmación* sería lo "mágico", no el mecanismo de selección en sí.
  3. **La KB usada puede cambiar durante la conversación** — a diferencia de RAG (un documento fijo por conversación), cada pregunta puede requerir un dominio distinto. No hay bloqueo de "una KB por conversación".
  4. **Límite configurable de KBs por pregunta:** por default, una sola KB se consulta por cada pregunta individual (`preferences.kbMaxPerQuestion`, default `1`) — a lo largo de toda la conversación se pueden usar N KBs distintas (una por pregunta, o la misma repetida), pero no varias a la vez para la misma pregunta salvo que el usuario lo configure explícitamente subiendo ese límite. Si se sube por encima de 1, el `Portal` debe advertir que los modelos pequeños de este stack pueden volverse notablemente más lentos o directamente no completar una respuesta al combinar contexto de varias KBs a la vez.
- **Consecuencias:**
  - `SPEC-KB-0001` se reescribe: "Diseño" ya no tiene un riesgo abierto: modos manual/recomendado especificados, modo mágico documentado aparte como premisa futura con su propia advertencia.
  - `TASK-KB-0001` pasa de bloqueante a `done` — ya no bloquea el resto de tareas de implementación de `kb-provider`.
  - Nuevo campo de preferencias sugerido para la fase de implementación: `preferences.kbMode?: "manual" | "recommend"`, `preferences.kb?: string` (id de la KB elegida en modo manual), `preferences.kbMaxPerQuestion?: number` (default 1) — mismo patrón ya usado por `ocrMode` (DEC-0021) y `maxWaitMs` (DEC-0010).
  - Sin importar el modo, `provenance` debe declarar qué KB(s) se consultaron (o que no se consultó ninguna) — la regla 7 del protocolo (transparencia obligatoria) no se relaja por el modo elegido.

## DEC-0028 — Tags de capability: autodeclarados (diseñado) y de comunidad (diseñado, bloqueado por auth)

- **Fecha:** 2026-07-06
- **Estado:** `proposed` (diseño documentado, sin implementar ninguna de las dos partes todavía)
- **Contexto:** El modo "recomendada" de `kb-provider` (DEC-0027) hace matching determinístico contra `capability.description` — un texto libre, más ambiguo de comparar que palabras clave cortas. Además, `description` es autodeclarada por quien opera el nodo, sin ninguna forma de que otros usuarios contrasten esa afirmación con su propia experiencia — el mismo riesgo ya señalado en los riesgos de `SPEC-KB-0001` ("`capability.description` es autodeclarada, nadie la verifica").
- **Decisión — dos partes, ninguna implementada todavía:**
  1. **Tags autodeclarados por el proveedor** (`Capability.tags?: string[]`, `packages/fhs-protocol/src/types.ts`) — mismo nivel de confianza que `description` (autodeclarado, no verificado), pero en formato de palabras clave cortas. Sirve como señal adicional (no reemplazo de `description`) para el matching del modo "recomendada" de KB, y en general para cualquier capability (Star o Satellite) que quiera describirse con keywords además de una descripción larga. **Sin bloqueos** — listo para implementar cuando se priorice.
  2. **Tags de comunidad** — agregados por el Atlas (Registry) a partir de retroalimentación de usuarios reales, mostrados junto a los tags del proveedor para contrastar "qué dice ofrecer" vs "qué ha confirmado la comunidad". **Bloqueado explícitamente por falta de identidad de usuario** (`SPEC-AUTH-0001`, pausado en `spec-native/ROADMAP.md`) — sin poder distinguir usuarios reales distintos, este campo sería trivialmente manipulable por el propio operador del nodo (autoenviarse tags favorables), dando una falsa sensación de verificación independiente. Se descarta explícitamente cualquier mitigación intermedia sin auth real (rate-limiting por conexión, cookies, etc.) — daría una garantía débil disfrazada de señal confiable, peor que no tener el campo.
- **Diseño de referencia para cuando se retome `SPEC-AUTH-0001`** (no implementar antes):
  - Mecanismo de **confirmar/objetar tags ya propuestos por el proveedor** (`agree: boolean`), no tags libres nuevos — acota la superficie de spam/moderación frente a permitir cualquier texto.
  - Un voto por usuario autenticado por tag por nodo (evita que un mismo usuario infle un conteo).
  - El conteo agregado debe ser visible (ej. "3 personas opinaron esto" vs "300"), no solo el tag "ganador" — para que quien elige pueda juzgar la fuerza real del consenso, no solo su dirección.
  - Mensaje de protocolo tentativo (a definir con precisión cuando se implemente): algo como `capability.tag.feedback { capabilityId, providerId, tag, agree }`, requiere sesión autenticada.
- **Consecuencias:**
  - `spec-native/specs/kb-provider/SPEC.md` se actualiza para mencionar `tags` del proveedor como señal adicional para el modo "recomendada", y enlaza aquí para la parte de comunidad (bloqueada).
  - Esta decisión no depende de que `rag-provider` o `kb-provider` se implementen primero — aplica a cualquier `Capability` del protocolo, aunque la motivación inmediata sea KB.
  - Ninguna de las dos partes se implementa como consecuencia directa de esta decisión — es diseño de referencia, a implementar cuando se priorice (la parte 1 no tiene bloqueos; la parte 2 depende de que `SPEC-AUTH-0001` deje de estar pausado).
