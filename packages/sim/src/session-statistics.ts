export function wilson(successes: number, n: number) {
  if (!Number.isSafeInteger(n) || !Number.isSafeInteger(successes) || n < 0 || successes < 0 || successes > n) throw new Error("Invalid binomial counts.");
  if (!n) return { count: successes, n, rate: null, confidence95: null };
  const z = 1.96; const p = successes / n; const denominator = 1 + z * z / n;
  const center = (p + z * z / (2 * n)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / denominator;
  return { count: successes, n, rate: p, confidence95: [Math.max(0, center - half), Math.min(1, center + half)] as const };
}
