import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { runCofreFocoLab, type BudgetMode, type Horizon } from "./cofre-foco-lab.js";

export type CofreFocoCliOptions = Readonly<{ seed: string; nights: number; horizon: Horizon; payout: "3:2" | "1:1"; budgetMode: BudgetMode; out?: string }>;

export function parseCofreFocoArgs(args: readonly string[]): CofreFocoCliOptions {
  const allowed = new Set(["--seed", "--nights", "--horizon", "--payout", "--budget", "--out"]);
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]!; const value = args[i + 1];
    if (!allowed.has(name) || options.has(name) || !value || value.startsWith("--")) throw new Error(`Invalid or missing option: ${name}`);
    options.set(name, value);
  }
  const seed = options.get("--seed") ?? "nocte-p2b-e-v1";
  const nights = Number(options.get("--nights") ?? "1000");
  const rawHorizon = Number(options.get("--horizon") ?? "10");
  const payout = options.get("--payout") ?? "3:2";
  const budget = options.get("--budget") ?? "fixed-3";
  if (!Number.isSafeInteger(nights) || nights < 1 || nights > 10000) throw new Error("--nights must be an integer in [1,10000].");
  if (rawHorizon !== 5 && rawHorizon !== 10 && rawHorizon !== 20) throw new Error("--horizon must be 5, 10 or 20.");
  if (payout !== "3:2" && payout !== "1:1") throw new Error("--payout must be 3:2 or 1:1.");
  if (budget !== "fixed-3" && budget !== "proportional-control") throw new Error("--budget must be fixed-3 or proportional-control.");
  return { seed, nights, horizon: rawHorizon, payout, budgetMode: budget, ...(options.has("--out") ? { out: options.get("--out")! } : {}) };
}

export function makeCofreFocoCliReport(options: CofreFocoCliOptions) {
  const start = performance.now();
  const result = runCofreFocoLab(options);
  return { result, execution: { elapsedMs: performance.now() - start, node: process.version,
    timingNote: "execution time is nondeterministic metadata; result reproduces byte-for-byte for the same options" } };
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  const options = parseCofreFocoArgs(args);
  const report = makeCofreFocoCliReport(options);
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (options.out) await writeFile(options.out, json, "utf8"); else process.stdout.write(json);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; });
}
