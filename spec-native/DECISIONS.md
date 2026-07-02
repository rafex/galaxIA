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
- **Estado:** `proposed`
- **Contexto:** `ws-handler.ts` acepta cualquier `providerId` en el mensaje `hello` sin validación. Si dos conexiones distintas envían el mismo `providerId`, la segunda sobrescribe silenciosamente la conexión de la primera en el Registry. Con DID simplificado (nombre de texto sin firma, ver DEC-0004) esto permite que cualquier nodo suplante la identidad de otro con solo conectarse y reutilizar su `providerId`.
- **Decisión:** Antes de aceptar un `hello`, el Registry debe verificar si el `providerId` ya tiene una conexión activa (no expirada). Si la tiene, rechazar el nuevo `hello` (o exigir prueba de identidad, cuando exista Ed25519 según DEC-0004) en vez de sobrescribir.
- **Consecuencias:**
  - Cierra el vector de suplantación trivial mientras la identidad siga sin firma criptográfica.
  - Requiere definir el mensaje de rechazo (`type: "hello.rejected"` o similar) y cómo el provider legítimo recupera su slot si perdió conexión sin que el Registry lo detectara aún.
  - Complementa, no sustituye, la migración a Ed25519 de DEC-0004.
- **Adicional — heartbeat gestionado por el provider:** cada provider (`llm-provider`, `ocr-provider`, y cualquier futuro) debe implementar un despachador ("mosquito"/dispatcher) interno que gestione las peticiones entrantes de forma concurrente y responda cada una en su propio momento, sin bloquear el heartbeat (`ping`) ni las respuestas a otras peticiones en curso. Esto evita que un provider ocupado en una tarea larga (ej. OCR de un documento grande) deje de enviar `ping` y sea marcado `lost` por el Registry (lease de 30s, DEC-0001) mientras sigue vivo.

## DEC-0010 — Heartbeat: ¿el servidor también debe emitir `ping`?

- **Fecha:** 2026-07-01
- **Estado:** `proposed`
- **Contexto:** Hoy solo los providers envían `ping` cada 10s (`HEARTBEAT_INTERVAL_SECONDS`, `packages/fhs-protocol/src/constants.ts`) y el Registry únicamente responde `pong`. El Registry detecta nodos caídos de forma pasiva: si no llega `ping` en 30s (lease), marca el nodo `lost`. El servidor nunca sondea activamente a los providers.
- **Decisión pendiente:** decidir explícitamente entre (a) mantener el heartbeat unidireccional documentado como "los providers son responsables del heartbeat" — más simple, coherente con el Registry como componente observable y no controlador (regla 10 del protocolo, `docs/protocolo.md`) — o (b) que el servidor también emita `ping` hacia cada provider conectado, permitiendo detectar caídas de red en ambos sentidos y reducir el tiempo de detección por debajo del lease de 30s.
- **Consecuencias a evaluar:**
  - Opción (a): cero cambios, pero un provider puede parecer "vivo" para sí mismo (proceso corriendo) mientras su conexión WebSocket está rota sin que el servidor lo note antes de los 30s.
  - Opción (b): detección más rápida y simétrica, pero introduce lógica de ping saliente en el Registry y un segundo timeout a gestionar (respuesta del provider al ping del servidor), aumentando la complejidad del componente que DEC-0005 mantiene embebido y simple para el MVP.
  - Cualquiera de las dos opciones debe quedar escrita en `docs/protocolo.md` como comportamiento explícito, no implícito.

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

- **Fecha:** 2026-07-01
- **Estado:** `proposed`
- **Contexto:** El protocolo genera un `requestId` por cada `chat.request`/`tool.call` (ver `llm-gateway.ts`, `mcp-host.ts`), pero hoy no se loggea en ningún punto ni se correlaciona con el `conversationId` de la conversación que lo originó. Si un usuario reporta un fallo ("mi OCR falló ayer"), no hay forma de reconstruir qué pasó — no por la privacidad (que solo restringe contenido), sino porque nunca se guardó ni siquiera la metadata de la operación. Confundir "no retener contenido" con "no registrar nada" deja al sistema sin capacidad de diagnóstico.
- **Decisión:** Distinguir explícitamente dos capas: **contenido** (texto, archivos, respuestas — sujeto a `privacy.retention` de cada provider) y **metadata de trazabilidad** (`conversationId`, `requestId`, `providerId`, capability/modelo, timestamp, duración, resultado/código de error — siempre se registra, no es negociable). Documentado en `docs/protocolo.md` (sección Privacidad → Trazabilidad operacional) y `docs/protocolo-provider.md` (checklist plug-and-play).
- **Consecuencias:**
  - Requiere propagar `conversationId` hacia `chat.request`/`tool.call` (hoy el `requestId` se genera aislado, sin relación con la conversación que lo originó) — pendiente de implementar en `apps/agent-server/src/agent/runtime.ts` y `providers/llm-gateway.ts`/`providers/mcp-host.ts`.
  - Requiere que el Agent Server loggee esa metadata de forma estructurada (hoy solo hay `console.error` sueltos sin correlación).
  - Cada provider (LLM, OCR, y futuros) también debe loggear su propia metadata local por `requestId`, sin loggear contenido salvo que su `retention` lo permita.
  - No cambia ninguna garantía de privacidad existente: el contenido sigue gobernado por `retention`. Solo agrega una capa de metadata que siempre existe.

## DEC-0013 — Contrato formal de provider ("protocolo-provider") para plug-and-play

- **Fecha:** 2026-07-01
- **Estado:** `proposed`
- **Contexto:** `examples/llm-provider` y `examples/ocr-provider` cumplen el protocolo FHS de mensajes, pero cada uno reimplementa desde cero su propio manejo de conexión, heartbeat y códigos de error. Sin un contrato explícito, cada provider nuevo tiende a "personalizarse" en detalles que deberían ser uniformes, obligando a conocimiento especial en el Agent Server por proveedor en vez de por tipo (`llm`/`mcp`).
- **Decisión:** Definir `docs/protocolo-provider.md` como el contrato obligatorio de implementación de cualquier provider: ciclo de vida de 5 estados (`Connecting → Identifying → Registering → Ready → Reconnecting`), dispatcher concurrente que no bloquea el heartbeat (relacionado con DEC-0009), manifiesto con campos obligatorios (incluyendo privacidad), tabla de códigos de error estandarizados, y checklist de trazabilidad obligatoria (DEC-0012). Cumplir este contrato es lo que permite que un provider nuevo se conecte sin cambios en `apps/agent-server`.
- **Consecuencias:**
  - El Registry debería validar manifiestos contra estos campos obligatorios (hoy no lo hace — deuda técnica documentada en el propio `protocolo-provider.md`).
  - `examples/llm-provider` y `examples/ocr-provider` deben migrar a los códigos de error estandarizados y a loggear metadata de trazabilidad — hoy no lo hacen completamente.
  - Facilita que futuros SDKs en Python/Rust/Java (DEC-0011) implementen el contrato una sola vez, en vez de adivinar el comportamiento leyendo el código TypeScript de referencia.

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
