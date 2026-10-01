# Intake

Ideas pendientes de triage. No son tareas ejecutables ni aparecen en el
tablero de entrega hasta que se promueven a una spec y sus tareas derivadas.

## INTAKE-CA-0001 — CA interna para TLS de la red GalaxIA

- **Estado:** `triaged`
- **Prioridad:** `high`
- **Objetivo:** eliminar la aceptación manual de certificados autofirmados en
  Firefox sin introducir tráfico FHS sin cifrar ni sustituir el camino P2P.
- **Decisión inicial:** usar una CA raíz interna de GalaxIA y certificados de
  servidor para Portal, Navigator y servicios P2P TLS. mTLS queda como opción
  posterior de control de acceso, no como mecanismo base de identidad P2P.

### Pasos propuestos

1. Definir la autoridad `GalaxIA Root CA`, política de nombres, vigencia,
   rotación y revocación.
2. Crear certificados de hoja con SAN para nombres DNS internos y direcciones
   IP de la MVP (`portal.galaxia.lan`, `navigator.galaxia.lan`, etc.).
3. Distribuir la CA raíz en macOS y Firefox, y documentar la instalación para
   nuevos nodos y clientes.
4. Montar certificados y claves como secretos de los contenedores Podman;
   nunca incluir claves privadas en imágenes ni en Git.
5. Reemplazar los certificados de desarrollo del Portal y Navigator,
   manteniendo WSS/HTTPS obligatorio.
6. Validar desde Firefox el portal HTTPS y el dial libp2p WSS sin excepciones
   manuales.
7. Documentar renovación, expiración, recuperación y retiro de certificados.
8. Evaluar mTLS después de la CA interna si se requiere autorización de
   dispositivos; el certificado del servidor seguirá necesitando confianza.

### Criterios para promover a spec

- Existe una política de CA y ciclo de vida aprobada.
- Todos los servicios TLS tienen SAN válido y cadena verificable.
- Un cliente autorizado conecta por HTTPS/WSS sin aceptar excepciones.
- Un cliente sin la CA no puede validar el servicio.
- Las claves privadas solo viven en secretos o volúmenes protegidos.
- La E2E P2P continúa usando libp2p + Noise + Protobuf.

## INTAKE-MTLS-0001 — Autenticación mutua opcional para nodos aprobados

- **Estado:** `backlog`
- **Prioridad:** `medium`
- **Objetivo:** añadir autenticación mutua TLS para un nivel de confianza
  reforzado, sin reemplazar la identidad P2P `did:key` ni el transporte
  libp2p + Protobuf.
- **Situación actual:** la red usa TLS con CA/certificados de prueba, pero
  únicamente autentica el servidor; mTLS no está implementado.

### Pasos propuestos

1. Definir el modelo de aprobación y qué CA emite certificados de cliente.
2. Definir SAN, rotación, revocación y asociación certificado ↔ `did:key`.
3. Configurar `requestCert` y verificación de cadena en los listeners TLS de
   Portal, Navigator y providers sin permitir fallback sin cifrar.
4. Distribuir certificados como secretos Podman y validar el rechazo de un
   cliente sin certificado o fuera de la CA.
5. Automatizar una E2E positiva y negativa, y documentar el trade-off de
   introducir una autoridad de aprobación dentro de la red descentralizada.

## INTAKE-JSON-ADAPTER-0001 — Frontera JSON de adaptadores locales

- **Estado:** `backlog`
- **Prioridad:** `medium`
- **Objetivo:** decidir si el JSON usado por los adaptadores locales de
  `llama.cpp` y por schemas internos debe permanecer como frontera externa o
  reemplazarse por estructuras Protobuf también fuera del wire FHS.
- **Situación actual:** el wire protocol FHS ya es libp2p + Protobuf. JSON está
  aislado en adaptadores de modelo, configuración y parseo local; esta entrada
  no implica que JSON pueda cruzar streams, pub/sub, DHT o Envelopes FHS.

### Criterios para promover a spec

- Medir el coste de mantener la frontera OpenAI-compatible de llama.cpp.
- Inventariar schemas internos JSON que no son mensajes FHS.
- Comparar interoperabilidad, depuración, rendimiento y compatibilidad de
  herramientas si se migran esos adaptadores a Protobuf.
