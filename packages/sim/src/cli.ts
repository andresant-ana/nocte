import { writeFile } from "node:fs/promises";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { simulate } from "./simulation.js";

const args = process.argv.slice(2);
function option(name: string, fallback: string): string {
  const index = args.indexOf(name);
  return index < 0 ? fallback : args[index + 1] ?? fail(`Falta valor para ${name}.`);
}
function fail(message: string): never { console.error(message); process.exit(2); }
const seed = option("--seed", "nocte-demo-1");
const scenarios = Number(option("--scenarios", "1000"));
const rulesId = option("--rules", DF_SYM_01_3_TO_2.id);
const outputPath = option("--out", "");
const rules = rulesId === DF_SYM_01_3_TO_2.id ? DF_SYM_01_3_TO_2
  : rulesId === DF_SYM_01_1_TO_1.id ? DF_SYM_01_1_TO_1 : fail(`Perfil desconhecido: ${rulesId}`);
try {
  const report = simulate({ seed, scenarios, rules });
  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outputPath) await writeFile(outputPath, json, "utf8");
  else process.stdout.write(json);
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}
