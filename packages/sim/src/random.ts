import type { Card, Rank } from "@nocte/engine";

/** Stable test/lab PRNG. This is not suitable for production secrets or dealing. */
export class SeededRandom {
  private state: number;
  constructor(seed: string | number) {
    const source = String(seed);
    let hash = 2166136261;
    for (let i = 0; i < source.length; i += 1) hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
    this.state = hash >>> 0 || 0x6d2b79f5;
  }
  nextUint32(): number {
    let x = this.state;
    x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
    this.state = x >>> 0;
    return this.state;
  }
  integer(maxExclusive: number): number {
    if (!Number.isInteger(maxExclusive) || maxExclusive <= 0) throw new Error("maxExclusive deve ser positivo.");
    return Math.floor((this.nextUint32() / 0x1_0000_0000) * maxExclusive);
  }
  card(): Card {
    const index = this.integer(13);
    const rank: Rank = index === 0 ? "A" : index <= 8 ? String(index + 1) as Rank : "10";
    return { rank };
  }
}
