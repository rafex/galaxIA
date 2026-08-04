# galaxIA — ¿Qué es y cómo usarlo?

## ¿Qué es galaxIA?

galaxIA es un asistente de inteligencia artificial comunitario. A diferencia de ChatGPT o Claude, **no depende de servidores de ninguna empresa**: corre en hardware que ya tienes (una computadora vieja, una Raspberry Pi, una laptop) y usa modelos de lenguaje de código abierto.

Todo el procesamiento ocurre en tu red local o en la red de personas de confianza. Tus conversaciones no salen a internet.

---

## ¿Para qué sirve?

- Hacer preguntas y recibir respuestas como en cualquier asistente de IA.
- Procesar documentos (texto, imágenes con OCR) sin subir nada a la nube.
- Crear tu propia red de IA con amigos o compañeros de trabajo.

---

## ¿Cómo funciona? (sin tecnicismos)

Imagina una oficina con tres roles:

1. **El directorio (Atlas)** — sabe quién está disponible para trabajar, pero no hace el trabajo él mismo.
2. **El asistente (Star)** — tiene el modelo de lenguaje instalado y responde las preguntas.
3. **El coordinador (Navigator)** — recibe tu pregunta, pregunta al directorio quién puede responderla, se la pasa al asistente y te devuelve la respuesta.

Cuando escribes un mensaje en el chat, el coordinador lo convierte en una "misión", la publica en la red interna, el asistente la toma, genera la respuesta y te la envía de vuelta.

---

## ¿Cómo uso el chat?

Si alguien ya tiene la infraestructura levantada, el operador debe entregarte
un cliente Portal que participe en la red FHS como peer libp2p.

1. Inicia el cliente Portal y conéctalo a un bootstrap peer autorizado.
2. Escribe tu mensaje en el campo de texto.
3. Presiona Enter o el botón de enviar.
4. La respuesta llega por el stream libp2p del Portal.

Al final de cada respuesta verás un bloque de **Procedencia** que indica qué modelo respondió y desde qué nodo — esto te permite saber exactamente de dónde vino la respuesta.

---

## ¿Qué necesito para montar mi propia red?

Lo mínimo:

- Una computadora con al menos **8 GB de RAM** (para un modelo pequeño).
- Acceso a internet solo para descargar el software la primera vez; después puede funcionar sin conexión.
- Saber copiar y pegar comandos en la terminal (o tener a alguien que lo haga por ti).

Para una red más cómoda:

- Dos o más computadoras conectadas por WiFi o cable local.
- Una computadora dedicada a ser el "asistente" (puede ser una Raspberry Pi 5 con 8 GB).

---

## Privacidad

- Tus mensajes nunca salen de tu red local a menos que tú lo configures así.
- No hay cuentas que crear, ni contraseñas que recordar.
- Cada nodo tiene una identidad criptográfica (DID) que puedes ver en los metadatos de la respuesta.

---

## ¿Qué pasa si la computadora del asistente se apaga?

El coordinador lo detecta y puede redistribuir la misión a otro asistente disponible en la red. Si no hay ningún asistente disponible, recibirás un mensaje de error — no hay un servidor central que falle, solo nodos individuales.

---

## Glosario rápido

| Término | Qué significa para ti |
|---|---|
| **Atlas** | El directorio de la red (arranca primero, siempre) |
| **Star** | El nodo que tiene el modelo de lenguaje |
| **Navigator** | El coordinador que recibe tu chat |
| **Misión** | Cada pregunta que haces se convierte en una misión interna |
| **DID** | La "firma" única de cada nodo (como una huella digital) |
| **Procedencia** | Bloque al final de cada respuesta que dice quién la generó |
