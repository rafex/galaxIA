import type {
  GenerateRequest,
  GenerateResponse,
  LlmMessage,
  ToolCall,
} from "@galaxia/fhs-protocol";

interface LlamaChoice {
  message?: LlmMessage;
  finish_reason?: string;
}

interface LlamaStreamChunk {
  choices: Array<{
    delta: Partial<LlmMessage>;
    finish_reason: string | null;
  }>;
}

export class LlmBridge {
  private llamaCppUrl: string;

  constructor(llamaCppUrl: string) {
    this.llamaCppUrl = llamaCppUrl.replace(/\/$/, "");
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.llamaCppUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        tools: request.tools,
        stream: false,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `llama.cpp request failed: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
      );
    }

    const data = (await response.json()) as {
      choices: LlamaChoice[];
    };

    const choice = data.choices[0];
    const message = choice?.message || {
      role: "assistant" as const,
      content: "",
    };
    const toolCalls = message.tool_calls || [];

    return {
      message,
      toolCalls,
      model: request.model || "unknown",
      provider: "llm-provider-fhs",
    };
  }

  async *stream(
    request: GenerateRequest
  ): AsyncGenerator<string, GenerateResponse, unknown> {
    const url = `${this.llamaCppUrl}/chat/completions`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: request.model,
        messages: request.messages,
        tools: request.tools,
        stream: true,
        temperature: request.temperature ?? 0.7,
        max_tokens: request.max_tokens,
      }),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      throw new Error(
        `llama.cpp stream failed: ${response.status} ${response.statusText}${text ? ` — ${text.slice(0, 200)}` : ""}`
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("No response body for stream");
    }

    const decoder = new TextDecoder();
    let buffer = "";
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6);
        if (data === "[DONE]") continue;

        try {
          const parsed = JSON.parse(data) as LlamaStreamChunk;
          const delta = parsed.choices[0]?.delta;
          if (delta?.content) {
            fullContent += delta.content;
            yield delta.content;
          }
          if (delta?.tool_calls) {
            toolCalls = delta.tool_calls as ToolCall[];
          }
        } catch {
          // ignorar chunks SSE malformados
        }
      }
    }

    return {
      message: {
        role: "assistant",
        content: fullContent,
        tool_calls: toolCalls,
      },
      toolCalls: toolCalls || [],
      model: request.model || "unknown",
      provider: "llm-provider-fhs",
    };
  }
}
