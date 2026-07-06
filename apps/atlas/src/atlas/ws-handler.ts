import type { FastifyInstance, FastifyRequest } from "fastify";
import type { WebSocket } from "@fastify/websocket";
import {
  type HelloMessage,
  type RegisterMessage,
  type PingMessage,
  type FhsMessage,
  HEARTBEAT_INTERVAL_SECONDS,
  FHS_ERROR_CODES,
  verifySignature,
} from "@rafex/galaxia-fhs-protocol";
import { Atlas } from "./registry.js";
import { validateManifest } from "./manifest-validation.js";

export async function setupWebSocket(app: FastifyInstance, registry: Atlas) {
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
    //
    // Tolera MISSED_PONG_THRESHOLD ciclos sin `pong` (no 1) antes de terminar
    // la conexión — con 1 ciclo, esta señal quedaba más estricta que el propio
    // lease de aplicación (30s) que complementa, pudiendo desconectar a un nodo
    // legítimamente ocupado en un cómputo bloqueante breve. Aun con esto,
    // sigue sin distinguir "atorado" de "ocupado pero progresando" — esa
    // garantía depende del dispatcher concurrente ("mosquito") que cada nodo
    // debe implementar (DEC-0009/satelite-rating): asegura que en algún
    // momento se responderá, no cuándo.
    const MISSED_PONG_THRESHOLD = 3;
    let missedPongs = 0;
    socket.on("pong", () => {
      missedPongs = 0;
    });
    pingTimer = setInterval(() => {
      if (missedPongs >= MISSED_PONG_THRESHOLD) {
        socket.terminate();
        return;
      }
      missedPongs += 1;
      socket.ping();
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);

    socket.on("message", (raw: any) => {
      try {
        const msg = JSON.parse(raw.toString()) as FhsMessage;
        handleMessage(msg);
      } catch (err) {
        send({ type: "error", data: { code: FHS_ERROR_CODES.PARSE_ERROR, message: "Invalid JSON" } } as any);
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
          // DEC-0030: providerId es un did:key real (Ed25519) — la firma se
          // verifica contra la clave pública derivada del propio identificador,
          // sin directorio de claves aparte. Suplantar a otro nodo deja de ser
          // posible con solo conectarse y reutilizar su providerId (DEC-0009
          // ya lo mitigaba parcialmente a nivel de conexión activa; esto lo
          // hace criptográficamente imposible sin la clave privada real).
          const helloPayload = `${hello.providerId}:${hello.timestamp}`;
          if (!hello.signature || !verifySignature(hello.providerId, helloPayload, hello.signature)) {
            send({
              type: "error",
              data: {
                code: FHS_ERROR_CODES.INVALID_SIGNATURE,
                message: "Firma Ed25519 inválida o ausente para este providerId",
              },
            } as any);
            return;
          }
          if (registry.hasActiveConnection(hello.providerId)) {
            // DEC-0009: no sobrescribir una conexión activa en silencio.
            send({
              type: "error",
              data: {
                code: FHS_ERROR_CODES.ALREADY_REGISTERED,
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
            send({ type: "error", data: { code: FHS_ERROR_CODES.NOT_IDENTIFIED, message: "Send hello first" } } as any);
            return;
          }
          // DEC-0030: register también viaja firmado — el hello ya probó la
          // identidad, pero register lleva su propio timestamp y podría
          // reenviarse/alterarse por separado.
          const registerPayload = `${providerId}:${register.timestamp}`;
          if (!register.signature || !verifySignature(providerId, registerPayload, register.signature)) {
            send({
              type: "error",
              data: {
                code: FHS_ERROR_CODES.INVALID_SIGNATURE,
                message: "Firma Ed25519 inválida o ausente en register",
              },
            } as any);
            return;
          }
          // DEC-0013: rechazar manifiestos incompletos, no aceptarlos con
          // valores por defecto silenciosos (ver docs/protocolo-provider.md,
          // "Manifiesto — campos obligatorios sin excepción").
          const validation = validateManifest(register.manifest);
          if (!validation.valid) {
            send({
              type: "error",
              data: {
                code: FHS_ERROR_CODES.INVALID_MANIFEST,
                message: `Manifiesto incompleto, faltan campos obligatorios: ${validation.missing.join(", ")}`,
              },
            } as any);
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
