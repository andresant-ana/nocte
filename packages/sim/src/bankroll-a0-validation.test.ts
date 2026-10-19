import { describe, expect, it } from "vitest";
import { runBankrollA0Validation, wilsonInterval } from "./bankroll-a0-validation.js";

describe("A0.1 offline validation", () => {
  it("reports reproducible paired policy trajectories and bank sensitivities", () => {
    const options = { seed: "a0-validation-test", nights: 3, horizon: 5 as const, payout: "3:2" as const, trainingScenarios: 4 };
    const report = runBankrollA0Validation(options);
    expect(runBankrollA0Validation(options)).toEqual(report);
    expect(report.startingBalances).toEqual([60, 100, 150, 200]);
    expect(Object.keys(report.policies).sort()).toEqual(["conserve", "intertemporal", "myopic"]);
    expect(report.pairedPolicyScoreDifferences["intertemporal-minus-conserve"].scoreDifference.n).toBe(3);
    expect(report.policies.conserve.focusSpent.mean + report.policies.conserve.focusExpired.mean).toBe(3);
    expect(report.policies.conserve.focusExpired.mean).toBe(3);
    for (const policy of Object.values(report.policies)) {
      expect(policy.focusSpent.mean + policy.focusExpired.mean).toBe(3);
      expect(policy.focusSpent.mean).toBeGreaterThanOrEqual(0);
      expect(policy.focusSpent.mean).toBeLessThanOrEqual(3);
    }
    for (const policy of Object.values(report.policies)) {
      expect(policy.score.n).toBe(3);
      expect(policy.balances).toHaveLength(4);
      for (const balance of policy.balances) {
        expect(balance.practiceProbability.n).toBe(3);
        expect(balance.finalBankroll.quantiles).toHaveProperty("p50");
        expect(balance.fundedRounds.mean + balance.practiceRounds.mean).toBe(5);
        expect(balance.fundedFractionOfNight.mean + balance.practiceRounds.mean / 5).toBeCloseTo(1);
      }
    }
    expect(report.protocol).toContain("trajectory is generated");
  });

  it("uses Wilson intervals and preserves undefined uncertainty for no observations", () => {
    expect(wilsonInterval(0, 0)).toBeNull();
    expect(wilsonInterval(0, 10)?.[0]).toBe(0);
    expect(wilsonInterval(10, 10)?.[1]).toBe(1);
    expect(wilsonInterval(5, 10)?.[0]).toBeLessThan(0.5);
    expect(wilsonInterval(5, 10)?.[1]).toBeGreaterThan(0.5);
  });
});
