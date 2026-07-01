# PRODUCT.md

## Problema

La inteligencia artificial útil hoy depende de proveedores centralizados: modelos en la nube, APIs propietarias y herramientas que obligan a enviar datos a terceros. Esto excluye a personas, comunidades y pequeños colectivos que quieren procesar información localmente, reutilizar hardware viejo y mantener soberanía sobre sus datos.

No existe aún un protocolo sencillo para que un grupo de personas combine sus propios equipos —una Mac mini con llama.cpp, una laptop con OCR, una Raspberry Pi con whisper— en un único agente de IA usable desde una interfaz común.

## Usuarios

- **Comunidades soberanas:** quieren compartir recursos de IA dentro de su red sin depender de servicios externos.
- **Personas con hardware viejo:** quieren darle utilidad a Mac minis, laptops o Raspberry Pis acumulando polvo.
- **Desarrolladores:** quieren construir aplicaciones que consuman modelos y herramientas federadas sin acoplarse a un proveedor único.

## Objetivos

- **Objetivo principal:** construir un protocolo y un chat web demostrativo que permita a una comunidad federar modelos de lenguaje (LLM) y herramientas (MCP) entre nodos locales.
- **Métricas de éxito del MVP:**
  - Un usuario puede escribir en un chat web y recibir respuestas generadas por un modelo local o comunitario.
  - El agente puede usar una tool externa (OCR) ofrecida por otro nodo de la red.
  - Si el nodo que ofrece OCR se apaga, el agente encuentra automáticamente otro nodo disponible.
  - Cada respuesta muestra su procedencia: quién razonó, quién procesó y qué datos viajaron.

## No objetivos

- No es un producto de IA conversacional genérico que compita con ChatGPT.
- No resuelve NAT traversal, descubrimiento totalmente descentralizado ni escalabilidad masiva en v0.1.
- No implementa autenticación de usuarios ni facturación en el MVP.
- No define ni implementa todos los tipos de proveedores desde el inicio (embedding, storage, agent).
- No reemplaza MCP ni OpenAI API; los complementa con un protocolo de descubrimiento y selección.

## Valor diferencial

FHS convierte recursos de IA dispersos en un agente distribuido. El modelo no tiene que vivir en la misma computadora que las herramientas. El dueño de cada nodo decide qué publicar; el dueño de los datos decide hasta dónde viajan; y el sistema siempre explica quién procesó qué.
