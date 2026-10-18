import { describe, expect, it } from "vitest";
import { runCofreFocoLab } from "./cofre-foco-lab.js";

describe("DF-CF-0.1-lab counterfactual comparison", () => {
  it("reproduces the same paired Nights and reports every required diagnostic profile", () => {
    const options = { seed: "cf-lab-test", nights: 8, horizon: 5 as const, payout: "3:2" as const };
    const first = runCofreFocoLab(options);
    expect(runCofreFocoLab(options)).toEqual(first);
    expect(Object.keys(first.profiles).sort()).toEqual(["baseline", "bm", "cofreOnly", "combined", "focusRead"]);
    for (const profile of Object.values(first.profiles)) {
      expect(Object.keys(profile.agents).sort()).toEqual(["conserve", "eager", "horizon"]);
      for (const agent of Object.values(profile.agents)) {
        expect(agent.score.n).toBe(8);
        expect(agent.baselineModelEvReference.n).toBe(8);
        expect(agent.baselineModelEvReference.confidence95).toHaveLength(2);
        expect(agent.score.confidence95).toHaveLength(2);
        expect(agent.decisionExamples.length).toBeLessThanOrEqual(8);
      }
    }
    expect(first.protocol).toContain("not a physical shoe or multiplayer mirror");
    expect(first.pairwiseProfileComparisons.eager["combined-minus-bm"]?.scoreDifference.n).toBe(8);
  });

  it("bounds all resource spending by initial Focus and retains null uncertainty for one Night", () => {
    const report = runCofreFocoLab({ seed: "cf-one", nights: 1, horizon: 10, payout: "1:1" });
    for (const profile of Object.values(report.profiles)) {
      for (const agent of Object.values(profile.agents)) {
        expect(agent.score.confidence95).toBeNull();
        expect(agent.focusRemaining.mean + agent.focusExpired.mean + agent.focusSpent.mean).toBe(profile.initialFocus);
        expect(agent.focusSpent.mean).toBeGreaterThanOrEqual(0);
        expect(agent.focusSpent.mean).toBeLessThanOrEqual(3);
      }
    }
  });

  it("labels integer-scaled Focus as a separate proportional research control", () => {
    const report = runCofreFocoLab({ seed: "scaled", nights: 1, horizon: 5, payout: "3:2", budgetMode: "proportional-control" });
    expect(report.budgetMode).toBe("proportional-control");
    expect(report.profiles.combined.initialFocus).toBe(2);
    expect(report.profiles.baseline.initialFocus).toBe(0);
    expect(report.limitations.some(line => line.includes("Research-only proportional budget"))).toBe(true);
  });

  it.each([0, -1, 1.5, 10001])("rejects invalid night count %s", nights => {
    expect(() => runCofreFocoLab({ seed: "bad", nights, horizon: 10, payout: "3:2" })).toThrow();
  });

  it.each([4, 6, 11, 21])("rejects unsupported main horizon %s", horizon => {
    expect(() => runCofreFocoLab({ seed: "bad", nights: 1, horizon, payout: "3:2" })).toThrow();
  });
});
