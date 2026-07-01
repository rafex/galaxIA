import type { FastifyInstance } from "fastify";
import { randomUUID } from "node:crypto";
import type { UserMessage } from "@galaxia/fhs-protocol";
import { Registry } from "../registry/registry.js";
import { EventBus } from "../sse/event-bus.js";
import { AgentRuntime } from "../agent/runtime.js";

export async function setupChatApi(
  app: FastifyInstance,
  registry: Registry,
  eventBus: EventBus
) {
  const runtimes = new Map<string, AgentRuntime>();

  app.post("/api/chat", async (req, reply) => {
    const body = req.body as {
      conversationId?: string;
      message: UserMessage;
      artifacts?: string[];
      preferences?: {
        model?: "auto" | string;
        scope?: "local" | "network" | "community" | "external";
        allowExternalProviders?: boolean;
      };
    };

    const conversationId = body.conversationId || randomUUID();
    const runtime = new AgentRuntime(registry, eventBus, conversationId);
    runtimes.set(conversationId, runtime);

    runtime
      .run(body.message, body.preferences || {})
      .catch((err: any) => {
        console.error("Agent runtime error:", err);
      })
      .finally(() => {
        runtimes.delete(conversationId);
      });

    reply.status(202);
    reply.header("Location", `/api/chat/${conversationId}/events`);
    return { conversationId };
  });
}
