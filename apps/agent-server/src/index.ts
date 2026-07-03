import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { readFileSync } from "node:fs";
import { FHS_VERSION } from "@galaxia/fhs-protocol";
import { Registry } from "./registry/registry.js";
import { setupWebSocket } from "./registry/ws-handler.js";
import { setupChatApi } from "./api/chat.js";
import { setupProvidersApi } from "./api/providers.js";
import { setupEventsApi } from "./api/events.js";
import { setupChatWebSocket } from "./api/chat-ws.js";
import { EventBus } from "./sse/event-bus.js";
import versionInfo from "./version.json" with { type: "json" };

const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || "127.0.0.1";
// TLS opt-in: si TLS_CERT_PATH/TLS_KEY_PATH están seteados, el Registry y el
// Chat API sirven wss:// en vez de ws:// — necesario para que providers en
// otra máquina no manden el manifiesto/mensajes en texto plano por la LAN
// (ver docs/tls-autofirmado.md). Certificado autofirmado, solo para la PoC.
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;

async function main() {
  const tlsEnabled = !!(TLS_CERT_PATH && TLS_KEY_PATH);

  // El tipo específico del servidor Node subyacente (http vs https) no le
  // importa al resto del código — todos los módulos de este archivo tipan
  // su parámetro como el FastifyInstance genérico por defecto.
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
  const registry = new Registry(eventBus);
  registry.startHealthChecks();

  // Registra rutas directamente (websocket no funciona bien dentro de un plugin anidado)
  await setupWebSocket(app, registry);
  await setupProvidersApi(app, registry);
  await setupEventsApi(app, eventBus);
  await setupChatApi(app, registry, eventBus);
  await setupChatWebSocket(app, registry, eventBus);

  app.get("/health", async () => ({
    ok: true,
    fhsVersion: FHS_VERSION,
    version: versionInfo.commit,
    buildDate: versionInfo.date,
  }));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Agent server running at ${tlsEnabled ? "https" : "http"}://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

main();
