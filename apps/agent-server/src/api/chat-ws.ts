import type { FastifyInstance } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import { randomUUID } from "node:crypto";
import type { UserMessage } from "@galaxia/fhs-protocol";
import { Registry } from "../registry/registry.js";
import { EventBus } from "../sse/event-bus.js";
import { AgentRuntime } from "../agent/runtime.js";

export async function setupChatWebSocket(
  app: FastifyInstance,
  registry: Registry,
  eventBus: EventBus
) {
  const runtimes = new Map<string, AgentRuntime>();

  app.get("/api/chat/ws", { websocket: true }, (socket: WebSocket) => {
    let conversationId: string | null = null;

    const send = (event: any) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(event));
      }
    };

    const unsubscribe = eventBus.subscribe({
      id: `ws-chat-${Date.now()}`,
      send: (event) => {
        // Solo reenviar eventos de la conversación activa
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
      }
    });

    function handleMessage(msg: any) {
      if (msg.type === "start") {
        conversationId = msg.conversationId || randomUUID();
        const body = msg as {
          conversationId?: string;
          message: UserMessage;
          artifacts?: string[];
          preferences?: {
            model?: "auto" | string;
            scope?: "local" | "network" | "community" | "external";
            allowExternalProviders?: boolean;
          };
        };

        const id = conversationId!;
        send({ type: "session", data: { conversationId: id } });

        const runtime = new AgentRuntime(registry, eventBus, id);
        runtimes.set(id, runtime);

        runtime
          .run(body.message, body.preferences || {})
          .catch((err: any) => {
            console.error("Agent runtime error:", err);
            send({ type: "error", data: { code: "RUNTIME_ERROR", message: err.message } });
          })
          .finally(() => {
            runtimes.delete(id);
          });
      }
    }
  });
}
