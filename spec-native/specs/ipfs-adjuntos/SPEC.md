# SPEC-IPFS-0001 — Transporte de adjuntos vía IPFS, configurable por el usuario

## Estado

`done (local)` — implementado y verificado con `npm run typecheck`/`build` en `galaxIA` (protocolo, Navigator, Portal) y `galaxIA-satellite-star` (`satellite-ocr-example`); UI verificada en `portal-dev` real. Ver DEC-0044, DEC-0045, DEC-0046, DEC-0047, DEC-0051, DEC-0052, DEC-0053.

## Owner

Raúl Fletes (rafex)

## Problema

Hoy los archivos adjuntos (imágenes, PDFs) viajan completos en el payload del protocolo FHS — el Portal los envía como `file_base64` directo al provider correspondiente (ej. `ocr_extract`). Esto tiene un problema de fondo: la entrega depende de que el backend (Navigator → provider) esté disponible y recibiendo **en ese instante exacto**, sin cortes — si la conexión se interrumpe a medio envío, o el provider está temporalmente ocupado/caído, la transmisión completa se pierde y hay que reintentarla desde cero. Es una entrega síncrona y frágil por construcción.

Además, la transmisión directa acopla inevitablemente "quién envía la petición en la conversación FHS" con "quién trajo el binario" — el provider ve el archivo llegar en el mismo canal por el que ve la identidad/contexto de la conversación.

## Propuesta

Agregar IPFS como un **transporte alternativo de adjuntos**, elegible por el usuario en el Portal — no un reemplazo obligatorio de la transmisión directa. Ambos modos coexisten.

### Dos modos, configurables en el Portal

1. **Transmisión directa (default, comportamiento actual sin cambios):** el archivo viaja completo en el payload del protocolo, como hoy.
2. **Vía IPFS (opt-in):** el Portal sube el archivo a un nodo IPFS, obtiene un CID, y el protocolo FHS transporta **solo el CID** hacia el provider (en vez del binario). El provider descarga el blob por su cuenta usando ese CID, en su propio momento — no necesita estar recibiendo un stream en tiempo real, puede tratarlo como un **proceso batch**: descargar cuando le convenga, procesarlo, y responder cuando termine.

La elección es una preferencia explícita del usuario en el Portal (mismo patrón que `preferences.ocrMode`/`preferences.kb` — un control visible en la barra de configuración, no un comportamiento oculto).

**Granularidad (DEC-0052):** es una configuración del Portal, no una elección por adjunto individual ni siquiera implícitamente por conversación — el usuario declara de antemano si IPFS está activo y, si lo está, con qué red (pública/privada, DEC-0045). Mientras esa configuración esté activa, los adjuntos van por IPFS; si no está activa, van directo, sin ningún paso intermedio ("sin mayor rodeo").

### Red pública vs. privada: también elección de quien sube el archivo (DEC-0045)

La pregunta abierta original ("¿red IPFS pública o nodo privado del operador?") se resuelve así: **no es una decisión fija del operador ni de este spec — es otra elección de quien sube el archivo**, mismo nivel que la elección directo/IPFS. El protocolo debe soportar ambas configuraciones (un gateway/nodo público, o un nodo privado que el usuario u operador especifique), no imponer una.

Consecuencia directa: **el CID solo no alcanza.** Un CID identifica el contenido, pero no dice en qué red/nodo buscarlo — si el usuario eligió un nodo privado, el provider (satellite) necesita saber *dónde* pedir ese CID, no solo *cuál* CID pedir.

### `ArtifactRef` — tipo de protocolo compartido, no campos ad hoc por tool (DEC-0046)

Descargar un CID (leer) y subir/pinear contenido nuevo (escribir) son operaciones distintas con requisitos distintos:

