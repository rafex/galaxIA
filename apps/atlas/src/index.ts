import Fastify, { type FastifyInstance } from "fastify";
import websocket from "@fastify/websocket";
import { readFileSync } from "node:fs";
import { FHS_VERSION } from "@rafex/galaxia-fhs-protocol";
import { Atlas } from "./atlas/registry.js";
import { setupWebSocket } from "./atlas/ws-handler.js";
import { setupProvidersApi } from "./api/providers.js";
import { setupMetricsApi } from "./api/metrics.js";
import { EventBus } from "./sse/event-bus.js";
import { loadOrCreateIdentity } from "./atlas/identity-store.js";
import { announceRegistry } from "./atlas/mdns-announce.js";
import versionInfo from "./version.json" with { type: "json" };

const PORT = Number(process.env.PORT || 8081);
const HOST = process.env.HOST || "127.0.0.1";
// SPEC-P2P-0001 (fase 1): anuncio mDNS del Registry, opt-out explícito —
// fallback de conveniencia, nunca obligatorio. Ver docs/protocolo.md.
const MDNS_ENABLED = process.env.MDNS_ENABLED !== "false";
const IDENTITY_KEY_PATH = process.env.IDENTITY_KEY_PATH || "./.fhs-identity-registry.pem";
// SPEC-SATRATING-0001 + excepción documentada a DEC-0032: SQLite (better-sqlite3)
// es un binding nativo, pero Atlas corre en la máquina "core" que el operador
// controla, no en hardware donado de Star/Satellite — no aplica la misma
// razón que descartó bindings nativos ahí.
const ATLAS_DB_PATH = process.env.ATLAS_DB_PATH || "./data/atlas-metrics.db";
// TLS opt-in: si TLS_CERT_PATH/TLS_KEY_PATH están seteados, Atlas sirve
// wss:// en vez de ws:// — necesario para que providers en otra máquina no
// manden el manifiesto/mensajes en texto plano por la LAN (ver
// docs/tls-autofirmado.md). Certificado autofirmado, solo para la PoC.
const TLS_CERT_PATH = process.env.TLS_CERT_PATH;
const TLS_KEY_PATH = process.env.TLS_KEY_PATH;

async function main() {
  const tlsEnabled = !!(TLS_CERT_PATH && TLS_KEY_PATH);

  const app = (
    tlsEnabled
      ? Fastify({
          logger: true,
          https: { cert: readFileSync(TLS_CERT_PATH), key: readFileSync(TLS_KEY_PATH) },
        })
      : Fastify({ logger: true })
  ) as FastifyInstance;

  await app.register(websocket);

  const eventBus = new EventBus();
  const registry = new Atlas(eventBus, ATLAS_DB_PATH);
  registry.startHealthChecks();

  // Registra rutas directamente (websocket no funciona bien dentro de un plugin anidado)
  await setupWebSocket(app, registry);
  await setupProvidersApi(app, registry);
  await setupMetricsApi(app, registry);

  app.get("/health", () => ({
    ok: true,
    fhsVersion: FHS_VERSION,
    version: versionInfo.commit,
    buildDate: versionInfo.date,
  }));

  try {
    await app.listen({ port: PORT, host: HOST });
    app.log.info(`Atlas running at ${tlsEnabled ? "https" : "http"}://${HOST}:${PORT}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }

  if (MDNS_ENABLED) {
    const identity = loadOrCreateIdentity(IDENTITY_KEY_PATH);
    announceRegistry(identity, PORT, tlsEnabled);
    app.log.info(`Anunciando Atlas por mDNS (did: ${identity.did})`);
  }
}

void main();
