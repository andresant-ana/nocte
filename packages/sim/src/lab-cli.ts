import { readFile, writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2, type Card } from "@nocte/engine";
import { benchmark, SCORING_VERSION } from "./benchmark.js";
import { EvSolver, SOLVER_VERSION } from "./solver.js";
import { enumerate } from "./enumeration.js";

async function main() {
  const args = process.argv.slice(2).filter(arg => arg !== "--");
  const known = new Set(["--seed", "--scenarios", "--rules", "--out", "--mode"]);
  const options = new Map<string, string>();
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]!; const value = args[i + 1];
    if (!known.has(name) || options.has(name) || !value || value.startsWith("--")) throw new Error(`Invalid or missing option: ${name}`);
    options.set(name, value);
  }
  const ruleId = options.get("--rules") ?? DF_SYM_01_3_TO_2.id;
  const rules = [DF_SYM_01_3_TO_2, DF_SYM_01_1_TO_1].find(r => r.id === ruleId);
  if (!rules) throw new Error(`Unknown rules: ${ruleId}`);
  const mode = options.get("--mode") ?? "benchmark";
  if (mode !== "benchmark" && mode !== "enumerate") throw new Error(`Unknown mode: ${mode}`);
  if (mode === "enumerate" && (options.has("--seed") || options.has("--scenarios"))) throw new Error("Enumeration is exhaustive; seed/scenarios do not apply.");
  const seed = options.get("--seed") ?? "nocte-p1b-v1";
  const scenarios = Number(options.get("--scenarios") ?? "10000");
  const start = performance.now();
  const solver = new EvSolver(rules);
  const cards: Card[] = ["5", "6", "10", "10"].map(rank => ({ rank: rank as Card["rank"] }));
  const caseStudy = { cards, dealerUp: "7", units: "initial-hand exposure; multiply by 10 for match points", ...solver.inspect(cards, { rank: "7" }) };
  let result: unknown;
  if (mode === "benchmark") result = benchmark({ seed, scenarios, rules });
  else {
    const weighted = enumerate(solver);
    const historical = JSON.parse(await readFile(new URL("../../../lab/results/exact-weighted-7150.json", import.meta.url), "utf8")) as {
      natural_payout: number; optimized_ev_per_2_unit_stakes: number; random_ev_per_2_unit_stakes: number;
    }[];
    const reference = historical.find(row => row.natural_payout === (rules.naturalPayout === "3:2" ? 1.5 : 1))!;
    result = { schemaVersion: 2, kind: "weighted-enumeration", solverVersion: SOLVER_VERSION, scoringVersion: SCORING_VERSION,
      rules: rules.id, ...weighted,
      historicalComparison: { file: "lab/results/exact-weighted-7150.json", reference,
        optimizedDelta: weighted.bestEv - reference.optimized_ev_per_2_unit_stakes,
        randomDistinctDelta: weighted.randomDistinctEv - reference.random_ev_per_2_unit_stakes,
        randomIndexedDelta: weighted.randomIndexedEv - reference.random_ev_per_2_unit_stakes,
        caution: "Python source absent; indexed versus distinct random pairing conventions both reported; deltas are not fitted." },
      cacheSizes: solver.cacheSizes() };
  }
  const report = { result, caseStudy, execution: { elapsedMs: performance.now() - start, node: process.version,
    timingNote: "execution timing is nondeterministic metadata; result and caseStudy reproduce exactly" } };
  const json = `${JSON.stringify(report, null, 2)}\n`;
  const path = options.get("--out");
  if (path) await writeFile(path, json, "utf8"); else process.stdout.write(json);
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; });
