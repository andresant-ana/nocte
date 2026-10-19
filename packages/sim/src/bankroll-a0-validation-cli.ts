import { writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { runBankrollA0Validation } from "./bankroll-a0-validation.js";

export type A0ValidationCliOptions = Readonly<{ seed: string; nights: number; horizon: 5 | 10 | 20; payout: "3:2" | "1:1"; trainingScenarios: number; out?: string }>;

export function parseA0ValidationArgs(args: readonly string[]): A0ValidationCliOptions {
  const allowed = new Set(["--seed", "--nights", "--horizon", "--payout", "--training", "--out"]);
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]!; const value = args[i + 1];
    if (!allowed.has(name) || options.has(name) || !value || value.startsWith("--")) throw new Error(`Invalid or missing option: ${name}`);
    options.set(name, value);
  }
  const seed = options.get("--seed") ?? "nocte-p4-a0-v-v1";
  const nights = Number(options.get("--nights") ?? "1000"); const horizon = Number(options.get("--horizon") ?? "10");
  const payout = options.get("--payout") ?? "3:2"; const trainingScenarios = Number(options.get("--training") ?? "512");
  if (!seed.trim()) throw new Error("--seed must not be empty.");
  if (!Number.isSafeInteger(nights) || nights < 1 || nights > 10000) throw new Error("--nights must be an integer in [1,10000].");
  if (horizon !== 5 && horizon !== 10 && horizon !== 20) throw new Error("--horizon must be 5, 10 or 20.");
  if (payout !== "3:2" && payout !== "1:1") throw new Error("--payout must be 3:2 or 1:1.");
  if (!Number.isSafeInteger(trainingScenarios) || trainingScenarios < 1 || trainingScenarios > 10000) throw new Error("--training must be an integer in [1,10000].");
  return { seed, nights, horizon, payout, trainingScenarios, ...(options.has("--out") ? { out: options.get("--out")! } : {}) };
}

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--"); const options = parseA0ValidationArgs(args);
  const started = performance.now(); const result = runBankrollA0Validation(options);
  const json = `${JSON.stringify({ result, execution: { elapsedMs: Math.round(performance.now() - started), node: process.version,
    timingNote: "execution is nondeterministic metadata; result is reproducible for the same code and parameters" } }, null, 2)}\n`;
  if (options.out) await writeFile(options.out, json, "utf8"); else process.stdout.write(json);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 2; });
}
