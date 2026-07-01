import type { FastifyInstance } from "fastify";
import { Registry } from "../registry/registry.js";

export async function setupProvidersApi(app: FastifyInstance, registry: Registry) {
  app.get("/api/fhs/nodes", async () => {
    return registry.getNodes();
  });

  app.get("/api/fhs/providers", async (req) => {
    const type = (req.query as { type?: string }).type;
    return registry.getProviders(type as any);
  });

  app.get("/api/fhs/models", async () => {
    const providers = registry.getProviders("llm");
    const models: any[] = [];
    for (const p of providers) {
      for (const m of p.service.models || []) {
        models.push({
          modelId: m.id,
          displayName: m.displayName,
          providerId: p.providerId,
          providerName: p.name,
          capabilities: m.capabilities,
          contextWindow: m.contextWindow,
        });
      }
    }
    return { models };
  });

  app.get("/api/fhs/capabilities", async () => {
    const providers = registry.getProviders("mcp");
    const caps = new Set<string>();
    for (const p of providers) {
      for (const c of p.service.capabilities || []) {
        caps.add(c.id);
      }
    }
    return { capabilities: Array.from(caps) };
  });

  app.post("/api/fhs/resolve", async (req) => {
    const { kind, capabilities, scope } = req.body as {
      kind: "llm" | "mcp";
      capabilities?: string[];
      scope?: string;
    };
    const candidates = registry.getProviders(kind);
    // Por ahora devuelve el primero disponible. El selector más sofisticado irá en el runtime.
    const selected = candidates[0];
    return {
      kind,
      selected: selected
        ? {
            providerId: selected.providerId,
            providerName: selected.name,
            serviceId: selected.service.id,
            capabilities: selected.service.capabilities.map((c) => c.id),
          }
        : null,
      reason: selected ? ["available"] : ["none"],
    };
  });
}
