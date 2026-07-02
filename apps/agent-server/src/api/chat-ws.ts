import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import type { UserMessage } from "@galaxia/fhs-protocol";
import { Registry } from "../registry/registry.js";
import { EventBus } from "../sse/event-bus.js";
import { AgentRuntime, type ModelPreferences } from "../agent/runtime.js";

interface PendingAttachment {
  text: string;
  filename: string;
  question?: string;
  preferences: ModelPreferences;
  /** true una vez que el usuario confirmó "usar" sin haber escrito pregunta todavía */
  confirmed: boolean;
}

export async function setupChatWebSocket(
  app: FastifyInstance,
  registry: Registry,
  eventBus: EventBus
) {
  const runtimes = new Map<string, AgentRuntime>();
  // Estado del flujo de confirmación de OCR (SPEC-OCRCONFIRM-0001). Vive
  // mientras dure la conexión WebSocket — se limpia al confirmar, descartar
  // o cerrar la conexión. Mismo scope que `runtimes`.
  const pendingAttachments = new Map<string, PendingAttachment>();

  app.get("/api/chat/ws", { websocket: true }, (socket: WebSocket) => {
    let conversationId: string | null = null;

    const send = (event: any) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(event));
      }
    };

    const unsubscribe = eventBus.subscribe({
      id: `ws-chat-${Date.now()}`,
      send: (event: any) => {
        // Eventos sin conversationId son globales (ej. node.online/node.lost del
        // Registry) y se reenvían a todos. Eventos con conversationId solo se
        // reenvían al socket dueño de esa conversación — ver DEC-0018.
        const eventConversationId = event?.data?.conversationId;
        if (eventConversationId && eventConversationId !== conversationId) return;
        send(event);
      },
    });

    socket.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString());
        handleMessage(msg);
      } catch (err) {
        send({ type: "error", data: { code: "PARSE_ERROR", message: "Invalid JSON" } });
      }
    });

    socket.on("close", () => {
      unsubscribe();
      if (conversationId) {
        runtimes.delete(conversationId);
        pendingAttachments.delete(conversationId);
      }
    });

    function runChat(id: string, message: UserMessage, preferences: ModelPreferences, preExtractedText?: string) {
      const runtime = new AgentRuntime(registry, eventBus, id);
      runtimes.set(id, runtime);

      runtime
        .run(message, preferences, undefined, preExtractedText)
        .catch((err: any) => {
          console.error("Agent runtime error:", err);
          send({ type: "error", data: { conversationId: id, code: "RUNTIME_ERROR", message: err.message } });
        })
        .finally(() => {
          runtimes.delete(id);
        });
    }

    function handleMessage(msg: any) {
      if (msg.type === "start") {
        conversationId = msg.conversationId || randomUUID();
        const body = msg as {
          conversationId?: string;
          message: UserMessage;
          artifacts?: string[];
          attachmentName?: string;
          preferences?: ModelPreferences;
        };

        const id = conversationId!;
        send({ type: "session", data: { conversationId: id } });
        const preferences = body.preferences || {};

        if (body.artifacts && body.artifacts.length > 0) {
          // Flujo de confirmación (SPEC-OCRCONFIRM-0001): se extrae el texto
          // y se muestra al usuario, pero NO se llama al LLM todavía.
          const runtime = new AgentRuntime(registry, eventBus, id);
          runtime
            .extractOcrText(body.artifacts, body.attachmentName || "archivo adjunto", preferences)
            .then((text) => {
              if (text) {
                pendingAttachments.set(id, {
                  text,
                  filename: body.attachmentName || "archivo adjunto",
                  question: body.message?.content || undefined,
                  preferences,
                  confirmed: false,
                });
              } else {
                send({
                  type: "error",
                  data: { conversationId: id, code: "OCR_FAILED", message: "No se pudo procesar el archivo adjunto." },
                });
              }
            })
            .catch((err: any) => {
              console.error("OCR extraction error:", err);
              send({ type: "error", data: { conversationId: id, code: "RUNTIME_ERROR", message: err.message } });
            });
          return;
        }

        // Sin adjunto en este turno: ¿había un documento ya confirmado
        // esperando la próxima pregunta del usuario?
        const pending = pendingAttachments.get(id);
        if (pending?.confirmed) {
          pendingAttachments.delete(id); // uso único (ver alcance del SPEC)
          runChat(id, body.message, preferences, pending.text);
          return;
        }

        runChat(id, body.message, preferences);
        return;
      }

      if (msg.type === "attachment.decision") {
        const body = msg as { conversationId: string; use: boolean };
        const pending = pendingAttachments.get(body.conversationId);
        if (!pending) return;

        if (!body.use) {
          pendingAttachments.delete(body.conversationId);
          return;
        }

        if (pending.question) {
          // El usuario ya había escrito su pregunta junto con el archivo —
          // no hace falta que la reescriba.
          pendingAttachments.delete(body.conversationId);
          runChat(body.conversationId, { role: "user", content: pending.question }, pending.preferences, pending.text);
        } else {
          // Confirmó "usar", pero aún no hay pregunta — esperar el próximo
          // mensaje del usuario y anteponer el texto entonces.
          pending.confirmed = true;
        }
        return;
      }
    }
  });
}
