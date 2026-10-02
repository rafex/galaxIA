# SPEC-AUTH-0001 — Autorización explícita por uso

## Estado

`active` — decisión DEC-0099. Reemplaza el uso de `kb.recommended`/`kb.decision` como
autorización (SPEC-KB-0002 queda superseded en ese punto) y la marca de `description` de
`/calc` (DEC-0097). Sin retrocompatibilidad: el Navigator y los clientes conformes exigen
este protocolo.

## Principio

**Ningún contenido del usuario sale del Navigator hacia otro nodo sin una autorización
vigente que lo cubra**, salvo el consentimiento implícito de P5. Portal → Navigator es una
frontera de ingreso de confianza (el usuario envía su propio contenido a su Navigator) y
queda fuera; el punto de aplicación es la **salida del Navigator**.

## Invariantes

- P1. Sin autorización vigente (o `Grant` implícito de P5) no sale ni una oferta ni un byte
  de carga hacia un provider.
- P2. Se autoriza lo concreto: capacidad, nodo (DID fijo), clase de dato, destino, retención
  y el **digest canónico** de los bytes que saldrán. El Navigator recalcula el digest al
  enviar y debe coincidir.
- P2b. **Modelo por etapas.** Solo se fijan por digest los bytes que ya existen. Lo que una
  operación produzca (texto de OCR, fragmentos de KB/RAG, resultado de una herramienta) se
  autoriza en una solicitud de seguimiento, con su digest real, **antes** de reenviarse a
  otro nodo o al LLM. No hay excepción para datos derivados del usuario.
- P3. Un solo uso, con vencimiento (60 s por defecto, medido con el reloj monotónico del
  Navigator), ligado a la sesión y a `authorization_id`. El estado pendiente se indexa por
  `authorization_id`, nunca por conversación.
- P4. Falla cerrado: sin decisión, con vencimiento, sin interfaz o ante cualquier duda, no
  se envía nada.
- P5. **Único consentimiento implícito**: el mensaje literal del usuario al Star que eligió,
  dentro del ámbito (`scope`) que fijó y con el DID del Star fijado (incluye la selección de
  KB por LLM). Se materializa como un `Grant` implícito emitido por el Navigator, con los
  mismos campos que uno explícito (`implicit = true`), por el mismo `Dispatcher`, auditado.
- P6. Consentimiento necesario, no suficiente: la política de confianza se aplica primero.
- P7. Procedencia y bitácora de auditoría (sin contenido) registran lo autorizado y lo enviado.

## Mensajes (IDL, rango 90–93)

- `authorization.requested` (Navigator → cliente): `authorization_id`, `conversation_id`,
  `turn_id`, `expires_at` (informativo), `batch_digest` e ítems (`AuthorizationItem`).
- `authorization.decision` (cliente → Navigator): `authorization_id`, `batch_digest` recibido
  y una decisión por `item_id`. Va en un Envelope firmado con la clave de la sesión.
- `authorization.resolved` (Navigator → cliente): resultado del lote y **por ítem**
  (`ALLOWED`, `DENIED`, `EXPIRED`, `CANCELLED`, `CONSUMED`, `SENT`, `FAILED`) con motivo.
- `authorization.status_request` (cliente → Navigator): tras reconectar; se responde con
  `authorization.resolved`.

## Cómo se fija el DID antes de autorizar

1. El Navigator elige el nodo con su caché de anuncios firmados y verificados y su política de
   confianza (no con los campos autodeclarados de una puja).
2. Pide la autorización con ese DID.
3. Con `allow` publica una oferta restringida a ese DID (solo la capacidad, sin datos ni
   consulta identificadora).
4. El nodo puja, el Navigator asigna y abre el stream por la conexión autenticada cuyo
   PeerId se deriva de ese DID. Si el nodo no puja: `NODE_UNAVAILABLE`; el sustituto exige una
   autorización nueva (`failover`). El DID nunca se copia de una puja.

## Transacción de autorización y envío

1. El `Grant` se consume de forma atómica **antes** de escribir en el transporte.
2. Un fallo ambiguo (escritura exitosa y acuse perdido, caída, timeout tras el ack) **no se
   reintenta** con el mismo `Grant`: reintentar exige una autorización nueva (`retry`).
3. Si la cancelación llega antes de la escritura, gana; si llega después, se registra como
   cancelación tardía.
4. Tras reconectar, el `Grant` consumido no revive y lo pendiente vence por su `expires_at`.

## Lote y dependencias

Cada ítem permitido recibe su propio `Grant`, emitido al despachar. Un ítem solo se despacha
si todos los de su `depends_on` están permitidos y completados; si una dependencia se
deniega, sus dependientes pasan a `DENIED` en cascada. Un ítem independiente permitido se
ejecuta aunque otro sea denegado (`PARTIAL`).

## Digests canónicos

`digest = SHA-256( dominio ‖ 0x00 ‖ "1" ‖ 0x00 ‖ bytes_canónicos )`, con un dominio por clase
(`fhs/auth/user_message`, `.../document`, `.../derived_text`, `.../command_args`,
`.../query`, `.../tool_args`, `.../tool_output`, `.../ipfs`, `.../batch`).

