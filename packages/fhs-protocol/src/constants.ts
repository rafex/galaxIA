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
