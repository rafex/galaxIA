# SPEC-PARSER-0001 — Perfil declarativo de parseo tolerante por modelo

## Estado

`accepted` (diseño) — con un primer perfil real implementado en `galaxia-parser-catalog` y ajuste correspondiente en `galaxIA-satellite-star`. Ver DEC-0050.

## Owner

Raúl Fletes (rafex)

## Problema

Algunos modelos (ejemplo real y ya documentado: `qwen2.5-coder-3b-instruct` vía `llama-server --jinja`, DEC-0016/DEC-0017) no llenan de forma confiable el campo estructurado `tool_calls` de una respuesta aunque el modelo sí haya decidido invocar una tool — el JSON de la llamada queda escrito como texto plano en `content`. La mitigación (`tryParseFallbackToolCall` en `examples/star-example/src/llm-bridge.ts`) es hoy código hardcodeado, anónimo, y local a un único Star — otro operador que despliegue el mismo modelo tiene que redescubrir el mismo problema desde cero.

Este comportamiento **no es del protocolo, es del modelo/template de inferencia**: cambia según el modelo, la versión de `llama-server`/motor de inferencia, y el template de chat usado. Es exactamente el tipo de conocimiento que la comunidad puede acumular y compartir — pero el protocolo no debe definir cómo se parsea (eso es motor interno de un Star, mismo principio de DEC-0026/DEC-0037), solo debe poder **transportar la referencia** a qué perfil de parseo conocido aplica a un modelo dado.

## Aclaración de alcance

Mismo patrón que `ArtifactRef` (DEC-0046) y `capability.tags` (DEC-0028): el protocolo transporta una referencia declarativa, nunca el motor o el contenido detrás de ella.

