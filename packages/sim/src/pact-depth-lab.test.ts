import { beforeAll, describe, expect, it } from "vitest";
import { runPactDepthLab, selectFocusUse } from "./pact-depth-lab.js";

describe("P8 paired strategic depth lab", () => {
  let report: ReturnType<typeof runPactDepthLab>;
  beforeAll(() => { report = runPactDepthLab({ seed: "p8-deterministic-fixture", nights: 1 }); }, 60000);

  it("keeps paid Focus actions possible without a free privilege, and after a privilege was spent", () => {
    expect(selectFocusUse("maneuver", "myopic", 4, 7, false, true, true, 0.2)).toBe("paid");
    expect(selectFocusUse("maneuver", "myopic", 5, 7, true, true, true, 0.2)).toBe("free");
    expect(selectFocusUse("maneuver", "myopic", 5, 7, false, true, true, 0.2)).toBe("paid");
    expect(selectFocusUse("maneuver", "myopic", 5, 7, false, false, true, 0.2)).toBe("none");
    expect(selectFocusUse("read", "myopic", 5, 7, false, true, true)).toBe("paid");
    expect(selectFocusUse("read", "myopic", 5, 7, true, true, true)).toBe("free");
    expect(selectFocusUse("read", "myopic", 5, 7, false, true, false)).toBe("none");
    expect(selectFocusUse("read", "conservative", 5, 7, true, true, true)).toBe("none");
    expect(selectFocusUse("maneuver", "intertemporal", 6, 7, true, true, true, 0.2)).toBe("none");
    expect(selectFocusUse("maneuver", "intertemporal", 7, 7, true, true, true, 0.2)).toBe("free");
    expect(selectFocusUse("maneuver", "intertemporal", 6, 7, false, true, true, 1.0)).toBe("paid");
  });

  it("covers every pair, policy, stake policy and natural payout with reproducible paired seeds", () => {
    expect(report.seed).toBe("p8-deterministic-fixture");
    expect(report.results).toHaveLength(9 * 4 * 3 * 3 * 2);
    expect(report.families).toHaveLength(9);
    expect(report.coverage.catalogPacts).toHaveLength(18);
    expect(report.coverage.untestedPacts).toEqual([]);
    expect(report.coverage.unexercisedPrivileges.every(id => report.coverage.catalogPacts.includes(id))).toBe(true);
    expect(report.randomOfferAudit.repeatedFamilyCount).toBe(0);
    expect(report.randomOfferAudit.seeds).toBeGreaterThanOrEqual(10000);
    expect(report.results.every(result => result.metrics.score.n === 1)).toBe(true);
    expect(report.results.every(result => result.pairedVsRefuse === null || result.pairedVsRefuse.score.n === 1)).toBe(true);
  });

  it("keeps skill score independent of stake sizing in the no-pact control", () => {
    for (const payout of report.payouts) for (const policy of ["conservative", "myopic", "intertemporal"] as const) {
      const controls = report.results.filter(result => result.payout === payout && result.policy === policy
        && result.family === "revelation" && result.choice === "refuse");
      expect(new Set(controls.map(row => row.metrics.score.mean)).size).toBe(1);
    }
  });

  it("reports bank, skill, Focus, privilege and restriction diagnostics as separate metrics", () => {
    const row = report.results.find(result => result.payout === "3:2" && result.stakePolicy === "variable"
      && result.policy === "myopic" && result.family === "fortune" && result.choice === "option-a")!;
    expect(row.metrics).toHaveProperty("score");
    expect(row.metrics).toHaveProperty("bankDeltaTicks");
    expect(row.metrics).toHaveProperty("focusSpent");
    expect(row.metrics).toHaveProperty("privilegesUsed");
    expect(row.metrics).toHaveProperty("renunciationBlocks");
    expect(row.metrics.score.mean).toBeGreaterThanOrEqual(-400);
    expect(row.metrics.score.mean).toBeLessThanOrEqual(400);
    expect(row.actionDisagreement?.comparedPolicy).toBe("conservative");
    if (row.actionDisagreement?.disagreementRate) {
      expect(row.actionDisagreement.disagreementRate.mean).toBeGreaterThanOrEqual(0);
      expect(row.actionDisagreement.disagreementRate.mean).toBeLessThanOrEqual(1);
    }
  });
});
