# SPEC-CMD-0001 — Comandos de chat autodescubiertos

## Estado

`active` — decisión DEC-0100. Sustituye el comando `/calc` cableado del Navigator (DEC-0097).
Sin retrocompatibilidad. Revisado por Codex en 5 rondas (2026-10-02).

## Problema

`/calc` estaba escrito en el Navigator (parser, capacidad, herramienta, validación). Un
comando nuevo exigía código nuevo en el Navigator. Un `/leer` que ningún nodo ofrece viajaba
al LLM como texto.

## Principio

**Un nodo declara en su anuncio firmado los comandos que ofrece; el Navigator los admite según
un registro cerrado y su política, y los ejecuta por el ciclo de siempre (oferta → puja →
asignación → stream) tras la autorización por uso (SPEC-AUTHZ-0001). El LLM no interviene.**
Lo que el nodo controla es un contrato acotado; lo que el Navigator muestra a la persona
(textos de error, plantilla de la tarjeta) es del Navigator.

## Definición en el protocolo

`Beacon.commands` (campo 11, `fhs_version ≥ 0.2`): lista de `CommandDescriptor`
(`idl/fhs-protocol.proto`). Los comandos se toman **solo** de `NodeAdvertise` por GossipSub;
los `DhtBeaconRecord` no alimentan la tabla. Todo campo del Beacon queda cubierto por la
firma del anuncio.

### Límites y canonicalidad (obligatorios; un incumplimiento invalida todo el anuncio de comandos)

- ≤ 8 comandos por Beacon, ordenados por `name` y con `name` único; el campo `commands`
  codificado ≤ 4096 bytes. ≤ 4 argumentos por comando; el orden de `args` es semántico.
- `name`: `^[a-z][a-z0-9-]{0,23}$`; reservados `ayuda`, `help`, `comandos`. `args[].name`:
  `^[a-z][a-z0-9_]{0,23}$`, únicos dentro del comando.
- `summary` ≤ 120 y `args[].description` ≤ 80 caracteres: **texto plano**.
- Campos por tipo: `max_length` (1..1024), `allowed_chars` (≤ 128 puntos de código, ordenados
  y sin duplicados), `max_nesting` (0..64) y `rest` solo en `STRING`; `enum_values` solo en
  `ENUM` (≤ 16, únicos, ordenados, cada uno de 1 a 64 caracteres sin espacios). `INTEGER`,
  `NUMBER` y `BOOLEAN` tienen un tope fijo de 32 caracteres por token. Un campo no aplicable
  debe estar vacío o en 0.
- Esquema no ambiguo: obligatorios antes que opcionales; solo el último argumento puede ser
  `rest`.
- `CommandResult.type` ∈ {`NUMBER`, `INTEGER`, `BOOLEAN`}, `max_chars` 1..64.
- Texto saneado: UTF-8 válido, sin puntos de código de las categorías Unicode Cc, Cf, Cs, Co,
  Cn, Zl, Zp ni espacios distintos de U+0020 ("imprimible"), sin saltos de línea.
- Un nodo que anuncia comandos declara `fhs_version ≥ 0.2`; el Navigator ignora los de
  versiones menores.

### Huella del contrato

`fingerprint = SHA-256("fhs/cmd/contract" ‖ 0x00 ‖ "1" ‖ 0x00 ‖ bytes)`, donde `bytes` es el
Protobuf determinista del `CommandDescriptor` **con `summary` y todo `description` vaciados**.
Cubre solo lo ejecutable: `name`, `capability_id`, `tool_name`, argumentos y resultado. Un
cambio de texto informativo no cambia la huella.

## Registro cerrado de capacidades invocables

