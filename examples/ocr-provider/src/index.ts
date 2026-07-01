import WebSocket, { WebSocketServer } from "ws";
import type {
  McpProviderManifest,
  ToolCallRequestMessage,
  ToolCallResultMessage,
  ToolCallErrorMessage,
  ToolListRequestMessage,
  ToolListResponseMessage,
} from "@galaxia/fhs-protocol";
import { OcrBridge } from "./ocr-bridge.js";

const REGISTRY_URL =
  process.env.REGISTRY_URL || "ws://localhost:8083/fhs/v1/ws";
const OCR_PROVIDER_PORT = Number(process.env.OCR_PROVIDER_PORT || 43112);
const OCR_PROVIDER_HOST =
  process.env.OCR_PROVIDER_HOST || "localhost";
const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL || "http://localhost:8082";
const PROVIDER_ID =
  process.env.PROVIDER_ID || "did:key:ocr-provider-01";
const PROVIDER_NAME =
  process.env.PROVIDER_NAME || "OCR FHS Provider";

const manifest: McpProviderManifest = {
  fhsVersion: "0.1",
  provider: {
    id: PROVIDER_ID,
    name: PROVIDER_NAME,
    type: "mcp",
    visibility: "community",
  },
  endpoint: {
    protocol: "fhs",
    url: `ws://${OCR_PROVIDER_HOST}:${OCR_PROVIDER_PORT}/fhs/v1/tools`,
  },
  capabilities: [
    {
      id: "document.ocr",
      name: "Extracci\u00F3n de texto",
      inputMediaTypes: ["image/jpeg", "image/png", "application/pdf"],
      languages: ["es", "en"],
    },
  ],
};

const tools = [
  {
    name: "ocr_extract",
    description: "Extrae texto de una imagen en base64 usando OCR.",
    inputSchema: {
      type: "object",
      properties: {
        image_base64: {
          type: "string",
          description: "Imagen codificada en base64",
        },
      },
      required: ["image_base64"],
    },
  },
];

const bridge = new OcrBridge(OCR_SERVICE_URL);

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

// ── Servidor FHS de Tools (donde el Agent Server se conecta) ──────────────

function startToolServer() {
  const wss = new WebSocketServer({ port: OCR_PROVIDER_PORT });

  wss.on("listening", () => {
    log(
      `Tool server FHS escuchando en ws://localhost:${OCR_PROVIDER_PORT}`
    );
  });

  wss.on("connection", (socket) => {
    log("Agent Server conectado al tool server FHS");

    socket.on("message", async (raw) => {
      try {
        const msg = JSON.parse(raw.toString());

        // ── tool.list ──
        if (msg.type === "tool.list") {
          const req = msg as ToolListRequestMessage;
          const response: ToolListResponseMessage = {
            type: "tool.list.response",
            requestId: req.requestId,
            tools,
          };
          socket.send(JSON.stringify(response));
          return;
        }

        // ── tool.call ──
        if (msg.type === "tool.call") {
          const req = msg as ToolCallRequestMessage;
          log(`tool.call ${req.requestId}: ${req.toolName}`);

          try {
            if (req.toolName === "ocr_extract") {
              const result = await bridge.extract({
                imageBase64: req.arguments.image_base64 || "",
              });

              const response: ToolCallResultMessage = {
                type: "tool.result",
                requestId: req.requestId,
                toolName: req.toolName,
                content: [{ type: "text", text: result.text }],
              };
              socket.send(JSON.stringify(response));
            } else {
              const error: ToolCallErrorMessage = {
                type: "tool.error",
                requestId: req.requestId,
                toolName: req.toolName,
                code: "UNKNOWN_TOOL",
                message: `Tool no soportada: ${req.toolName}`,
              };
              socket.send(JSON.stringify(error));
            }
          } catch (err: any) {
            const error: ToolCallErrorMessage = {
              type: "tool.error",
              requestId: req.requestId,
              toolName: req.toolName,
              code: "EXECUTION_ERROR",
              message: err.message,
            };
            socket.send(JSON.stringify(error));
          }
        }
      } catch (err: any) {
        socket.send(
          JSON.stringify({
            type: "tool.error",
            requestId: "unknown",
            toolName: "unknown",
            code: "PARSE_ERROR",
            message: err.message,
          })
        );
      }
    });

    socket.on("close", () => {
      log("Agent Server desconectado del tool server");
    });
  });
}

// ── Arranque ───────────────────────────────────────────────────────────────

function log(message: string) {
  const ts = new Date().toISOString().slice(11, 23);
  console.log(`[fhs-ocr ${ts}] ${message}`);
}

log(`Iniciando OCR Provider FHS v${manifest.fhsVersion}`);
log(`  Provider : ${PROVIDER_NAME} (${PROVIDER_ID})`);
log(`  Registry : ${REGISTRY_URL}`);
log(`  OCR Svc  : ${OCR_SERVICE_URL}`);
log(`  Tools FHS: ws://localhost:${OCR_PROVIDER_PORT}`);
log(`  Tools    : ${tools.map((t) => t.name).join(", ")}`);

connectToRegistry();
startToolServer();
