import type { Card, RuleProfile, SettledHand } from "@nocte/engine";
import type { DecisionRecord, CompletedRoundDetails } from "../game/controller";

export const STUDY_PROTOCOL_VERSION = "P2A-study-v1";
export const STUDY_POOL_CATALOG_VERSION = "p2a-pool-catalog-v1";

export type QuestionnaireKey = "understanding" | "meaningfulChoice" | "repetition" | "confidence" | "timeBurden" | "replayInterest";
export type QuestionnaireAnswers = Partial<Record<QuestionnaireKey, string>>;
export type DealerBucket = "2-6" | "7-9" | "10-A";
export type DecisionClass = "single-option" | "close-options" | "clear-best";
export type PoolStage = "familiarization" | "teaching" | "assessment";

export type CompletedRoundRecord = Readonly<{
  protocolVersion: typeof STUDY_PROTOCOL_VERSION;
  gameVersion: "DF-SYM-0.1";
  rulesId: RuleProfile["id"];
  streamVersion: string;
  poolVersion: string;
  poolCatalogVersion: typeof STUDY_POOL_CATALOG_VERSION;
  solverVersion: string;
  stage: PoolStage;
  seed: string;
  index: number;
  dealerBucket?: DealerBucket;
  decisionClass?: DecisionClass;
  initialCards: readonly Card[];
  dealerUp: Card;
  composition: CompletedRoundDetails["composition"];
  compositionDurationMs: number;
  actions: readonly DecisionRecord[];
  finalHands: Readonly<Record<"luz" | "sombra", Readonly<{ cards: readonly Card[]; exposure: number }>>>;
  settlement: Readonly<Record<"luz" | "sombra", SettledHand>>;
  score: number;
  chosenEv: number;
  bestEv: number;
  regret: number;
}>;
