import {
  type Signal,
  type GenerateRequest,
  type KbCitation,
  type KbQueryChunk,
  type LlmMessage,
  type ModelInfo,
  type PrivacyScope,
  type ProvenanceInfo,
  type PublishedService,
  type ToolCall,
  type ToolDefinition,
  type UserMessage,
} from "@rafex/galaxia-fhs-protocol";
import { AtlasClient } from "../atlas-client.js";
import { EventBus } from "../sse/event-bus.js";
import { LlmGateway } from "../providers/llm-gateway.js";
import { McpHost, LoadedTool } from "../providers/mcp-host.js";

export interface ModelPreferences {
  model?: "auto" | string;
  scope?: PrivacyScope;
  allowExternalProviders?: boolean;
  /**
   * "confirm" (default): al adjuntar un archivo, se muestra el texto OCR y
   * se espera confirmación del usuario antes de llamar al LLM (SPEC-OCRCONFIRM-0001).
   * "auto": comportamiento original de DEC-0020 — OCR + respuesta del LLM en
   * una sola llamada, sin pedir confirmación. Más rápido, menos control.
   */
  ocrMode?: "confirm" | "auto";
  /**
   * "Kill" configurable de la espera de una Mission/Star (DEC-0010): cuánto
   * tiempo (ms) espera el Agent Server una respuesta antes de abandonar y
   * liberar la conversación, en vez del default fijo del stack (~300s). Es
   * responsabilidad del nodo (Star/Satellite) resolver internamente si se
   * atoró — esto solo controla la paciencia del lado del Portal.
   */
  maxWaitMs?: number;
  /**
   * Modo manual (SPEC-KB-0001, DEC-0027): providerId de la KB elegida
   * explícitamente por el usuario. Puede cambiar entre preguntas de una
   * misma conversación — a diferencia de RAG, no queda fija.
   */
  kb?: string;
  /**
   * Cuántas KBs se consultan por una sola pregunta (default 1). Subirlo
   * puede saturar el contexto de modelos pequeños — el Portal debe advertir
   * explícitamente antes de permitirlo (DEC-0027). Esta iteración solo
   * implementa el caso `1`; valores mayores se documentan como pendiente,
   * ver TASK-KB-0004.
   */
  kbMaxPerQuestion?: number;
}

interface ResolvedLlm {
  nodeId: string;
  providerName: string;
  service: PublishedService;
  model: ModelInfo;
  reason: string[];
}

interface ResolvedToolProvider {
  capability: Signal;
  providerId: string;
  providerName: string;
  service: PublishedService;
}

export class AgentRuntime {
  private llmGateway = new LlmGateway();
  private mcpHost = new McpHost();
  private artifacts: string[] = [];
  private usedTools: Array<{
    capability: string;
    providerId: string;
    providerName: string;
    toolName: string;
    /** Citas de los fragmentos usados, si la tool las expone (DEC-0049). */
    citations?: KbCitation[];
  }> = [];

  constructor(
    private atlasClient: AtlasClient,
    private eventBus: EventBus,
    private conversationId: string
  ) {}