- **Leer** (lo que necesita quien resuelve un CID): un **gateway URL** de solo lectura (ej. `https://ipfs.io/ipfs/<CID>` en público, o `http://mi-nodo:8080/ipfs/<CID>` en uno propio — puerto por defecto de Kubo). Normalmente sin autenticación en un gateway público; en uno privado, solo si el operador lo puso detrás de un proxy con auth.
- **Escribir** (lo que necesita quien sube): un **API endpoint** distinto del gateway (ej. puerto `5001` de Kubo, o el endpoint de un servicio de pinning tipo Pinata/web3.storage), casi siempre con credenciales (API key/Bearer token) porque subir/pinear consume recursos del nodo.

El endpoint de **escritura** es configuración local de quien sube — nunca necesita viajar por el protocolo FHS. Solo el endpoint de **lectura** (el gateway) es lo que la otra parte necesita para resolver el CID, y por lo tanto es lo único que el protocolo transporta.

Esto se modela como un tipo compartido en `packages/fhs-protocol/src/types.ts`, no como campos sueltos redefinidos en cada tool — mismo patrón que `RetentionPolicy` (DEC-0025) o `Signal` (DEC-0028):

```ts
export type ArtifactRef =
  | { transport: "inline"; base64: string; filename?: string }
  | {
      transport: "ipfs";
      cid: string;
      network: "public" | "private";
      gatewayUrl?: string;
      filename?: string;
      /** DEC-0052 — "ephemeral": el satellite debe borrar tras responder (con TTL de respaldo). "reuse": no borra, el usuario es responsable del borrado. Default "ephemeral" si se omite. */
      retention?: "ephemeral" | "reuse";
    };
```

`gatewayUrl` opcional si `network` es `"public"` (se puede usar un gateway público por default, ver preguntas abiertas); obligatorio si `"private"`. `retention` solo aplica al modo `"ipfs"` — un adjunto `"inline"` no tiene nada que pinear/borrar.

### Dirección inversa: el provider también puede subir y devolver un CID

Además de recibir adjuntos vía IPFS, un provider debe poder **generar** un resultado (ej. una imagen procesada, un artefacto grande) y devolverlo de la misma forma — subiéndolo él mismo a IPFS (a su propio endpoint de escritura, configuración local suya) y devolviendo un `ArtifactRef` con `transport: "ipfs"` en vez de un payload inline. Mismo tipo, dirección simétrica: cualquiera de las dos partes (quien pide, quien resuelve) puede ser quien sube o quien descarga.

**Dónde vive `ArtifactRef` en los mensajes existentes** (`packages/fhs-protocol/src/messages.ts`):

- **Entrada** — `ToolCallRequestMessage.arguments` reemplaza el campo `file_base64: string` de cada tool por un solo campo `file: ArtifactRef` (el `transport` decide si viene inline o por IPFS; ya no hace falta un nombre de parámetro distinto por modo).
- **Salida** — `ToolCallResultMessage.content` (hoy `Array<{ type: "text"; text: string }>`) gana un nuevo tipo de item, `{ type: "artifact"; artifact: ArtifactRef }`, para que un provider devuelva un resultado vía IPFS con la misma forma exacta con la que recibió uno.

### Por qué IPFS resuelve el problema de fondo

- **Desacopla la entrega del procesamiento.** Subir a IPFS y descargar del lado del provider son dos operaciones independientes en el tiempo — si el provider está ocupado, el archivo ya está disponible esperando en IPFS, no se pierde ni hay que reenviarlo. Esto es lo que permite tratar la descarga como un proceso batch/asíncrono en vez de una recepción síncrona.
- **Anonimiza el origen del binario frente al provider.** El provider nunca ve el archivo llegar directamente desde la conexión del usuario — solo pide un CID a la red/nodo IPFS. Quien sirve el blob (el nodo IPFS) no es la misma parte que sabe qué conversación/usuario lo originó.

### Retención (DEC-0052)

Dos modos, declarados explícitamente en el Portal al subir el archivo — reemplaza el modelo original de DEC-0044 ("3h por default, ampliable"):

