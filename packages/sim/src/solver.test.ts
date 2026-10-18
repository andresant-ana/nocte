import { describe, expect, it } from "vitest";
import fc from "fast-check";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2, handValue, type Card } from "@nocte/engine";
import { EvSolver } from "./solver.js";
import { enumerate } from "./enumeration.js";

const c = (rank: Card["rank"]): Card => ({ rank });
const solver = new EvSolver(DF_SYM_01_3_TO_2);

// Independent forward probability propagation using effective total/softness,
// rather than the solver's recursive low-sum state representation.
function forwardDealer(up: Card): Record<string, number> {
  const result: Record<string, number> = { natural: 0, bust: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0 };
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"] as const;
  let frontier = new Map<string, number>();
  for (const rank of ranks) {
    const v = handValue([up, c(rank)]); const p = rank === "10" ? 4 / 13 : 1 / 13;
    if (v.natural) result.natural! += p;
    else frontier.set(`${v.total},${Number(v.soft)}`, (frontier.get(`${v.total},${Number(v.soft)}`) ?? 0) + p);
  }
  while (frontier.size) {
    const next = new Map<string, number>();
    for (const [key, probability] of frontier) {
      const [total, soft] = key.split(",").map(Number) as [number, number];
      if (total > 21) { result.bust! += probability; continue; }
      if (total >= 17) { result[total]! += probability; continue; }
      for (const rank of ranks) {
        let t = total + (rank === "A" ? 1 : Number(rank)); let s = soft;
        if (rank === "A" && !s && t + 10 <= 21) { t += 10; s = 1; }
        if (t > 21 && s) { t -= 10; s = 0; }
        const k = `${t},${s}`;
        next.set(k, (next.get(k) ?? 0) + probability * (rank === "10" ? 4 / 13 : 1 / 13));
      }
    }
    frontier = next;
  }
  return result;
}

describe("exact model solver", () => {
  it("normalizes unconditional and peek-conditioned dealer probabilities against an independent forward algorithm", () => {
    for (const rank of ["A", "2", "6", "7", "10"] as const) {
      const expected = forwardDealer(c(rank));
      const exAnte = solver.dealerDistribution(c(rank), "ex-ante");
      const conditional = solver.dealerDistribution(c(rank), "no-natural");
      expect(Object.values(exAnte).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      expect(Object.values(conditional).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
      for (const key of Object.keys(expected) as (keyof typeof exAnte)[]) {
        expect(exAnte[key]).toBeCloseTo(expected[key]!, 12);
        expect(conditional[key]).toBeCloseTo(key === "natural" ? 0 : expected[key]! / (1 - expected.natural!), 12);
      }
    }
    expect(solver.dealerDistribution(c("A"), "ex-ante").natural).toBeCloseTo(4 / 13, 14);
    expect(solver.dealerDistribution(c("10"), "ex-ante").natural).toBeCloseTo(1 / 13, 14);
  });
  it("separates ex-ante composition EV from negative-peek action EV and natural payout", () => {
    const cards = [c("A"), c("10"), c("7"), c("8")];
    for (const [rules, payout] of [[DF_SYM_01_3_TO_2, 1.5], [DF_SYM_01_1_TO_1, 1]] as const) {
      const s = new EvSolver(rules);
      expect(s.actions(cards.slice(0, 2), c("A")).ev).toBe(payout);
      const inspected = s.inspect(cards, c("A"));
      const p = inspected.partitions.find(p => p.partition.luz[1] === 1)!;
      expect(p.luz.exAnte).toBeCloseTo((9 / 13) * payout, 13);
      expect(p.sombra.exAnte).toBeCloseTo(-4 / 13 + (9 / 13) * p.sombra.afterPeek, 13);
    }
  });
  it("doubles by one forced draw with twice the exposure, permits no later double, and distinguishes post-hit 21", () => {
    const up = c("7"); const dist = forwardDealer(up);
    const forcedStand = (total: number) => total > 21 ? -1 : Object.entries(dist).reduce((ev, [key, p]) =>
      ev + p * (key === "bust" ? 1 : key === "natural" ? -1 : total > Number(key) ? 1 : total === Number(key) ? 0 : -1), 0);
    const expectedDouble = 2 * [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].reduce((sum, draw) => sum + (draw === 10 ? 4 / 13 : 1 / 13) * forcedStand(11 + draw), 0);
    expect(solver.actions([c("5"), c("6")], up).values.double).toBeCloseTo(expectedDouble, 12);
    expect(solver.actions([c("2"), c("3"), c("6")], up).values.double).toBeUndefined();
    expect(solver.actions([c("7"), c("7"), c("7")], up).values.stand).toBeCloseTo(1 - dist[21]!, 12);
    expect(solver.actions([c("A"), c("10")], up).values).toEqual({ stand: 1.5 });
    expect(solver.actions([c("10"), c("10")], up).values.hit).toBeCloseTo((1 - dist[21]!) / 13 - 12 / 13, 12);
    const softDouble = 2 * ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"].reduce((sum, rank) => {
      const total = handValue([c("A"), c("6"), c(rank as Card["rank"])]).total;
      return sum + (rank === "10" ? 4 / 13 : 1 / 13) * forcedStand(total);
    }, 0);
    expect(solver.actions([c("A"), c("6")], up).values.double).toBeCloseTo(softDouble, 12);
  });
  it("distinguishes the two random conventions in the historical decision example", () => {
    const result = solver.inspect([c("5"), c("6"), c("10"), c("10")], c("7"));
    const [a, b] = result.partitions;
    expect(result.partitions).toHaveLength(2);
    expect(result.randomDistinctEv).toBeCloseTo((a!.ev + b!.ev) / 2, 14);
    expect(result.randomIndexedEv).toBeCloseTo((a!.ev + 2 * b!.ev) / 3, 14);
  });
  it("bounds EVs and never ranks the best below the random policy", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom<Card["rank"]>("A", "2", "5", "7", "10"), { minLength: 4, maxLength: 4 }), ranks => {
      const result = solver.inspect(ranks.map(c), c("6"));
      expect(result.bestEv + 1e-12).toBeGreaterThanOrEqual(result.randomDistinctEv);
      expect(result.bestEv).toBeLessThanOrEqual(4);
      expect(result.bestEv).toBeGreaterThanOrEqual(-2);
    }), { numRuns: 100 });
  });
  it("enumerates 7150 classes with normalized multinomial weights and both random conventions", () => {
    const result = enumerate(solver);
    expect(result.classes).toBe(7150);
    expect(result.totalWeight).toBeCloseTo(1, 12);
    expect(result.bestEv).toBeGreaterThan(result.randomDistinctEv);
    expect(result.randomDistinctEv).not.toBeCloseTo(result.randomIndexedEv, 5);
  });
});
