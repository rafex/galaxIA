/**
 * Tipos base del protocolo FHS v0.1.
 */

export type NodeType = "llm" | "mcp" | "multi";

export type NodeVisibility = "local" | "network" | "community" | "external";

export type ServiceStatus = "available" | "unavailable" | "degraded" | "unknown";

export type NodeStatus = "online" | "lost" | "offline";

export type PrivacyScope = "local" | "network" | "community" | "external";

export interface NodeProfile {
  /** Identificador verificable del proveedor. En v0.1 es did:key:<nombre-simple>. */
  id: string;
  /** Nombre legible para humanos. */
  name: string;
  /** Tipo de proveedor. */
  type: NodeType;
  /** Visibilidad/ámbito del proveedor. */
  visibility: NodeVisibility;
  /** Región opcional. */
  region?: string;
}

export interface EndpointInfo {
  /** Protocolo de transporte de la capa de aplicación. */
  protocol: "openai-compatible" | "mcp" | "custom" | "fhs";
  /** URL base del servicio. */
  url: string;
  /** Transporte MCP cuando aplica. */
  transport?: "streamable-http" | "stdio" | "sse";
}

export interface Signal {
  /** Identificador único de la capacidad, e.g. document.ocr. */
  id: string;
  /** Nombre legible. */
  name?: string;
  /** Tipos MIME de entrada soportados. */
  inputMediaTypes?: string[];
  /** Idiomas soportados. */
  languages?: string[];
  /** Descripción corta. */
  description?: string;
}

export interface ModelInfo {
  id: string;
  displayName: string;
  /** Capacidades del modelo, e.g. chat, tool.calling. */
  capabilities: string[];
  contextWindow?: number;
  languages?: string[];
  toolCalling?: {
    supported: boolean;
    mode?: "native" | "prompt-template" | "unsupported";
    formats?: string[];
    parallelCalls?: boolean;
    maxToolsPerRequest?: number;
  };
  privacy?: {
    retention?: string;
    trainingUse?: boolean;
  };
  availability?: {
    status?: ServiceStatus;
    maxConcurrentRequests?: number;
  };
}

export interface PrivacyPolicy {
  retention?: string;
  trainingUse?: boolean;
  jurisdiction?: string;
}

export interface UserMessage {
  role: "user";
  content: string;
}

export interface AssistantMessage {
  role: "assistant";
  content: string;
}

export type ChatMessage = UserMessage | AssistantMessage;

export interface AuthenticationInfo {
  methods: string[];
}

export interface SignatureInfo {
  algorithm: string;
  value: string;
}

/** Representación interna de un servicio publicado por un nodo. */
export interface PublishedService {
  id: string;
  nodeId: string;
  kind: NodeType;
  endpoint: EndpointInfo;
  capabilities: Signal[];
  status: ServiceStatus;
  models?: ModelInfo[];
  privacy?: PrivacyPolicy;
  authentication?: AuthenticationInfo;
  updatedAt: number;
}

/** Representación interna de un nodo registrado. */
export interface RegisteredNode {
  providerId: string;
  name: string;
  status: NodeStatus;
  lastSeen: number;
  leaseExpires: number;
  registeredAt: number;
  services: PublishedService[];
}
