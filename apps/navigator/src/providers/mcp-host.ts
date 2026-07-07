import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import type {
  Signal,
  PublishedService,
  ToolCallRequestMessage,
  ToolListRequestMessage,
  ToolListResponseMessage,
} from "@rafex/galaxia-fhs-protocol";
import { logTrace } from "../observability/trace.js";

export interface LoadedTool {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
  providerId: string;
  providerName: string;
  capabilityId: string;
}

export interface DispatchResult {
  message: unknown;
  /** null si el nodo nunca envió dispatch.ack (SPEC-SATRATING-0001) */
  dispatchMs: number | null;
}

/** Contexto de trazabilidad (DEC-0012) — ausente para llamadas internas de gestión (ej. tool.list). */
export interface TraceContext {
  conversationId: string;
  capabilityId: string;
}

interface PendingCall {
  resolve: (result: DispatchResult) => void;
  reject: (err: Error) => void;
  startedAt: number;
  ackAt?: number;
  trace?: TraceContext;
}

export interface McpProviderClient {
  providerId: string;
  providerName: string;
  service: PublishedService;
  ws: WebSocket;
  tools: LoadedTool[];
  pending: Map<string, PendingCall>;
}

const CONNECT_TIMEOUT_MS = 10_000;
// Alineado con los timeouts de 300s del resto del stack para hardware comunitario lento.
const CALL_TIMEOUT_MS = 300_000;

// PoC: certificados autofirmados en wss:// — ver docs/tls-autofirmado.md.
function wsOptions(url: string) {
  return url.startsWith("wss://") ? { rejectUnauthorized: false } : undefined;
}

/**
 * Cliente del protocolo FHS de tools (tool.list / tool.call / tool.result / tool.error)
 * sobre WebSocket — NO es el SDK de MCP nativo. Los providers FHS (ej. examples/satellite-ocr-example)
 * exponen su propio servidor WebSocket hablando este protocolo, no un endpoint MCP
 * streamable-http. Ver docs/protocolo-provider.md.
 */
export class McpHost {
  private clients = new Map<string, McpProviderClient>();

