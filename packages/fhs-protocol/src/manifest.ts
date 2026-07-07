/**
 * Manifiestos de proveedor FHS v0.1.
 */

import type {
  AuthenticationInfo,
  Signal,
  EndpointInfo,
  ModelInfo,
  PrivacyPolicy,
  NodeProfile,
  SignatureInfo,
  NodeType,
} from "./types.js";

export interface BaseBeacon {
  fhsVersion: string;
  provider: NodeProfile;
  endpoint?: EndpointInfo;
  privacy?: PrivacyPolicy;
  authentication?: AuthenticationInfo;
  signature?: SignatureInfo;
}

export interface StarBeacon extends BaseBeacon {
  provider: NodeProfile & { type: Extract<NodeType, "llm"> };
  endpoint: EndpointInfo;
  models: ModelInfo[];
}

/**
 * Nova (DEC-0055) — nodo de razonamiento con loop propio, a diferencia de un
 * Star (una sola llamada). Mismo `models: ModelInfo[]` que un Star (un Nova
 * también tiene un modelo subyacente); `reasoning.maxSteps` declara el techo
 * de rondas que este Nova soporta — el motor real del loop es responsabilidad
 * exclusiva del provider (DEC-0026), el protocolo solo transporta el dato.
 */
export interface NovaBeacon extends BaseBeacon {
  provider: NodeProfile & { type: Extract<NodeType, "agent"> };
  endpoint: EndpointInfo;
  models: ModelInfo[];
  reasoning: { maxSteps: number };
}

export interface SatelliteBeacon extends BaseBeacon {
  provider: NodeProfile & { type: Extract<NodeType, "mcp"> };
  endpoint: EndpointInfo;
  capabilities: Signal[];
}

export interface MultiServiceEntry {
  kind: "llm" | "mcp";
  endpoint: EndpointInfo;
  capabilities?: Signal[];
  models?: ModelInfo[];
}

export interface MultiBeacon extends BaseBeacon {
  provider: NodeProfile & { type: Extract<NodeType, "multi"> };
  services: MultiServiceEntry[];
}

export type Beacon =
  | StarBeacon
  | SatelliteBeacon
  | MultiBeacon
  | NovaBeacon;

/**
 * Normaliza un manifiesto multi-proveedor en servicios individuales.
 */
export function* flattenManifest(
  manifest: Beacon
): Generator<{
  provider: NodeProfile;
  kind: "llm" | "mcp" | "agent";
  endpoint: EndpointInfo;
  models?: ModelInfo[];
  capabilities?: Signal[];
}> {
  if (manifest.provider.type === "multi") {
    const base = { ...manifest.provider, type: "multi" as const };
    for (const service of (manifest as MultiBeacon).services) {
      const provider: NodeProfile = {
        ...base,
        type: service.kind,
        id: `${base.id}/${service.kind}`,
      };
      yield {
        provider,
        kind: service.kind,
        endpoint: service.endpoint,
        models: service.models,
        capabilities: service.capabilities,
      };
    }
    return;
  }

  const m = manifest as StarBeacon | SatelliteBeacon | NovaBeacon;
  yield {
    provider: m.provider,
    kind: m.provider.type,
    endpoint: m.endpoint,
    models: (m as StarBeacon | NovaBeacon).models,
    capabilities: (m as SatelliteBeacon).capabilities,
  };
}
