/**
 * Manifiestos de proveedor FHS v0.1.
 */
import type { AuthenticationInfo, Signal, EndpointInfo, ModelInfo, PrivacyPolicy, NodeProfile, SignatureInfo, NodeType } from "./types.js";
export interface BaseBeacon {
    fhsVersion: string;
    provider: NodeProfile;
    endpoint?: EndpointInfo;
    privacy?: PrivacyPolicy;
    authentication?: AuthenticationInfo;
    signature?: SignatureInfo;
}
export interface StarBeacon extends BaseBeacon {
    provider: NodeProfile & {
        type: Extract<NodeType, "llm">;
    };
    endpoint: EndpointInfo;
    models: ModelInfo[];
}
export interface SatelliteBeacon extends BaseBeacon {
    provider: NodeProfile & {
        type: Extract<NodeType, "mcp">;
    };
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
    provider: NodeProfile & {
        type: Extract<NodeType, "multi">;
    };
    services: MultiServiceEntry[];
}
export type Beacon = StarBeacon | SatelliteBeacon | MultiBeacon;
/**
 * Normaliza un manifiesto multi-proveedor en servicios individuales.
 */
export declare function flattenManifest(manifest: Beacon): Generator<{
    provider: NodeProfile;
    kind: "llm" | "mcp";
    endpoint: EndpointInfo;
    models?: ModelInfo[];
    capabilities?: Signal[];
}>;
//# sourceMappingURL=manifest.d.ts.map