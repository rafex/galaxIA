import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import {
  type HelloMessage,
  type RegisterMessage,
  type PingMessage,
  type FhsMessage,
  HEARTBEAT_INTERVAL_SECONDS,
} from "@galaxia/fhs-protocol";
import { Registry } from "./registry.js";

export async function setupWebSocket(app: FastifyInstance, registry: Registry) {
  app.get("/fhs/v1/ws", { websocket: true }, (socket: WebSocket, req: FastifyRequest) => {
    let providerId: string | null = null;
    let pingTimer: NodeJS.Timeout | null = null;

    const send = (msg: FhsMessage) => {
      if (socket.readyState === 1) {
        socket.send(JSON.stringify(msg));
      }
    };

    // Pulse de transporte (DEC-0010): ping/pong nativo de WebSocket (RFC 6455),
    // no un mensaje FHS — el Registry sondea a cada nodo conectado para detectar
    // conexiones rotas (proceso caído, red partida) más rápido que el lease de
    // aplicación (LEASE_EXPIRE_SECONDS). Complementa, no reemplaza, el heartbeat
    // de aplicación (`ping`/`pong` JSON) ni dispatch.ack — no dice nada de si el
    // nodo está "atorado" procesando una Mission, solo si el socket responde.
    let isAlive = true;
    socket.on("pong", () => {
      isAlive = true;
    });
    pingTimer = setInterval(() => {
      if (!isAlive) {
        socket.terminate();
        return;
      }
      isAlive = false;
      socket.ping();
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);

    socket.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString()) as FhsMessage;
        handleMessage(msg);
      } catch (err) {
        send({ type: "error", data: { code: "PARSE_ERROR", message: "Invalid JSON" } } as any);
      }
    });

    socket.on("close", () => {
      if (providerId) {
        registry.removeConnection(providerId);
      }
      if (pingTimer) clearInterval(pingTimer);
    });

    function handleMessage(msg: FhsMessage) {
      switch (msg.type) {
        case "hello": {
          const hello = msg as HelloMessage;
          if (registry.hasActiveConnection(hello.providerId)) {
            // DEC-0009: no sobrescribir una conexión activa en silencio.
            send({
              type: "error",
              data: {
                code: "ALREADY_REGISTERED",
                message: `providerId ${hello.providerId} ya tiene una conexión activa`,
              },
            } as any);
            socket.close(4009, "already-registered");
            return;
          }
          providerId = hello.providerId;
          registry.registerConnection(providerId, socket as any);
          send({
            type: "welcome",
            registryId: "registry-001",
            leaseSeconds: registry.leaseSeconds,
          });
          break;
        }
        case "register": {
          const register = msg as RegisterMessage;
          if (!providerId) {
            send({ type: "error", data: { code: "NOT_IDENTIFIED", message: "Send hello first" } } as any);
            return;
          }
          const accepted = registry.registerOrUpdate(providerId, register.manifest);
          send({
            type: "registered",
            leaseExpires: Math.floor(Date.now() / 1000) + registry.leaseSeconds,
            acceptedServices: accepted,
          });
          break;
        }
        case "ping": {
          if (providerId) registry.touchConnection(providerId);
          send({ type: "pong", timestamp: Math.floor(Date.now() / 1000) });
          break;
        }
      }
    }
  });
}
