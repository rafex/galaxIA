/**
 * Manifiestos de proveedor FHS v0.1.
 */
/**
 * Normaliza un manifiesto multi-proveedor en servicios individuales.
 */
export function* flattenManifest(manifest) {
    if (manifest.provider.type === "multi") {
        const base = { ...manifest.provider, type: "multi" };
        for (const service of manifest.services) {
            const provider = {
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
    const m = manifest;
    yield {
        provider: m.provider,
        kind: m.provider.type,
        endpoint: m.endpoint,
        models: m.models,
        capabilities: m.capabilities,
    };
}
//# sourceMappingURL=manifest.js.map