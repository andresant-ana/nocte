import { runConditionalLab } from "./conditional-lab.js";

const args = new Map(process.argv.slice(2).flatMap((value, index, values) => value.startsWith("--") ? [[value.slice(2), values[index + 1] ?? "true"]] : []));
const number = (key: string, fallback: number) => Number(args.get(key) ?? fallback);
try {
  const started = performance.now();
  const report = runConditionalLab({ seed: args.get("seed") ?? "nocte-p2b-f-repro", nights: number("nights", 1000),
    horizon: number("horizon", 10) as 5 | 10 | 20, payout: (args.get("payout") ?? "3:2") as "3:2" | "1:1",
    trainingScenarios: number("training", 256) });
  process.stdout.write(`${JSON.stringify({ ...report, execution: { elapsedMs: Math.round(performance.now() - started), node: process.version } }, null, 2)}\n`);
} catch (error) {
  process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
  process.exitCode = 1;
}
