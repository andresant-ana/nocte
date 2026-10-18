import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
const cli = fileURLToPath(new URL("./depth-cli.ts", import.meta.url));
// Several test workers independently enumerate the full domain on small CI runners.
const run = (args: string[]) => spawnSync(process.execPath, ["--import", "tsx", cli, ...args], { encoding: "utf8", timeout: 45000 });
describe("depth audit CLI", () => {
  it("runs a one-session smoke test and retains unknown uncertainty as null", () => {
    const result = run(["--mode", "sessions", "--seed", "cli-p1c", "--sessions", "1"]);
    expect(result.status).toBe(0);
    const report = JSON.parse(result.stdout);
    expect(report.result.sessions).toBe(1);
    expect(report.result.comparisons[0].margin.confidence95).toBeNull();
    expect(report.result.comparisons.filter((c: {key: string}) => c.key.endsWith("optimal-vs-optimal"))).toHaveLength(3);
  }, 60000);
  it.each([
    ["--mode", "sessions", "--sessions", "0"], ["--mode", "sessions", "--sessions", "1.5"],
    ["--mode", "exact", "--seed", "x"], ["--rules", "DF-ASYM-0.2"], ["--out"],
  ])("rejects invalid or out-of-scope input: %j", (...args) => {
    const result = run(args); expect(result.status).toBe(2); expect(result.stderr.length).toBeGreaterThan(0);
  });
});
