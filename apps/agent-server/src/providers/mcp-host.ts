import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import type { Capability, PublishedService } from "@galaxia/fhs-protocol";

export interface LoadedTool {
  name: string;
  description?: string;
  inputSchema?: any;
  providerId: string;
  providerName: string;
  capabilityId: string;
}

export interface McpProviderClient {
  providerId: string;
  providerName: string;
  service: PublishedService;
  client: Client;
  tools: LoadedTool[];
}

export class McpHost {
  private clients = new Map<string, McpProviderClient>();

  async connectProvider(
    providerId: string,
    providerName: string,
    service: PublishedService
  ): Promise<McpProviderClient> {
    const existing = this.clients.get(providerId);
    if (existing) return existing;

    const client = new Client({ name: "fhs-agent", version: "0.1.0" });
    const transport = new StreamableHTTPClientTransport(new URL(service.endpoint.url));
    await client.connect(transport);

    const toolsResult = await client.listTools();
    const tools = (toolsResult.tools || []).map((tool: any) => ({
      name: tool.name,
      description: tool.description,
      inputSchema: tool.inputSchema,
      providerId,
      providerName,
      capabilityId: this.matchCapabilityId(service.capabilities, tool.name),
    }));

    const providerClient: McpProviderClient = {
      providerId,
      providerName,
      service,
      client,
      tools,
    };
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
        console.error(`Failed to connect MCP provider ${p.providerId}:`, err);
      }
    }
    return allTools;
  }

  async callTool(
    providerId: string,
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    const client = this.clients.get(providerId);
    if (!client) {
      throw new Error(`MCP provider not connected: ${providerId}`);
    }
    const result = await client.client.callTool({ name: toolName, arguments: args });
    return result;
  }

  disconnect(providerId: string) {
    const client = this.clients.get(providerId);
    if (client) {
      client.client.close().catch(() => {});
      this.clients.delete(providerId);
    }
  }

  private matchCapabilityId(capabilities: Capability[], toolName: string): string {
    const normalized = toolName.toLowerCase().replace(/[-_]/g, "");
    for (const cap of capabilities) {
      const capNormalized = cap.id.toLowerCase().replace(/[-_.]/g, "");
      if (normalized.includes(capNormalized) || capNormalized.includes(normalized)) {
        return cap.id;
      }
    }
    return toolName;
  }
}
