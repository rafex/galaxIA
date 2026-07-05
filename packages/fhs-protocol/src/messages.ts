/**
 * Mensajes del protocolo WebSocket entre proveedores y Registry FHS v0.1.
 */

import type { ProviderManifest } from "./manifest.js";

export interface BaseMessage {
  type: string;
  timestamp?: number;
}

export interface HelloMessage extends BaseMessage {
  type: "hello";
  providerId: string;
  timestamp: number;
  signature?: string;
}

export interface WelcomeMessage extends BaseMessage {
  type: "welcome";
  registryId: string;
  leaseSeconds: number;
}

export interface RegisterMessage extends BaseMessage {
  type: "register";
  providerId: string;
  manifest: ProviderManifest;
  timestamp: number;
  signature?: string;
}

export interface RegisteredMessage extends BaseMessage {
  type: "registered";
  leaseExpires: number;
  acceptedServices: number;
}

export interface PingMessage extends BaseMessage {
  type: "ping";
}

export interface PongMessage extends BaseMessage {
  type: "pong";
  timestamp: number;
}

export interface NodeOnlineMessage extends BaseMessage {
  type: "node.online";
  providerId: string;
  providerName: string;
  services: { kind: string; capabilities: string[] }[];
}

export interface NodeLostMessage extends BaseMessage {
  type: "node.lost";
  providerId: string;
  providerName: string;
  services: { kind: string; capabilities: string[] }[];
}

export interface NodeUpdatedMessage extends BaseMessage {
  type: "node.updated";
  providerId: string;
  providerName: string;
  services: { kind: string; capabilities: string[] }[];
}

/**
 * Rechazo del Registry antes de completar el registro — ej. `hello` con un
 * `providerId` que ya tiene una conexión activa (DEC-0009). El provider debe
 * tratar esto igual que un cierre de conexión: no reintentar con el mismo
 * `providerId` sin resolver el conflicto primero.
 */
export interface RegistryErrorMessage extends BaseMessage {
  type: "error";
  data: {
    code: "NOT_IDENTIFIED" | "ALREADY_REGISTERED" | "INVALID_MANIFEST" | "PARSE_ERROR";
    message: string;
  };
}

export type RegistryOutboundMessage =
  | WelcomeMessage
  | RegisteredMessage
  | PongMessage
  | NodeOnlineMessage
  | NodeLostMessage
  | RegistryErrorMessage
  | NodeUpdatedMessage;

export type RegistryInboundMessage =
  | HelloMessage
  | RegisterMessage
  | PingMessage;

export type FhsMessage = RegistryInboundMessage | RegistryOutboundMessage;

// ============================================================
// Chat protocol (Agent Server ↔ LLM Provider over FHS WebSocket)
// ============================================================

export interface ChatRequestMessage extends BaseMessage {
  type: "chat.request";
  requestId: string;
  request: import("./llm.js").GenerateRequest;
}

export interface ChatDeltaMessage extends BaseMessage {
  type: "chat.delta";
  requestId: string;
  delta: string;
}

export interface ChatCompletedMessage extends BaseMessage {
  type: "chat.completed";
  requestId: string;
  response: import("./llm.js").GenerateResponse;
}

export interface ChatErrorMessage extends BaseMessage {
  type: "chat.error";
  requestId: string;
  code: string;
  message: string;
}

export type LlmProviderInboundMessage = ChatRequestMessage;

export type LlmProviderOutboundMessage =
  | ChatDeltaMessage
  | ChatCompletedMessage
  | ChatErrorMessage;

export type LlmProviderMessage =
  | LlmProviderInboundMessage
  | LlmProviderOutboundMessage;

// ============================================================
// Tool call protocol (Agent Server ↔ MCP/Tool Provider over FHS WebSocket)
// ============================================================

export interface ToolCallRequestMessage extends BaseMessage {
  type: "tool.call";
  requestId: string;
  toolName: string;
  arguments: Record<string, any>;
}

export interface ToolCallResultMessage extends BaseMessage {
  type: "tool.result";
  requestId: string;
  toolName: string;
  content: Array<{ type: "text"; text: string }>;
}

export interface ToolCallErrorMessage extends BaseMessage {
  type: "tool.error";
  requestId: string;
  toolName: string;
  code: string;
  message: string;
}

export interface ToolListRequestMessage extends BaseMessage {
  type: "tool.list";
  requestId: string;
}

export interface ToolListResponseMessage extends BaseMessage {
  type: "tool.list.response";
  requestId: string;
  tools: Array<{
    name: string;
    description?: string;
    inputSchema?: Record<string, any>;
  }>;
}

export type ToolProviderInboundMessage =
  | ToolCallRequestMessage
  | ToolListRequestMessage;

export type ToolProviderOutboundMessage =
  | ToolCallResultMessage
  | ToolCallErrorMessage
  | ToolListResponseMessage;

export type ToolProviderMessage =
  | ToolProviderInboundMessage
  | ToolProviderOutboundMessage;
