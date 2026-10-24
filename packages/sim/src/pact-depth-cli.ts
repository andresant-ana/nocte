import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { performance } from "node:perf_hooks";
import { runPactDepthLab } from "./pact-depth-lab.js";

function parse(args: readonly string[]) {
  const values = new Map<string, string>();
  for (let i = 0; i < args.length; i++) {
    const flag = args[i]!;
    if (!flag.startsWith("--")) throw new Error(`Unexpected argument ${flag}`);
    if (!new Set(["--seed", "--nights", "--out"]).has(flag) || values.has(flag)) throw new Error(`Invalid or repeated option ${flag}`);
    const value = args[++i];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for ${flag}`);
    values.set(flag, value);
  }
  const seed = values.get("--seed") ?? "nocte-p8-pact-depth-v1";
  const nights = Number(values.get("--nights") ?? "100");
  if (!seed.trim()) throw new Error("--seed must not be empty.");
  if (!Number.isSafeInteger(nights) || nights < 1 || nights > 10000) throw new Error("--nights must be in [1,10000].");
  return { seed, nights, out: values.get("--out") };
}

async function main() {
  const options = parse(process.argv.slice(2));
  const started = performance.now();
  const result = runPactDepthLab(options);
  const output = `${JSON.stringify({ result, execution: { elapsedMs: Math.round(performance.now() - started), node: process.version,
    timingNote: "elapsed time is nondeterministic metadata; result is reproducible for the same commit, seed and sample count" } }, null, 2)}\n`;
  if (options.out) await writeFile(resolve(dirname(fileURLToPath(import.meta.url)), "../../../", options.out), output, "utf8");
  else process.stdout.write(output);
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))) {
  main().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 2; });
}
