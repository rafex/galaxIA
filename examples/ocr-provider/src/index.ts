import WebSocket, { WebSocketServer } from "ws";
import { createServer as createHttpsServer } from "node:https";
import { readFileSync } from "node:fs";
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
// TLS opt-in (PoC, certificado autofirmado — ver docs/tls-autofirmado.md).
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;
const TLS_ENABLED = !!(TLS_CERT_PATH && TLS_KEY_PATH);
const WS_SCHEME = TLS_ENABLED ? "wss" : "ws";

function wsOptions(url: string) {
  return url.startsWith("wss://") ? { rejectUnauthorized: false } : undefined;
}
const OCR_SERVICE_URL =
  process.env.OCR_SERVICE_URL || "http://localhost:9011";
const OCR_API_KEY =
  process.env.OCR_API_KEY || "";
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
    url: `${WS_SCHEME}://${OCR_PROVIDER_HOST}:${OCR_PROVIDER_PORT}/fhs/v1/tools`,
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
    description: "Extrae texto de una imagen usando OCR.",
    inputSchema: {
      type: "object",
      properties: {
        file_base64: {
          type: "string",
          description: "Imagen codificada en base64",
        },
        filename: {
          type: "string",
          description: "Nombre del archivo (opcional, default: ocr.png)",
        },
        lang: {
          type: "string",
          description: "Idiomas OCR separados por + (default: spa+eng)",
        },
      },
      required: ["file_base64"],
    },
  },
];

const bridge = new OcrBridge(OCR_SERVICE_URL, OCR_API_KEY);

// ── Conexión al Registry FHS ──────────────────────────────────────────────

function connectToRegistry() {
  const ws = new WebSocket(REGISTRY_URL, wsOptions(REGISTRY_URL));

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

    if (msg.type === "error") {
      // DEC-0009: el Registry rechaza el hello si el providerId ya tiene
      // una conexión activa — no reintentar aquí, el "close" que sigue ya
      // dispara el backoff de reconexión normal.
      log(`Registry rechazó la conexión: ${msg.data?.code} — ${msg.data?.message}`);
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
  let wss: WebSocketServer;

  if (TLS_ENABLED) {
    const httpsServer = createHttpsServer({
      cert: readFileSync(TLS_CERT_PATH!),
      key: readFileSync(TLS_KEY_PATH!),
    });
    wss = new WebSocketServer({ server: httpsServer });
    httpsServer.listen(OCR_PROVIDER_PORT, () => {
      log(`Tool server FHS escuchando en wss://localhost:${OCR_PROVIDER_PORT}`);
    });
  } else {
    wss = new WebSocketServer({ port: OCR_PROVIDER_PORT });
    wss.on("listening", () => {
      log(`Tool server FHS escuchando en ws://localhost:${OCR_PROVIDER_PORT}`);
    });
  }

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
                fileBase64: req.arguments.file_base64 || "",
                filename: req.arguments.filename || "ocr-image.png",
                lang: req.arguments.lang || "spa+eng",
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
log(`  Tools FHS: ${WS_SCHEME}://localhost:${OCR_PROVIDER_PORT}`);
log(`  Tools    : ${tools.map((t) => t.name).join(", ")}`);

connectToRegistry();
startToolServer();
