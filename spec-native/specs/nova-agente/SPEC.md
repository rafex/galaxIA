# SPEC-NOVA-0001 — Nova: nodo de razonamiento con loop propio

## Estado

`done (local)` — protocolo implementado (DEC-0055) y Nova de referencia (`nova-example`) implementado y verificado contra hardware real (DEC-0056): `qwen2.5-coder-3b-instruct` real en `bastion-wifi`, sin Atlas/Navigator de por medio (prueba directa del loop, no el registro FHS completo — ver Notas).

## Owner

Raúl Fletes (rafex)

## Problema

Un Star (`NodeType: "llm"`) es una sola llamada de completions, sin estado ni loop — Navigator hace toda la orquestación (matching determinístico, ejecución de tools, decisión de cuándo consultar una KB, etc.) y el Star solo genera texto o pide `tool_calls`. Este diseño es deliberado y defendido varias veces en este proyecto (DEC-0016/DEC-0017/DEC-0020/DEC-0050/DEC-0054): en hardware comunitario, un modelo pequeño no es confiable tomando decisiones de ejecución vía tool-calling, y cada ronda adicional de tool-calling es una nueva oportunidad de fallo de formato — así que el sistema minimiza cuántas veces se apuesta a que el modelo llene una estructura correctamente.

Pero hay una distinción real entre "el LLM no debe decidir ejecución" y "el LLM nunca puede razonar en varios pasos". Hay problemas que sí necesitan varias rondas de razonamiento (buscar, evaluar si alcanza, refinar la búsqueda, responder) para resolverse bien — forzarlos a una sola llamada no los hace más confiables, solo los hace peores. El protocolo hoy no tiene manera de distinguir "quiero una respuesta directa" de "quiero que algo razone en varios pasos" — ambos casos usan el mismo `NodeType: "llm"`.

## Propuesta

### Nova — un tipo de nodo nuevo, no un modo de Star

`NodeType` gana `"agent"` — nombre de producto **Nova** (vocabulario espacial, DEC-0024: un Star es una llamada, un Nova es un evento de varias fases). Un Nova:

- Tiene su propio loop de razonamiento interno (varias rondas antes de responder) — el motor real de ese loop es responsabilidad exclusiva del provider (DEC-0026), el protocolo no lo define.
- Se registra y descubre igual que un Star (mismo manifiesto base, mismo mecanismo de Atlas) — `NovaBeacon` reutiliza `models: ModelInfo[]` (un Nova también tiene un modelo subyacente) y agrega `reasoning: { maxSteps: number }`, el techo de rondas que ese Nova soporta.
- Se pide explícitamente — quien orquesta (hoy, Navigator) decide si quiere un Star o un Nova para una tarea dada, resolviendo contra Atlas por `NodeType` igual que ya hace para `"llm"`/`"mcp"`. Esta elección es responsabilidad de quien orquesta, no algo que el protocolo imponga.

### `GenerateRequest.maxReasoningSteps` — sugerencia, no orden

Quien pide una generación a un Nova puede sugerir cuántas rondas usar (`maxReasoningSteps?: number`) — un Star simplemente lo ignora, no tiene loop. Es un techo, no un mínimo obligatorio: el Nova puede resolver en menos pasos si ya tiene suficiente.

### `GenerateResponse.reasoningSteps` — traceability, no detalle del motor

Un Nova puede reportar cuántas rondas usó realmente (`reasoningSteps?: number`) — esto es lo único que el protocolo pide sobre el *resultado* del razonamiento interno, no el contenido de cada paso. Mismo principio ya aplicado a `KbCitation`/`ArtifactRef`/`ModelParserProfile`: el protocolo transporta el dato de auditoría, nunca el mecanismo detrás.

### Por qué esto no reabre DEC-0020/DEC-0050

DEC-0020 estableció que el LLM no debe decidir **ejecución/enrutamiento** de forma oculta — ese principio no cambia aquí. Un Nova sigue expuesto igual que un Star: quien lo invoca (Navigator) decide *cuándo* pedirle algo a un Nova, y cualquier tool que el Nova use dentro de su loop sigue pasando por el mismo mecanismo FHS de `tool.call`/`tool.result` — nada de esto es una decisión oculta nueva, es la misma arquitectura, con un nodo que internamente puede dar más de una vuelta antes de responder.

**Riesgo de confiabilidad, no resuelto por este spec:** cada ronda del loop interno de un Nova sigue siendo una llamada donde el modelo podría no llenar el formato esperado (DEC-0016/DEC-0017). El protocolo no puede garantizar que el Nova maneje esto bien — es responsabilidad de implementación del provider (DEC-0026), igual que ya lo es para el catálogo de parsers tolerantes (DEC-0050). Un Nova de referencia mal implementado (sin parser tolerante en cada ronda, sin límite duro de reintentos) hereda el mismo riesgo que ya se documentó para tool-calling — el protocolo declara el tipo de nodo, no puede forzar que la implementación sea robusta.

## Alcance

### Dentro del alcance

- `NodeType` gana `"agent"` (`packages/fhs-protocol/src/types.ts`).
- `NovaBeacon` (`packages/fhs-protocol/src/manifest.ts`) — mismo patrón que `StarBeacon`, con `reasoning.maxSteps`.
- `GenerateRequest.maxReasoningSteps` / `GenerateResponse.reasoningSteps` (`packages/fhs-protocol/src/llm.ts`).
- `flattenManifest` extendido para reconocer `NovaBeacon` — sin cambios en Atlas más allá de esto (`validateManifest` ya acepta cualquier `provider.type` con `endpoint`, sin caso especial necesario para `"agent"`).

