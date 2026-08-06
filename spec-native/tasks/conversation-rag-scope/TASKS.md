+++
artifact_type = "task_file"
initiative = "conversation-rag-scope"
spec_id = "SPEC-CONVERSATION-RAG-0001"
owner = "rafex"
state = "in_progress"
+++

## TASK-CONVERSATION-RAG-0001 — Persistir el modo RAG por conversación

```toml
id = "TASK-CONVERSATION-RAG-0001"
title = "Persistir el modo RAG por conversación"
state = "done"
owner = "rafex"
dependencies = []
expected_files = ["apps/portal-chat/src/types/fhs.ts", "apps/portal-chat/src/services/chat-history.ts", "apps/portal-chat/tests/chat-history.test.ts"]
close_criteria = "ChatConversation conserva ragMode y los historiales anteriores se migran a common sin perder mensajes."
validation = ["npm test -w apps/portal-chat"]
```

## TASK-CONVERSATION-RAG-0002 — Elegir el modo al crear conversación

```toml
id = "TASK-CONVERSATION-RAG-0002"
title = "Elegir el modo al crear conversación"
state = "done"
owner = "rafex"
dependencies = ["TASK-CONVERSATION-RAG-0001"]
expected_files = ["apps/portal-chat/src/components/chat-view.ts", "apps/portal-chat/src/styles/main.css"]
close_criteria = "El botón de nueva conversación muestra una elección accesible y la conversación lista el modo seleccionado."
validation = ["npm run typecheck -w apps/portal-chat", "npm run build -w apps/portal-chat"]
```

## TASK-CONVERSATION-RAG-0003 — Aplicar el ámbito al índice local

```toml
id = "TASK-CONVERSATION-RAG-0003"
title = "Aplicar el ámbito al índice local"
state = "done"
owner = "rafex"
dependencies = ["TASK-CONVERSATION-RAG-0001"]
expected_files = ["apps/portal-chat/src/services/local-rag/*", "apps/portal-chat/src/components/chat-view.ts", "apps/portal-chat/tests/local-rag.test.ts"]
close_criteria = "Las consultas comunes comparten documentos entre conversaciones comunes y las independientes quedan aisladas en SQLite/OPFS e IndexedDB."
validation = ["npm test -w apps/portal-chat"]
```

## TASK-CONVERSATION-RAG-0004 — Validar el flujo completo

```toml
id = "TASK-CONVERSATION-RAG-0004"
title = "Validar el flujo completo"
state = "in_progress"
owner = "rafex"
dependencies = ["TASK-CONVERSATION-RAG-0002", "TASK-CONVERSATION-RAG-0003"]
expected_files = ["/Users/rafex/repository/github/rafex/galaxIA-E2E/tests/*", "spec-native/TRACEABILITY.md"]
close_criteria = "La automatización verifica persistencia, compartición común, aislamiento independiente y DocumentContext Protobuf."
validation = ["npm run test:functional"]
```
