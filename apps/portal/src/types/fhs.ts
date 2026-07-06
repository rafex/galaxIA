import type { AgentSSEEvent } from "@galaxia/fhs-protocol";

export * from "@galaxia/fhs-protocol";

export type ChatMessage =
  | { role: "user"; content: string; attachmentName?: string; attachmentIsPdf?: boolean }
  | { role: "assistant"; content: string; provenance?: any };

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel: "auto" | string;
  privacyScope: "local" | "network" | "community" | "external";
  ocrMode: "confirm" | "auto";
}

export type { AgentSSEEvent };
