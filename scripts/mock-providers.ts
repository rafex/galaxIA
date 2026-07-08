/**
 * Script para registrar proveedores mock en el Registry FHS.
 * Uso: npx tsx scripts/mock-providers.ts
 */
import WebSocket from "ws";

const REGISTRY_URL = "ws://localhost:8083/fhs/v1/ws";

function registerProvider(providerId: string, _name: string, manifest: Record<string, unknown>) {
  const ws = new WebSocket(REGISTRY_URL);

  ws.on("open", () => {
    ws.send(JSON.stringify({ type: "hello", providerId, timestamp: Date.now() }));
  });

  ws.on("message", (data: Buffer) => {
    const msg = JSON.parse(data.toString()) as { type?: string };
    console.log(`[${providerId}]`, msg.type, msg);

    if (msg.type === "welcome") {
      ws.send(
        JSON.stringify({
          type: "register",
          providerId,
          manifest,
          timestamp: Date.now(),
        })
      );
    }
  });

  ws.on("error", (err) => {
    console.error(`[${providerId}] error`, err.message);
  });

  // Renovar registro periódicamente
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "register",
          providerId,
          manifest,
          timestamp: Date.now(),
        })
      );
    }
  }, 25000);

  // Heartbeat
  setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 10000);
}

const llmManifest = {
  fhsVersion: "0.1",
  provider: {
    id: "did:key:macmini-raul",
    name: "Mac mini de Raúl",
    type: "llm",
    visibility: "community",
  },
  endpoint: {
    protocol: "fhs",
    url: "ws://localhost:43111/fhs/v1/chat",
  },
  models: [
    {
      id: "qwen2.5-0.5b-instruct",
      displayName: "Qwen 2.5 0.5B Instruct",
      capabilities: ["chat"],
      contextWindow: 2048,
      toolCalling: { supported: false },
    },
  ],
};

const ocrManifest = {
  fhsVersion: "0.1",
  provider: {
    id: "did:key:ocr-provider-01",
    name: "OCR FHS Provider",
    type: "mcp",
    visibility: "community",
  },
  endpoint: {
    protocol: "fhs",
    url: "ws://localhost:43112/fhs/v1/tools",
  },
  capabilities: [
    {
      id: "document.ocr",
      name: "Extracción de texto",
      inputMediaTypes: ["image/jpeg", "image/png", "application/pdf"],
      languages: ["es", "en"],
    },
  ],
};

registerProvider("did:key:macmini-raul", "Mac mini de Raúl", llmManifest);
registerProvider("did:key:ocr-provider-01", "OCR FHS Provider", ocrManifest);

console.log("Mock providers registered. Press Ctrl+C to exit.");
