import { describe, expect, it } from "vitest";
import { makeCofreFocoCliReport, parseCofreFocoArgs } from "./cofre-foco-cli.js";

describe("Cofre + Foco lab CLI contract", () => {
  it("parses versioned experiment parameters and separates timing metadata", () => {
    const options = parseCofreFocoArgs(["--seed", "seed-x", "--nights", "1", "--horizon", "5", "--payout", "1:1"]);
    expect(options).toEqual({ seed: "seed-x", nights: 1, horizon: 5, payout: "1:1", budgetMode: "fixed-3" });
    const a = makeCofreFocoCliReport(options); const b = makeCofreFocoCliReport(options);
    expect(a.result).toEqual(b.result);
    expect(a.execution.elapsedMs).toBeGreaterThanOrEqual(0);
    expect(a.result).not.toHaveProperty("execution");
  });

  it.each([
    ["--unknown", "x"], ["--nights", "1.2"], ["--horizon", "12"], ["--payout", "2:1"],
    ["--seed"], ["--nights", "2", "--nights", "3"],
  ])("rejects malformed CLI input %j", (...args) => {
    expect(() => parseCofreFocoArgs(args as string[])).toThrow();
  });
});