  async run(
    message: UserMessage,
    preferences: ModelPreferences,
    artifacts?: string[],
    preExtractedText?: string,
    ragActive?: boolean,
    kbProviderId?: string
  ) {
    this.artifacts = preExtractedText ? [] : artifacts || [];
    this.emitStatus("classifying", "Analizando tu petición...");

    const capabilities = classifyIntent(message.content);
    // Adjuntar un archivo ya expresa la intención de OCR sin ambigüedad —
    // no depender de que el texto del mensaje también contenga palabras
    // clave como "ocr"/"texto"/"imagen" (ver DEC-0020). Si el texto ya viene
    // pre-extraído (flujo de confirmación, ver SPEC-OCRCONFIRM-0001), no hace
    // falta resolver el provider de OCR de nuevo.
    if (this.artifacts.length > 0 && !capabilities.includes("document.ocr")) {
      capabilities.push("document.ocr");
    }
    this.emitStatus("resolving-model", "Buscando modelo disponible...");

    const llm = await this.resolveLlm(preferences);
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
    const toolProviders = await this.resolveToolProviders(capabilities, preferences.scope);
    const loadedTools = await this.mcpHost.loadToolsForCapabilities(
      toolProviders.map((t) => ({
        providerId: t.providerId,
        providerName: t.providerName,
        service: t.service,
      }))
    );

    // Ejecución determinística: si hay un archivo adjunto y existe un provider
    // para document.ocr, se ejecuta el OCR directamente, sin esperar a que el
    // LLM "decida" invocarlo vía tool calling. Modelos pequeños/locales no son
    // confiables tomando esa decisión (ver spec-native/DECISIONS.md DEC-0020) —
    // cuando el usuario adjunta un archivo, la intención ya es inequívoca.
    let userContent = message.content;
    if (preExtractedText) {
      userContent = `[Texto extraído automáticamente del archivo adjunto mediante OCR]\n${preExtractedText}\n\n[Pregunta del usuario]\n${message.content}`;
      // No hay archivo real en este turno (ya se extrajo antes) — si se deja
      // la tool disponible, el LLM puede igual decidir invocarla sin adjunto
      // y fallar (ver bug encontrado en la demo multi-host: el modelo llamaba
      // ocr_extract sobre un /tmp/ocr.png inexistente tras confirmar el uso).
      const ocrToolIndex = loadedTools.findIndex((t) => t.capabilityId === "document.ocr");
      if (ocrToolIndex >= 0) loadedTools.splice(ocrToolIndex, 1);
    } else {
      const ocrToolIndex = this.artifacts.length > 0
        ? loadedTools.findIndex((t) => t.capabilityId === "document.ocr")
        : -1;

      if (ocrToolIndex >= 0) {
        const ocrTool = loadedTools[ocrToolIndex];
        const ocrText = await this.runOcrDeterministically(ocrTool, preferences.maxWaitMs);
        loadedTools.splice(ocrToolIndex, 1); // ya se ejecutó; no ofrecerla también al LLM
        userContent = ocrText
          ? `[Texto extraído automáticamente del archivo adjunto mediante OCR]\n${ocrText}\n\n[Pregunta del usuario]\n${message.content}`
          : `${message.content}\n\n(No se pudo extraer texto del archivo adjunto.)`;
      }
    }

    // SPEC-RAG-0001: recuperación determinística, nunca una decisión del LLM
    // vía tool calling — se dispara en cada turno de una conversación ya
    // marcada como "RAG activa" por chat-ws.ts. Silenciosa: no se expone en
    // la UI qué fragmentos se recuperaron (a diferencia de OCR).
    if (ragActive) {
      const ragContext = await this.queryRagContext(message.content, preferences);
      if (ragContext) {
        userContent = `[Fragmentos relevantes del documento indexado]\n${ragContext}\n\n[Pregunta del usuario]\n${userContent}`;
      }
    }

    // SPEC-KB-0001: kbProviderId ya viene resuelto por chat-ws.ts — modo
    // manual (preferences.kb) o modo recomendado ya confirmado por el
    // usuario (kb.decision). Nunca el LLM decide qué KB usar.
    if (kbProviderId) {
      const kbContext = await this.queryKb(kbProviderId, message.content, preferences);
      if (kbContext) {
        userContent = `[Fragmentos relevantes de la base de conocimiento]\n${kbContext}\n\n${userContent}`;
      }
    }

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
      { role: "user", content: userContent },
    ];

    // Primera llamada: permite que el LLM solicite tools
    let response = await this.callLlm(llm, messages, toolDefinitions, preferences.maxWaitMs);
    messages.push(response.message);

    // Ejecutar tools solicitadas (una sola ronda)
    if (response.toolCalls.length > 0) {
      const executed = new Set<string>();
      for (const toolCall of response.toolCalls) {
        const key = `${toolCall.function.name}:${toolCall.function.arguments}`;
        if (executed.has(key)) continue;
        executed.add(key);
        await this.executeToolCall(toolCall, loadedTools, preferences.scope, messages, preferences.maxWaitMs);
      }

      // Segunda llamada: genera respuesta final SIN tools
      response = await this.callLlm(llm, messages, undefined, preferences.maxWaitMs);
      messages.push(response.message);
    }

