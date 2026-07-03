# ROADMAP.md

## Ahora

- **Iniciativa activa:** `fhs-mvp` — MVP del protocolo FHS y chat comunitario para la ponencia.
  - Federar LLMs locales y tools MCP.
  - Frontend web vanilla con Vite.
  - Registry embebido en Agent Backend con WebSocket y SQLite.
  - Demo con OCR y failover de nodo.
- **Bloqueos actuales:** ninguno. El pipeline de OCR está verificado end-to-end con modelo real y ejecución determinística (DEC-0014, DEC-0015, DEC-0016, DEC-0017, DEC-0020 — ya no depende de que el LLM decida invocar la tool), y el aislamiento de eventos entre conversaciones concurrentes también está verificado (DEC-0018, probado con dos inferencias reales en paralelo). Se pausa temporalmente `SPEC-AUTH-0001` para enfocar recursos en el MVP.
- **Iniciativa en spec, sin iniciar:** `rag-provider` — indexado y recuperación de documentos (SPEC-RAG-0001 en `spec-native/specs/rag-provider/SPEC.md`). Extiende el patrón determinístico de DEC-0020 a la recuperación de contexto. No se inicia hasta decisión explícita.
- **Completado:** `ocr-confirmacion` — confirmación explícita (burbuja colapsada + botones) antes de que el LLM use el texto OCR (SPEC-OCRCONFIRM-0001, `spec-native/specs/ocr-confirmacion/SPEC.md`). Verificado end-to-end contra el bastion real. Sienta la base de estado por conversación que `rag-provider` también necesita (TASK-RAG-0001).
- **Completado y verificado:** topología multi-host — core (`web`+`agent-server`) en laptop (`192.168.3.137`), providers pesados (LLM/OCR) en bastion (`192.168.3.173`) (DEC-0022, `docs/despliegue-multi-host.md`). Desplegado y validado end-to-end con tráfico real cruzando ambas máquinas: chat simple y flujo completo de OCR con confirmación. Requirió además ajustar el mapeo de puertos de los providers (sin remapeo, para que coincida con lo anunciado en el manifiesto) y abrir reglas UFW en ambas máquinas, acotadas a la LAN.
- **Completado y verificado:** TLS/WSS con certificado autofirmado para todo el protocolo FHS (DEC-0023, `docs/tls-autofirmado.md`). Opt-in vía overlay `containers/compose.tls.yaml` — no afecta el despliegue sin TLS. Aplicado y validado end-to-end sobre la topología multi-host real (laptop + bastion): chat simple y flujo completo de OCR funcionando sobre el canal cifrado. Requirió tres ajustes de infraestructura (bind-mount con ruta absoluta configurable, puerto 8443 en vez de 443 por restricción de podman rootless, y recrear el túnel SSH del socket de podman) — ninguno del código TLS en sí.

## Después

- **Separar Registry del Agent Backend:** convertir el Registry en un servicio independiente para soportar múltiples backends y comunidades.
- **Identidad criptográfica (Ed25519):** reemplazar DID simplificado por firmas reales en registro y heartbeat.
- **IPFS para artefactos:** subir archivos adjuntos a IPFS y pasar solo el hash a los servidores MCP. Esto protege la privacidad del origen, permite desacoplamiento temporal y deduplicación natural.
- **Autenticación de usuarios:** retomar `SPEC-AUTH-0001` cuando el MVP esté estable.
- **Modelo de confianza comunitaria:** reputación, vetos persistentes y políticas de privacidad más granulares.
- **Validar identidad en `hello`:** rechazar registro si el `providerId` ya tiene conexión activa, en vez de sobrescribir (DEC-0009).
- **Dispatcher/heartbeat concurrente en providers:** cada provider debe gestionar peticiones entrantes sin bloquear su propio `ping` (DEC-0009).
- **Definir dirección del heartbeat:** decidir si el servidor también emite `ping` a los providers o el heartbeat queda unidireccional (DEC-0010).
- **SDK/provider de referencia en Python:** primer lenguaje no-TypeScript soportado (DEC-0011); caso de uso natural para providers de IA/OCR.
- **SDK/provider de referencia en Rust:** para hardware con recursos limitados (DEC-0011).
- **SDK/provider de referencia en Java:** para integración con sistemas comunitarios existentes (DEC-0011).
- **Propagar `conversationId` → `requestId` y loggear metadata de trazabilidad:** cerrar el gap de diagnóstico de errores sin tocar privacidad de contenido (DEC-0012).
- **Validar manifiesto contra campos obligatorios del contrato de provider** (incluye `privacy.retention`) en el Registry, y migrar `llm-provider`/`ocr-provider` a los códigos de error estandarizados (DEC-0013).
- **Evaluar modelo de chat general con tool calling** (`qwen2.5-3b-chat-q4` u otro) — hoy el modelo de producción es Coder 3B, suficiente para la demo de OCR pero no ideal para chat general (DEC-0016).

## Más adelante

- **Descubrimiento descentralizado:** reemplazar Registry central por mDNS + DHT ligero (posiblemente libp2p) para eliminar puntos centrales.
- **Más tipos de proveedores:** `embedding`, `storage`, `resource`, `agent`.
- **NAT traversal:** permitir nodos fuera de la red local.
- **Gateway FHS en Rust/Rust-like:** versión ligera del protocolo para equipos pequeños.
- **Marketplace de tools:** catalogar y versionar capacidades ofrecidas por la comunidad.

## No hacer por ahora

- Frameworks frontend pesados (React, Vue, Angular) en el MVP.
- Soporte multi-idioma completo en la interfaz (solo español e inglés de los modelos/tools).
- Facturación, cuotas o monetización.
- Versionado de schemas de tools MCP fuera del alcance del protocolo.
- Reescribir el protocolo en Rust u otro lenguaje hasta que TypeScript demuestre validez.