- Decidir explícitamente el límite: solo adaptadores locales o también
  herramientas/modelos externos.
- Definir una migración coordinada y pruebas de no regresión antes de cambiar
  la frontera.

## INTAKE-NOVA-CONSTITUCION-0001 — Nova especialista en la Constitución mexicana

- **Estado:** `backlog`
- **Prioridad:** `low` — idea futura; no desplaza los pendientes P0 del MVP.
- **Objetivo:** explorar una Nova especializada en responder preguntas sobre
  la Constitución Política de los Estados Unidos Mexicanos, usando el texto
  oficial vigente como fuente y mostrando referencias verificables a los
  artículos consultados.
- **Alcance inicial:** definir una especialización de dominio sobre el tipo
  Nova ya existente; no crear un nuevo tipo de nodo ni cambiar el protocolo
  FHS por el solo hecho de añadir este caso de uso.
- **Fuera de alcance por ahora:** implementación, selección de modelo,
  despliegue en el laboratorio y decisión entre RAG local o de red.

### Criterios para promover a spec

- Identificar y versionar una fuente oficial del texto constitucional vigente,
  registrando fecha de consulta y cambios entre versiones.
- Responder con referencias comprobables a título/capítulo/artículo y separar
  claramente lo que dice la fuente de cualquier explicación generada.
- Cuando la fuente no alcance para contestar, reconocer la incertidumbre en vez
  de inventar el contenido o presentar la respuesta como asesoría jurídica.
- Preparar preguntas de evaluación que comprueben citas, cobertura,
  actualización y abstención ante información insuficiente.
- Definir cómo se actualizará el corpus y cómo se conservará la trazabilidad
  de cada respuesta hacia la versión consultada.

## INTAKE-RUST-MIGRATION-0001 — Migrar los componentes de GalaxIA a Rust

- **Estado:** `backlog`
- **Prioridad:** `medium` — iniciativa amplia posterior a la PoC funcional; no
  implica reescritura inmediata ni detiene el MVP actual.
- **Objetivo:** migrar gradualmente a Rust los componentes ejecutables del
  ecosistema GalaxIA, conservando el Portal Chat como excepción explícita.
- **Motivación:** la PoC ya demostró que el flujo integrado funciona; la
  siguiente etapa es evaluar una implementación común en Rust para runtimes y
  providers, manteniendo compatibilidad entre nodos y con dispositivos de
  recursos limitados.
- **Alcance candidato:** Atlas; Navigator/agente; Star; providers Satellite
  (OCR, RAG y KB); Nova; y las bibliotecas compartidas de protocolo y catálogo
  de parsers cuando formen parte de esos runtimes. La capacidad CURP ya está
  implementada en Rust/WASM y debe conservarse/integrarse, no reescribirse por
  defecto.
- **Excepción:** Portal Chat —su interfaz web y experiencia de usuario quedan
  fuera de esta migración. Esto no impide que consuma bibliotecas Rust
  compiladas a WASM si se justifica y mantiene la compatibilidad del navegador.
- **Fuera de alcance inicial:** cambiar el contrato FHS o el IDL Protobuf;
  reescribir documentación, schemas declarativos o infraestructura únicamente
  por uniformidad de lenguaje; retirar el runtime TypeScript antes de validar
  su reemplazo componente por componente.

### Criterios para promover a spec

- Inventariar componentes, dependencias entre repositorios y versiones activas;
  clasificar cada pieza como runtime, librería compartida, interfaz o tooling.
- Definir fases y orden de migración, estrategia de convivencia temporal con
  TypeScript y criterios de rollback por componente.
- Mantener interoperabilidad FHS (libp2p, Protobuf, identidad y semántica de
  Missions) sin cambios incompatibles al protocolo.
- Definir pruebas de paridad funcional y rendimiento en x86_64 y aarch64,
  incluyendo el hardware limitado del laboratorio.
- Acordar cómo se integrarán los providers Rust con llama.cpp y otros servicios
  externos sin incorporar al LLM dentro de esta migración.
- Migrar el tráfico productivo de cada componente solo después de superar sus
  pruebas unitarias, de protocolo e E2E; mantener Chat operativo sin cambios.