`idl/command-capabilities.json` (esquema `idl/command-capabilities.schema.json`; JSON válido,
sin comentarios). Por capacidad: `tools` permitidas, `admission` (`open` | `trusted`) y
`error_codes` (código → texto propio del Navigator). El operador puede sustituirlo con
`FHS_COMMAND_REGISTRY`; si no valida contra el esquema, el Navigator **no arranca**. Se carga
una vez (sin recarga en caliente). `registry_digest = SHA-256("fhs/cmd/registry" ‖ 0x00 ‖ "1"
‖ 0x00 ‖ bytes exactos del archivo)`. Una capacidad fuera del registro **no puede declarar
comandos**.

## Admisión

Un comando entra a la tabla solo si: la firma y la frescura del anuncio son válidas; su
`capability_id` está en el Beacon y en el registro; `tool_name` ∈ `registro[cap].tools`; el
descriptor es canónico y cumple los límites; y el DID pasa la admisión de esa capacidad:
`trusted` exige que esté en `FHS_TRUSTED_NODES`; `open` exige que el operador lo permita con
`FHS_COMMAND_NODES` (`*` o lista de DIDs). Sin `FHS_COMMAND_NODES` no hay comandos abiertos.

## Tabla de comandos

- Los descriptores admitidos con el mismo `name` deben tener **la misma huella**; si difieren
  el comando queda **deshabilitado por conflicto** y `/ayuda` lo avisa. Varios nodos con la
  misma huella son el caso normal (la subasta elige). `summary` y `description` mostrados son
  los del nodo con el DID menor (orden de bytes) entre los de esa huella.
- Un comando existe mientras viva el anuncio que lo declara.

## Gramática de entrada (v1)

Tras `/nombre` (ASCII sin distinguir mayúsculas) los argumentos son *tokens* separados por
uno o más espacios o tabuladores ASCII; sin comillas ni escapes. `rest` toma el resto de la
línea recortado, conservando espacios internos. Sin `rest`, un token sobrante es error; un
obligatorio faltante es error; la cadena vacía no es un valor. Largos en puntos de código
Unicode. La línea completa ≤ 2048 caracteres. `allowed_chars` se aplica a cada punto de código
de un `STRING` (los espacios internos deben estar listados). `INTEGER`: `-?(0|[1-9][0-9]*)`,
cabe en i64; `NUMBER`: `-?(0|[1-9][0-9]*)(\.[0-9]+)?`, finito, `-0` se normaliza a `0`;
`BOOLEAN`: `true|false`; `ENUM`: coincidencia exacta.

## Comportamiento del Navigator

1. `/nombre` vigente: valida con el descriptor (un error se responde localmente con el uso,
   **sin enviar nada**), elige nodo y pide la autorización por uso.
