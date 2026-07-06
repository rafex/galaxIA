# Vocabulario espacial de galaxIA

`galaxIA` combina "Galaxy" (galaxia) + "IA" — el vocabulario de producto sigue esa metáfora. Este documento es la referencia única: cualquier otro documento que necesite nombrar estos conceptos debe citar esta tabla, no reinventarla.

> Este vocabulario es de **documentación, interfaz y comunicación** — no cambia el protocolo FHS ni el código. `provider`, `providerId`, `capability`, `manifest`, `Registry`, `requestId` y el resto de identificadores técnicos siguen exactamente igual (ver `spec-native/specs/vocabulario-espacial/SPEC.md`, SPEC-VOCAB-0001, y `spec-native/DECISIONS.md` DEC-0024). Cuando un documento técnico necesita ser preciso a nivel de protocolo, usa el término técnico; cuando habla de cara a la comunidad o a un usuario, usa el término de esta tabla.

## Tabla canónica

| Concepto técnico | Nombre GalaxIA | Motivo |
|---|---|---|
| Red completa | Galaxy / GalaxIA Network | La federación completa de nodos |
| Nodo proveedor (genérico, cualquier tipo) | Node / Nodo | Término neutro cuando no importa si es Star o Satellite |
| LLM provider | Star | Fuente de razonamiento/generación — central, como una estrella |
| Tool provider | Satellite | Capacidad específica que orbita y aporta una función (OCR, búsqueda, etc.) |
| Registro (Registry) | Atlas | Mapa de nodos y capacidades |
| Manifiesto (manifest) | Beacon | Lo que anuncia un nodo al conectarse |
| Chat web | Portal | Entrada humana a la red |
| Orquestador / Agent Runtime | Navigator | Decide rutas entre razonamiento (Star) y herramientas (Satellite) |
| Ejecución de una tool (`tool.call`) | Mission | Una tarea enviada a un satélite |
| Auditoría/procedencia (`provenance`) | Flight Log | Registro de qué pasó, qué nodo, qué datos |
| Heartbeat (`ping`/`pong`) | Pulse | Señal periódica de vida |
| Conexión activa con la red | Orbit | Estado de "conectado y registrado" |
| Capacidad (`capability`) | Signal | Lo que un nodo anuncia que puede hacer |

### Subtipos de Satellite reservados (sin implementar todavía)

- **Memory Satellite** — búsqueda/vector store (ver `spec-native/specs/rag-provider/SPEC.md`, `spec-native/specs/kb-provider/SPEC.md`).
- **Storage Satellite** — archivos/documentos.
- **Bridge Satellite** — conecta con otro protocolo o red.

No hay subtipos de Star reservados todavía — un solo tipo de razonamiento por ahora.

## Star vs. Satellite: por qué no son sinónimos

Un **Star** razona: recibe un mensaje y genera una respuesta (hoy, un LLM vía `star-example`). Un **Satellite** ejecuta una capacidad puntual y determinada: OCR, búsqueda, en el futuro RAG o una base de conocimiento. Cuando algo aplica a cualquiera de los dos por igual (el ciclo de vida de conexión, el heartbeat, el descubrimiento por mDNS), se usa **"nodo"** como término neutro — nunca "satélite" como paraguas genérico, que fue el uso inicial descartado en DEC-0024.

## Frase de posicionamiento

**Español:**

> GalaxIA es una galaxia soberana de IA donde equipos reutilizados se convierten en estrellas y satélites. Cada estrella aporta razonamiento; cada satélite aporta una capacidad — OCR, búsqueda, memoria o automatización. El Portal los descubre mediante Atlas y el Navegador los combina en un agente comunitario.

**English:**

> GalaxIA is a sovereign AI galaxy where old computers become stars and satellites. Each star contributes reasoning; each satellite contributes a capability — OCR, search, memory or automation. The Portal discovers them through Atlas, and the Navigator combines them into a community agent.

## Enlaces relacionados

- `spec-native/specs/vocabulario-espacial/SPEC.md` (SPEC-VOCAB-0001) — spec completa, con el análisis de alcance y el conflicto Star vs. Satellite ya resuelto.
- `spec-native/DECISIONS.md` — DEC-0024 (decisión formal de vocabulario).
- `spec-native/specs/satelite-rating/SPEC.md`, `spec-native/specs/p2p-discovery/SPEC.md`, `spec-native/specs/rag-provider/SPEC.md`, `spec-native/specs/kb-provider/SPEC.md` — specs que ya usan este vocabulario.
