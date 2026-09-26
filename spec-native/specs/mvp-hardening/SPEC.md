+++
artifact_type = "spec"
id = "SPEC-MVP-HARDENING-0001"
state = "active"
owner = "rafex"
created_at = "2026-08-05"
updated_at = "2026-08-05"
replaces = "none"
related_tasks = ["TASK-MVPH-0001", "TASK-MVPH-0002", "TASK-MVPH-0003", "TASK-MVPH-0004", "TASK-MVPH-0005"]
related_decisions = ["DEC-0093"]
+++

# Endurecimiento prioritario del MVP FHS

## Objetivo

Ordenar y ejecutar los pendientes que actualmente bloquean una experiencia
confiable del MVP: documentación coherente, contexto OCR acotado, resiliencia
de Missions y validación completa de la delegación de Ephemeral Satellites.

El transporte no cambia: la comunicación FHS continúa usando libp2p y
Protobuf. El RAG local y los adaptadores de modelo son detalles internos y no
introducen JSON en el wire protocol.

## Prioridad y alcance

### P0 — Corrección documental cross-repository

Actualizar los `README.md` y `ECOSYSTEM.md` que describan el sistema para que
coincidan con el protocolo vigente: Atlas no es un Registry HTTP central,
Portal/Navigator se descubren por libp2p, Protobuf es el wire format, y HTTP,
HTTPS o WSS solo aparecen en las fronteras permitidas y adaptadores externos.

Repositorios mínimos: `galaxIA`, `galaxIA-Core`, `galaxIA-SDK`,
`galaxIA-satellite-star`, `galaxia-parser-catalog` y `galaxIA-E2E`.

### P0 — Recuperación local del OCR

Después del OCR, el Portal debe indexar el texto localmente, fragmentarlo y
recuperar únicamente los fragmentos relevantes para cada pregunta. El texto
OCR completo nunca se incorpora al prompt del LLM. La solicitud FHS solo lleva
el `DocumentContext` estructurado con los fragmentos seleccionados.

La implementación reutiliza la iniciativa `browser-rag`: aislamiento por
conversación/documento, ejecución fuera del hilo principal, límites de
fragmentos y fallback local. La pregunta inicial y las preguntas de
seguimiento deben usar la misma ruta de recuperación.

### P0 — Retry, failover y reasignación de Missions

Navigator debe conservar candidatos alternativos y poder reasignar una Mission
cuando el proveedor seleccionado falle, expire, se desconecte o devuelva un
estado recuperable. Los intentos deben estar acotados, correlacionados con la
misma Mission y producir una única terminación observable para el Portal.

La reasignación debe respetar scope, capacidades, privacidad, delegación y
provenance. El cambio de proveedor debe ser visible en la actividad de la
Mission sin exigir intervención del usuario.

### P0 — Validación de `DelegationToken`

Completar la validación de Ephemeral Satellites en Atlas y el runtime que
acepta sus Beacons. La validación debe comprobar, como mínimo: firma Ed25519
sobre la representación canónica, `issuer` en Orbit, `subject` coincidente,
capabilities delegadas como subconjunto del Host, `wasmHash`, expiración y
lease. Deben existir pruebas positivas y negativas, incluida la reasignación
de una Mission a un Ephemeral Satellite rechazado.

## Fuera de alcance de esta iniciativa

- mTLS: permanece en backlog y no se convierte en requisito de cierre.
- Reemplazar el RAG local del navegador por un provider remoto.
- Cambiar libp2p, Protobuf o la identidad `did:key` del protocolo.
- Decidir ahora si los adaptadores locales de llama.cpp y schemas internos
  conservan JSON o migran también a Protobuf; esa decisión queda registrada
  como backlog separado.

## Criterios de aceptación

1. Los documentos de los seis repositorios no contradicen el protocolo FHS
   vigente y enlazan la fuente canónica correspondiente.
2. Un PDF grande puede generar una respuesta sin enviar el OCR completo al
   LLM; una prueba inspecciona el payload y verifica que solo contiene los
   fragmentos recuperados en `DocumentContext`.
3. Si el primer proveedor falla, una Mission se reasigna automáticamente a un
   candidato válido dentro del límite de intentos y el Portal recibe una sola
   respuesta final.
4. Atlas rechaza tokens expirados, mal firmados, con issuer desconocido,
   subject incorrecto, capabilities no delegadas o hash WASM inconsistente.
5. Las pruebas E2E cubren PDF + pregunta inicial + seguimiento, fallo del
   proveedor y validación positiva/negativa de delegación.
