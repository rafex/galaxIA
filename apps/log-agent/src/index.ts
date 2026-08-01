/**
 * log-agent (DEC-0083) — capa operativa, no forma parte del protocolo FHS.
 * Ver docs/observabilidad-logs.md para variables de entorno y despliegue.
 */

import { runShip } from "./ship.js";
import { runCollect } from "./collect.js";

const mode = process.env.LOG_AGENT_MODE || "ship";
const localDir = process.env.LOG_AGENT_LOCAL_DIR || "./logs";

async function main() {
  if (mode === "ship") {
    const containersEnv = process.env.LOG_AGENT_CONTAINERS;
    if (!containersEnv) {
      throw new Error("LOG_AGENT_CONTAINERS es requerida en modo ship (lista separada por coma)");
    }
    const hostLabel = process.env.LOG_AGENT_HOST_LABEL;
    if (!hostLabel) {
      throw new Error("LOG_AGENT_HOST_LABEL es requerida en modo ship (ej. bastion, raspi4b, laptop)");
    }
    await runShip({
      containers: containersEnv.split(",").map((c) => c.trim()).filter(Boolean),
      hostLabel,
      natsUrl: process.env.NATS_URL,
      localDir,
    });
    return;
  }

  if (mode === "collect") {
    const natsUrl = process.env.NATS_URL;
    if (!natsUrl) {
      throw new Error("NATS_URL es requerida en modo collect");
    }
    await runCollect({ natsUrl, localDir });
    return;
  }

  throw new Error(`LOG_AGENT_MODE desconocido: "${mode}" (usar "ship" o "collect")`);
}

main().catch((err) => {
  console.error(`[log-agent] error fatal: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
