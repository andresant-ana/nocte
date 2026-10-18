import { beforeAll, describe, expect, it } from "vitest";
import fc from "fast-check";
import { DF_SYM_01_3_TO_2, partitions, type Card } from "@nocte/engine";
import { buildAudit, heldOut, secondGap } from "./depth-audit.js";
import { features, fixedPolicies } from "./depth-policies.js";
import { fitTree, predict } from "./depth-learning.js";
import { RANKS, rankProbability } from "./solver.js";
import { weightedSummary } from "./weighted-statistics.js";
import { orderDistribution } from "./depth-order.js";
import { EvSolver } from "./solver.js";
const c = (rank: Card["rank"]): Card => ({ rank });
let audit: ReturnType<typeof buildAudit>;
beforeAll(() => { audit = buildAudit(DF_SYM_01_3_TO_2); }, 30000);
describe("exact depth diagnostics", () => {
  it("normalizes weighted classes and every complete segmentation axis", () => {
    expect(audit.report.classes).toBe(7150);
    expect(audit.report.orderedDecisionClasses).toBe(100000);
    expect(audit.report.totalWeight).toBeCloseTo(1, 12);
    for (const axis of ["up", "ace", "naturalPossible", "duplicates", "rankSum", "optimalOpeningTotal"]) {
      const weight = Object.entries(audit.report.strata).filter(([key]) => key.startsWith(`${axis}:`)).reduce((s, [, group]) => s + group.probabilityMass, 0);
      expect(weight).toBeCloseTo(1, 12);
    }
    expect(audit.report.compressionReference.oracleTwoCardUtilityStates).toBe(270);
  });
  it("matches option frequencies from independent ordered-rank probability counting", () => {
    const expected = { 1: 0, 2: 0, 3: 0 };
    for (const a of RANKS) for (const b of RANKS) for (const c of RANKS) for (const d of RANKS) {
      const ranks = [a, b, c, d]; const distinct = new Set(ranks);
      const multiplicity = Math.max(...[...distinct].map(rank => ranks.filter(r => r === rank).length));
      const count = multiplicity >= 3 ? 1 : distinct.size === 4 ? 3 : 2;
      expected[count] += ranks.reduce((p, rank) => p * rankProbability(rank), 1);
    }
    for (const n of [1, 2, 3]) expect(audit.report.optionCountMass[n]).toBeCloseTo(expected[n as 1 | 2 | 3], 12);
    const trivial = audit.rows.find(r => r.inspection.partitions.length === 1)!;
    expect(secondGap(trivial)).toBeNull();
    expect(audit.report.bestSecond.nontrivial!.mass + audit.report.bestSecond.undefinedSingleMass).toBeCloseTo(1, 12);
  });
  it("pins regret in the historical 11+20 versus 15+16 example", () => {
    const row = audit.rows.find(r => r.key === "5,6,10,10|7")!;
    const selected = row.inspection.partitions[row.selected.maximin!]!;
    expect(row.inspection.bestEv - selected.ev).toBeCloseTo(2.020656824543817, 12);
    expect(secondGap(row)).toBeCloseTo(2.020656824543817, 12);
    expect(row.selected.p1a).toBe(row.inspection.bestIndex);
  });
  it("calculates weighted quantiles and histogram probabilities independently of class counts", () => {
    const summary = weightedSummary([{ value: 0, weight: 3 }, { value: 1, weight: 1 }])!;
    expect(summary.mean).toBe(0.25); expect(summary.quantiles.p50).toBe(0); expect(summary.quantiles.p90).toBe(1);
    expect(summary.histogram.reduce((s, b) => s + b.probability, 0)).toBe(1);
    expect(weightedSummary([])).toBeNull();
  });
});
describe("explainable public-only policies", () => {
  it("integrates P1A's order-sensitive tie without replacing it by a sorted-card policy", () => {
    const cards = [c("6"), c("7"), c("7"), c("8")]; const up = c("7");
    const inspection = new EvSolver(DF_SYM_01_3_TO_2).inspect(cards, up);
    const result = orderDistribution(cards, up, inspection, fixedPolicies(DF_SYM_01_3_TO_2));
    expect(result.orders).toBe(12);
    expect(result.probabilities.p1a![0]).toBeCloseTo(2 / 3, 14);
    expect(result.probabilities.p1a![1]).toBeCloseTo(1 / 3, 14);
    for (const probabilities of Object.values(result.probabilities)) expect(probabilities.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 14);
  });
  it("never requests hidden data and returns a valid composition", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom<Card["rank"]>("A", "2", "5", "7", "10"), { minLength: 4, maxLength: 4 }), ranks => {
      const cards = ranks.map(c); const choices = partitions(cards);
      const up = new Proxy(c("7"), { get(target, property) { if (property !== "rank") throw new Error("Forbidden hidden input"); return target.rank; } });
      for (const policy of [...fixedPolicies(DF_SYM_01_3_TO_2), ...audit.policies.filter(p => p.kind === "learned")]) {
        const choice = policy.select(cards, up, choices);
        expect(choice).toBeGreaterThanOrEqual(0); expect(choice).toBeLessThan(choices.length);
      }
    }), { numRuns: 100 });
  });
  it("groups all upcards for a multiset in the same held-out fold", () => {
    for (const row of audit.rows) expect(row.holdout).toBe(heldOut(row.multiset));
    expect(audit.report.split.trainMass + audit.report.split.holdoutMass).toBeCloseTo(1, 12);
    const expected = Object.entries(audit.report.policies).filter(([id]) => id !== "p1a").sort((a, b) =>
      a[1].train.regret!.mean - b[1].train.regret!.mean || a[0].localeCompare(b[0])).slice(0, 2).map(([id]) => id);
    expect(audit.finalists).toEqual(expected);
  });
  it("fits deterministic limited rules with quantized predictions and symmetric public features", () => {
    const points = [0, 0, 1, 1].map(x => ({ x: Array.from({ length: 9 }, () => x), y: x ? 1 : -1, weight: 0.25 }));
    const tree = fitTree(points, 1);
    expect(tree).toEqual(fitTree(points, 1)); expect(predict(tree, [0])).toBe(-1); expect(predict(tree, [1])).toBe(1);
    const cards = [c("5"), c("6"), c("10"), c("10")];
    expect(features(cards, c("7"), { luz: [0, 1], sombra: [2, 3] })).toEqual(features(cards, c("7"), { luz: [2, 3], sombra: [0, 1] }));
  });
});
