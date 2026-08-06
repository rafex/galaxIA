+++
artifact_type = "task_file"
initiative = "browser-rag"
spec_id = "SPEC-BROWSER-RAG-0001"
owner = "rafex"
state = "active"
+++

## TASK-BROWSER-RAG-0001 — Crear el módulo local de almacenamiento vectorial

```toml
id = "TASK-BROWSER-RAG-0001"
title = "Crear el módulo local de almacenamiento vectorial"
state = "done"
owner = "rafex"
dependencies = []
expected_files = ["apps/portal-chat/src/services/local-rag/*", "apps/portal-chat/tests/local-rag.test.ts"]
close_criteria = "Existe una interfaz de almacenamiento que persiste fragmentos y vectores en SQLite WASM/OPFS y expone fallback IndexedDB sin bloquear el hilo principal."
validation = ["just test-portal", "just typecheck-portal"]
```

Encapsular SQLite WASM, `sqlite-vec`, OPFS y el fallback detrás de una interfaz
estable para que el resto del Portal no dependa de un motor concreto.

## TASK-BROWSER-RAG-0002 — Implementar chunking, embeddings y recuperación

```toml
id = "TASK-BROWSER-RAG-0002"
title = "Implementar chunking, embeddings y recuperación"
state = "done"
owner = "rafex"
dependencies = ["TASK-BROWSER-RAG-0001"]
expected_files = ["apps/portal-chat/src/services/local-rag/*", "apps/portal-chat/tests/local-rag.test.ts"]
close_criteria = "Un texto OCR se indexa con un modelo de embeddings fijo y una pregunta devuelve top-k aislado por conversación/documento."
validation = ["just test-portal", "just typecheck-portal"]
```

Implementar fragmentación determinista, generación de embeddings en Worker,
versionado de modelo/dimensiones, búsqueda vectorial y fallback coseno.

## TASK-BROWSER-RAG-0003 — Integrar RAG con OCR y DocumentContext

```toml
id = "TASK-BROWSER-RAG-0003"
title = "Integrar RAG con OCR y DocumentContext"
state = "done"
owner = "rafex"
dependencies = ["TASK-BROWSER-RAG-0002"]
expected_files = ["apps/portal-chat/src/components/chat-view.ts", "apps/portal-chat/src/services/api.ts", "apps/portal-chat/tests/*"]
close_criteria = "El OCR dispara indexado automático y cada pregunta posterior genera DocumentContext Protobuf sin confirmación manual ni JSON de transporte."
validation = ["just test-portal", "just build-portal"]
```

Conectar el ciclo de vida actual del Portal: resultado OCR, persistencia local,
recuperación antes del envío, cambio de LLM y eliminación por conversación.

## TASK-BROWSER-RAG-0004 — Actualizar documentación y decisión de arquitectura

```toml
id = "TASK-BROWSER-RAG-0004"
title = "Actualizar documentación y decisión de arquitectura"
state = "done"
owner = "rafex"
dependencies = ["TASK-BROWSER-RAG-0001"]
expected_files = ["spec-native/DECISIONS.md", "spec-native/TRACEABILITY.md", "spec-native/specs/rag-provider/SPEC.md"]
close_criteria = "La separación entre RAG local del cliente y provider RAG remoto opcional queda documentada sin contradicciones."
validation = ["just test-typecheck"]
```

Registrar la decisión persistente y actualizar la spec histórica para señalar
que el flujo local es el predeterminado del Portal.

## TASK-BROWSER-RAG-0005 — Automatizar la prueba E2E

```toml
id = "TASK-BROWSER-RAG-0005"
title = "Automatizar la prueba E2E de RAG local"
state = "in_progress"
owner = "rafex"
dependencies = ["TASK-BROWSER-RAG-0003"]
expected_files = ["/Users/rafex/repository/github/rafex/galaxIA-E2E/*"]
close_criteria = "La prueba automatizada valida PDF, pregunta inicial, seguimiento, persistencia local y aislamiento entre dos conversaciones."
validation = ["npm run test:functional"]
```

Agregar el escenario al runner multihost sin introducir un transporte HTTP/REST
para mensajes FHS.
