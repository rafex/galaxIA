+++
artifact_type = "task_file"
initiative = "mvp-hardening"
spec_id = "SPEC-MVP-HARDENING-0001"
owner = "rafex"
state = "active"
+++

# Tareas prioritarias del MVP FHS

## TASK-MVPH-0001 — Corregir README y ECOSYSTEM.md cross-repository

```toml
id = "TASK-MVPH-0001"
title = "Corregir README y ECOSYSTEM.md cross-repository"
state = "todo"
owner = "rafex"
dependencies = []
expected_files = ["README.md", "ECOSYSTEM.md", "docs/*", "spec-native/ROADMAP.md"]
close_criteria = "Los README y ECOSYSTEM.md dentro de galaxIA, galaxIA-Core, galaxIA-SDK, galaxIA-satellite-star, galaxia-parser-catalog y galaxIA-E2E describen la topología, transporte, formatos y excepciones actuales sin referencias operativas al diseño HTTP/WebSocket/SSE histórico."
validation = ["rg -n -i 'Registry HTTP|WebSocket de aplicación|SSE para chat|JSON.*wire|XML.*wire' en los seis repositorios", "revisión manual de enlaces y comandos de despliegue"]
```

Priorizar la eliminación de instrucciones ejecutables obsoletas, manteniendo
las notas históricas solo cuando estén marcadas como tales.

## TASK-MVPH-0002 — Integrar OCR con recuperación local acotada

```toml
id = "TASK-MVPH-0002"
title = "Integrar OCR con recuperación local acotada"
state = "todo"
owner = "rafex"
dependencies = ["TASK-BROWSER-RAG-0003"]
expected_files = ["galaxIA-Core/apps/navigator/src/p2p/portal-session.ts", "galaxIA-Core/apps/portal-chat/src/services/local-rag/*", "galaxIA-E2E/tests/*"]
close_criteria = "El OCR se indexa localmente y el LLM recibe solo top-k de fragmentos relevantes en DocumentContext; el texto OCR completo no aparece en ninguna solicitud al adaptador llama.cpp."
validation = ["prueba con PDF grande y pregunta inicial", "pregunta de seguimiento en la misma conversación", "inspección del payload del adaptador y del Envelope Protobuf"]
```

La ruta debe cubrir tanto la primera pregunta asociada al adjunto como las
preguntas posteriores, sin confirmación manual ni serialización JSON en FHS.

## TASK-MVPH-0003 — Implementar retry, failover y reasignación de Missions

```toml
id = "TASK-MVPH-0003"
title = "Implementar retry, failover y reasignación de Missions"
state = "todo"
owner = "rafex"
dependencies = []
expected_files = ["galaxIA-Core/apps/navigator/src/p2p/mission-cycle.ts", "galaxIA-Core/apps/navigator/src/p2p/p2p-llm-gateway.ts", "galaxIA-Core/apps/navigator/src/p2p/p2p-mcp-host.ts", "galaxIA-Core/apps/navigator/tests/*"]
close_criteria = "Una Mission conserva candidatos alternativos, reintenta con backoff acotado y publica una nueva asignación cuando el proveedor falla; se evita duplicar la respuesta terminal y se registra cada intento en provenance."
validation = ["test de timeout", "test de desconexión durante streaming", "E2E con dos proveedores y apagado del primero", "verificación de límites de reintentos"]
```

El failover debe volver a aplicar scope, privacidad, capabilities,
DelegationToken y límites de concurrencia antes de cada reasignación.

## TASK-MVPH-0004 — Completar validación de DelegationToken

```toml
id = "TASK-MVPH-0004"
title = "Completar validación de DelegationToken para Ephemeral Satellites"
state = "todo"
owner = "rafex"
dependencies = []
expected_files = ["galaxIA-Core/apps/atlas/src/*", "galaxIA-Core/apps/navigator/src/*", "galaxIA/idl/fhs-protocol.proto", "galaxIA-satellite-star/examples/*", "galaxIA-Core/tests/*"]
close_criteria = "Atlas y Navigator validan firma canónica, issuer en Orbit, subject, capabilities, wasmHash, expiración y lease; los tokens inválidos no entran en Orbit ni reciben Missions."
validation = ["token válido", "firma inválida", "issuer fuera de Orbit", "subject distinto", "capability fuera del Host", "expirado", "wasmHash inconsistente"]
```

La implementación debe reutilizar la identidad `did:key` existente y devolver
errores FHS estructurados, sin añadir un directorio central de claves.

## TASK-MVPH-0005 — Visibilizar errores silenciosos de red

```toml
id = "TASK-MVPH-0005"
title = "Visibilizar errores silenciosos de red (portal, servidores y doctor)"
state = "in_progress"
owner = "rafex"
dependencies = []
expected_files = ["galaxIA-Core/apps/portal-chat/src/services/diagnostics.ts", "galaxIA-Core/apps/portal-chat/src/components/diagnostics-panel.ts", "galaxIA-Core/packages/fhs-node/src/diagnostics.ts", "galaxIA-Core/apps/navigator/src/index.ts", "galaxIA-satellite-star/examples/fhs-wire/src/diagnostics.ts", "galaxIA-gitops/scripts/doctor.sh", "galaxIA-Core/docs/diagnostico.md"]
close_criteria = "Un fallo de red (certificado no aceptado, puerto cerrado, host inalcanzable, reloj desfasado, nodo aislado del bootstrap) se ubica sin inspeccionar sockets: el portal dice en qué etapa y en qué wss:// falló y ofrece aceptar el certificado; los servidores registran bootstrap, conexiones y errores internos de libp2p y exponen /status; doctor.sh lo detecta desde la máquina de la demo antes de abrir el navegador."
validation = ["tests de describeError, summary y discovery con dial rechazado", "dialBootstraps reintenta hasta conectar", "reproducir en Firefox el rechazo del certificado de :4010 y ver el enlace para aceptarlo", "doctor.sh desde el Mac con y sin Navigator", "reinicio simultáneo de Atlas/Navigator/Star reconecta solo"]
```

Origen: primera prueba real desde el navegador (E2E-025 en
`galaxIA-Core/docs/historial-incidencias-e2e.md`). El navegador no expone a
JavaScript el motivo de un fallo TLS; el diseño lo asume y ofrece el enlace
para aceptar el certificado en lugar de afirmar una causa.
