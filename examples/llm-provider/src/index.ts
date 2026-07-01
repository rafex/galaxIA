import WebSocket, { WebSocketServer } from "ws";
import type {
  LlmProviderManifest,
  ChatRequestMessage,
  ChatDeltaMessage,
  ChatCompletedMessage,
  ChatErrorMessage,
} from "@galaxia/fhs-protocol";
import { LlmBridge } from "./llm-bridge.js";

const REGISTRY_URL =
  process.env.REGISTRY_URL || "ws://localhost:8083/fhs/v1/ws";
const LLM_PROVIDER_PORT = Number(process.env.LLM_PROVIDER_PORT || 43111);
const LLM_PROVIDER_HOST =
  process.env.LLM_PROVIDER_HOST || "localhost";
const LLAMA_CPP_URL =
  process.env.LLAMA_CPP_URL || "http://localhost:43110/v1";
const PROVIDER_ID =
  process.env.PROVIDER_ID || "did:key:macmini-raul";
const PROVIDER_NAME =
  process.env.PROVIDER_NAME || "Mac mini de Ra\u00FAl";

const manifest: LlmProviderManifest = {
  fhsVersion: "0.1",
  provider: {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    type: "llm",
    visibility: "community",
  },
  endpoint: {
    protocol: "fhs",
    url: `ws://${LLM_PROVIDER_HOST}:${LLM_PROVIDER_PORT}/fhs/v1/chat`,
  },
  models: [
    {
      id: "deepseek-r1-distill-qwen-1.5b",
      displayName: "DeepSeek R1 Distill Qwen 1.5B",
      capabilities: ["chat", "tool.calling"],
      contextWindow: 4096,
      toolCalling: { supported: true, mode: "native", formats: ["openai"] },
    },
  ],
};

const bridge = new LlmBridge(LLAMA_CPP_URL);

// ── Conexión al Registry FHS ──────────────────────────────────────────────

function connectToRegistry() {
  const ws = new WebSocket(REGISTRY_URL);

  ws.on("open", () => {
    log("Conectado al Registry, enviando hello...");
    ws.send(
      JSON.stringify({
        type: "hello",
        providerId: PROVIDER_ID,
        timestamp: Date.now(),
      })
    );
  });

  ws.on("message", (data: WebSocket.Data) => {
    const msg = JSON.parse(data.toString());

    if (msg.type === "welcome") {
      log(`Registry dio welcome (lease: ${msg.leaseSeconds}s), registrando...`);
      ws.send(
        JSON.stringify({
          type: "register",
          providerId: PROVIDER_ID,
          manifest,
          timestamp: Date.now(),
        })
      );
    }

    if (msg.type === "registered") {
      log(`Registrado: ${msg.acceptedServices} servicio(s) aceptado(s)`);
    }
  });

  ws.on("close", () => {
    log("Conexión con Registry perdida, reintentando en 5s...");
    setTimeout(connectToRegistry, 5000);
  });

  ws.on("error", (err) => {
    log(`Error Registry: ${err.message}`);
  });

  const pingTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "ping" }));
    }
  }, 10_000);

  const renewTimer = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          type: "register",
          providerId: PROVIDER_ID,
          manifest,
          timestamp: Date.now(),
        })
      );
    }
  }, 25_000);

  ws.on("close", () => {
    clearInterval(pingTimer);
    clearInterval(renewTimer);
  });
}

// ── Servidor FHS de Chat (donde el Agent Server se conecta) ───────────────

async function handleMessage(socket: WebSocket, raw: WebSocket.Data) {
  try {
    const msg = JSON.parse(raw.toString());

    if (msg.type !== "chat.request") return;

    const req = msg as ChatRequestMessage;
    log(
      `chat.request ${req.requestId}: model=${req.request.model}, stream=${req.request.stream}`
    );
    log(
      `  tools=${req.request.tools ? req.request.tools.length : 0}, messages=${req.request.messages?.length || 0}`
    );

    try {
      if (req.request.stream) {
        log(`  → iniciando stream`);
        const generator = bridge.stream(req.request);
        let result = await generator.next();

        while (!result.done) {
          const deltaMsg: ChatDeltaMessage = {
            type: "chat.delta",
            requestId: req.requestId,
            delta: result.value,
          };
          socket.send(JSON.stringify(deltaMsg));
          result = await generator.next();
        }

        log(`  → stream completado`);
        const completed: ChatCompletedMessage = {
          type: "chat.completed",
          requestId: req.requestId,
          response: result.value,
        };
        socket.send(JSON.stringify(completed));
      } else {
        log(`  → llamando bridge.generate()`);
        const startedAt = Date.now();
        const response = await bridge.generate(req.request);
        log(`  → bridge.generate() completado en ${Date.now() - startedAt}ms`);
        const completed: ChatCompletedMessage = {
          type: "chat.completed",
          requestId: req.requestId,
          response,
        };
        socket.send(JSON.stringify(completed));
        log(`  → chat.completed enviado`);
      }
    } catch (err: any) {
      log(`  → ERROR: ${err.message}`);
      console.error(`[fhs-llm] bridge error:`, err);
      const errorMsg: ChatErrorMessage = {
        type: "chat.error",
        requestId: req.requestId,
        code: "LLM_ERROR",
        message: err.message,
      };
      socket.send(JSON.stringify(errorMsg));
    }
  } catch (err: any) {
    log(`  → PARSE ERROR: ${err.message}`);
    console.error(`[fhs-llm] parse error:`, err);
    socket.send(
      JSON.stringify({
        type: "chat.error",
        requestId: "unknown",
        code: "PARSE_ERROR",
        message: err.message,
      })
    );
  }
}

function startChatServer() {
  const wss = new WebSocketServer({ port: LLM_PROVIDER_PORT });

  wss.on("listening", () => {
    log(
      `Chat server FHS escuchando en ws://localhost:${LLM_PROVIDER_PORT}`
    );
  });

  wss.on("connection", (socket) => {
    log("Agent Server conectado al chat FHS");

    socket.on("message", (raw) => {
      handleMessage(socket, raw);
    });

    socket.on("close", () => {
      log("Agent Server desconectado del chat");
    });

    socket.on("error", (err) => {
      log(`Error en socket de chat: ${err.message}`);
    });
  });
}

// ── Arranque ───────────────────────────────────────────────────────────────

function log(message: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[fhs-llm ${ts}] ${message}`);
}

log(`Iniciando LLM Provider FHS v${manifest.fhsVersion}`);
log(`  Provider : ${PROVIDER_NAME} (${PROVIDER_ID})`);
log(`  Registry : ${REGISTRY_URL}`);
log(`  llama.cpp: ${LLAMA_CPP_URL}`);
log(`  Chat FHS : ws://localhost:${LLM_PROVIDER_PORT}`);

connectToRegistry();
startChatServer();
