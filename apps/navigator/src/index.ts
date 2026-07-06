import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { readFileSync } from "node:fs";
import { FHS_VERSION } from "@galaxia/fhs-protocol";
import { AtlasClient } from "./atlas-client.js";
import { setupChatApi } from "./api/chat.js";
import { setupEventsApi } from "./api/events.js";
import { setupChatWebSocket } from "./api/chat-ws.js";
import { EventBus } from "./sse/event-bus.js";
import versionInfo from "./version.json" with { type: "json" };

const PORT = Number(process.env.PORT || 8090);
const HOST = process.env.HOST || "127.0.0.1";
// DEC-0035: Navigator ya no hospeda a Atlas — le habla por HTTP. Sin
// descubrimiento mDNS todavía (deferido, ver DEC-0035): se requiere la URL
// explícita, mismo patrón que REGISTRY_URL en los providers de ejemplo antes
// de DEC-0032.
const ATLAS_URL = process.env.ATLAS_URL || "http://localhost:8081";
// TLS opt-in: si TLS_CERT_PATH/TLS_KEY_PATH están seteados, la Chat API sirve
// wss:// en vez de ws:// (ver docs/tls-autofirmado.md). Certificado
// autofirmado, solo para la PoC.
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;

async function main() {
  const tlsEnabled = !!(TLS_CERT_PATH && TLS_KEY_PATH);

  const app = (
    tlsEnabled
      ? Fastify({
          logger: true,
          https: { cert: readFileSync(TLS_CERT_PATH!), key: readFileSync(TLS_KEY_PATH!) },
        })
      : Fastify({ logger: true })
  ) as FastifyInstance;

  await app.register(websocket);

  const eventBus = new EventBus();
  const atlasClient = new AtlasClient(ATLAS_URL);

  await setupEventsApi(app, eventBus);
  await setupChatApi(app, atlasClient, eventBus);
  await setupChatWebSocket(app, atlasClient, eventBus);

  app.get("/health", async () => ({
    ok: true,
    fhsVersion: FHS_VERSION,
    version: versionInfo.commit,
    buildDate: versionInfo.date,
  }));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Navigator running at ${tlsEnabled ? "https" : "http"}://${HOST}:${PORT} (Atlas: ${ATLAS_URL})`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