- **Dentro del protocolo (`galaxIA`):** el tipo `ModelParserProfile` (`profileId`, `registryRef?`), colgado de `ModelInfo.toolCalling.parserProfile` — declara qué perfil de parseo tolerante usa/necesita un modelo, y opcionalmente dónde vive el catálogo real.
- **Fuera del protocolo:** el catálogo real de perfiles — las reglas de parseo, cómo se versionan, cómo se distribuyen (SQLite), y cómo se evalúan (trazabilidad, falsos positivos) — vive en su propio repo, [`galaxia-parser-catalog`](https://github.com/rafex/galaxia-parser-catalog). Cualquier Star (de `galaxIA-satellite-star` o de cualquier otra implementación) puede consumir ese catálogo o mantener el suyo propio; el protocolo no lo exige ni lo conoce.

## Propuesta

### Tipo de protocolo (`packages/fhs-protocol/src/types.ts`)

```ts
export interface ModelParserProfile {
  profileId: string;      // e.g. "jinja-plain-json-toolcall-fallback-v1"
  registryRef?: string;   // dónde vive el catálogo real — informativo
}
```

Colgado de `ModelInfo.toolCalling.parserProfile?: ModelParserProfile` — un modelo puede declarar (a mano por el operador, o autodetectado por un Star que reconozca su propio `model.id` contra un catálogo local) qué perfil de parseo tolerante necesita.

### Por qué esto es auditable, no un fallo silencioso

Como el perfil se declara en el manifiesto (campo visible, parte de lo que ya se publica al Registry/Atlas), queda expuesto igual que cualquier otro dato de `ModelInfo` — no es una decisión oculta del Star. Esto es relevante porque conecta con el mismo argumento ya usado en DEC-0048 (SPEC-KB-0002): una elección que se declara/muestra deja de ser un riesgo de fallo silencioso.

### El catálogo (`galaxia-parser-catalog`, fuera de este repo)

- `profiles/*.json` — fuente humana, un archivo por perfil (`id`, `modelPattern`, `strategy`, `rule`, `notes`, `sourceIncident`).
- `catalog.sqlite` — artefacto compilado desde `profiles/*.json`, formato de distribución (pedido explícito: SQLite para fácil distribución entre nodos/operadores).
- Un matcher genérico (`matchProfile(modelId, catalog)` + `tryParse(content, requestedTools, profile)`) que interpreta la regla declarada (`strategy` + `rule`) en vez de tener lógica hardcodeada por modelo — un Star nuevo con un modelo ya catalogado no necesita escribir ningún parser propio.
- Trazabilidad (`parse_attempts`): cada intento de match/parseo se registra (modelo, perfil, si hubo match, hash del contenido — nunca el contenido crudo, ver nota de privacidad abajo) para poder evaluar tasas de falso positivo/negativo por perfil con el tiempo.

### Nota de privacidad (trazabilidad)

El contenido crudo de una respuesta de modelo puede derivar de la pregunta de un usuario. La trazabilidad de intentos de parseo guarda un **hash** del contenido, no el texto — mismo cuidado de retención que el resto del protocolo (DEC-0013/DEC-0025). Si en algún momento se quisiera guardar contenido real para depurar falsos positivos a mano, eso requeriría su propia política de retención explícita, no indefinida — no resuelto aquí.

## Alcance

### Dentro del alcance

- `ModelParserProfile` como tipo de protocolo compartido.
- Extensión de `ModelInfo.toolCalling` con `parserProfile?`.
- Primer perfil real: `jinja-plain-json-toolcall-fallback-v1`, publicado en `galaxia-parser-catalog`, generalizando el `tryParseFallbackToolCall` ya existente en `galaxIA-satellite-star`.
- Ajuste de `examples/star-example/src/llm-bridge.ts` para usar el matcher genérico + el perfil catalogado, en vez de la función hardcodeada anterior.

### Fuera del alcance

- El motor/las reglas de parseo en sí — viven en `galaxia-parser-catalog`, no en el protocolo.
- Un mecanismo de publicación/distribución automática del catálogo hacia los Stars (hoy: el Star carga su copia local de `catalog.sqlite`/perfiles; cómo se actualiza esa copia — manual, `npm` package, git submodule, etc. — es una decisión de despliegue, no de protocolo).
- El "eval" completo (medición sistemática de falsos positivos/negativos con el tiempo) — la trazabilidad mínima (hash + resultado) queda dentro de alcance como base, pero el mecanismo de evaluación/mejora del catálogo con esos datos no se diseña aquí.
- Autodetección universal de qué perfil aplica sin declaración — el matching por `modelPattern` (regex simple contra `model.id`) es la primera versión; mecanismos más sofisticados (fingerprinting de comportamiento real del modelo) quedan fuera.

## Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Un perfil de parseo mal definido introduce falsos positivos (interpreta texto conversacional normal como una tool call) | Medio | Mismo cuidado que ya tenía `tryParseFallbackToolCall`: validar el `name` contra las tools realmente ofrecidas en la petición, nunca aceptar cualquier JSON |
| El catálogo (`galaxia-parser-catalog`) queda desactualizado respecto a nuevas versiones de un modelo/motor de inferencia | Medio | Fuera de alcance de este spec — es mantenimiento del catálogo, no del protocolo; documentado como responsabilidad de quien mantiene ese repo |
| Guardar contenido crudo en trazabilidad expondría datos derivados del usuario | Medio si se implementa mal | Mitigado por diseño: solo se guarda hash, no el contenido, salvo decisión explícita futura con su propia política de retención |
| Dos Stars con el mismo modelo pero perfiles distintos (uno desactualizado) producen comportamiento inconsistente entre nodos | Bajo | Aceptado — cada Star es responsable de su propia copia del catálogo, igual que cualquier otro aspecto de su motor interno |

## Enlaces y decisiones relacionadas

- DEC-0016/DEC-0017 — el incidente real (`qwen2.5-coder-3b-instruct`) que motiva este spec.
- DEC-0020 — distinción ejecución/enrutamiento (determinístico) vs. síntesis (delegable), reutilizada aquí: el *parseo* de una tool call ya decidida por el modelo no es una decisión de enrutamiento nueva, es tolerancia a un formato de salida — no reabre DEC-0020.
- DEC-0026/DEC-0037 — el protocolo nunca define el motor interno de un provider; aplica aquí igual que a RAG/KB.
- DEC-0028/DEC-0046 — mismo patrón de "referencia declarativa transportada por el protocolo, contenido/motor externo" ya usado para `capability.tags` y `ArtifactRef`.
- [`galaxia-parser-catalog`](https://github.com/rafex/galaxia-parser-catalog) — el catálogo real, fuera de este repo.
- `examples/star-example/src/llm-bridge.ts` (en `galaxIA-satellite-star`) — implementación ajustada para consumir el matcher genérico.

## Tareas relacionadas

- Aún no creadas — `spec-native/tasks/parser-catalog/TASKS.md` se escribe si se prioriza extender esto (más perfiles, mecanismo de distribución automática, eval sistemático).

## Notas

- Primer perfil (`jinja-plain-json-toolcall-fallback-v1`) implementado y ajuste de `llm-bridge.ts` verificado con `npm run typecheck`/`build` en `galaxIA-satellite-star` — 2026-07-07.
