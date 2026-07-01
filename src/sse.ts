/**
 * Eventos SSE transmitidos desde el Agent Backend hacia el frontend.
 */

export interface SessionEvent {
  type: "session";
  data: { conversationId: string };
}

export interface AgentStatusEvent {
  type: "agent.status";
  data: { status: string; message: string };
}

export interface LlmSelectedEvent {
  type: "llm.selected";
  data: {
    providerId: string;
    providerName: string;
    modelId: string;
    reason: string[];
  };
}

export interface LlmStreamingEvent {
  type: "llm.streaming";
  data: { delta: string };
}

export interface ToolSelectedEvent {
  type: "tool.selected";
  data: {
    capability: string;
    providerId: string;
    providerName: string;
  };
}

export interface ToolRunningEvent {
  type: "tool.running";
  data: { name: string; providerId: string };
}

export interface ToolCompletedEvent {
  type: "tool.completed";
  data: { name: string; duration: number; success: boolean };
}

export interface ToolErrorEvent {
  type: "tool.error";
  data: { name: string; error: string };
}

export interface AssistantDeltaEvent {
  type: "assistant.delta";
  data: { text: string };
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
  data: { provenance: ProvenanceInfo };
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

export interface ErrorEvent {
  type: "error";
  data: { code: string; message: string };
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
  | NodeLostEvent
  | NodeOnlineEvent
  | ErrorEvent;
