/**
 * Modo "ship" (DEC-0083) — sigue contenedores locales (`podman logs -f`),
 * escribe cada línea a un archivo local por contenedor (lo que `lnav` ya
 * usaba antes de esto, sin cambios — ver helpers/just/status.just) y,
 * opcionalmente, la publica a NATS en `logs.<host>.<container>` para que
 * un `collect` central la vea en tiempo real. Nunca depende de NATS para
 * seguir escribiendo el archivo local.
 */

import { spawn } from "node:child_process";
import { mkdir, appendFile } from "node:fs/promises";
import { join } from "node:path";
import { createLogNatsClient } from "./nats-client.js";

export interface ShipConfig {
  containers: string[];
  hostLabel: string;
  natsUrl?: string;
  localDir: string;
}

function subjectFor(hostLabel: string, container: string): string {
  return `logs.${hostLabel}.${container}`;
}

function followContainer(container: string, config: ShipConfig, publish: (subject: string, line: string) => void) {
  const filePath = join(config.localDir, `${container}.log`);
  const subject = subjectFor(config.hostLabel, container);

  const child = spawn("podman", ["logs", "-f", "--tail", "50", container], {
    stdio: ["ignore", "pipe", "pipe"],
  });

  let buffer = "";

  async function handleChunk(chunk: Buffer) {
    buffer += chunk.toString("utf8");
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line) continue;
      await appendFile(filePath, line + "\n");
      publish(subject, line);
    }
  }

  child.stdout.on("data", (chunk: Buffer) => void handleChunk(chunk));
  child.stderr.on("data", (chunk: Buffer) => void handleChunk(chunk));

  child.on("error", (err) => {
    console.error(`[log-agent] no se pudo seguir ${container}: ${err.message}`);
  });

  child.on("exit", (code) => {
    console.error(`[log-agent] "podman logs -f ${container}" terminó (code=${code}) — reintentando en 5s`);
    setTimeout(() => followContainer(container, config, publish), 5000);
  });
}

export async function runShip(config: ShipConfig): Promise<void> {
  await mkdir(config.localDir, { recursive: true });

  const nats = await createLogNatsClient(config.natsUrl);
  console.log(
    `[log-agent] modo ship — host="${config.hostLabel}" contenedores=[${config.containers.join(", ")}] nats=${nats.connected ? "conectado" : "no disponible (solo local)"}`
  );

  const publish = (subject: string, line: string) => {
    if (nats.connected) nats.publish(subject, line);
  };

  for (const container of config.containers) {
    followContainer(container, config, publish);
  }
}
