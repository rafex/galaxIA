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
    /**
     * Tags autodeclarados por el operador (DEC-0028) — mismo nivel de
     * confianza que `description`, no verificados por el Registry/Atlas.
     * Señal adicional para el matching determinístico del modo "recomendado"
     * de kb-provider (SPEC-KB-0001). Los tags de comunidad (agregados por
     * Atlas a partir de feedback real de usuarios) quedan bloqueados hasta
     * que exista identidad de usuario (SPEC-AUTH-0001) — no se agregan aquí.
     */
    tags?: string[];
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
/**
 * Formato generalizado de retención (DEC-0025): `"none"` (no se guarda
 * nada más allá de la petición en curso), `"session"` (vive mientras dure
 * la conversación, sin más precisión), un TTL explícito en duración ISO
 * 8601, o `"permanent-readonly"` (contenido curado por el operador, sin
 * expiración — usado por kb-provider, nunca por contenido de usuario).
 */
export type RetentionPolicy = "none" | "session" | {
    ttl: string;
} | "permanent-readonly";
export interface PrivacyPolicy {
    retention?: RetentionPolicy;
    /**
     * Obligatorio quando `retention` no es `"none"` (DEC-0025) — texto que el
     * Portal debe mostrar al usuario antes de aceptar el primer adjunto,
     * explicando en lenguaje llano qué pasa con su contenido.
     */
    warning?: string;
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
//# sourceMappingURL=types.d.ts.map