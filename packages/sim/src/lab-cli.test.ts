import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const cli = fileURLToPath(new URL("./lab-cli.ts", import.meta.url));
const run = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, ...args], { encoding: "utf8", timeout: 15000 });
describe("versioned laboratory CLI", () => {
  it("accepts one scenario and separates nondeterministic timing from reproducible data", () => {
    const args = ["--seed", "cli-single", "--scenarios", "1"];
    const a = run(args); const b = run(args);
    expect(a.status).toBe(0); expect(b.status).toBe(0);
    const first = JSON.parse(a.stdout); const second = JSON.parse(b.stdout);
    expect(first.result).toEqual(second.result);
    expect(first.result.strategies.optimal.score.confidence95).toBeNull();
    expect(first.execution.elapsedMs).toBeGreaterThan(0);
  });
  it.each([
    ["--scenarios", "1.5"], ["--seed"], ["--mode", "other"],
    ["--unknown", "x"], ["--seed", "x", "--seed", "y"], ["--rules", "DF-ASYM-0.2"],
  ])("rejects malformed options: %j", (...args) => {
    const result = run(args);
    expect(result.status).toBe(2); expect(result.stderr.length).toBeGreaterThan(0);
  });
});