### Fuera del alcance (para esta iteración)

- El motor de razonamiento en sí (cómo decide un Nova cuándo parar, qué tools usa, cómo valida cada ronda) — responsabilidad exclusiva de la implementación de referencia en `galaxIA-satellite-star`, no de este spec.
- Que Navigator prefiera automáticamente un Nova sobre un Star para ciertas tareas — sigue siendo una decisión de implementación de Navigator, no impuesta por el protocolo.
- Streaming de pasos intermedios del loop hacia el Portal (ej. mostrar "paso 1: busqué X" en tiempo real) — el protocolo solo transporta el conteo final (`reasoningSteps`), no eventos por paso.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un Nova mal implementado reintroduce el riesgo de DEC-0016/DEC-0017 en cada ronda de su loop interno | Alto si no se implementa con cuidado | El protocolo no puede forzarlo — el Nova de referencia debe usar el mismo patrón de parser tolerante + límite duro ya validado (DEC-0050/DEC-0054), documentado como requisito de la implementación de referencia, no del protocolo |
| Confundir Nova con el "modo mágico" ya rechazado (DEC-0027) | Medio | Diferente: el modo mágico era "el LLM decide sin confirmación si usa una KB"; Nova es un tipo de nodo distinto, invocado explícitamente por quien orquesta — no reabre esa decisión |
| Sin límite duro en `maxReasoningSteps`, un Nova podría entrar en un loop largo/costoso en hardware comunitario | Medio | `maxReasoningSteps` es responsabilidad de quien pide (Navigator) declarar un techo razonable; la implementación de referencia debe respetar un límite duro propio además de lo sugerido |
| Dejar el JSON crudo del fallback de parseo también en `content` (no solo en `tool_calls`) contamina el historial en un loop — el modelo tiende a repetir el mismo tool call en vez de avanzar | Alto (encontrado y corregido, DEC-0056) | `content` se limpia (`""`) cuando el parser tolerante extrae un tool call desde ahí — verificado contra hardware real: sin el fix, misma tool call repetida 3 veces idénticas y respuesta final corrupta; con el fix, respuesta final correcta |
| Un modelo pequeño puede no incorporar bien el resultado de una tool entre rondas y seguir repitiendo la misma llamada (observado con `qwen2.5-coder-3b-instruct`, DEC-0056) | Medio | Sin solución asignada — el límite duro de pasos + llamada final sin tools (ya parte del diseño) rescata una respuesta correcta aunque el modelo no reconozca cuándo detenerse por sí mismo |
| Ofrecer una tool irrelevante para la pregunta puede degradar la respuesta de un modelo pequeño (observado con `calculate` ofrecida incondicionalmente en `nova-example`, DEC-0056) — mismo problema ya resuelto para KB en DEC-0054 | Medio | Sin resolver aquí — un Nova real necesitaría el mismo tipo de gate de relevancia ya diseñado para KB antes de decidir qué tools ofrecer en cada turno |

## Enlaces y decisiones relacionadas

- DEC-0016/DEC-0017 — confiabilidad de tool-calling en hardware comunitario; motivo original del determinismo que este spec no reabre.
- DEC-0020 — ejecución determinística; Nova no cambia quién decide *cuándo* invocar un nodo, solo agrega un tipo de nodo con loop interno.
- DEC-0026/DEC-0037 — el protocolo define el contrato, nunca el motor interno; aplica al loop de razonamiento de un Nova.
- DEC-0050/SPEC-PARSER-0001 — patrón de parser tolerante que la implementación de referencia de Nova debe reutilizar en cada ronda de su loop.
- DEC-0054/SPEC-KB-0002 — mismo principio de "una llamada + parser tolerante en vez de loop sin blindaje" que motivó parte de este debate.
- DEC-0024/`docs/vocabulario.md` — vocabulario espacial; Nova se agrega como tercer tipo de nodo junto a Star/Satellite.

## Tareas relacionadas

- Ver `spec-native/tasks/nova-agente/TASKS.md`.

## Notas

- Protocolo implementado y verificado (`npm run typecheck`/`build` en `galaxIA`) el 2026-07-07.
- Nova de referencia (`galaxIA-satellite-star/examples/nova-example`) implementado y verificado contra hardware real el 2026-07-08 (DEC-0056) — `qwen2.5-coder-3b-instruct` en `bastion-wifi` (CPU-only, `llama-server --jinja`). Dos hallazgos reales: un bug de contaminación de contexto (encontrado y corregido) y dos limitaciones observadas del modelo/diseño (documentadas, sin resolver) — ver DEC-0056 para el detalle completo.
- **Lo que sí se verificó:** el mecanismo del loop en sí (`ReasoningLoop.run()` contra un `LlmBridge` real) — llama la tool cuando hace falta, respeta el límite de pasos, fuerza una respuesta final coherente aunque el modelo no se detenga solo, reporta `reasoningSteps` correctamente.
- **Lo que falta verificar:** el registro/descubrimiento FHS completo de un Nova contra un Atlas real (`hello`/`register`/`chat.request` vía WebSocket) — esta sesión solo probó `ReasoningLoop` de forma directa (`smoke-test.ts`), no el flujo de red completo. El flujo de red en sí ya está probado por `star-example`/`satellite-ocr-example` en sesiones anteriores y `nova-example` reutiliza exactamente el mismo código de conexión, pero no se ejecutó de punta a punta con un Nova real en esta sesión.
