# SPEC-RAG-0001 — Provider RAG remoto opcional

> **Contrato vigente (2026-08-05):** el RAG privado y temporal del Portal vive
> por defecto en el navegador y está definido en
> [`SPEC-BROWSER-RAG-0001`](../browser-rag/SPEC.md). Este documento conserva
> únicamente la integración opcional de un nodo RAG remoto para operadores que
> la configuren explícitamente.

## Estado

`optional (selected per conversation)` — el Portal puede seleccionar este
provider de forma explícita al crear una conversación. No se usa por defecto
ni se fusiona con el índice local en el MVP.

## Propósito

Un operador puede publicar capabilities `document.index` y `document.query`
para documentos que autorice explícitamente. El provider debe declarar su
retención y advertencia de privacidad, aislar los datos por `conversationId` y
respetar el transporte FHS sobre libp2p con mensajes Protobuf.

## Contrato funcional

- `document.index`: recibe texto, `conversationId`, `documentId` y parámetros
  opcionales de fragmentación; devuelve el número de fragmentos indexados.
- `document.query`: recibe pregunta, `conversationId`, `documentId` opcional y
  `topK`; devuelve fragmentos con puntuación.
- El provider no decide mediante el LLM si debe indexar o consultar: el nodo
  consumidor dispara ambas operaciones de forma determinista cuando la fuente
  `RAG_SOURCE_NETWORK` está habilitada.
- Los datos de una conversación nunca se comparten con otra conversación.
- `privacy.retention` y `privacy.warning` son obligatorios cuando el nodo
  conserva contenido.

## Relación con el RAG local

El Portal indexa automáticamente el resultado OCR en el navegador y construye
el `DocumentContext` localmente para preguntas posteriores. La vista previa OCR
es informativa; no existe confirmación manual ni un botón de autorización para
activar el contexto. El provider remoto solo se usa si la conversación lo
solicita explícitamente y el Portal no duplica el documento en el índice local.

El cambio de LLM no debe eliminar el contexto. En modo local, el Portal envía
el mismo campo estructurado `DocumentContext.chunks` al nodo seleccionado; en
modo network, el Navigator consulta el mismo `documentId` en el provider FHS.

## Fuera de alcance

- Definir el motor de embeddings o la base de datos del provider remoto.
- Reemplazar el índice local privado del Portal.
- Sincronizar índices privados entre navegadores o nodos.
- `AttachmentDecisionMessage`, `sendDecision`, `attachment.decision` y
  `ocr_mode=confirm`; fueron retirados del protocolo.
- mTLS; queda en backlog independiente.

## Transporte y privacidad

El contenido no debe enviarse a un provider remoto sin una configuración que lo
autorice y una política de retención visible. Cuando se use la integración, las
tools se invocan como capacidades FHS a través de libp2p y Protobuf; no se
define una API HTTP/REST para mensajes ni un formato JSON en el cable.

## Criterios históricos de verificación

La implementación remota existente se conserva como compatibilidad operativa
opcional y debe verificarse con indexado, consulta, aislamiento entre
conversaciones y trazabilidad de provenance. La nueva prueba prioritaria es la
del RAG local: PDF, pregunta inicial, pregunta de seguimiento y cambio de LLM
sin perder el índice del navegador.

## Referencias

- [`SPEC-BROWSER-RAG-0001`](../browser-rag/SPEC.md)
- [`DEC-0093`](../../DECISIONS.md)
- [`docs/protocolo.md`](../../../docs/protocolo.md)
- [`docs/protocolo-provider.md`](../../../docs/protocolo-provider.md)
