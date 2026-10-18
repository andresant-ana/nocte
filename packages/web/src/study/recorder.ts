import type { RuleProfile } from "@nocte/engine";
import type { CompletedRoundDetails } from "../game/controller";
import type { CompletedRoundRecord, PoolStage } from "./protocol";
import type { PlaytestScenario } from "./pools";

export async function buildCompletedRoundRecord(
  details: CompletedRoundDetails,
  scenario: PlaytestScenario,
  stage: PoolStage,
  rules: RuleProfile,
): Promise<CompletedRoundRecord> {
  if (details.result.phase !== "complete" || !details.result.settlement || !details.result.hands) {
    throw new Error("Só é possível registrar uma rodada concluída.");
  }
  const hands = details.result.hands;
  const settlement = details.result.settlement;
  if (details.seed !== scenario.seed || details.index !== scenario.index || details.rulesId !== rules.id) {
    throw new Error("Os metadados da rodada não correspondem ao cenário selecionado.");
  }

  // This module is browser-safe; solver evaluation is intentionally loaded only after settlement.
  const { EvSolver, SOLVER_VERSION } = await import("@nocte/sim/solver");
  const inspection = new EvSolver(rules).inspect(details.initialCards, details.dealerUp);
  const chosen = inspection.partitions.find(({ partition }) =>
    partition.luz[0] === details.composition.luz[0]
    && partition.luz[1] === details.composition.luz[1]
    && partition.sombra[0] === details.composition.sombra[0]
    && partition.sombra[1] === details.composition.sombra[1]
  );
  if (!chosen) throw new Error("A composição registrada não pertence às opções do solver.");

  const exposure = rules.initialExposure;
  const result = details.result;
  return {
    protocolVersion: "P2A-study-v1",
    gameVersion: result.gameVersion,
    rulesId: rules.id,
    streamVersion: "sha256-counter-rejection-v1",
    poolVersion: "p2a-pools-v1",
    poolCatalogVersion: "p2a-pool-catalog-v1",
    solverVersion: SOLVER_VERSION,
    stage,
    seed: details.seed,
    index: details.index,
    ...(scenario.dealerBucket ? { dealerBucket: scenario.dealerBucket } : {}),
    ...(scenario.decisionClass ? { decisionClass: scenario.decisionClass } : {}),
    initialCards: structuredClone(details.initialCards),
    dealerUp: structuredClone(details.dealerUp),
    composition: structuredClone(details.composition),
    compositionDurationMs: details.compositionDurationMs,
    actions: structuredClone(details.actions),
    finalHands: {
      luz: { cards: structuredClone(hands.luz.cards), exposure: hands.luz.exposure },
      sombra: { cards: structuredClone(hands.sombra.cards), exposure: hands.sombra.exposure },
    },
    settlement: structuredClone(settlement),
    score: details.score,
    chosenEv: chosen.ev * exposure,
    bestEv: inspection.bestEv * exposure,
    regret: Math.max(0, inspection.bestEv - chosen.ev) * exposure,
  };
}
