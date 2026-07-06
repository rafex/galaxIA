/**
 * Protocolo FHS v0.1 — Constantes compartidas.
 */
export declare const FHS_VERSION = "0.1";
/** Duración del lease de registro en segundos. */
export declare const DEFAULT_LEASE_SECONDS = 30;
/** Intervalo de heartbeat en segundos. */
export declare const HEARTBEAT_INTERVAL_SECONDS = 10;
/** Tiempo máximo sin renovación antes de marcar un nodo como 'lost'. */
export declare const LEASE_EXPIRE_SECONDS = 30;
/** Tiempo máximo sin renovación antes de eliminar un nodo del registro. */
export declare const NODE_PURGE_SECONDS = 120;
/**
 * Códigos de error estandarizados (DEC-0013, `docs/protocolo-provider.md`).
 * Cualquier provider debe usar estos en `chat.error`/`tool.error` en vez de
 * inventar los suyos, para que quien consuma FHS pueda decidir (reintentar,
 * buscar otro nodo, informar al usuario) leyendo solo el código. No es un
 * tipo cerrado a nivel de protocolo (DEC-0026: el protocolo no mandata
 * implementación) — un provider en otro lenguaje puede emitir un código
 * distinto si no aplica ninguno de estos, pero debe preferir esta lista.
 */
export declare const FHS_ERROR_CODES: {
    readonly NOT_IDENTIFIED: "NOT_IDENTIFIED";
    readonly INVALID_SIGNATURE: "INVALID_SIGNATURE";
    readonly INVALID_MANIFEST: "INVALID_MANIFEST";
    readonly ALREADY_REGISTERED: "ALREADY_REGISTERED";
    readonly UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE";
    readonly UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT";
    readonly INVALID_ARGUMENTS: "INVALID_ARGUMENTS";
    readonly UNSUPPORTED_CAPABILITY: "UNSUPPORTED_CAPABILITY";
    readonly INTERNAL_ERROR: "INTERNAL_ERROR";
    readonly PARSE_ERROR: "PARSE_ERROR";
};
export type FhsErrorCode = (typeof FHS_ERROR_CODES)[keyof typeof FHS_ERROR_CODES];
//# sourceMappingURL=constants.d.ts.map