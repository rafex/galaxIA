# TRACEABILITY.md

Mapa de relaciones entre specs, tareas, decisiones y validacion.

## Objetivo

Permitir que una persona o agente pueda reconstruir rapidamente:

- que spec origino un cambio
- que tareas ejecutaron esa spec
- que decisiones condicionaron el trabajo
- que evidencia valida el resultado

## Cuando actualizar este archivo

Actualizar al cerrar una iniciativa, no durante la ejecucion.
El momento correcto es cuando la spec pasa a estado `done` o `blocked`.

Si una decision cambia el alcance de una spec activa, registrar
la relacion antes de continuar.

## Formato sugerido

| Spec | Estado | Tareas | Decisiones | Archivos principales | Validacion | Observaciones |
| --- | --- | --- | --- | --- | --- | --- |
| fhs-mvp | active | TASK-FHS-0001..0008 | DEC-0001..DEC-0022 | `packages/fhs-protocol/`, `apps/agent-server/`, `apps/web/`, `examples/llm-provider/`, `examples/ocr-provider/`, `containers/compose.yaml` | Chat E2E con Qwen2.5-Coder-3B + OCR E2E con ether-ocr (validado 2026-07-02 con modelo real, PDF válido); aislamiento de eventos entre conversaciones concurrentes verificado con dos inferencias reales en paralelo | Stack desplegado en bastion 192.168.3.173. LLM via FHS WS + curl. OCR via FHS WS + curl -F. Timeouts a 300s para hardware lento. Soporte PDF en OCR. `McpHost` reescrito para hablar FHS WS real (DEC-0014). Matching de capability corregido (DEC-0015). Modelo cambiado a Qwen2.5-Coder-3B con tool calling + fallback de parseo en `llm-bridge.ts` (DEC-0016, DEC-0017). Configuración de modelo movida a env vars (DEC-0019). EventBus aislado por conversationId (DEC-0018). Ejecución determinística de OCR, sin depender de tool calling (DEC-0020), configurable vía `ocrMode` (DEC-0021). Topología multi-host diseñada y `compose.yaml` preparado, despliegue real pendiente (DEC-0022, `docs/despliegue-multi-host.md`). |
| ocr-confirmacion | done | TASK-OCRCONFIRM-0001..0005 | DEC-0020 | `packages/fhs-protocol/src/sse.ts`, `apps/agent-server/src/agent/runtime.ts`, `apps/agent-server/src/api/chat-ws.ts`, `apps/web/src/components/chat-view.ts`, `apps/web/src/services/api.ts` | Verificado 2026-07-02 contra el bastion real: texto OCR mostrado correctamente antes de responder (`"HOLA MUNDO PDF TEST..."` coincide exacto con el PDF de prueba), "Descartar" con cero llamadas al LLM confirmado en logs, "Usar documento" responde correctamente usando el texto ya extraído | Primera iniciativa en construir estado por conversación en `chat-ws.ts` (`pendingAttachments`) — reutilizable por `rag-provider` (TASK-RAG-0001). |
| rag-provider | draft | TASK-RAG-0001..0007 | DEC-0020 (precedente de diseño) | `examples/rag-provider/` (no creado aún) | — | Solo documentado, sin implementar. Depende del mismo patrón de estado por conversación que `ocr-confirmacion` ya implementó. |
| satelite-rating | draft | TASK-SATRATING-0001..0008 | DEC-0009 (dispatcher concurrente, formalizado ahora) | `packages/fhs-protocol/src/`, `apps/agent-server/src/registry/`, `apps/agent-server/src/agent/runtime.ts`, `apps/agent-server/src/providers/`, `examples/llm-provider/`, `examples/ocr-provider/` | — | Solo documentado, sin implementar. Formaliza el "mosquito" (DEC-0009, `docs/protocolo-provider.md`) con un mensaje `dispatch.ack` verificable, y agrega historial de latencia + rating por satélite en el Registry. Adopta "satélite" como vocabulario de producto (sin cambios de campo en el protocolo). |
| (fix aislado, sin spec dedicada) | done | — | DEC-0009 (primera mitad: validación de identidad) | `packages/fhs-protocol/src/messages.ts`, `apps/agent-server/src/registry/registry.ts`, `apps/agent-server/src/registry/ws-handler.ts`, `examples/llm-provider/src/index.ts`, `examples/ocr-provider/src/index.ts` | Verificado 2026-07-05 con dos pruebas reales contra el agent-server local: hello duplicado simultáneo rechazado (`ALREADY_REGISTERED`, socket cerrado con código 4009) sin afectar la conexión original; reconexión legítima tras `ws.terminate()` aceptada sin bloqueo | P0 del plan de priorización — quick win aislado antes de iniciar `satelite-rating`. La segunda mitad de DEC-0009 (dispatcher/mosquito) sigue pendiente ahí. |
| vocabulario-espacial | draft (bloqueada) | TASK-VOCAB-0001..0005 | ninguna aún — TASK-VOCAB-0001 generará una entrada nueva en DECISIONS.md | `docs/vocabulario.md` (no creado aún), `site/index.md`, potencialmente `satelite-rating/SPEC.md` y `p2p-discovery/SPEC.md` | — | Solo documentado, sin implementar. Bloqueada en una decisión explícita del owner: si "satélite" sigue siendo el término general (ya usado en 2 specs) o se reserva "Star" para LLM. No toca código, contenedores ni el protocolo FHS. |
| p2p-discovery | draft | TASK-P2P-0001..0006 | DEC-0001 (reafirma la decisión de v0.1, fase 1 acotada) | `apps/agent-server/src/` (anuncio mDNS), `examples/llm-provider/`, `examples/ocr-provider/` | — | Solo documentado, sin implementar. Autodescubrimiento del Registry por mDNS en la LAN, como fallback opcional a `REGISTRY_URL` manual — no reemplaza el Registry centralizado ni cambia el protocolo `hello`/`register`/heartbeat. Motivado por los cambios de IP reales sufridos en el despliegue de esta semana (DEC-0022 y cambios de red posteriores). DHT/libp2p fuera de la LAN queda fuera de alcance, sin spec todavía. |

