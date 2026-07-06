/**
 * Eventos SSE transmitidos desde el Agent Backend hacia el frontend.
 */

export interface SessionEvent {
  type: "session";
  data: { conversationId: string };
}

export interface AgentStatusEvent {
  type: "agent.status";
  data: { conversationId: string; status: string; message: string };
}

export interface LlmSelectedEvent {
  type: "llm.selected";
  data: {
    conversationId: string;
    providerId: string;
    providerName: string;
    modelId: string;
    reason: string[];
  };
}

export interface LlmStreamingEvent {
  type: "llm.streaming";
  data: { conversationId: string; delta: string };
}

export interface ToolSelectedEvent {
  type: "tool.selected";
  data: {
    conversationId: string;
    capability: string;
    providerId: string;
    providerName: string;
  };
}

export interface ToolRunningEvent {
  type: "tool.running";
  data: { conversationId: string; name: string; providerId: string };
}

export interface ToolCompletedEvent {
  type: "tool.completed";
  data: { conversationId: string; name: string; duration: number; success: boolean };
}

export interface ToolErrorEvent {
  type: "tool.error";
  data: { conversationId: string; name: string; error: string };
}

export interface AssistantDeltaEvent {
  type: "assistant.delta";
  data: { conversationId: string; text: string };
}

export interface OcrExtractedEvent {
  type: "ocr.extracted";
  data: { conversationId: string; filename: string; text: string };
}

export interface ProvenanceInfo {
  llm: {
    providerId: string;
    providerName: string;
    model: string;
  };
  tools: Array<{
    capability: string;
    providerId: string;
    providerName: string;
    retention?: string;
  }>;
  dataExported: string;
  jurisdiction: string;
}

export interface AssistantCompletedEvent {
  type: "assistant.completed";
  data: { conversationId: string; provenance: ProvenanceInfo };
}

export interface NodeLostEvent {
  type: "node.lost";
  data: {
    providerId: string;
    providerName: string;
    services: { kind: string; capabilities: string[] }[];
  };
}

export interface NodeOnlineEvent {
  type: "node.online";
  data: {
    providerId: string;
    providerName: string;
    services: { kind: string; capabilities: string[] }[];
  };
}

export interface KbRecommendedEvent {
  type: "kb.recommended";
  data: {
    conversationId: string;
    providerId: string;
    providerName: string;
    description: string;
  };
}

export interface KbWarningEvent {
  type: "kb.warning";
  data: { conversationId: string; message: string };
}

export interface ErrorEvent {
  type: "error";
  // conversationId ausente = error de conexión antes de establecer una conversación
  // (ej. PARSE_ERROR); se difunde a ese socket únicamente, nunca a otros clientes.
  data: { conversationId?: string; code: string; message: string };
}

export type AgentSSEEvent =
  | SessionEvent
  | AgentStatusEvent
  | LlmSelectedEvent
  | LlmStreamingEvent
  | ToolSelectedEvent
  | ToolRunningEvent
  | ToolCompletedEvent
  | ToolErrorEvent
  | AssistantDeltaEvent
  | AssistantCompletedEvent
  | OcrExtractedEvent
  | NodeLostEvent
  | NodeOnlineEvent
  | KbRecommendedEvent
  | KbWarningEvent
  | ErrorEvent;
