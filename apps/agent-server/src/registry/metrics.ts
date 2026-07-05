/**
 * Historial de latencia/éxito por nodo + capability, y rating derivado
 * (SPEC-SATRATING-0001). En memoria, sin persistencia entre reinicios —
 * mismo nivel de ambición que MemoryRegistryStore. Ventana acotada por
 * cantidad de muestras (no por tiempo) para simplicidad de esta v1.
 */

export interface LatencySample {
  /** null si el nodo nunca envió dispatch.ack (timeout/caída, o nodo viejo sin soporte) */
  dispatchMs: number | null;
  totalMs: number;
  success: boolean;
  at: number; // epoch ms
}

export interface NodeMetricsSummary {
  rating: number; // 0.0–5.0
  avgDispatchMs: number | null;
  avgTotalMs: number;
  successRate: number;
  sampleCount: number;
}

// Ventana de muestras por (providerId, capability). Fija por ahora — ajustable
// sin tocar el protocolo (es cálculo interno, no forma parte del mensaje FHS).
const WINDOW_SIZE = 50;

// Tope de latencia total para normalizar el score de velocidad, ver
// "Fórmula del rating" en spec-native/specs/satelite-rating/SPEC.md.
const P_MAX_MS = 60_000;

export class NodeMetricsStore {
  private samples = new Map<string, LatencySample[]>();

  private key(providerId: string, capability: string): string {
    return `${providerId}::${capability}`;
  }

  recordSample(providerId: string, capability: string, sample: LatencySample) {
    const key = this.key(providerId, capability);
    const list = this.samples.get(key) || [];
    list.push(sample);
    if (list.length > WINDOW_SIZE) list.shift();
    this.samples.set(key, list);
  }

  getSummary(providerId: string, capability: string): NodeMetricsSummary | null {
    const list = this.samples.get(this.key(providerId, capability));
    if (!list || list.length === 0) return null;

    const successCount = list.filter((s) => s.success).length;
    const successRate = successCount / list.length;

    const totalMsList = list.map((s) => s.totalMs);
    const avgTotalMs = totalMsList.reduce((a, b) => a + b, 0) / totalMsList.length;

    const dispatchMsList = list
      .map((s) => s.dispatchMs)
      .filter((v): v is number => v !== null);
    const avgDispatchMs =
      dispatchMsList.length > 0
        ? dispatchMsList.reduce((a, b) => a + b, 0) / dispatchMsList.length
        : null;

    const latencyScore = clamp(1 - avgTotalMs / P_MAX_MS, 0, 1);
    const rating = Math.round((0.6 * successRate + 0.4 * latencyScore) * 5 * 10) / 10;

    return {
      rating,
      avgDispatchMs,
      avgTotalMs,
      successRate,
      sampleCount: list.length,
    };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