## Trazabilidad operacional (runtime) — no confundir con la tabla anterior

La tabla de arriba es trazabilidad **de repositorio**: qué spec/decisión originó qué código. Es distinta de la trazabilidad **de ejecución**: poder reconstruir qué pasó con una petición real de un usuario (`conversationId` → `requestId` → provider → resultado) para diagnosticar un fallo, sin violar la privacidad de contenido.

Esa segunda trazabilidad está definida como requisito de protocolo en `docs/protocolo.md` (sección "Privacidad → Trazabilidad operacional") y `docs/protocolo-provider.md` (checklist plug-and-play), y registrada como decisión pendiente de implementación en **DEC-0012**. Estado actual: **gap conocido** — el `requestId` se genera por petición pero no se loggea ni se correlaciona con `conversationId` en ningún punto del Agent Server ni de los providers de ejemplo. Cerrar este gap es la validación pendiente para que DEC-0012 y DEC-0013 pasen de `proposed` a `accepted`.

## Lección de esta iniciativa: "registrado" no es "probado"

El 2026-07-02 se probó por primera vez el pipeline de OCR de punta a punta contra el bastion real (no solo build/typecheck/registro en el Registry) y aparecieron varios bugs que llevaban tiempo sin detectarse: DEC-0014 (transporte incorrecto en `McpHost`), DEC-0015 (matching de capability roto), DEC-0016/DEC-0017 (ningún modelo con tool calling confiable, y `llama-server` no siempre llenaba `tool_calls` aunque el modelo decidiera usarlo) y DEC-0018 (el `EventBus` mezclaba eventos entre conversaciones concurrentes — encontrado por accidente al correr dos pruebas seguidas). Todos eran invisibles desde el Registry — el provider se veía `online` con su capability declarada, el build pasaba, el typecheck pasaba. Solo pruebas end-to-end reales (incluyendo, para DEC-0018, con **concurrencia real**) expusieron cada problema.

**Regla derivada para integrar piezas nuevas de aquí en adelante:** ninguna integración (provider nuevo, modelo nuevo, capability nueva) se considera "lista" solo porque se registra en el Registry o porque compila. Requiere al menos una ejecución end-to-end real (petición → tool call o chat.request → respuesta) antes de marcar la tarea `done` en `spec-native/tasks/`. Para funcionalidad que involucra múltiples clientes/conexiones (como el chat), una prueba de un solo cliente no es suficiente — DEC-0018 solo se detectó con dos conversaciones simultáneas reales. Ver `docs/protocolo-provider.md` sección "Lecciones de integración" para el detalle de cada bug.
