import WebSocket from "ws";
import { randomUUID } from "node:crypto";
import type {
  Capability,
  PublishedService,
  ToolCallRequestMessage,
  ToolListRequestMessage,
} from "@galaxia/fhs-protocol";

export interface LoadedTool {
  name: string;
  description?: string;
  inputSchema?: any;
  providerId: string;
  providerName: string;
  capabilityId: string;
}

interface PendingCall {
  resolve: (msg: any) => void;
  reject: (err: Error) => void;
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

/**
 * Cliente del protocolo FHS de tools (tool.list / tool.call / tool.result / tool.error)
 * sobre WebSocket — NO es el SDK de MCP nativo. Los providers FHS (ej. examples/ocr-provider)
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

    const ws = new WebSocket(service.endpoint.url);
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
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return; // ignorar mensajes no JSON
      }
      const entry = pending.get(msg.requestId);
      if (!entry) return;
      pending.delete(msg.requestId);
      if (msg.type === "tool.error") {
        entry.reject(new Error(`${msg.code}: ${msg.message}`));
      } else {
        entry.resolve(msg);
      }
    });

    ws.on("close", () => {
      this.clients.delete(providerId);
      for (const entry of pending.values()) {
        entry.reject(new Error(`Conexión FHS cerrada con provider ${providerId}`));
      }
      pending.clear();
    });

    const providerClient: McpProviderClient = { providerId, providerName, service, ws, tools: [], pending };

    const listRequestId = randomUUID();
    const listMsg: ToolListRequestMessage = { type: "tool.list", requestId: listRequestId };
    const listResponse = await this.sendAndWait(providerClient, listMsg, listRequestId);

    providerClient.tools = (listResponse.tools || []).map((tool: any) => ({
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

  async callTool(providerId: string, toolName: string, args: Record<string, any>): Promise<any> {
    const client = this.clients.get(providerId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      throw new Error(`FHS tool provider no conectado: ${providerId}`);
    }
    const requestId = randomUUID();
    const msg: ToolCallRequestMessage = { type: "tool.call", requestId, toolName, arguments: args };
    return this.sendAndWait(client, msg, requestId);
  }

  disconnect(providerId: string) {
    const client = this.clients.get(providerId);
    if (client) {
      client.ws.close();
      this.clients.delete(providerId);
    }
  }

  private sendAndWait(client: McpProviderClient, msg: any, requestId: string): Promise<any> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        client.pending.delete(requestId);
        reject(new Error(`Timeout esperando respuesta FHS de ${client.providerId}`));
      }, CALL_TIMEOUT_MS);
      client.pending.set(requestId, {
        resolve: (m) => {
          clearTimeout(timeout);
          resolve(m);
        },
        reject: (e) => {
          clearTimeout(timeout);
          reject(e);
        },
      });
      client.ws.send(JSON.stringify(msg));
    });
  }

  private matchCapabilityId(capabilities: Capability[], toolName: string): string {
    if (capabilities.length === 1) return capabilities[0].id;

    const toolWords = new Set(toolName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean));
    for (const cap of capabilities) {
      const capWords = cap.id.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
      if (capWords.some((w) => toolWords.has(w))) {
        return cap.id;
      }
    }
    return toolName;
  }
}
