import { describe, expect, it } from "vitest";
import { parseA0ValidationArgs } from "./bankroll-a0-validation-cli.js";

describe("A0 validation CLI", () => {
  it("parses reproducible options and rejects unsupported values", () => {
    expect(parseA0ValidationArgs(["--seed", "study-v1", "--nights", "20", "--horizon", "5", "--payout", "1:1", "--training", "40"]))
      .toMatchObject({ seed: "study-v1", nights: 20, horizon: 5, payout: "1:1", trainingScenarios: 40 });
    for (const args of [["--horizon", "11"], ["--payout", "2:1"], ["--nights", "0"], ["--training", "0"]]) {
      expect(() => parseA0ValidationArgs(args)).toThrow();
    }
  });
});