  async connectProvider(
    providerId: string,
    providerName: string,
    service: PublishedService
  ): Promise<McpProviderClient> {
    const existing = this.clients.get(providerId);
    if (existing && existing.ws.readyState === WebSocket.OPEN) return existing;

    const ws = new WebSocket(service.endpoint.url, wsOptions(service.endpoint.url));
    const pending = new Map<string, PendingCall>();

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        ws.terminate();
        reject(new Error(`Timeout conectando al provider FHS ${providerId}`));
      }, CONNECT_TIMEOUT_MS);
      ws.once("open", () => {
        clearTimeout(timeout);
        resolve();
      });
      ws.once("error", (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });

    ws.on("message", (raw) => {
      let msg: Record<string, unknown> & { requestId: string; type: string; code?: string; message?: string };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // ignorar mensajes no JSON
      }
      const entry = pending.get(msg.requestId);
      if (!entry) return;

      // Mosquito: el ack de despacho no resuelve la petición — solo marca
      // cuándo el nodo la tomó, para separar latencia de despacho de la
      // latencia total (SPEC-SATRATING-0001). Se usa el reloj del Agent
      // Server en ambos extremos (startedAt/ackAt), no `queuedAt` del nodo.
      if (msg.type === "dispatch.ack") {
        entry.ackAt = Date.now();
        return;
      }

      pending.delete(msg.requestId);
      const dispatchMs = entry.ackAt ? entry.ackAt - entry.startedAt : null;
      const success = msg.type !== "tool.error";
      if (entry.trace) {
        logTrace({
          conversationId: entry.trace.conversationId,
          requestId: msg.requestId,
          providerId,
          capability: entry.trace.capabilityId,
          dispatchMs,
          totalMs: Date.now() - entry.startedAt,
          success,
          errorCode: success ? undefined : msg.code,
        });
      }
      if (msg.type === "tool.error") {
        entry.reject(new Error(`${msg.code}: ${msg.message}`));
      } else {
        entry.resolve({ message: msg, dispatchMs });
      }
    });

    ws.on("close", () => {
      this.clients.delete(providerId);
      for (const [requestId, entry] of pending.entries()) {
        if (entry.trace) {
          logTrace({
            conversationId: entry.trace.conversationId,
            requestId,
            providerId,
            capability: entry.trace.capabilityId,
            dispatchMs: entry.ackAt ? entry.ackAt - entry.startedAt : null,
            totalMs: Date.now() - entry.startedAt,
            success: false,
            errorCode: "CONNECTION_CLOSED",
          });
        }
        entry.reject(new Error(`Conexión FHS cerrada con provider ${providerId}`));
      }
      pending.clear();
    });

    const providerClient: McpProviderClient = { providerId, providerName, service, ws, tools: [], pending };

    const listRequestId = randomUUID();
    const listMsg: ToolListRequestMessage = { type: "tool.list", requestId: listRequestId };
    const { message: listResponse } = await this.sendAndWait(providerClient, listMsg, listRequestId) as { message: ToolListResponseMessage };

    providerClient.tools = (listResponse.tools || []).map((tool) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      providerId,
      providerName,
      capabilityId: this.matchCapabilityId(service.capabilities, tool.name),
    }));

    this.clients.set(providerId, providerClient);
    return providerClient;
  }

  async loadToolsForCapabilities(
    providers: Array<{ providerId: string; providerName: string; service: PublishedService }>
  ): Promise<LoadedTool[]> {
    const allTools: LoadedTool[] = [];
    for (const p of providers) {
      try {
        const client = await this.connectProvider(p.providerId, p.providerName, p.service);
        allTools.push(...client.tools);
      } catch (err) {
        console.error(`Failed to connect FHS tool provider ${p.providerId}:`, err);
      }
    }
    return allTools;
  }

  /**
   * `timeoutMs` (opcional): "kill" configurable de la espera de una Mission
   * (DEC-0010) — el usuario del Portal puede pedir esperar menos que el
   * default de `CALL_TIMEOUT_MS`. Es responsabilidad del nodo (Star/Satellite)
   * resolver internamente si se atoró; esto solo controla cuánto espera el
   * Agent Server antes de abandonar y liberar la conversación.
   */
  async callTool(
    providerId: string,
    toolName: string,
    args: Record<string, unknown>,
    timeoutMs?: number,
    trace?: TraceContext
  ): Promise<DispatchResult> {
    const client = this.clients.get(providerId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`FHS tool provider no conectado: ${providerId}`);
    }
    const requestId = randomUUID();
    const msg: ToolCallRequestMessage = { type: "tool.call", requestId, toolName, arguments: args };
    return this.sendAndWait(client, msg, requestId, timeoutMs, trace);
  }

  disconnect(providerId: string) {
    const client = this.clients.get(providerId);
    if (client) {
      client.ws.close();
      this.clients.delete(providerId);
    }
  }

  private sendAndWait(
    client: McpProviderClient,
    msg: ToolCallRequestMessage | ToolListRequestMessage,
    requestId: string,
    timeoutMs?: number,
    trace?: TraceContext
  ): Promise<DispatchResult> {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      const timeout = setTimeout(() => {
        const pendingEntry = client.pending.get(requestId);
        client.pending.delete(requestId);
        if (trace) {
          logTrace({
            conversationId: trace.conversationId,
            requestId,
            providerId: client.providerId,
            capability: trace.capabilityId,
            dispatchMs: pendingEntry?.ackAt ? pendingEntry.ackAt - startedAt : null,
            totalMs: Date.now() - startedAt,
            success: false,
            errorCode: "TIMEOUT",
          });
        }
        reject(new Error(`Timeout esperando respuesta FHS de ${client.providerId}`));
      }, timeoutMs ?? CALL_TIMEOUT_MS);
      client.pending.set(requestId, {
        startedAt,
        trace,
        resolve: (result) => {
          clearTimeout(timeout);
          resolve(result);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      client.ws.send(JSON.stringify(msg));
    });
  }

  /**
   * Elige, entre varias capabilities de un mismo provider, la que mejor
   * corresponde a un nombre de tool — por cantidad de palabras compartidas,
   * no por la primera coincidencia parcial. Necesario desde que un provider
   * puede declarar varias capabilities con un prefijo común (ej.
   * rag-provider: "document.index"/"document.retrieve" ambas comparten
   * "document") — quedarse con el primer match ambiguaba `document_query`
   * hacia "document.index" en vez de "document.retrieve", encontrado
   * verificando rag-provider end-to-end (SPEC-RAG-0001).
   */
  private matchCapabilityId(capabilities: Signal[], toolName: string): string {
    if (capabilities.length === 1) return capabilities[0].id;

    const toolWords = new Set(toolName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    let best: { id: string; score: number } | null = null;
    for (const cap of capabilities) {
      const capWords = cap.id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      const score = capWords.filter((w) => toolWords.has(w)).length;
      if (score > 0 && (!best || score > best.score)) {
        best = { id: cap.id, score };
      }
    }
    return best?.id ?? toolName;
  }
}
