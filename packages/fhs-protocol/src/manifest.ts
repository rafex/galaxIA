/**
 * Manifiestos de proveedor FHS v0.1.
 */

import type {
  AuthenticationInfo,
  Capability,
  EndpointInfo,
  ModelInfo,
  PrivacyPolicy,
  ProviderIdentity,
  SignatureInfo,
  ProviderType,
} from "./types.js";

export interface BaseProviderManifest {
  fhsVersion: string;
  provider: ProviderIdentity;
  endpoint?: EndpointInfo;
  privacy?: PrivacyPolicy;
  authentication?: AuthenticationInfo;
  signature?: SignatureInfo;
}

export interface LlmProviderManifest extends BaseProviderManifest {
  provider: ProviderIdentity & { type: Extract<ProviderType, "llm"> };
  endpoint: EndpointInfo;
  models: ModelInfo[];
}

export interface McpProviderManifest extends BaseProviderManifest {
  provider: ProviderIdentity & { type: Extract<ProviderType, "mcp"> };
  endpoint: EndpointInfo;
  capabilities: Capability[];
}

export interface MultiServiceEntry {
  kind: "llm" | "mcp";
  endpoint: EndpointInfo;
  capabilities?: Capability[];
  models?: ModelInfo[];
}

export interface MultiProviderManifest extends BaseProviderManifest {
  provider: ProviderIdentity & { type: Extract<ProviderType, "multi"> };
  services: MultiServiceEntry[];
}

export type ProviderManifest =
  | LlmProviderManifest
  | McpProviderManifest
  | MultiProviderManifest;

/**
 * Normaliza un manifiesto multi-proveedor en servicios individuales.
 */
export function* flattenManifest(
  manifest: ProviderManifest
): Generator<{ provider: ProviderIdentity; kind: "llm" | "mcp"; endpoint: EndpointInfo; models?: ModelInfo[]; capabilities?: Capability[] }> {
  if (manifest.provider.type === "multi") {
    const base = { ...manifest.provider, type: "multi" as const };
    for (const service of (manifest as MultiProviderManifest).services) {
      const provider: ProviderIdentity = {
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

  const m = manifest as LlmProviderManifest | McpProviderManifest;
  yield {
    provider: m.provider,
    kind: m.provider.type,
    endpoint: m.endpoint,
    models: (m as LlmProviderManifest).models,
    capabilities: (m as McpProviderManifest).capabilities,
  };
}
