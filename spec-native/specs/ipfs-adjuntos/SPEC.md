# SPEC-IPFS-0001 — Transporte de adjuntos vía IPFS, configurable por el usuario

## Estado

`accepted` (diseño cerrado) — sin implementar. Ver DEC-0044, DEC-0045.

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

### Red pública vs. privada: también elección de quien sube el archivo (DEC-0045)

La pregunta abierta original ("¿red IPFS pública o nodo privado del operador?") se resuelve así: **no es una decisión fija del operador ni de este spec — es otra elección de quien sube el archivo**, mismo nivel que la elección directo/IPFS. El protocolo debe soportar ambas configuraciones (un gateway/nodo público, o un nodo privado que el usuario u operador especifique), no imponer una.

Consecuencia directa: **el CID solo no alcanza.** Un CID identifica el contenido, pero no dice en qué red/nodo buscarlo — si el usuario eligió un nodo privado, el provider (satellite) necesita saber *dónde* pedir ese CID, no solo *cuál* CID pedir. El protocolo debe transportar, junto al CID, un descriptor de origen IPFS:

```
{
  cid: string,
  ipfs: {
    network: "public" | "private",
    endpoint?: string   // URL del gateway/nodo — obligatorio si network es "private",
                         // opcional si "public" (se puede usar un gateway público por default)
  }
}
```

Esto reemplaza el parámetro `file_cid` mencionado más abajo en "Alcance" — no es solo el CID, es CID + descriptor de dónde resolverlo.

### Dirección inversa: el provider también puede subir y devolver un CID

Además de recibir adjuntos vía IPFS, un provider debe poder **generar** un resultado (ej. una imagen procesada, un artefacto grande) y devolverlo de la misma forma — subiéndolo él mismo a IPFS (al mismo nodo/red que el descriptor de la petición indique, o a otro si así se configura) y devolviendo `{ cid, ipfs: {...} }` en vez de un payload inline. Mismo mecanismo, dirección simétrica: cualquiera de las dos partes (quien pide, quien resuelve) puede ser quien sube o quien descarga.

### Por qué IPFS resuelve el problema de fondo

- **Desacopla la entrega del procesamiento.** Subir a IPFS y descargar del lado del provider son dos operaciones independientes en el tiempo — si el provider está ocupado, el archivo ya está disponible esperando en IPFS, no se pierde ni hay que reenviarlo. Esto es lo que permite tratar la descarga como un proceso batch/asíncrono en vez de una recepción síncrona.
- **Anonimiza el origen del binario frente al provider.** El provider nunca ve el archivo llegar directamente desde la conexión del usuario — solo pide un CID a la red/nodo IPFS. Quien sirve el blob (el nodo IPFS) no es la misma parte que sabe qué conversación/usuario lo originó.

### Retención

Default: **3 horas** desde que se sube (`privacy.retention: { ttl: "PT3H" }`, mismo formato generalizado de DEC-0025 que ya usa `rag-provider`). Quien sube el archivo puede pedir ampliar esa ventana explícitamente si planea reutilizarlo (ej. la misma sesión de trabajo se extiende más de 3 horas) — la ampliación es una acción explícita del usuario, no un default más largo.

## Alcance

### Dentro del alcance

- Selector en el Portal: transmisión directa (default) vs. IPFS, por adjunto o por conversación (a definir en implementación — ver preguntas abiertas).
- Si se elige IPFS, selector adicional de red: pública (con gateway default) vs. privada (requiere especificar `endpoint`) — misma UI, mismo nivel de elección que directo/IPFS.
- Subida del archivo a IPFS desde el Portal (o desde Navigator en nombre del Portal — a definir en implementación).
- El protocolo FHS transporta `{ cid, ipfs: { network, endpoint? } }` en vez del binario cuando el modo IPFS está activo — mismo mecanismo de tool call que hoy (`ocr_extract`, `document_index`, etc.), reemplazando el parámetro `file_base64`.
- Simetría: un provider puede devolver un resultado de la misma forma (subir a IPFS + devolver `{ cid, ipfs }`), no solo recibir adjuntos así.
- Retención de 3 horas por default, extensible explícitamente por quien subió el archivo.

### Fuera del alcance (para esta iteración)