    this.emit({ type: "assistant.completed", data: { provenance: this.buildProvenance(llm) } });
  }

  private async resolveLlm(preferences: ModelPreferences): Promise<ResolvedLlm | null> {
    const providers = await this.atlasClient.getProviders("llm");
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

  private async resolveToolProviders(
    capabilities: string[],
    scope?: PrivacyScope
  ): Promise<ResolvedToolProvider[]> {
    const providers = await this.atlasClient.getProviders("mcp");
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

  /**
   * Ejecuta OCR sobre el artifact adjunto y emite `ocr.extracted`, sin llamar
   * al LLM — usado por el flujo de confirmación (SPEC-OCRCONFIRM-0001): el
   * usuario ve el texto extraído antes de decidir si el LLM lo usa o no.
   */
  async extractOcrText(
    artifacts: string[],
    filename: string,
    preferences: ModelPreferences
  ): Promise<string | null> {
    this.artifacts = artifacts;
    const toolProviders = await this.resolveToolProviders(["document.ocr"], preferences.scope);
    const loadedTools = await this.mcpHost.loadToolsForCapabilities(
      toolProviders.map((t) => ({ providerId: t.providerId, providerName: t.providerName, service: t.service }))
    );
    const ocrTool = loadedTools.find((t) => t.capabilityId === "document.ocr");
    if (!ocrTool) {
      this.emitError("NO_OCR_PROVIDER", "No hay proveedores de OCR disponibles en tu scope");
      return null;
    }

    const text = await this.runOcrDeterministically(ocrTool, preferences.maxWaitMs);
    if (text) {
      this.emit({ type: "ocr.extracted", data: { filename, text } });
    }
    return text;
  }

  /**
   * Indexa un documento ya confirmado en un rag-provider (SPEC-RAG-0001) —
   * llamado por chat-ws.ts en el mismo instante en que se resuelve
   * `attachment.decision { use: true }`, nunca antes ni de forma
   * especulativa. Degradación graceful: si no hay ningún rag-provider en el
   * scope del usuario, simplemente no hay RAG disponible para esta
   * conversación — no es un error visible para el usuario.
   */
  async indexDocumentForRag(text: string, preferences: ModelPreferences): Promise<boolean> {
    const toolProviders = await this.resolveToolProviders(["document.index"], preferences.scope);
    const loadedTools = await this.mcpHost.loadToolsForCapabilities(
      toolProviders.map((t) => ({ providerId: t.providerId, providerName: t.providerName, service: t.service }))
    );
    const indexTool = loadedTools.find((t) => t.capabilityId === "document.index");
    if (!indexTool) return false;

    try {
      await this.mcpHost.callTool(
        indexTool.providerId,
        indexTool.name,
        { text, conversationId: this.conversationId },
        preferences.maxWaitMs,
        { conversationId: this.conversationId, capabilityId: indexTool.capabilityId }
      );
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Recupera los fragmentos más relevantes del índice RAG de esta
   * conversación — silencioso (SPEC-RAG-0001: "la recuperación en turnos
   * 2+ es silenciosa", sin eventos tool.selected/running/completed como sí
   * emite OCR). Devuelve null si no hay rag-provider o no hay nada indexado.
   */
  private async queryRagContext(query: string, preferences: ModelPreferences): Promise<string | null> {
    const toolProviders = await this.resolveToolProviders(["document.query"], preferences.scope);
    const loadedTools = await this.mcpHost.loadToolsForCapabilities(
      toolProviders.map((t) => ({ providerId: t.providerId, providerName: t.providerName, service: t.service }))
    );
    const queryTool = loadedTools.find((t) => t.capabilityId === "document.query");
    if (!queryTool) return null;

    const startTime = Date.now();
    try {
      const { message: result, dispatchMs } = await this.mcpHost.callTool(
        queryTool.providerId,
        queryTool.name,
        { query, conversationId: this.conversationId, top_k: 3 },
        preferences.maxWaitMs,
        { conversationId: this.conversationId, capabilityId: queryTool.capabilityId }
      );
      const parsed = JSON.parse(extractText(result)) as { chunks: Array<{ text: string; score: number }> };
      this.atlasClient.recordSample({
        providerId: queryTool.providerId,
        capability: queryTool.capabilityId,
        sample: { dispatchMs, totalMs: Date.now() - startTime, success: true, at: Date.now() },
      });
      if (!parsed.chunks || parsed.chunks.length === 0) return null;

      this.usedTools.push({
        capability: queryTool.capabilityId,
        providerId: queryTool.providerId,
        providerName: queryTool.providerName,
        toolName: queryTool.name,
      });
      return parsed.chunks.map((c) => c.text).join("\n---\n");
    } catch {
      this.atlasClient.recordSample({
        providerId: queryTool.providerId,
        capability: queryTool.capabilityId,
        sample: { dispatchMs: null, totalMs: Date.now() - startTime, success: false, at: Date.now() },
      });
      return null;
    }
  }

  /**
   * Modo "recomendado" de kb-provider (SPEC-KB-0001, DEC-0027): compara la
   * pregunta contra `capability.description`/`tags` (DEC-0028) de cada KB
   * registrada con un matching de texto determinístico — nunca el LLM
   * decide. Devuelve la mejor coincidencia por encima de un umbral mínimo,
   * o null si ninguna KB coincide razonablemente (nunca fuerza una
   * elección de baja relevancia). `chat-ws.ts` pide confirmación al
   * usuario antes de consultar la KB recomendada.
   */
  async recommendKb(
    question: string,
    scope?: PrivacyScope
  ): Promise<{ providerId: string; providerName: string; description: string } | null> {
    const providers = await this.atlasClient.getProviders("mcp");
    const questionTokens = tokenizeForMatching(question);

    let best: { providerId: string; providerName: string; description: string; score: number } | null = null;
    for (const p of providers) {
      if (scope && !matchesScope(p.service, scope)) continue;
      const kbCapability = p.service.capabilities.find((c) => c.id === "kb.query");
      if (!kbCapability) continue;

      const descriptionText = [kbCapability.description, ...(kbCapability.tags || [])].filter(Boolean).join(" ");
      const score = jaccardSimilarity(questionTokens, tokenizeForMatching(descriptionText));
      if (score > 0.05 && (!best || score > best.score)) {
        best = {
          providerId: p.providerId,
          providerName: p.name,
          description: kbCapability.description || kbCapability.id,
          score,
        };
      }
    }

    return best ? { providerId: best.providerId, providerName: best.providerName, description: best.description } : null;
  }

  /**
   * Consulta una KB específica (`kb.query`) — no está scoped por
   * `conversationId` (a diferencia de RAG): cualquier conversación que
   * consulte este nodo ve el mismo corpus (SPEC-KB-0001).
   */
  private async queryKb(kbProviderId: string, query: string, preferences: ModelPreferences): Promise<string | null> {
    const providers = await this.atlasClient.getProviders("mcp");
    const target = providers.find((p) => p.providerId === kbProviderId);
    if (!target) return null;

    const loadedTools = await this.mcpHost.loadToolsForCapabilities([
      { providerId: target.providerId, providerName: target.name, service: target.service },
    ]);
    const kbTool = loadedTools.find((t) => t.capabilityId === "kb.query");
    if (!kbTool) return null;

    const startTime = Date.now();
    try {
      const { message: result, dispatchMs } = await this.mcpHost.callTool(
        kbTool.providerId,
        kbTool.name,
        { query, top_k: 3 },
        preferences.maxWaitMs,
        { conversationId: this.conversationId, capabilityId: kbTool.capabilityId }
      );
      const parsed = JSON.parse(extractText(result)) as { chunks: KbQueryChunk[] };
      this.atlasClient.recordSample({
        providerId: kbTool.providerId,
        capability: kbTool.capabilityId,
        sample: { dispatchMs, totalMs: Date.now() - startTime, success: true, at: Date.now() },
      });
      if (!parsed.chunks || parsed.chunks.length === 0) return null;

      const citations = parsed.chunks.map((c) => c.citation).filter((c): c is KbCitation => !!c);
      this.usedTools.push({
        capability: kbTool.capabilityId,
        providerId: kbTool.providerId,
        providerName: kbTool.providerName,
        toolName: kbTool.name,
        citations: citations.length > 0 ? citations : undefined,
      });
      // Cada fragmento se etiqueta con su fuente cuando hay citación
      // disponible — el LLM puede así atribuir la respuesta en el texto
      // (prompting, no lógica nueva de protocolo, DEC-0048).
      return parsed.chunks
        .map((c) => (c.citation ? `[Fuente: ${c.citation.documentTitle}]\n${c.text}` : c.text))
        .join("\n---\n");
    } catch {
      this.atlasClient.recordSample({
        providerId: kbTool.providerId,
        capability: kbTool.capabilityId,
        sample: { dispatchMs: null, totalMs: Date.now() - startTime, success: false, at: Date.now() },
      });
      return null;
    }
  }

  /**
   * Ejecuta document.ocr directamente contra el provider, sin pasar por una
   * decisión del LLM. Emite los mismos eventos que executeToolCall para que
   * el frontend muestre la misma actividad (tool.selected/running/completed).
   * Devuelve el texto extraído, o null si falla (degradación graceful).
   */
  private async runOcrDeterministically(tool: LoadedTool, maxWaitMs?: number): Promise<string | null> {
    const artifact = this.artifacts[0];
    if (!artifact) return null;

    this.emit({
      type: "tool.selected",
      data: { capability: tool.capabilityId, providerId: tool.providerId, providerName: tool.providerName },
    });
    this.emit({ type: "tool.running", data: { name: tool.name, providerId: tool.providerId } });
    const startTime = Date.now();

    try {
      const parsed = parseDataUrl(artifact);
      const args = { file_base64: parsed.base64, filename: `upload-${Date.now()}.${parsed.extension}` };
      const { message: result, dispatchMs } = await this.mcpHost.callTool(
        tool.providerId,
        tool.name,
        args,
        maxWaitMs,
        { conversationId: this.conversationId, capabilityId: tool.capabilityId }
      );
      const duration = Date.now() - startTime;
      const textResult = extractText(result);

      this.emit({ type: "tool.completed", data: { name: tool.name, duration, success: true } });
      this.atlasClient.recordSample({
        providerId: tool.providerId,
        capability: tool.capabilityId,
        sample: { dispatchMs, totalMs: duration, success: true, at: Date.now() },
      });
      this.usedTools.push({
        capability: tool.capabilityId,
        providerId: tool.providerId,
        providerName: tool.providerName,
        toolName: tool.name,
      });
      return textResult;
    } catch (err: any) {
      const duration = Date.now() - startTime;
      this.emit({ type: "tool.error", data: { name: tool.name, error: err.message } });
      this.atlasClient.recordSample({
        providerId: tool.providerId,
        capability: tool.capabilityId,
        sample: { dispatchMs: null, totalMs: duration, success: false, at: Date.now() },
      });
      return null;
    }
  }

  private async executeToolCall(
    toolCall: ToolCall,
    loadedTools: LoadedTool[],
    scope?: PrivacyScope,
    messages?: LlmMessage[],
    maxWaitMs?: number
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

      if (tool.capabilityId === "document.ocr" && !args.file_base64) {
        const artifact = this.artifacts[0];
        if (!artifact) {
          this.emit({ type: "tool.error", data: { name: toolName, error: "No hay archivo adjunto para OCR" } });
          messages?.push({ role: "tool", content: "Error: no hay archivo adjunto", tool_call_id: toolCall.id });
          return;
        }
        const parsed = parseDataUrl(artifact);
        args.file_base64 = parsed.base64;
        args.filename = args.filename || `upload-${Date.now()}.${parsed.extension}`;
      }

      const { message: result, dispatchMs } = await this.mcpHost.callTool(
        tool.providerId,
        toolName,
        args,
        maxWaitMs,
        { conversationId: this.conversationId, capabilityId: tool.capabilityId }
      );
      const duration = Date.now() - startTime;
      const textResult = extractText(result);

      this.emit({ type: "tool.completed", data: { name: toolName, duration, success: true } });
      this.atlasClient.recordSample({
        providerId: tool.providerId,
        capability: tool.capabilityId,
        sample: { dispatchMs, totalMs: duration, success: true, at: Date.now() },
      });
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
      this.atlasClient.recordSample({
        providerId: tool.providerId,
        capability: tool.capabilityId,
        sample: { dispatchMs: null, totalMs: duration, success: false, at: Date.now() },
      });
      messages?.push({ role: "tool", content: `Error: ${err.message}`, tool_call_id: toolCall.id });
    }
  }

  private async callLlm(
    llm: ResolvedLlm,
    messages: LlmMessage[],
    tools?: ToolDefinition[],
    maxWaitMs?: number
  ): Promise<{ message: LlmMessage; toolCalls: ToolCall[] }> {
    const request: GenerateRequest = {
      model: llm.model.id,
      messages,
      tools,
      stream: false,
      temperature: 0.7,
    };

    const startTime = Date.now();
    let dispatchResult;
    try {
      dispatchResult = await this.llmGateway.generate(
        { nodeId: llm.nodeId, providerName: llm.providerName, service: llm.service, model: llm.model },
        request,
        maxWaitMs,
        { conversationId: this.conversationId, capability: llm.model.id }
      );
    } catch (err) {
      this.atlasClient.recordSample({
        providerId: llm.nodeId,
        capability: llm.model.id,
        sample: { dispatchMs: null, totalMs: Date.now() - startTime, success: false, at: Date.now() },
      });
      throw err;
    }

    const { response, dispatchMs } = dispatchResult;
    this.atlasClient.recordSample({
      providerId: llm.nodeId,
      capability: llm.model.id,
      sample: { dispatchMs, totalMs: Date.now() - startTime, success: true, at: Date.now() },
    });

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
        citations: t.citations,
      })),
      dataExported: this.usedTools.length > 0 ? "Datos enviados a tools federadas" : "Ninguno",
      jurisdiction: "red local comunitaria",
    };
  }

  // Todo evento conversation-scoped pasa por aquí para que conversationId se
  // adjunte siempre — así ningún call site puede olvidarlo (ver DEC-0018).
  private emit(event: any) {
    this.eventBus.emit({
      ...event,
      data: { ...event.data, conversationId: this.conversationId },
    });
  }

  private emitStatus(status: string, message: string) {
    this.emit({ type: "agent.status", data: { status, message } });
  }

  private emitError(code: string, message: string) {
    this.emit({ type: "error", data: { code, message } });
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

// SPEC-KB-0001: matching determinístico de texto para el modo "recomendado"
// — mismo mecanismo de similitud (Jaccard) que rag-provider usa para
// recuperación, reutilizado aquí para decidir qué KB recomendar, nunca cuál
// invocar (eso lo confirma el usuario).
function tokenizeForMatching(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((t) => t.length > 1)
  );
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
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

const EXTENSION_BY_MIME: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/webp": "webp",
  "application/pdf": "pdf",
};

function parseDataUrl(dataUrl: string): { base64: string; mimeType: string; extension: string } {
  const match = /^data:([^;]+);base64,(.*)$/s.exec(dataUrl);
  if (!match) {
    // No es un data URL; se asume base64 crudo de una imagen.
    return { base64: dataUrl, mimeType: "image/png", extension: "png" };
  }
  const [, mimeType, base64] = match;
  return { base64, mimeType, extension: EXTENSION_BY_MIME[mimeType] || "bin" };
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
