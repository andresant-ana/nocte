import { EV_TOLERANCE } from "./solver.js";
export const DEPTH_THRESHOLDS = [0.01, 0.05, 0.1, 0.2, 0.5, 1] as const;
export type WeightedValue = { value: number; weight: number };
export function weightedSummary(values: WeightedValue[]) {
  const mass = values.reduce((s, v) => s + v.weight, 0);
  if (!mass) return null;
  const ordered = [...values].sort((a, b) => a.value - b.value);
  const quantile = (p: number) => { let w = 0;
    for (const entry of ordered) { w += entry.weight; if (w >= p * mass - 1e-15) return entry.value; }
    return ordered.at(-1)!.value;
  };
  const bounds = [0, ...DEPTH_THRESHOLDS, Infinity];
  return { mass, mean: values.reduce((s, v) => s + v.weight * v.value, 0) / mass,
    max: ordered.at(-1)!.value, quantiles: { p50: quantile(0.5), p90: quantile(0.9), p95: quantile(0.95), p99: quantile(0.99) },
    histogram: bounds.map((bound, i) => ({ upperInclusive: Number.isFinite(bound) ? bound : null,
      probability: values.filter(v => v.value <= bound + EV_TOLERANCE && (i === 0 || v.value > bounds[i - 1]! + EV_TOLERANCE)).reduce((s, v) => s + v.weight, 0) / mass })),
    above: DEPTH_THRESHOLDS.map(threshold => ({ threshold, probability: values.filter(v => v.value > threshold + EV_TOLERANCE).reduce((s, v) => s + v.weight, 0) / mass })),
  };
}