2. `/nombre` desconocido, deshabilitado o sin nodo vivo: respuesta **local** ("no hay nodos
   que ofrezcan /nombre ahora; usa /ayuda"). **Nunca llega al LLM.** Escape: `//texto` se
   envía como el literal `/texto` al Star elegido (implícito, P5).
3. `/ayuda` (local, sin red) lista los comandos vigentes con su uso, la cuenta de nodos y los
   conflictos.
4. Ejecución: oferta restringida al DID autorizado, puja, asignación y
   `ToolCall{tool_name, arguments}`.

## Resultado y errores

El resultado viaja como `DynamicObject{"result": string_value}` con **texto decimal canónico**
(no `double`); `BOOLEAN` como `"true"` | `"false"`. El Navigator valida el formato y
**reconstruye** el valor a mostrar. Un resultado que no sea `string_value`, con claves extra, o
que incumpla la gramática se rechaza como "error del nodo". Un error del nodo es un
`tool_error` cuyo `error` es **exactamente** un código de `error_codes` del registro; el texto
mostrado es el del Navigator. Cualquier otra cosa es "error del nodo".

## Autorización (enmienda a SPEC-AUTHZ-0001)

- Clase de dato `command_args`. `payload_digest = SHA-256("fhs/auth/command_args" ‖ 0x00 ‖ "1" ‖
  0x00 ‖ cv1(objeto))` con el valor cv1 `{ "args": <objeto de argumentos tipados>, "tool":
  <texto> }`: lo que transporta el `ToolCall` (no la serialización Protobuf).
- **Ligadura de contexto del `Grant`** (no son bytes enviados): `contract_fingerprint`,
  `tool_name` y `registry_digest` (`AuthorizationItem` 19–21). El `Grant` ata además
  `(provider_did, capability, tool, huella, registry_digest)`; el Dispatcher los **revalida al
  consumir** (huella vigente del nodo en la tabla, digest del registro del proceso). Entran al
  `batch_digest`, que el cliente firma. Un cambio de contrato entre la autorización y el
  despacho rechaza el envío y exige una autorización nueva.
- `data_summary` no lleva contenido ("comando /calc · 1 argumento · 12 caracteres"). La
  vista previa la hace el Portal localmente con la línea que la persona escribió; sin esa
  línea (p. ej. tras reconectar) muestra solo metadatos y nunca reconstruye el contenido.
- La bitácora registra `tool_name`, `contract_fingerprint` y `registry_digest`, sin contenido.

## Frescura de los anuncios (mínimo para esta spec)

El verificador rechaza `|ahora − timestamp| > 120 s`, `ttl_seconds` fuera de 1..=120 y
cualquier desbordamiento aritmético. La expiración es `timestamp + ttl` del **anuncio**
(nunca la hora de recepción) y se exige `timestamp` estrictamente mayor al último aceptado de
ese DID. Ese estado vive en memoria: tras un reinicio solo puede reaparecer un anuncio de
≤ 120 s, que no vive más allá de su `timestamp + ttl` y que el nodo debe respaldar pujando y
sirviendo el stream (residuo aceptado). El plan de confianza lo absorbe.

## Mensajes al cliente

- `commands.available` (94, Navigator → cliente): `revision` y lista de `CommandSummary`.
  Se envía tras el handshake y en cada cambio de la tabla, incluidas las bajas por TTL. Solo
  metadatos. `revision` es monótono por sesión; el cliente aplica una lista solo si
  `revision` es mayor que la última vista en la sesión.
- `commands.list_request` (95, cliente → Navigator): tras reconectar (sesión nueva) el
  cliente la envía y **reemplaza** su lista sin comparar con revisiones anteriores.
- Los comandos en conflicto se muestran solo como `nombre · conflicto (N nodos)`. El cliente
  pinta todo texto de nodo como texto plano.

## Orden de despliegue

`fhs_version` pasa a `0.2`. Una implementación vieja descarta el campo 11 al re-codificar el
Beacon y rechaza el anuncio del nodo que lo usa. Orden: (1) SDK e IDL; (2) Atlas y relevos
que validen anuncios; (3) Navigator; (4) nodo móvil; (5) Portal. Hasta el paso 4 nadie
publica el campo.

## Conformidad

- El Navigator no contiene `"/calc"`, `FHS_CALC_NODES`, `prepare_calc`, `run_calc`, `calc-0`
  ni `arithmetic_solve` fuera del registro, fixtures y pruebas.
- Fixtures compartidos Rust/TypeScript: `idl/fixtures/command-descriptors.json` (descriptores
  válidos, inválidos y no canónicos; huellas; líneas de entrada → argumentos o error exacto;
  resultados) y `idl/fixtures/authorization-digests.json` (digest `command_args`; el
  `batch_digest` con la ligadura).
- Pruebas: nodo no admitido; capacidad o herramienta fuera del registro; conflicto de
  huellas; anuncio vencido, futuro o reinyectado; `/foo` desconocido nunca llega al LLM;
  cambio de huella entre la autorización y el despacho; resultado malicioso.

## Fuera de alcance

Comandos con efectos externos, con adjuntos o multi-paso; argumentos con nombre (`--flag`) y
comillas; registro dinámico de capacidades por los nodos; traducciones de `/ayuda`; resultados
de tipo texto.
