import {
  type Capability,
  type GenerateRequest,
  type LlmMessage,
  type ModelInfo,
  type PrivacyScope,
  type ProvenanceInfo,
  type PublishedService,
  type ToolCall,
  type ToolDefinition,
  type UserMessage,
} from "@galaxia/fhs-protocol";
import { Registry } from "../registry/registry.js";
import { EventBus } from "../sse/event-bus.js";
import { LlmGateway } from "../providers/llm-gateway.js";
import { McpHost, LoadedTool } from "../providers/mcp-host.js";

export interface ModelPreferences {
  model?: "auto" | string;
  scope?: PrivacyScope;
  allowExternalProviders?: boolean;
}

interface ResolvedLlm {
  nodeId: string;
  providerName: string;
  service: PublishedService;
  model: ModelInfo;
  reason: string[];
}

interface ResolvedToolProvider {
  capability: Capability;
  providerId: string;
  providerName: string;
  service: PublishedService;
}

export class AgentRuntime {
  private llmGateway = new LlmGateway();
  private mcpHost = new McpHost();
  private usedTools: Array<{
    capability: string;
    providerId: string;
    providerName: string;
    toolName: string;
  }> = [];

  constructor(
    private registry: Registry,
    private eventBus: EventBus,
    private conversationId: string
  ) {}

  async run(message: UserMessage, preferences: ModelPreferences) {
    this.emitStatus("classifying", "Analizando tu petición...");

    const capabilities = classifyIntent(message.content);
    this.emitStatus("resolving-model", "Buscando modelo disponible...");

    const llm = this.resolveLlm(preferences);
    if (!llm) {
      this.emitError("NO_LLM", "No hay modelos disponibles con tool calling en tu scope");
      return;
    }

    this.emit({
      type: "llm.selected",
      data: {
        providerId: llm.nodeId,
        providerName: llm.providerName,
        modelId: llm.model.id,
        reason: llm.reason,
      },
    });

    this.emitStatus("resolving-tools", "Buscando herramientas...");
    const toolProviders = this.resolveToolProviders(capabilities, preferences.scope);
    const loadedTools = await this.mcpHost.loadToolsForCapabilities(
      toolProviders.map((t) => ({
        providerId: t.providerId,
        providerName: t.providerName,
        service: t.service,
      }))
    );

    const toolDefinitions: ToolDefinition[] = this.llmGateway.toToolDefinitions(loadedTools);

    // Preparar mensajes
    const messages: LlmMessage[] = [
      {
        role: "system",
        content:
          "Eres un asistente útil de una red soberana de IA comunitaria. " +
          "Responde siempre en español. " +
          "Si necesitas usar una herramienta, hazlo UNA SOLA VEZ y luego responde con la información obtenida. " +
          "No repitas llamadas a herramientas.",
      },
      { role: "user", content: message.content },
    ];

    // Primera llamada: permite que el LLM solicite tools
    let response = await this.callLlm(llm, messages, toolDefinitions);
    messages.push(response.message);

    // Ejecutar tools solicitadas (una sola ronda)
    if (response.toolCalls.length > 0) {
      const executed = new Set<string>();
      for (const toolCall of response.toolCalls) {
        const key = `${toolCall.function.name}:${toolCall.function.arguments}`;
        if (executed.has(key)) continue;
        executed.add(key);
        await this.executeToolCall(toolCall, loadedTools, preferences.scope, messages);
      }

      // Segunda llamada: genera respuesta final SIN tools
      response = await this.callLlm(llm, messages, undefined);
      messages.push(response.message);
    }

    this.emit({ type: "assistant.completed", data: { provenance: this.buildProvenance(llm) } });
  }

  private resolveLlm(preferences: ModelPreferences): ResolvedLlm | null {
    const providers = this.registry.getProviders("llm");
    const candidates = providers.filter((p) =>
      preferences.scope ? matchesScope(p.service, preferences.scope) : true
    );

    if (preferences.model && preferences.model !== "auto") {
      for (const p of candidates) {
        const model = p.service.models?.find((m) => m.id === preferences.model);
        if (model) {
          return {
            nodeId: p.providerId,
            providerName: p.name,
            service: p.service,
            model,
            reason: ["manual-selection"],
          };
        }
      }
    }

    // Preferir modelo con tool calling nativo
    for (const p of candidates) {
      const model = p.service.models?.find((m) =>
        m.capabilities.includes("tool.calling") && m.toolCalling?.supported
      );
      if (model) {
        return {
          nodeId: p.providerId,
          providerName: p.name,
          service: p.service,
          model,
          reason: ["tool-calling", "available"],
        };
      }
    }

    // Fallback al primer modelo disponible
    const first = candidates[0];
    const model = first?.service.models?.[0];
    if (!model) return null;

    return {
      nodeId: first.providerId,
      providerName: first.name,
      service: first.service,
      model,
      reason: ["available"],
    };
  }

