import { describe, expect, it } from "vitest";
import { simulate } from "./simulation.js";
import { SeededRandom } from "./random.js";

describe("reproducible simulator", () => {
  it("replays the same seed, rules and scenario count byte-for-byte", () => {
    const a = JSON.stringify(simulate({ seed: "fixture-1", scenarios: 50 }));
    const b = JSON.stringify(simulate({ seed: "fixture-1", scenarios: 50 }));
    expect(a).toBe(b);
  });
  it("compares both requested strategies and reports the rule version", () => {
    const report = simulate({ seed: "acceptance", scenarios: 25 });
    expect(report.strategies["random-partition"].scenarios).toBe(25);
    expect(report.strategies["heuristic-partition"].scenarios).toBe(25);
    expect(report.rules).toBe("DF-SYM-0.1-lab-infinite-3to2-peek-natural-first");
    expect(report.rngVersion).toBe("fnv1a32-xorshift32-v1");
    expect(report.optimality).toContain("not an exact solver");
  });
  it("rejects unsafe scenario counts and supports seeded card replay", () => {
    expect(() => simulate({ seed: "x", scenarios: 0 })).toThrow();
    const a = new SeededRandom("same"); const b = new SeededRandom("same");
    expect(Array.from({ length: 20 }, () => a.card())).toEqual(Array.from({ length: 20 }, () => b.card()));
  });
  it("reports paired Monte Carlo uncertainty when estimable", () => {
    const many = simulate({ seed: "ci", scenarios: 30 });
    expect(many.uncertainty.confidence95).toHaveLength(2);
    expect(many.uncertainty.standardError).not.toBeNull();
    const one = simulate({ seed: "one", scenarios: 1 });
    expect(one.uncertainty.confidence95).toBeNull();
  });
});
