import catalog from "./pools.v1.json";
import type { DealerBucket, DecisionClass, PoolStage } from "./protocol";

export type PlaytestScenario = Readonly<{
  stage: PoolStage;
  seed: string;
  index: number;
  dealerBucket?: DealerBucket;
  decisionClass?: DecisionClass;
}>;
export type PlaytestPools = Readonly<{
  version: string;
  streamVersion: string;
  solverVersion: string;
  rulesId: string;
  familiarization: readonly PlaytestScenario[];
  teaching: readonly PlaytestScenario[];
  assessment: readonly PlaytestScenario[];
}>;
export type PlaytestPoolCatalog = Readonly<{
  catalogVersion: string;
  profiles: readonly PlaytestPools[];
}>;

export function poolsForRules(rulesId: string): PlaytestPools {
  const profile = (catalog as PlaytestPoolCatalog).profiles.find((candidate) => candidate.rulesId === rulesId);
  if (!profile) throw new Error(`O catálogo P2A não contém o perfil ${rulesId}.`);
  return profile;
}