1. **Efímera (default):** el archivo vive solo mientras dura el procesamiento. En cuanto se resuelve la llamada a la tool (éxito o error), Navigator hace unpin del CID — no es una ventana de tiempo, es un evento (fin del procesamiento). Como respaldo ante el caso en que Navigator mismo se caiga antes de llegar a ese punto, se agenda además un **TTL de seguridad de 3 horas** al momento de subir — solo como red de seguridad, el mecanismo principal sigue siendo el borrado inmediato tras la respuesta.
2. **Reutilizar:** el usuario declara explícitamente en el frontend que quiere conservar el archivo más allá de un solo procesamiento. Esta elección viaja dentro del `ArtifactRef` para que quien lo consuma sepa que no debe asumir que el archivo desaparecerá. Sin TTL — el archivo no expira solo. El borrado queda como **responsabilidad exclusiva del usuario**, sin ningún barrido/expiración automática (un punto centralizado que recorra todos los CIDs "reutilizar" pendientes de borrar no es factible ahora mismo, requeriría un componente nuevo con ese único propósito). Queda documentado como funcionalidad a futuro: una acción explícita en el Portal ("borrar este adjunto") que dispare la petición de unpin bajo demanda — no implementada en esta iteración.

**Cómo viaja esta elección por el protocolo:** el modo (`ephemeral` | `reuse`) se transporta junto al `ArtifactRef` cuando `transport: "ipfs"` — ver `ArtifactRef` más abajo.

**Refinamiento de implementación (DEC-0053) — quién ejecuta el unpin:** el diseño original de DEC-0052 decía "el satellite debe borrar tras responder". Al implementar, esto se corrigió a **Navigator**, no el satellite — es Navigator quien tiene el endpoint de escritura de IPFS (DEC-0051/DEC-0046: el endpoint de escritura nunca viaja por el protocolo, se queda local a quien sube). Pedirle a un satellite que haga unpin habría requerido darle acceso a las credenciales de escritura de Navigator, contradiciendo ese principio. Navigator ya recibe la respuesta (`tool.result`/`tool.error`) de vuelta — hace el unpin ahí mismo, sin que el satellite necesite saber nada de IPFS más allá de leer el `gatewayUrl` que se le dio.

## Alcance

### Dentro del alcance

- Configuración en el Portal (DEC-0052): activar/desactivar transporte IPFS, red (pública/privada) si está activo, y modo de retención (efímera/reutilizar) — configuración explícita, no una elección oculta ni un default silencioso.
- Subida del archivo a IPFS **desde Navigator** (DEC-0051) — el Portal sigue siendo un frontal puro, entrega el binario a Navigator igual que ya hace hoy en el modo directo (`artifacts: string[]` en `chat-ws.ts`); Navigator usa su endpoint de escritura configurado localmente (nunca transportado por el protocolo, ver `ArtifactRef` arriba).
- Nuevo tipo de protocolo `ArtifactRef` (`packages/fhs-protocol/src/types.ts`) — reemplaza `file_base64: string` en `ToolCallRequestMessage.arguments` por `file: ArtifactRef`, y agrega `{ type: "artifact"; artifact: ArtifactRef }` como nuevo item posible en `ToolCallResultMessage.content`. Incluye `retention?: "ephemeral" | "reuse"` (DEC-0052).
- Simetría: un provider puede devolver un resultado de la misma forma (`ArtifactRef` con `transport: "ipfs"`), no solo recibir adjuntos así.
- Contrato de borrado (DEC-0052, refinado en DEC-0053): en modo `ephemeral`, **Navigator** (no el satellite) hace unpin del CID en cuanto la llamada a la tool se resuelve (éxito o error); TTL de 3h como respaldo si Navigator mismo se cae antes de ese punto. En modo `reuse`, nadie borra automáticamente — el borrado queda como responsabilidad del usuario (sin mecanismo automático todavía). El satellite solo lee (`gatewayUrl`/`cid`), nunca necesita credenciales de escritura de IPFS.

