import { describe, expect, it } from "vitest";
import { fitFocusValues, runConditionalLab, trainFocusValues } from "./conditional-lab.js";

describe("NOCTE-P2B-F conditional strategy lab", () => {
  it("reproduces its fitted continuation values from the independent training seed", () => {
    const options = { seed: "p2b-f-train-replay", maxHorizon: 4, scenariosPerStage: 6, payout: "3:2" as const };
    const values = trainFocusValues(options);
    expect(trainFocusValues(options)).toEqual(values);
    for (const row of values) for (let focus = 1; focus < row.length; focus++) expect(row[focus]).toBeGreaterThanOrEqual(row[focus - 1]! - 1e-12);
  });

  it("reports conditional training-sample standard errors for every horizon and Focus state", () => {
    const fit = fitFocusValues({ seed: "p2b-f-training-uncertainty", maxHorizon: 3, scenariosPerStage: 12, payout: "3:2" });
    expect(fit.stageSamplingUncertaintyByRoundsAndFocus).toHaveLength(4);
    for (const row of fit.stageSamplingUncertaintyByRoundsAndFocus.slice(1)) {
      expect(row).toHaveLength(4);
      for (const estimate of row) {
        expect(estimate.n).toBe(12);
        expect(estimate.standardError).not.toBeNull();
        expect(estimate.confidence95).toHaveLength(2);
      }
    }
  });

  it("keeps paired evaluation disjoint from training and preserves the exact baseline under conserve", () => {
    const report = runConditionalLab({ seed: "p2b-f-lab-test", nights: 8, horizon: 5, payout: "3:2", trainingScenarios: 8, caseStudySearch: false });
    expect(report.trainingSeed).not.toBe(report.evaluationSeed);
    expect(report.policies.baseline.pairedRealizedDifferenceVsBaseline.mean).toBe(0);
    expect(report.policies.conserve.pairedRealizedDifferenceVsBaseline.mean).toBe(0);
    expect(report.policies.conserve.pairedExpectedDifferenceVsBaseline.mean).toBeCloseTo(0, 10);
    expect(report.inheritedP2BEPolicies.conserve.pairedDifferenceVsBaseline.mean).toBe(0);
    expect(report.policies.intertemporal.pairedRealizedDifferenceVsBaseline.n).toBe(8);
    expect(report.pairedComparisons["intertemporal-minus-immediate-realized"]?.n).toBe(8);
    expect(report.policies.intertemporal.focusSpent.mean).toBeGreaterThanOrEqual(0);
    expect(report.policies.intertemporal.focusSpent.mean).toBeLessThanOrEqual(3);
    expect(report.policies.intertemporal.focusSpent.mean + report.policies.intertemporal.focusExpired.mean).toBeCloseTo(3, 10);
    expect(report.perfectHoleInformationUpperBound.pairedGapOverIntertemporalCurrentRoundEV.mean).toBeGreaterThanOrEqual(-1e-10);
    expect(report.training.valueByRoundsAndFocus).toHaveLength(6);
    expect(report.limitations.some(line => line.includes("sample averages"))).toBe(true);
  });

  it.each([0, -1, 10001])("rejects invalid evaluation night counts %s", nights => {
    expect(() => runConditionalLab({ seed: "bad", nights, horizon: 5, payout: "1:1", trainingScenarios: 1 })).toThrow();
  });
});
