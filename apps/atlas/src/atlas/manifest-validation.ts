/**
 * Valida los campos obligatorios del manifiesto (DEC-0013,
 * `docs/protocolo-provider.md`, sección "Manifiesto — campos obligatorios
 * sin excepción"). Un manifiesto sin `privacy.retention` debe rechazarse,
 * no aceptarse con un valor por defecto silencioso.
 */
export interface ManifestValidationResult {
  valid: boolean;
  missing: string[];
}

export function validateManifest(manifest: any): ManifestValidationResult {
  const missing: string[] = [];

  if (!manifest || typeof manifest !== "object") {
    return { valid: false, missing: ["manifest"] };
  }
  if (!manifest.fhsVersion) missing.push("fhsVersion");
  if (!manifest.provider?.id) missing.push("provider.id");
  if (!manifest.provider?.type) missing.push("provider.type");
  if (!manifest.provider?.visibility) missing.push("provider.visibility");
  if (!manifest.privacy?.retention) missing.push("privacy.retention");
  if (manifest.provider?.type === "llm" && manifest.privacy?.trainingUse === undefined) {
    missing.push("privacy.trainingUse");
  }

  if (manifest.provider?.type === "multi") {
    if (!Array.isArray(manifest.services) || manifest.services.length === 0) {
      missing.push("services");
    } else {
      manifest.services.forEach((service: any, i: number) => {
        if (!service.endpoint) missing.push(`services[${i}].endpoint`);
      });
    }
  } else if (!manifest.endpoint) {
    missing.push("endpoint");
  }

  return { valid: missing.length === 0, missing };
}