  private resolveToolProviders(
    capabilities: string[],
    scope?: PrivacyScope
  ): ResolvedToolProvider[] {
    const providers = this.registry.getProviders("mcp");
    const result: ResolvedToolProvider[] = [];
    const seen = new Set<string>();

    for (const cap of capabilities) {
      for (const p of providers) {
        if (scope && !matchesScope(p.service, scope)) continue;
        const capability = p.service.capabilities.find((c) => c.id === cap);
        if (capability && !seen.has(`${p.providerId}:${cap}`)) {
          seen.add(`${p.providerId}:${cap}`);
          result.push({
            capability,
            providerId: p.providerId,
            providerName: p.name,
            service: p.service,
          });
          break;
        }
      }
    }

    return result;
  }

  private async executeToolCall(
    toolCall: ToolCall,
    loadedTools: LoadedTool[],
    scope?: PrivacyScope,
    messages?: LlmMessage[]
  ) {
    const toolName = toolCall.function.name;
    let tool = loadedTools.find((t) => t.name === toolName);

    if (!tool) {
      this.emit({ type: "tool.error", data: { name: toolName, error: "Tool no encontrada" } });
      messages?.push({ role: "tool", content: "Error: tool no encontrada", tool_call_id: toolCall.id });
      return;
    }

    this.emit({
      type: "tool.selected",
      data: {
        capability: tool.capabilityId,
        providerId: tool.providerId,
        providerName: tool.providerName,
      },
    });

    if (!authorize(tool.providerId, scope)) {
      this.emit({
        type: "tool.error",
        data: { name: toolName, error: "No autorizado por política de privacidad" },
      });
      messages?.push({ role: "tool", content: "Error: no autorizado", tool_call_id: toolCall.id });
      return;
    }

    this.emit({ type: "tool.running", data: { name: toolName, providerId: tool.providerId } });
    const startTime = Date.now();

    try {
      const args = JSON.parse(toolCall.function.arguments || "{}") as Record<string, any>;
      const result = await this.mcpHost.callTool(tool.providerId, toolName, args);
      const duration = Date.now() - startTime;
      const textResult = extractText(result);

      this.emit({ type: "tool.completed", data: { name: toolName, duration, success: true } });
      this.usedTools.push({
        capability: tool.capabilityId,
        providerId: tool.providerId,
        providerName: tool.providerName,
        toolName,
      });

      messages?.push({ role: "tool", content: textResult, tool_call_id: toolCall.id });
    } catch (err: any) {
      const duration = Date.now() - startTime;
      this.emit({ type: "tool.error", data: { name: toolName, error: err.message } });
      messages?.push({ role: "tool", content: `Error: ${err.message}`, tool_call_id: toolCall.id });
    }
  }

  private async callLlm(
    llm: ResolvedLlm,
    messages: LlmMessage[],
    tools?: ToolDefinition[]
  ): Promise<{ message: LlmMessage; toolCalls: ToolCall[] }> {
    const request: GenerateRequest = {
      model: llm.model.id,
      messages,
      tools,
      stream: false,
      temperature: 0.7,
    };

    const response = await this.llmGateway.generate(
      { nodeId: llm.nodeId, providerName: llm.providerName, service: llm.service, model: llm.model },
      request
    );

    // Stream el delta si el frontend lo espera
    if (response.message.content && response.toolCalls.length === 0) {
      this.emit({ type: "assistant.delta", data: { text: response.message.content } });
    }

    return { message: response.message, toolCalls: response.toolCalls };
  }

  private buildProvenance(llm: ResolvedLlm): ProvenanceInfo {
    return {
      llm: {
        providerId: llm.nodeId,
        providerName: llm.providerName,
        model: llm.model.id,
      },
      tools: this.usedTools.map((t) => ({
        capability: t.capability,
        providerId: t.providerId,
        providerName: t.providerName,
      })),
      dataExported: this.usedTools.length > 0 ? "Datos enviados a tools federadas" : "Ninguno",
      jurisdiction: "red local comunitaria",
    };
  }

  private emit(event: any) {
    this.eventBus.emit(event);
  }

  private emitStatus(status: string, message: string) {
    this.eventBus.emit({ type: "agent.status", data: { status, message } });
  }

  private emitError(code: string, message: string) {
    this.eventBus.emit({ type: "error", data: { code, message } });
  }
}

function classifyIntent(content: string): string[] {
  const text = content.toLowerCase();
  const capabilities: string[] = [];

  if (text.includes("ocr") || text.includes("texto") || text.includes("imagen") || text.includes("foto")) {
    capabilities.push("document.ocr");
  }
  if (text.includes("resumen") || text.includes("resume")) {
    capabilities.push("text.summarize");
  }

  return capabilities;
}

function matchesScope(service: PublishedService, scope: PrivacyScope): boolean {
  // Para la PoC, asumimos que todos los proveedores locales están en scope.
  // En versiones futuras, el manifiesto declararía el scope explícitamente.
  return true;
}

function authorize(_providerId: string, _scope?: PrivacyScope): boolean {
  // Para la PoC, autorizamos siempre. En producción, verificar vetos y políticas.
  return true;
}

function extractText(result: any): string {
  if (typeof result === "string") return result;
  if (result && typeof result === "object") {
    if (result.content && Array.isArray(result.content)) {
      return result.content.map((c: any) => c.text || "").join("\n");
    }
    return JSON.stringify(result);
  }
  return String(result);
}
