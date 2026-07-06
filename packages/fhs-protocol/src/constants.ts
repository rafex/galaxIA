/**
 * Protocolo FHS v0.1 — Constantes compartidas.
 */

export const FHS_VERSION = "0.1";

/** Duración del lease de registro en segundos. */
export const DEFAULT_LEASE_SECONDS = 30;

/** Intervalo de heartbeat en segundos. */
export const HEARTBEAT_INTERVAL_SECONDS = 10;

/** Tiempo máximo sin renovación antes de marcar un nodo como 'lost'. */
export const LEASE_EXPIRE_SECONDS = DEFAULT_LEASE_SECONDS;

/** Tiempo máximo sin renovación antes de eliminar un nodo del registro. */
export const NODE_PURGE_SECONDS = 120;

/**
 * Códigos de error estandarizados (DEC-0013, `docs/protocolo-provider.md`).
 * Cualquier provider debe usar estos en `chat.error`/`tool.error` en vez de
 * inventar los suyos, para que quien consuma FHS pueda decidir (reintentar,
 * buscar otro nodo, informar al usuario) leyendo solo el código. No es un
 * tipo cerrado a nivel de protocolo (DEC-0026: el protocolo no mandata
 * implementación) — un provider en otro lenguaje puede emitir un código
 * distinto si no aplica ninguno de estos, pero debe preferir esta lista.
 */
export const FHS_ERROR_CODES = {
  NOT_IDENTIFIED: "NOT_IDENTIFIED",
  INVALID_SIGNATURE: "INVALID_SIGNATURE",
  INVALID_MANIFEST: "INVALID_MANIFEST",
  ALREADY_REGISTERED: "ALREADY_REGISTERED",
  UPSTREAM_UNAVAILABLE: "UPSTREAM_UNAVAILABLE",
  UPSTREAM_TIMEOUT: "UPSTREAM_TIMEOUT",
  INVALID_ARGUMENTS: "INVALID_ARGUMENTS",
  UNSUPPORTED_CAPABILITY: "UNSUPPORTED_CAPABILITY",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  PARSE_ERROR: "PARSE_ERROR",
} as const;

export type FhsErrorCode = (typeof FHS_ERROR_CODES)[keyof typeof FHS_ERROR_CODES];
