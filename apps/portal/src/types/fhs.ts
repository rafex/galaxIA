import type { AgentSSEEvent } from "@rafex/galaxia-fhs-protocol";

export * from "@rafex/galaxia-fhs-protocol";

export type ChatMessage =
  | { role: "user"; content: string; attachmentName?: string; attachmentIsPdf?: boolean }
  | { role: "assistant"; content: string; provenance?: any };

export interface ChatState {
  messages: ChatMessage[];
  isStreaming: boolean;
  selectedModel: "auto" | string;
  privacyScope: "local" | "network" | "community" | "external";
  ocrMode: "confirm" | "auto";
  /** "" = modo recomendado (matching determinístico + confirmación); un providerId = modo manual (SPEC-KB-0001) */
  kbProviderId: string;
}

export type { AgentSSEEvent };