- Elegir el motor/nodo IPFS concreto (ver pregunta abierta #1 abajo) — igual que con RAG/KB (DEC-0026/DEC-0037), este spec define el contrato (qué transporta el protocolo, quién decide el modo, política de retención) pero no impone una implementación de infraestructura IPFS específica.
- Deduplicación explícita entre distintos usuarios que suben el mismo archivo (mencionada como beneficio natural de IPFS en el ROADMAP original, pero no es un requisito de esta iteración — es una consecuencia gratuita del content-addressing, no algo que haya que construir).
- Migrar adjuntos existentes ya enviados por transmisión directa a IPFS retroactivamente.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un CID en una red IPFS **pública** es recuperable por cualquiera que lo tenga, indefinidamente mientras algún nodo lo mantenga pinneado — no hay control de acceso nativo. "Anonimizar el origen" no es lo mismo que "el contenido es privado". | Alto si el adjunto es sensible | Mitigado por diseño (DEC-0045): la elección de red pública/privada es del usuario que sube el archivo, no un default fijo — quien maneje contenido sensible puede elegir un nodo privado explícitamente. La responsabilidad de saber cuál conviene es del usuario/operador, el protocolo solo debe soportar ambas opciones |
| Sin el descriptor `ipfs.endpoint`, un provider no puede resolver un CID subido a un nodo privado — el CID solo no basta | Alto (bloquea el caso privado por completo si se omite) | Resuelto en el diseño: el protocolo transporta `{ cid, ipfs: { network, endpoint } }`, nunca el CID aislado |
| Nadie despina el CID después de la ventana de retención — el archivo queda huérfano pero recuperable | Medio | El mecanismo de expiración (quién corre el unpin tras el TTL) es responsabilidad de implementación, no resuelto en este spec |
| El usuario no entiende la diferencia entre los dos modos y elige el que no le conviene | Bajo | El selector del Portal debe explicar la diferencia en una línea (mismo patrón que la advertencia de `kbMaxPerQuestion`, DEC-0027) |

## Preguntas abiertas (para cuando se priorice implementar)

1. ~~¿Red IPFS pública o un nodo IPFS privado operado por el propio operador de la red FHS?~~ **Resuelta (DEC-0045):** es elección de quien sube el archivo, el protocolo soporta ambas vía `ipfs.network`/`ipfs.endpoint`.
2. ¿La elección de transporte (directo vs. IPFS) es una preferencia por conversación, o por cada adjunto individual dentro de la misma conversación?
3. ¿Quién sube el archivo a IPFS — el propio Portal (cliente) directo contra un nodo/gateway, o el Portal se lo entrega a Navigator y Navigator lo sube? Afecta qué componente necesita credenciales/acceso al nodo IPFS.
4. ¿Cómo se implementa técnicamente "ampliar la ventana de retención" — un mensaje/acción nueva en el protocolo, o un parámetro adicional en la tool call original?
5. ¿Quién ejecuta el unpin cuando expira el TTL — un proceso propio de Navigator, un servicio aparte, o se delega al propio nodo IPFS si soporta expiración nativa?
6. ¿Cuál es el gateway público *default* cuando el usuario elige `network: "public"` sin especificar `endpoint`? ¿Configurable por el operador del nodo Portal, o hardcodeado a uno conocido (ej. `ipfs.io`)?
7. Si el usuario especifica un nodo privado (`endpoint`) para subir, ¿ese mismo endpoint se usa también para que el provider descargue, o el provider podría necesitar una URL distinta (ej. el Portal sube vía un endpoint interno, pero el provider descarga vía una URL pública/LAN distinta del mismo nodo)? No asumido en el diseño actual — el descriptor `ipfs.endpoint` hoy asume una sola URL válida para ambas partes.

## Enlaces y decisiones relacionadas

- DEC-0025 — formato generalizado de `privacy.retention` (`{ ttl: ... }`), reutilizado aquí para el default de 3 horas.
- DEC-0026/DEC-0037 — el protocolo define el contrato, nunca el motor/infraestructura interna de un provider ni de un mecanismo de transporte — aplicado aquí a la elección de red/nodo IPFS.
- `spec-native/specs/ocr-confirmacion/SPEC.md` (SPEC-OCRCONFIRM-0001) — patrón de preferencia configurable en el Portal (`preferences.ocrMode`) que este spec reutiliza para el selector de transporte.
- `spec-native/specs/rag-provider/SPEC.md` (SPEC-RAG-0001) — mismo formato de retención con TTL.
- Issue #12 en GitHub — seguimiento público de esta iniciativa.

## Tareas relacionadas

- Aún no creadas — `spec-native/tasks/ipfs-adjuntos/TASKS.md` se escribe cuando se priorice la implementación.
