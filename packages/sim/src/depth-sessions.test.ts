import { beforeAll, describe, expect, it } from "vitest";
import { DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { buildAudit } from "./depth-audit.js";
import { sessionBenchmark } from "./depth-sessions.js";
import { wilson } from "./session-statistics.js";
let audit: ReturnType<typeof buildAudit>;
beforeAll(() => { audit = buildAudit(DF_SYM_01_3_TO_2); }, 30000);
describe("session statistics", () => {
  it("matches independent Wilson boundary/symmetry cases and worst-case precision", () => {
    expect(wilson(0, 10).confidence95![1]).toBeCloseTo(1.96 ** 2 / (10 + 1.96 ** 2), 13);
    const middle = wilson(5, 10).confidence95!;
    expect(middle[0] + middle[1]).toBeCloseTo(1, 14);
    expect(wilson(0, 0).rate).toBeNull(); expect(wilson(0, 0).confidence95).toBeNull();
    expect(wilson(5000, 10000).confidence95![1] - 0.5).toBeLessThan(0.01);
    expect(() => wilson(2, 1)).toThrow();
  });
  it("replays nested session data deterministically and partitions win/loss/tie counts", () => {
    const options = { seed: "session-fixture", sessions: 20, rules: DF_SYM_01_3_TO_2 };
    const a = sessionBenchmark(options, audit); const b = sessionBenchmark(options, audit);
    expect(a).toEqual(b); expect(a.lengths).toEqual([5, 10, 20]);
    for (const comparison of a.comparisons) {
      expect(comparison.win.count + comparison.loss.count + comparison.tie.count).toBe(20);
      expect(comparison.margin.n).toBe(20);
      expect(comparison.expectedMargin.mean - comparison.margin.mean + comparison.luckResidual.mean).toBeCloseTo(0, 11);
    }
  });
  it("has an exact all-tie optimal/optimal control with undefined decisive win rate", () => {
    const result = sessionBenchmark({ seed: "control", sessions: 5, rules: DF_SYM_01_3_TO_2 }, audit);
    for (const comparison of result.comparisons.filter(c => c.key.endsWith("optimal-vs-optimal"))) {
      expect(comparison.tie.count).toBe(5); expect(comparison.margin.mean).toBe(0); expect(comparison.margin.variance).toBe(0);
      expect(comparison.decisiveWin.rate).toBeNull();
    }
    const one = sessionBenchmark({ seed: "one", sessions: 1, rules: DF_SYM_01_3_TO_2 }, audit);
    expect(one.comparisons[0]!.margin.confidence95).toBeNull();
    expect(() => sessionBenchmark({ seed: "bad", sessions: 0, rules: DF_SYM_01_3_TO_2 }, audit)).toThrow();
  });
  it("keeps holdout probability out of the fitted rule weights", () => {
    for (const model of audit.report.learnedModels) expect(model.tree.weight).toBeCloseTo(audit.report.split.trainMass, 12);
  });
});