- Texto: bytes UTF-8 exactos, sin normalización Unicode adicional.
- Archivo: los bytes reales (no el descriptor). IPFS: el CID y el digest del contenido.
- Conjuntos de fragmentos: número de fragmentos y cada uno con su longitud de 4 bytes, en el
  orden de envío.
- Valores dinámicos (`cv1`): `0x00` ausente; `0x01` bool; `0x02` entero (8 bytes BE); `0x03`
  número (IEEE-754 BE, `-0` = `0`, no finitos prohibidos); `0x04` texto; `0x05` bytes; `0x06`
  lista (cuenta y elementos); `0x07` objeto (cuenta y pares con las claves ordenadas por sus
  bytes). Un archivo no puede ir dentro de argumentos.
- Lote: `authorization_id`, `conversation_id`, `turn_id`, `expires_at` (decimal) y los ítems
  ordenados por `item_id`, con cada campo precedido por su longitud de 4 bytes.
- Fixtures compartidos Rust/TypeScript: `idl/fixtures/authorization-digests.json`.

## Matriz de cobertura

| Flujo | Qué sale | Ítem |
|---|---|---|
| Mensaje del usuario al Star elegido | `user_message` | Implícito (P5), Star fijado y dentro del `scope` |
| Selección de KB por LLM | la pregunta | Implícito, mismo Star |
| Contexto derivado al LLM | fragmentos KB/RAG, texto de OCR | Explícito (`derived_text`), etapa de seguimiento |
| OCR | el archivo | Explícito por adjunto: nodo, tamaño, tipo, IPFS y retención |
| IPFS | el archivo a la red | Explícito (`public_network`) |
| RAG: indexar | texto del documento | Explícito (etapa de seguimiento: el texto de OCR ya existe) |
| RAG/KB: consultar | la pregunta | Explícito; **también si el usuario fija la KB a mano** |
| Comandos (`/calc`) | argumentos | Explícito |
| Herramienta pedida por el LLM | argumentos y resultado de vuelta al LLM | Explícito por llamada |
| Failover (OCR, LLM, herramientas) | el mismo dato a otro nodo | Autorización nueva (`failover`) |

## Herramientas

Una herramienta que no esté en el registro se **deniega**; las de efectos externos están
desactivadas por defecto. Toda operación con red pasa por el `Dispatcher`; las herramientas
del Navigator son únicamente llamadas remotas a providers. Una herramienta local con red o
subprocesos propios tendría que ejecutarse en un sandbox sin red ni subprocesos libres.

## IPFS

Se distingue (a) lo que controla el Navigator (qué sube, cuándo, a qué red, sus lecturas),
(b) la retención de mejor esfuerzo (unpin y GC, sin garantía de borrado) y (c) lo inevitable
de la red pública: cualquiera con el CID puede leerlo y copiarlo. Un archivo se sube **una
sola vez** por adjunto; reintentos con el mismo CID. Volver a subir exige un ítem propio.

**Ligadura del CID.** El ítem `ipfs.upload` se autoriza con el digest de los bytes del
archivo (dominio `ipfs`). Al subirlo, el Dispatcher registra `CID → digest autorizado`; los
ítems posteriores que referencian ese archivo por CID (OCR por IPFS, lecturas por el gateway
o libp2p) solo se despachan si el CID está en ese registro y el nodo destino coincide con el
autorizado. Un CID que el registro no conoce no sale del Navigator.

## Enmienda: comandos (SPEC-CMD-0001, DEC-0100)

`AuthorizationItem` gana `contract_fingerprint` (19), `tool_name` (20) y `registry_digest`
(21), vacíos si el ítem no es un comando. La clase `command_args` usa el dominio
`fhs/auth/command_args` y el digest cv1 de `{args, tool}`. La huella y el `registry_digest` son
una **ligadura de contexto del `Grant`**, no bytes enviados: el Dispatcher los revalida al
consumir y entran al `batch_digest` (cada campo UTF-8 con su longitud de 4 bytes, después de
los existentes). La bitácora los registra sin contenido. Los ítems que no son comando llevan
esos tres campos vacíos.

## Atribución

La firma del Envelope prueba la posesión de la clave de la sesión, no que una persona aprobó.
El estándar exige defensas del cliente (CSP, sin scripts de terceros). Se asume que el
Navigator del operador es de confianza; una extensión futura podría propagar una prueba de
autorización a los providers.

## Conformidad

Toda implementación que declare conformidad pasa la suite del **límite de salida**: un espía
sobre la publicación de ofertas, la apertura de streams, las operaciones de IPFS y las
llamadas remotas a herramientas verifica que, sin `Grant`, no sale nada. Además: decisión
repetida, tardía o de otra sesión; vencimiento; cancelación; turnos concurrentes sin
sobrescribirse; sustitución de nodo; cambio de contenido con el mismo tamaño (digest
distinto); inyección de prompt que pide una herramienta. No existe indicador inseguro en
compilaciones de producción.
