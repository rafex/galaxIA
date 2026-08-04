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