### Fuera del alcance (para esta iteración)

- Elegir el motor/nodo IPFS concreto (ver pregunta abierta #1 abajo) — igual que con RAG/KB (DEC-0026/DEC-0037), este spec define el contrato (qué transporta el protocolo, quién decide el modo, política de retención) pero no impone una implementación de infraestructura IPFS específica.
- Deduplicación explícita entre distintos usuarios que suben el mismo archivo (mencionada como beneficio natural de IPFS en el ROADMAP original, pero no es un requisito de esta iteración — es una consecuencia gratuita del content-addressing, no algo que haya que construir).
- Migrar adjuntos existentes ya enviados por transmisión directa a IPFS retroactivamente.
- Acción explícita en el Portal para que el usuario borre bajo demanda un archivo en modo `reuse` (DEC-0052) — documentado como funcionalidad a futuro, no implementada en esta iteración.
- Cualquier mecanismo de barrido/expiración centralizado para archivos en modo `reuse` — no es factible ahora mismo (requeriría un componente nuevo con ese único propósito); el borrado en ese modo es responsabilidad del usuario hasta que exista la acción explícita de borrado.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un CID en una red IPFS **pública** es recuperable por cualquiera que lo tenga, indefinidamente mientras algún nodo lo mantenga pinneado — no hay control de acceso nativo. "Anonimizar el origen" no es lo mismo que "el contenido es privado". | Alto si el adjunto es sensible | Mitigado por diseño (DEC-0045): la elección de red pública/privada es del usuario que sube el archivo, no un default fijo — quien maneje contenido sensible puede elegir un nodo privado explícitamente. La responsabilidad de saber cuál conviene es del usuario/operador, el protocolo solo debe soportar ambas opciones |
| Sin `gatewayUrl`, un provider no puede resolver un CID subido a un nodo privado — el CID solo no basta | Alto (bloquea el caso privado por completo si se omite) | Resuelto en el diseño (DEC-0046): `ArtifactRef` con `transport: "ipfs"` siempre incluye `gatewayUrl` cuando `network` es `"private"`, nunca se transporta el CID aislado |
| Exponer por error el endpoint de **escritura** (API con credenciales) en vez del de lectura (gateway) en el protocolo, dejando credenciales de subida circulando por el canal FHS | Alto si ocurre | Resuelto por diseño (DEC-0046): `ArtifactRef` modela explícitamente solo el endpoint de lectura; el de escritura es responsabilidad local de quien sube y nunca forma parte del tipo de protocolo |
| En modo `ephemeral`, el satellite se cae/pierde conexión antes de responder y nunca hace el unpin — el archivo queda huérfano | Medio | Mitigado (DEC-0052): TTL de respaldo de 3h además del borrado por evento; no depende únicamente de que el satellite responda con éxito |
| En modo `reuse`, el usuario nunca borra el archivo manualmente — queda huérfano indefinidamente, sin ningún mecanismo de expiración | Medio | Aceptado a propósito (DEC-0052): un barrido centralizado no es factible ahora; la funcionalidad de borrado bajo demanda queda como trabajo futuro, documentado, no bloqueante |
| Navigator se cae o se reinicia entre subir el archivo y que se cumpla el TTL de respaldo — el timer en memoria se pierde, el unpin de respaldo nunca se ejecuta | Medio | **Sin mitigación completa todavía** (limitación conocida de la implementación, DEC-0053): el TTL de respaldo se agenda con `setTimeout` en memoria, no persiste a un reinicio de Navigator. Documentado como pendiente — un TTL persistente (ej. respaldado en disco/SQLite) queda para una iteración futura, no bloqueante para esta |
| El usuario no entiende la diferencia entre los dos modos y elige el que no le conviene | Bajo | El selector del Portal debe explicar la diferencia en una línea (mismo patrón que la advertencia de `kbMaxPerQuestion`, DEC-0027) |
| `file_base64` se reemplaza sin transición (DEC-0047) — un provider de `galaxIA-satellite-star` no actualizado en el mismo ciclo deja de poder recibir adjuntos por transmisión directa | Alto durante el rollout, si no se coordina | Implementar y desplegar el cambio de protocolo (`galaxIA`) y la actualización de los providers afectados (`galaxIA-satellite-star`) en el mismo ciclo de trabajo — no hay compatibilidad hacia atrás que lo cubra |

## Preguntas abiertas (para cuando se priorice implementar)

1. ~~¿Red IPFS pública o un nodo IPFS privado operado por el propio operador de la red FHS?~~ **Resuelta (DEC-0045):** es elección de quien sube el archivo, el protocolo soporta ambas vía `ipfs.network`/`ipfs.endpoint`.
2. ~~¿La elección de transporte (directo vs. IPFS) es una preferencia por conversación, o por cada adjunto individual dentro de la misma conversación?~~ **Resuelta (DEC-0052):** ni una ni otra — es una configuración del Portal (activo/inactivo + red), no una elección repetida por conversación ni por adjunto. Si está activa, todos los adjuntos van por IPFS; si no, van directo.
3. ~~¿Quién sube el archivo a IPFS — el propio Portal (cliente) directo contra un nodo/gateway, o el Portal se lo entrega a Navigator y Navigator lo sube?~~ **Resuelta (DEC-0051): Navigator.** El Portal es un frontal puro, no debe guardar credenciales de escritura de IPFS en el navegador (expuestas por construcción). Navigator ya recibe el binario crudo hoy en el modo directo (`artifacts: string[]`, `chat-ws.ts`) — mismo punto de confianza, sin superficie nueva; solo cambia qué hace con el binario una vez recibido.
4. ~~¿Cómo se implementa técnicamente "ampliar la ventana de retención" — un mensaje/acción nueva en el protocolo, o un parámetro adicional en la tool call original?~~ **Resuelta (DEC-0052):** no es una "ampliación" de una ventana — es una elección binaria declarada por adelantado (`ephemeral` vs `reuse`), transportada como parte de `ArtifactRef`. No hace falta un mensaje nuevo de protocolo.
5. ~~¿Quién ejecuta el unpin cuando expira el TTL — un proceso propio de Navigator, un servicio aparte, o se delega al propio nodo IPFS si soporta expiración nativa?~~ **Resuelta (DEC-0052):** en modo `ephemeral`, el propio satellite que consumió el archivo, inmediatamente al responder (evento, no TTL) — con el TTL de 3h solo como respaldo si nunca responde. En modo `reuse`, nadie automáticamente — responsabilidad del usuario, sin mecanismo de expiración (funcionalidad de borrado bajo demanda queda a futuro).
6. ~~¿Cuál es el gateway público *default* cuando el usuario elige `network: "public"` sin especificar `gatewayUrl`? ¿Configurable por el operador del nodo Portal, o hardcodeado a uno conocido (ej. `ipfs.io`)?~~ **Resuelta (DEC-0053):** default `https://ipfs.io/ipfs`, configurable por el operador de Navigator vía `IPFS_PUBLIC_GATEWAY_URL`. El Portal lo consulta en `GET /api/ipfs-config` y lo muestra explícitamente al usuario antes de que elija ese transporte — nunca un detalle oculto.
7. ~~Si el usuario especifica un nodo privado para subir, ¿la subida y la descarga necesitan URLs distintas?~~ **Resuelta (DEC-0046):** son estructuralmente dos endpoints distintos siempre (API de escritura vs. gateway de lectura) — `ArtifactRef` solo modela el de lectura (`gatewayUrl`); el de escritura es config local de quien sube y nunca viaja por el protocolo.
8. ~~¿`ArtifactRef` reemplaza por completo `file_base64`, o convive con él durante una transición?~~ **Resuelta (DEC-0047): se reemplaza.** No hay convivencia — `file_base64` se retira del schema de `arguments` en el mismo cambio que introduce `file: ArtifactRef`. Es un breaking change deliberado, no accidental: requiere actualizar `galaxIA` (protocolo) y `galaxIA-satellite-star` (providers que ya implementan `file_base64`: `satellite-ocr-example`, `rag-provider`, `kb-provider`) en el mismo ciclo de trabajo — no hay periodo donde ambas formas coexistan.

## Enlaces y decisiones relacionadas

- DEC-0025 — formato generalizado de `privacy.retention` (`{ ttl: ... }`), reutilizado aquí para el default de 3 horas.
- DEC-0026/DEC-0037 — el protocolo define el contrato, nunca el motor/infraestructura interna de un provider ni de un mecanismo de transporte — aplicado aquí a la elección de red/nodo IPFS.
- DEC-0028 — `Signal.tags`, mismo patrón de "tipo de protocolo compartido y tipado" que `ArtifactRef` sigue aquí (DEC-0046).
- `spec-native/specs/ocr-confirmacion/SPEC.md` (SPEC-OCRCONFIRM-0001) — patrón de preferencia configurable en el Portal (`preferences.ocrMode`) que este spec reutiliza para el selector de transporte.
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — mismo formato de retención con TTL.
- Issue #12 en GitHub — seguimiento público de esta iniciativa.

## Tareas relacionadas

- Ver `spec-native/tasks/ipfs-adjuntos/TASKS.md`.

## Notas

- Implementado el 2026-07-07 (DEC-0053 documenta los refinamientos surgidos al implementar):
  - **Protocolo:** `ArtifactRef.retention`, `ToolCallResultMessage.content` con el item `{ type: "artifact" }` (`packages/fhs-protocol/src/types.ts`/`messages.ts`).
  - **Navigator:** `apps/navigator/src/ipfs/ipfs-client.ts` (cliente mínimo compatible con la API de Kubo — `IPFS_API_URL` para escritura, `IPFS_PUBLIC_GATEWAY_URL`/`IPFS_PRIVATE_GATEWAY_URL` para lectura). `runOcrDeterministically`/`executeToolCall` (`agent/runtime.ts`) reemplazan `file_base64` por `file: ArtifactRef`; unpin inmediato tras la respuesta + TTL de respaldo de 3h. `GET /api/ipfs-config` expone si IPFS está disponible y el gateway público default.
  - **Portal:** selector de transporte directo/IPFS + red + retención en la barra de configuración (`chat-view.ts`), deshabilitado si Navigator no tiene IPFS configurado, con el gateway público mostrado explícitamente. Bug de CSS encontrado y corregido: `.settings-bar label { display: flex }` sobrescribía el estilo UA de `[hidden]`, dejando visibles filas que debían estar ocultas — corregido con `.settings-bar [hidden] { display: none }`.
  - **`galaxIA-satellite-star`:** `examples/satellite-ocr-example/src/index.ts` resuelve `file: ArtifactRef` (inline o descarga desde `gatewayUrl`) — nunca hace unpin, eso es responsabilidad exclusiva de Navigator (ver DEC-0053). `rag-provider`/`kb-provider` no se tocaron — no exponen ninguna tool que reciba binarios.
  - Verificado con `npm run typecheck`/`build` en los dos repos, y la UI del Portal probada en `portal-dev` real (toggle directo/IPFS, visibilidad correcta de las filas tras el fix de CSS).
  - **Pendiente (backlog, no bloqueante):** verificación E2E contra un nodo IPFS/Kubo real (no ejecutado en esta sesión, sin infraestructura IPFS disponible — mismo patrón que otros bloqueos de hardware/infra del proyecto, ej. issue #1); TTL de respaldo no persistente a un reinicio de Navigator (ver Riesgos); acción de borrado bajo demanda para modo `reuse` (funcionalidad a futuro).
