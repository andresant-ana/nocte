import { writeFile } from "node:fs/promises";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2 } from "@nocte/engine";
import { fileURLToPath } from "node:url";
import { generatePlaytestPools } from "./playtest-pools.js";

const output = fileURLToPath(new URL("../../web/src/study/pools.v1.json", import.meta.url));
const catalog = {
  catalogVersion: "p2a-pool-catalog-v1",
  generatedBy: "@nocte/sim generatePlaytestPools",
  profiles: [
    generatePlaytestPools(DF_SYM_01_3_TO_2),
    generatePlaytestPools(DF_SYM_01_1_TO_1),
  ],
};
await writeFile(output, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
process.stdout.write(`Wrote deterministic P2A pools to ${output}\n`);
