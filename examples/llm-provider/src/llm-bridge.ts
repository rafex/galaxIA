import { execFile } from "node:child_process";
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

export class LlmBridge {
  private llamaCppUrl: string;

  constructor(llamaCppUrl: string) {
    this.llamaCppUrl = llamaCppUrl.replace(/\/$/, "");
  }

  async generate(request: GenerateRequest): Promise<GenerateResponse> {
    const url = `${this.llamaCppUrl}/chat/completions`;
    const body = JSON.stringify({
      model: request.model,
      messages: request.messages,
      tools: request.tools,
      stream: false,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens,
    });

    const stdout = await this.curlPost(url, body);

    const data = JSON.parse(stdout) as {
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
    const body = JSON.stringify({
      model: request.model,
      messages: request.messages,
      tools: request.tools,
      stream: true,
      temperature: request.temperature ?? 0.7,
      max_tokens: request.max_tokens,
    });

    const stdout = await this.curlPost(url, body);

    const lines = stdout.split("\n");
    let fullContent = "";
    let toolCalls: ToolCall[] | undefined;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const dataStr = trimmed.slice(6);
      if (dataStr === "[DONE]") continue;

      try {
        const parsed = JSON.parse(dataStr) as {
          choices: Array<{
            delta: Partial<LlmMessage>;
            finish_reason: string | null;
          }>;
        };
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

  private curlPost(url: string, body: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const child = execFile(
        "curl",
        [
          "-sfS",
          "--max-time", "55",
          "-X", "POST",
          url,
          "-H", "Content-Type: application/json",
          "-d", body,
        ],
        {
          timeout: 58_000,
          maxBuffer: 16 * 1024 * 1024,
        },
        (err, stdout, stderr) => {
          if (err) {
            reject(
              new Error(
                `llama.cpp request failed: ${err.message}${stderr ? ` — ${stderr.slice(0, 200)}` : ""}`
              )
            );
            return;
          }
          resolve(stdout);
        }
      );

      child.on("error", reject);
    });
  }
}
