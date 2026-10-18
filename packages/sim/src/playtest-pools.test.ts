import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { describe, expect, it } from "vitest";
import { generatePlaytestPools, PLAYTEST_POOL_VERSION, type DecisionClass, type DealerBucket } from "./playtest-pools.js";

describe("P2A fixed scenario pools", () => {
  it("builds distinct, replayable pools with all planned assessment strata", () => {
    const first = generatePlaytestPools(DF_SYM_01_3_TO_2);
    const again = generatePlaytestPools(DF_SYM_01_3_TO_2);
    expect(first).toEqual(again);
    expect(first.version).toBe(PLAYTEST_POOL_VERSION);
    expect(first.familiarization).toHaveLength(3);
    expect(first.teaching).toHaveLength(1);
    expect(first.assessment).toHaveLength(9);

    const assessment = new Set(first.assessment.map((entry) => `${entry.dealerBucket}:${entry.decisionClass}`));
    const buckets: DealerBucket[] = ["2-6", "7-9", "10-A"];
    const classes: DecisionClass[] = ["single-option", "close-options", "clear-best"];
    for (const bucket of buckets) for (const decisionClass of classes) {
      expect(assessment.has(`${bucket}:${decisionClass}`)).toBe(true);
    }

    const all = [...first.familiarization, ...first.teaching, ...first.assessment];
    expect(new Set(all.map((entry) => `${entry.seed}:${entry.index}`)).size).toBe(all.length);
    expect(first.rulesId).toBe(DF_SYM_01_3_TO_2.id);
    const sensitivity = generatePlaytestPools(DF_SYM_01_1_TO_1);
    expect(sensitivity.rulesId).toBe(DF_SYM_01_1_TO_1.id);
    expect(sensitivity.assessment.every((entry) => entry.seed !== first.assessment[0]!.seed)).toBe(true);
  }, 120_000);
});

