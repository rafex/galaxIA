# ROADMAP.md

## Ahora

- **Iniciativa activa:** `fhs-mvp` — MVP del protocolo FHS y chat comunitario para la ponencia.
  - Federar LLMs locales y tools MCP.
  - Frontend web vanilla con Vite.
  - Registry embebido en Agent Backend con WebSocket y SQLite.
  - Demo con OCR y failover de nodo.
- **Bloqueos actuales:** ninguno. Se pausa temporalmente `SPEC-AUTH-0001` para enfocar recursos en el MVP.

## Después

- **Separar Registry del Agent Backend:** convertir el Registry en un servicio independiente para soportar múltiples backends y comunidades.
- **Identidad criptográfica (Ed25519):** reemplazar DID simplificado por firmas reales en registro y heartbeat.
- **IPFS para artefactos:** subir archivos adjuntos a IPFS y pasar solo el hash a los servidores MCP. Esto protege la privacidad del origen, permite desacoplamiento temporal y deduplicación natural.
- **Autenticación de usuarios:** retomar `SPEC-AUTH-0001` cuando el MVP esté estable.
- **Modelo de confianza comunitaria:** reputación, vetos persistentes y políticas de privacidad más granulares.

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
