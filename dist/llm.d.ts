/**
 * Tipos para interacción con proveedores LLM.
 */
export interface ToolParameterSchema {
    type: string;
    properties?: Record<string, any>;
    required?: string[];
}
export interface ToolDefinition {
    type: "function";
    function: {
        name: string;
        description?: string;
        parameters: ToolParameterSchema;
    };
}
export interface ToolCall {
    id: string;
    type: "function";
    function: {
        name: string;
        arguments: string;
    };
}
export interface LlmMessage {
    role: "system" | "user" | "assistant" | "tool";
    content?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
}
export interface GenerateRequest {
    model?: string;
    messages: LlmMessage[];
    tools?: ToolDefinition[];
    stream?: boolean;
    temperature?: number;
    max_tokens?: number;
}
export interface GenerateResponse {
    message: LlmMessage;
    toolCalls: ToolCall[];
    model: string;
    provider: string;
}
export type StreamHandler = (delta: string) => void;
//# sourceMappingURL=llm.d.ts.map