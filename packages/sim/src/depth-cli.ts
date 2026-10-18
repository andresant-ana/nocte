import { writeFile } from "node:fs/promises";
import { performance } from "node:perf_hooks";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { buildAudit, representativeCsv } from "./depth-audit.js";
import { sessionBenchmark } from "./depth-sessions.js";
async function main() {
  const args = process.argv.slice(2).filter(a => a !== "--"); const options = new Map<string, string>();
  const flags = new Set(["--mode", "--seed", "--sessions", "--rules", "--out", "--csv"]);
  for (let i = 0; i < args.length; i += 2) {
    const name = args[i]!; const value = args[i + 1];
    if (!flags.has(name) || options.has(name) || !value || value.startsWith("--")) throw new Error(`Invalid or missing option: ${name}`);
    options.set(name, value);
  }
  const rules = [DF_SYM_01_3_TO_2, DF_SYM_01_1_TO_1].find(r => r.id === (options.get("--rules") ?? DF_SYM_01_3_TO_2.id));
  if (!rules) throw new Error("Unknown rule profile.");
  const mode = options.get("--mode") ?? "exact";
  if (mode !== "exact" && mode !== "sessions") throw new Error("Unknown mode.");
  if (mode === "exact" && (options.has("--seed") || options.has("--sessions"))) throw new Error("Exact audit does not consume seed/sessions.");
  if (mode === "sessions" && options.has("--csv")) throw new Error("CSV is for exact representative scenarios.");
  const n = Number(options.get("--sessions") ?? "10000");
  if (mode === "sessions" && (!Number.isSafeInteger(n) || n < 1 || n > 100000)) throw new Error("Invalid session count.");
  const start = performance.now(); const prepared = buildAudit(rules);
  const result = mode === "exact" ? prepared.report : sessionBenchmark({ seed: options.get("--seed") ?? "nocte-p1c-main-v1", sessions: n, rules }, prepared);
  const report = { result, execution: { elapsedMs: performance.now() - start, node: process.version,
    timingNote: "result is deterministic; execution timing/environment are metadata" } };
  if (options.has("--csv")) await writeFile(options.get("--csv")!, representativeCsv(prepared.report), "utf8");
  const json = JSON.stringify(report, null, 2) + "\n";
  if (options.has("--out")) await writeFile(options.get("--out")!, json, "utf8"); else process.stdout.write(json);
}
main().catch(error => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 2; });
