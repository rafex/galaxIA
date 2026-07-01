import { EventBus } from "../sse/event-bus.js";
import { MemoryRegistryStore, type RegistryStore } from "./db.js";
import {
  DEFAULT_LEASE_SECONDS,
  HEARTBEAT_INTERVAL_SECONDS,
  LEASE_EXPIRE_SECONDS,
  NODE_PURGE_SECONDS,
  FHS_VERSION,
  type ProviderManifest,
  type PublishedService,
  type NodeStatus,
  flattenManifest,
} from "@galaxia/fhs-protocol";

export interface RegistryConnection {
  providerId: string;
  socket: WebSocketLike;
  connectedAt: number;
  lastPong: number;
}

export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
}

export class Registry {
  private store: RegistryStore;
  private connections = new Map<string, RegistryConnection>();
  private checkTimer?: NodeJS.Timeout;

  constructor(private eventBus: EventBus) {
    this.store = new MemoryRegistryStore();
  }

  get version() {
    return FHS_VERSION;
  }

  get leaseSeconds() {
    return DEFAULT_LEASE_SECONDS;
  }

  registerConnection(providerId: string, socket: WebSocketLike) {
    const now = nowSeconds();
    this.connections.set(providerId, {
      providerId,
      socket,
      connectedAt: now,
      lastPong: now,
    });
  }

  removeConnection(providerId: string) {
    this.connections.delete(providerId);
  }

  touchConnection(providerId: string) {
    const conn = this.connections.get(providerId);
    if (conn) {
      conn.lastPong = nowSeconds();
    }
  }

  registerOrUpdate(providerId: string, manifest: ProviderManifest) {
    const now = nowSeconds();
    const leaseExpires = now + LEASE_EXPIRE_SECONDS;

    this.store.upsertNode({
      providerId,
      name: manifest.provider.name,
      lastSeen: now,
      leaseExpires,
      registeredAt: now, // better-sqlite3 no actualiza created_at en upsert; mantenemos simple
      updatedAt: now,
    });

    const services: PublishedService[] = [];
    for (const entry of flattenManifest(manifest)) {
      services.push({
        id: cryptoRandomId(),
        nodeId: providerId,
        kind: entry.kind,
        endpoint: entry.endpoint,
        capabilities: entry.capabilities || [],
        models: entry.models,
        status: "available",
        updatedAt: now,
      } as PublishedService);
    }

    this.store.replaceServices(providerId, services, now);

    this.eventBus.broadcastToRuntimes({
      type: "node.online",
      data: {
        providerId,
        providerName: manifest.provider.name,
        services: services.map((s) => ({
          kind: s.kind,
          capabilities: s.capabilities.map((c) => c.id),
        })),
      },
    });

    return services.length;
  }

  markLost(providerId: string) {
    this.store.updateNodeStatus(providerId, "lost", nowSeconds());
    const node = this.store.getNode(providerId);
    if (node) {
      this.eventBus.broadcastToRuntimes({
        type: "node.lost",
        data: {
          providerId,
          providerName: node.name,
          services: node.services.map((s) => ({
            kind: s.kind,
            capabilities: s.capabilities.map((c) => c.id),
          })),
        },
      });
    }
  }

  getNodes(status?: NodeStatus) {
    if (status) {
      // por simplicidad filtramos en memoria
      return this.store.getOnlineNodes().filter((n) => n.status === status);
    }
    return this.store.getOnlineNodes();
  }

  getProviders(type?: "llm" | "mcp") {
    const nodes = this.getNodes();
    const providers: Array<{ providerId: string; name: string; type: string; service: PublishedService }> = [];
    for (const node of nodes) {
      for (const service of node.services) {
        if (!type || service.kind === type) {
          providers.push({
            providerId: node.providerId,
            name: node.name,
            type: service.kind,
            service,
          });
        }
      }
    }
    return providers;
  }

  startHealthChecks() {
    if (this.checkTimer) return;
    this.checkTimer = setInterval(() => {
      const now = nowSeconds();
      const expired = this.store.getExpiredNodes(now);
      for (const node of expired) {
        this.markLost(node.provider_id);
      }

      // Limpiar nodos "lost" muy antiguos
      const nodes = this.store.getOnlineNodes();
      for (const node of nodes) {
        if (node.status === "lost" && now - node.leaseExpires > NODE_PURGE_SECONDS) {
          // Eliminar (la db no tiene DELETE aún; se puede agregar si es necesario)
        }
      }
    }, HEARTBEAT_INTERVAL_SECONDS * 1000);
  }

  stopHealthChecks() {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = undefined;
    }
  }
}

function nowSeconds() {
  return Math.floor(Date.now() / 1000);
}

function cryptoRandomId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
