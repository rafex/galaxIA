import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import type {
  GenerateRequest,
  GenerateResponse,
  ModelInfo,
  ToolDefinition,
  ToolParameterSchema,
  PublishedService,
  ChatRequestMessage,
  ChatDeltaMessage,
  ChatCompletedMessage,
  ChatErrorMessage,
} from "@rafex/galaxia-fhs-protocol";
import { logTrace } from "../observability/trace.js";

/** Envoltorio mínimo para narrowing de mensajes FHS crudos antes de castear al tipo específico. */
interface FhsMessageEnvelope {
  requestId?: string;
  type?: string;
}

/** Contexto de trazabilidad (DEC-0012). */
export interface TraceContext {
  conversationId: string;
  capability: string;
}

// PoC: certificados autofirmados en wss:// — no hay CA de confianza que
// verificar. Ver docs/tls-autofirmado.md. No usar rejectUnauthorized:false
// contra un endpoint real fuera de esta PoC.
function wsOptions(url: string) {
  return url.startsWith("wss://") ? { rejectUnauthorized: false } : undefined;
}

export interface LlmProviderSelection {
  nodeId: string;
  providerName: string;
  service: PublishedService;
  model: ModelInfo;
}

export interface GenerateDispatchResult {
  response: GenerateResponse;
  /** null si el nodo nunca envió dispatch.ack (SPEC-SATRATING-0001) */
  dispatchMs: number | null;
}

export class LlmGateway {
  /**
   * `timeoutMs` (opcional): "kill" configurable de la espera (DEC-0010) — el
   * usuario del Portal puede pedir esperar menos que el default. Es
   * responsabilidad del nodo (Star) resolver internamente si se atoró; esto
   * solo controla cuánto espera el Agent Server antes de abandonar.
   */
  async generate(
    selection: LlmProviderSelection,
    request: GenerateRequest,
    timeoutMs?: number,
    trace?: TraceContext
  ): Promise<GenerateDispatchResult> {
    return this.fhsGenerate(selection.nodeId, selection.service.endpoint.url, request, timeoutMs, trace);
  }

  async *stream(
    selection: LlmProviderSelection,
    request: GenerateRequest
  ): AsyncGenerator<string, GenerateResponse, unknown> {
    return yield* this.fhsStream(selection.service.endpoint.url, request);
  }

  private fhsGenerate(
    nodeId: string,
    url: string,
    request: GenerateRequest,
    timeoutMs?: number,
    trace?: TraceContext
  ): Promise<GenerateDispatchResult> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url, wsOptions(url));
      const requestId = randomUUID();
      const startedAt = Date.now();
      // Mosquito: null hasta que llegue dispatch.ack (SPEC-SATRATING-0001).
      let ackAt: number | null = null;

      const emitTrace = (success: boolean, errorCode?: string) => {
        if (!trace) return;
        logTrace({
          conversationId: trace.conversationId,
          requestId,
          providerId: nodeId,
          capability: trace.capability,
          dispatchMs: ackAt ? ackAt - startedAt : null,
          totalMs: Date.now() - startedAt,
          success,
          errorCode,
        });
      };

      const timeout = setTimeout(() => {
        ws.close();
        emitTrace(false, "TIMEOUT");
        reject(new Error("Timeout esperando respuesta del LLM vía FHS"));
      }, timeoutMs ?? 310_000);

      ws.on("open", () => {
        const msg: ChatRequestMessage = {
          type: "chat.request",
          requestId,
          request: { ...request, stream: false },
        };
        ws.send(JSON.stringify(msg));
      });

      ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(String(raw)) as FhsMessageEnvelope;
          if (msg.requestId !== requestId) return;

          if (msg.type === "dispatch.ack") {
            ackAt = Date.now();
            return;
          }

          if (msg.type === "chat.completed") {
            clearTimeout(timeout);
            ws.close();
            const dispatchMs = ackAt ? ackAt - startedAt : null;
            emitTrace(true);
            resolve({ response: (msg as ChatCompletedMessage).response, dispatchMs });
          } else if (msg.type === "chat.error") {
            clearTimeout(timeout);
            ws.close();
            emitTrace(false, (msg as ChatErrorMessage).code);
            reject(
              new Error(
                `FHS LLM error: ${(msg as ChatErrorMessage).message}`
              )
            );
          }
        } catch {
          // ignorar mensajes no JSON
        }
      });

      ws.on("error", (err) => {
        clearTimeout(timeout);
        emitTrace(false, "WEBSOCKET_ERROR");
        reject(new Error(`FHS WebSocket error: ${err.message}`));
      });

      ws.on("close", () => {
        clearTimeout(timeout);
      });
    });
  }

  private async *fhsStream(
    url: string,
    request: GenerateRequest
  ): AsyncGenerator<string, GenerateResponse, unknown> {
    const ws = new WebSocket(url, wsOptions(url));
    const requestId = randomUUID();

    type QueueItem =
      | { kind: "delta"; text: string }
      | { kind: "completed"; response: GenerateResponse }
      | { kind: "error"; message: string };

    const queue: QueueItem[] = [];
    let waiter: ((item: QueueItem) => void) | null = null;

    const enqueue = (item: QueueItem) => {
      if (waiter) {
        waiter(item);
        waiter = null;
      } else {
        queue.push(item);
      }
    };

    const wait = (): Promise<QueueItem> =>
      new Promise((resolve) => {
        waiter = resolve;
      });

    ws.on("open", () => {
      const msg: ChatRequestMessage = {
        type: "chat.request",
        requestId,
        request: { ...request, stream: true },
      };
      ws.send(JSON.stringify(msg));
    });

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString()) as FhsMessageEnvelope;
        if (msg.requestId !== requestId) return;

        if (msg.type === "chat.delta") {
          enqueue({ kind: "delta", text: (msg as ChatDeltaMessage).delta });
        } else if (msg.type === "chat.completed") {
          enqueue({
            kind: "completed",
            response: (msg as ChatCompletedMessage).response,
          });
          ws.close();
        } else if (msg.type === "chat.error") {
          enqueue({
            kind: "error",
            message: (msg as ChatErrorMessage).message,
          });
          ws.close();
        }
      } catch {
        // ignorar
      }
    });

    ws.on("error", (err) => {
      enqueue({ kind: "error", message: err.message });
    });

    const timeout = setTimeout(() => {
      enqueue({ kind: "error", message: "Timeout esperando stream FHS" });
      ws.close();
    }, 310_000);

    try {
      while (true) {
        const item = queue.length > 0 ? queue.shift()! : await wait();

        if (item.kind === "delta") {
          yield item.text;
          continue;
        }

        if (item.kind === "completed") {
          return item.response;
        }

        if (item.kind === "error") {
          throw new Error(`FHS LLM stream error: ${item.message}`);
        }
      }
    } finally {
      clearTimeout(timeout);
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    }
  }

  // ── Utilidades ──────────────────────────────────────────────────────────

  supportsToolCalling(model: ModelInfo): boolean {
    return !!model.toolCalling?.supported;
  }

  toToolDefinitions(
    tools: Array<{
      name: string;
      description?: string;
      inputSchema?: ToolParameterSchema;
    }>
  ): ToolDefinition[] {
    return tools.map((t) => ({
      type: "function",
      function: {
        name: t.name,
        description: t.description || `Tool ${t.name}`,
        parameters: t.inputSchema || { type: "object", properties: {} },
      },
    }));
  }
}
