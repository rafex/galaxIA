import type { AgentSSEEvent, UserMessage } from "../types/fhs.js";

export interface ApiOptions {
  conversationId?: string;
  message: string;
  artifacts?: string[];
  attachmentName?: string;
  preferences?: {
    model?: "auto" | string;
    scope?: "local" | "network" | "community" | "external";
    allowExternalProviders?: boolean;
    ocrMode?: "confirm" | "auto";
    kb?: string;
    kbMaxPerQuestion?: number;
  };
}

export interface ChatConnection {
  send(options: ApiOptions): void;
  sendDecision(conversationId: string, use: boolean): void;
  sendKbDecision(conversationId: string, use: boolean): void;
  close(): void;
}

const WS_URL = `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/api/chat/ws`;

export function connectToChat(
  onEvent: (event: AgentSSEEvent) => void,
  onOpen?: () => void
): ChatConnection {
  const socket = new WebSocket(WS_URL);
  let ready = false;
  let pending: ApiOptions | null = null;

  socket.addEventListener("open", () => {
    ready = true;
    if (pending) {
      send(pending);
      pending = null;
    }
    onOpen?.();
  });

  socket.addEventListener("message", (event) => {
    try {
      const payload = JSON.parse(event.data) as AgentSSEEvent;
      onEvent(payload);
    } catch (err) {
      console.error("Failed to parse WebSocket event", err);
    }
  });

  socket.addEventListener("error", (err) => {
    console.error("WebSocket error", err);
    onEvent({ type: "error", data: { code: "WS_ERROR", message: "Error de conexión" } });
  });

  socket.addEventListener("close", () => {
    onEvent({ type: "error", data: { code: "WS_CLOSED", message: "Conexión cerrada" } });
  });

  function send(options: ApiOptions) {
    const msg: any = {
      type: "start",
      conversationId: options.conversationId,
      message: { role: "user", content: options.message } as UserMessage,
      artifacts: options.artifacts || [],
      attachmentName: options.attachmentName,
      preferences: options.preferences || {},
    };

    if (ready) {
      socket.send(JSON.stringify(msg));
    } else {
      pending = options;
    }
  }

  function sendDecision(conversationId: string, use: boolean) {
    if (ready) {
      socket.send(JSON.stringify({ type: "attachment.decision", conversationId, use }));
    }
  }

  function sendKbDecision(conversationId: string, use: boolean) {
    if (ready) {
      socket.send(JSON.stringify({ type: "kb.decision", conversationId, use }));
    }
  }

  return {
    send,
    sendDecision,
    sendKbDecision,
    close: () => socket.close(),
  };
}
