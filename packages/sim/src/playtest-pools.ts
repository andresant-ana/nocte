import type { Card, Rank, RuleProfile } from "@nocte/engine";
import { scenario, STREAM_VERSION } from "./streams.js";
import { EvSolver, SOLVER_VERSION } from "./solver.js";

export const PLAYTEST_POOL_VERSION = "p2a-pools-v1";
const MAX_ASSESSMENT_CANDIDATES = 30_000;

export type DealerBucket = "2-6" | "7-9" | "10-A";
export type DecisionClass = "single-option" | "close-options" | "clear-best";
export type PoolStage = "familiarization" | "teaching" | "assessment";
export type PlaytestScenario = Readonly<{
  stage: PoolStage;
  seed: string;
  index: number;
  dealerBucket?: DealerBucket;
  decisionClass?: DecisionClass;
}>;
export type PlaytestPools = Readonly<{
  version: typeof PLAYTEST_POOL_VERSION;
  streamVersion: typeof STREAM_VERSION;
  solverVersion: typeof SOLVER_VERSION;
  rulesId: RuleProfile["id"];
  familiarization: readonly PlaytestScenario[];
  teaching: readonly PlaytestScenario[];
  assessment: readonly PlaytestScenario[];
}>;

function bucket(rank: Rank): DealerBucket {
  if (["2", "3", "4", "5", "6"].includes(rank)) return "2-6";
  if (["7", "8", "9"].includes(rank)) return "7-9";
  return "10-A";
}

function decisionClass(cards: readonly Card[], up: Card, solver: EvSolver): DecisionClass {
  const inspection = solver.inspect(cards, up);
  if (inspection.partitions.length === 1) return "single-option";
  const ordered = inspection.partitions.map(({ ev }) => ev).sort((a, b) => b - a);
  return ordered[0]! - ordered[1]! <= 0.1 ? "close-options" : "clear-best";
}

/**
 * Select first-match deterministic scenarios. Assessment quotas are stratified
 * by visible upcard and EV-gap class; they are not a representative sample.
 */
export function generatePlaytestPools(rules: RuleProfile): PlaytestPools {
  const profileKey = rules.naturalPayout.replace(":", "to");
  const familiarSeed = `nocte/${PLAYTEST_POOL_VERSION}/${profileKey}/familiarization`;
  const teachingSeed = `nocte/${PLAYTEST_POOL_VERSION}/${profileKey}/teaching`;
  const assessmentSeed = `nocte/${PLAYTEST_POOL_VERSION}/${profileKey}/assessment`;
  const familiarization = [0, 1, 2].map((index) => ({ stage: "familiarization" as const, seed: familiarSeed, index }));
  const teaching = [{ stage: "teaching" as const, seed: teachingSeed, index: 0 }];
  const solver = new EvSolver(rules);
  const selected = new Map<string, PlaytestScenario>();
  const buckets: readonly DealerBucket[] = ["2-6", "7-9", "10-A"];
  const classes: readonly DecisionClass[] = ["single-option", "close-options", "clear-best"];
  const targets = buckets.flatMap((dealerBucket) => classes.map((kind) => ({ dealerBucket, kind })));
  const remaining = new Map(targets.map((target) => [`${target.dealerBucket}:${target.kind}`, target]));

  for (let index = 0; index < MAX_ASSESSMENT_CANDIDATES && remaining.size > 0; index += 1) {
    const initial = scenario(assessmentSeed, index);
    const dealerBucket = bucket(initial.up.rank);
    const kind = decisionClass(initial.cards, initial.up, solver);
    const key = `${dealerBucket}:${kind}`;
    if (!remaining.has(key)) continue;
    selected.set(key, { stage: "assessment", seed: assessmentSeed, index, dealerBucket, decisionClass: kind });
    remaining.delete(key);
  }
  if (remaining.size > 0) {
    throw new Error(`Não foi possível preencher os estratos P2A: ${[...remaining.keys()].join(", ")}.`);
  }

  return {
    version: PLAYTEST_POOL_VERSION,
    streamVersion: STREAM_VERSION,
    solverVersion: SOLVER_VERSION,
    rulesId: rules.id,
    familiarization,
    teaching,
    assessment: targets.map(({ dealerBucket, kind }) => selected.get(`${dealerBucket}:${kind}`)!),
  };
}
