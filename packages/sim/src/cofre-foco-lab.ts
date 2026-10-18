import {
  CF_CONTROL_COFRE_FREE, CF_CONTROL_FOCUS_READ,
  CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2, CF_LAB_01_BM_3_TO_2,
  type CofreFocoNight, type CofreFocoRules,
  type Card, type HandName, type Partition,
  createNight, beginRound, composeCofreFoco, continueAfterAbilities,
  skipRead, skipManeuver, readDealerHole, maneuver, projectCofreFoco,
  legalCofreFocoActions, applyCofreFocoAction, playCofreFocoDealer,
} from "@nocte/engine/cofre-foco";
import {
  DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2,
  applyAction, compose, createRound, handValue, legalActions, partitions, playDealer, roundScore,
} from "@nocte/engine";
import { BenchmarkRandom, scenario, STREAM_VERSION, type InitialScenario } from "./streams.js";
import { EvSolver, SOLVER_VERSION } from "./solver.js";
import { Moments } from "./statistics.js";

export const COFRE_FOCO_LAB_VERSION = "cofre-foco-named-lanes-v1";
export const COFRE_FOCO_POLICY_VERSION = "resource-policies-explicit-v1";
export const COFRE_FOCO_SCORING_VERSION = "cf-lab-net-match-points-natural-opening-v1";
export type Horizon = 5 | 10 | 20;
export type ResourceAgent = "conserve" | "eager" | "horizon";
export type ResearchProfile = "baseline" | "cofreOnly" | "focusRead" | "combined" | "bm";
export type BudgetMode = "fixed-3" | "proportional-control";

const agents: readonly ResourceAgent[] = ["conserve", "eager", "horizon"];
const profileNames: readonly ResearchProfile[] = ["baseline", "cofreOnly", "focusRead", "combined", "bm"];

type ProfileDefinition = Readonly<{ rulesId: string; rules?: CofreFocoRules; initialFocus: number; label: string }>;
type RunResult = {
  score: number; referenceEv: number; hands: { wins: number; losses: number; pushes: number };
  focusSpent: number; focusRemaining: number; focusExpired: number;
  readUses: number; maneuverUses: number; readsByRound: number[]; maneuversByRound: number[];
  examples: Record<string, unknown>[];
};

const definitions = (payout: "3:2" | "1:1", focusBudget: number): Record<ResearchProfile, ProfileDefinition> => {
  const full = payout === "3:2" ? CF_LAB_01_3_TO_2 : CF_LAB_01_1_TO_1;
  const bm = payout === "3:2" ? CF_LAB_01_BM_3_TO_2 : { ...CF_LAB_01_BM_3_TO_2, id: "DF-CF-0.1-lab-bm-1to1" as const, naturalPayout: "1:1" as const };
  const cofreOnly = payout === "3:2" ? CF_CONTROL_COFRE_FREE : { ...CF_CONTROL_COFRE_FREE, id: "DF-CF-0.1-control-cofre-free-1to1" as const, naturalPayout: "1:1" as const };
  const focusRead = payout === "3:2" ? CF_CONTROL_FOCUS_READ : { ...CF_CONTROL_FOCUS_READ, id: "DF-CF-0.1-control-focus-read-1to1" as const, naturalPayout: "1:1" as const };
  const budgetedFull = { ...full, focusPerNight: focusBudget };
  const budgetedBm = { ...bm, focusPerNight: focusBudget };
  const budgetedFocusRead = { ...focusRead, focusPerNight: focusBudget };
  return {
    baseline: { rulesId: payout === "3:2" ? DF_SYM_01_3_TO_2.id : DF_SYM_01_1_TO_1.id, initialFocus: 0, label: "DF-SYM-0.1" },
    cofreOnly: { rulesId: cofreOnly.id, rules: cofreOnly, initialFocus: 0, label: "free-swap diagnostic control" },
    focusRead: { rulesId: focusRead.id, rules: budgetedFocusRead, initialFocus: focusBudget, label: "Focus + private Read diagnostic control" },
    combined: { rulesId: full.id, rules: budgetedFull, initialFocus: focusBudget, label: "DF-CF-0.1-lab full experimental profile" },
    bm: { rulesId: bm.id, rules: budgetedBm, initialFocus: focusBudget, label: "B-M: Cofre + Focus + Manobra, no Read" },
  };
};

export type CofreFocoAgentSummary = Readonly<{
  score: ReturnType<Moments["summary"]>;
  scorePerRound: number;
  baselineModelEvReference: ReturnType<Moments["summary"]>;
  focusSpent: ReturnType<Moments["summary"]>;
  focusRemaining: ReturnType<Moments["summary"]>;
  focusExpired: ReturnType<Moments["summary"]>;
  readUses: ReturnType<Moments["summary"]>;
  maneuverUses: ReturnType<Moments["summary"]>;
  hands: Readonly<{ wins: number; losses: number; pushes: number }>;
  readsByRound: readonly number[];
  maneuversByRound: readonly number[];
  decisionExamples: readonly Readonly<Record<string, unknown>>[];
}>;
export type CofreFocoComparisonReport = Readonly<{
  schemaVersion: 1;
  labVersion: typeof COFRE_FOCO_LAB_VERSION;
  policyVersion: typeof COFRE_FOCO_POLICY_VERSION;
  scoringVersion: typeof COFRE_FOCO_SCORING_VERSION;
  prngVersion: typeof STREAM_VERSION;
  solverVersion: typeof SOLVER_VERSION;
  seed: string;
  nights: number;
  horizon: Horizon;
  budgetMode: BudgetMode;
  payout: "3:2" | "1:1";
  units: "net match points per Night; 10 points per initial hand exposure";
  protocol: string;
  policies: Readonly<Record<ResourceAgent, string>>;
  profiles: Readonly<Record<ResearchProfile, Readonly<{
    rulesId: string; label: string; initialFocus: number; agents: Readonly<Record<ResourceAgent, CofreFocoAgentSummary>>;
  }>>>;
  comparisonsAgainstBaseline: Readonly<Record<ResourceAgent, Readonly<Record<ResearchProfile, Readonly<{
    scoreDifference: ReturnType<Moments["summary"]>;
    win: number; loss: number; push: number;
  }>>>>>;
  pairwiseProfileComparisons: Readonly<Record<ResourceAgent, Readonly<Record<string, Readonly<{
    scoreDifference: ReturnType<Moments["summary"]>;
    win: number; loss: number; push: number;
  }>>>>>;
  limitations: readonly string[];
}>;

export function runCofreFocoLab(options: { seed: string; nights: number; horizon: Horizon | number; payout: "3:2" | "1:1"; budgetMode?: BudgetMode }): CofreFocoComparisonReport {
  if (!options.seed.trim()) throw new Error("A non-empty seed is required.");
  if (!Number.isSafeInteger(options.nights) || options.nights < 1 || options.nights > 10000) throw new Error("nights must be an integer in [1,10000].");
  if (![5, 10, 20].includes(options.horizon)) throw new Error("horizon must be one of 5, 10 or 20.");
  if (options.payout !== "3:2" && options.payout !== "1:1") throw new Error("payout must be 3:2 or 1:1.");
  const budgetMode = options.budgetMode ?? "fixed-3";
  if (budgetMode !== "fixed-3" && budgetMode !== "proportional-control") throw new Error("Unknown Focus budget mode.");
  const focusBudget = budgetMode === "fixed-3" ? 3 : Math.round(3 * options.horizon / 10);
  const rulesByProfile = definitions(options.payout, focusBudget);
  const profiles = {} as Record<ResearchProfile, { rulesId: string; label: string; initialFocus: number;
    agents: Record<ResourceAgent, CofreFocoAgentSummary> }>;
  const raw = {} as Record<ResearchProfile, Record<ResourceAgent, RunResult[]>>;
  const seed = `${COFRE_FOCO_LAB_VERSION}:${options.seed}`;
  const baseRules = options.payout === "3:2" ? DF_SYM_01_3_TO_2 : DF_SYM_01_1_TO_1;
  const solver = new EvSolver(baseRules);
  for (const profileName of profileNames) {
    const def = rulesByProfile[profileName];
    raw[profileName] = {} as Record<ResourceAgent, RunResult[]>;
    profiles[profileName] = { rulesId: def.rulesId, label: def.label, initialFocus: def.initialFocus,
      agents: {} as Record<ResourceAgent, CofreFocoAgentSummary> };
    for (const agent of agents) {
      const results: RunResult[] = [];
      for (let nightIndex = 0; nightIndex < options.nights; nightIndex++) {
        if (profileName === "baseline" && agent !== "conserve") {
          results.push(raw.baseline.conserve![nightIndex]!);
        } else if (profileName !== "baseline" && agent === "conserve") {
          results.push(asConserveControl(raw.baseline.conserve![nightIndex]!, def.initialFocus, options.horizon as Horizon));
        } else {
          results.push(profileName === "baseline"
            ? runBaselineNight({ seed, nightIndex, horizon: options.horizon as Horizon, payout: options.payout, solver })
            : runExperimentalNight({ seed, nightIndex, horizon: options.horizon as Horizon, agent, rules: def.rules!, solver }));
        }
      }
      raw[profileName][agent] = results;
      profiles[profileName].agents[agent] = summarize(results, options.horizon as Horizon, def.initialFocus);
    }
  }
  const comparisonsAgainstBaseline = {} as Record<ResourceAgent, Record<ResearchProfile, { scoreDifference: ReturnType<Moments["summary"]>; win: number; loss: number; push: number }>>;
  for (const agent of agents) {
    comparisonsAgainstBaseline[agent] = {} as Record<ResearchProfile, { scoreDifference: ReturnType<Moments["summary"]>; win: number; loss: number; push: number }>;
    for (const profileName of profileNames) {
      const differences = new Moments(); let win = 0; let loss = 0; let push = 0;
      for (let i = 0; i < options.nights; i++) {
        const delta = raw[profileName][agent]![i]!.score - raw.baseline[agent]![i]!.score;
        differences.add(delta);
        if (delta > 0) win++; else if (delta < 0) loss++; else push++;
      }
      comparisonsAgainstBaseline[agent][profileName] = { scoreDifference: differences.summary(), win, loss, push };
    }
  }
  const pairwiseProfileComparisons = {} as Record<ResourceAgent, Record<string, { scoreDifference: ReturnType<Moments["summary"]>; win: number; loss: number; push: number }>>;
  for (const agent of agents) {
    pairwiseProfileComparisons[agent] = {};
    for (let a = 0; a < profileNames.length; a++) for (let b = a + 1; b < profileNames.length; b++) {
      const left = profileNames[a]!; const right = profileNames[b]!;
      const key = `${left}-minus-${right}`; const differences = new Moments(); let win = 0; let loss = 0; let push = 0;
      for (let i = 0; i < options.nights; i++) {
        const delta = raw[left][agent]![i]!.score - raw[right][agent]![i]!.score;
        differences.add(delta);
        if (delta > 0) win++; else if (delta < 0) loss++; else push++;
      }
      pairwiseProfileComparisons[agent][key] = { scoreDifference: differences.summary(), win, loss, push };
    }
  }
  return {
    schemaVersion: 1, labVersion: COFRE_FOCO_LAB_VERSION, policyVersion: COFRE_FOCO_POLICY_VERSION,
    scoringVersion: COFRE_FOCO_SCORING_VERSION, prngVersion: STREAM_VERSION, solverVersion: SOLVER_VERSION,
    seed: options.seed, nights: options.nights, horizon: options.horizon as Horizon, budgetMode, payout: options.payout,
    units: "net match points per Night; 10 points per initial hand exposure",
    protocol: "paired deterministic counterfactual scenarios; same four initial cards, dealer up/hole, and hand/dealer lanes for every profile; Cofre has its own lane; not a physical shoe or multiplayer mirror",
    policies: {
      conserve: "EV-optimal composition and P1B action choices; never reads or maneuvers; baseline resource control",
      eager: "EV-optimal composition; reads whenever affordable and maneuvers whenever a public total-distance heuristic strictly improves; uses a transparent hole-aware basic heuristic only after Read",
      horizon: "EV-optimal composition; delays Read to the final round, and maneuvers only in the final round when public total-distance improves; approximate horizon rule, not a dynamic-programming oracle",
    }, profiles, comparisonsAgainstBaseline, pairwiseProfileComparisons,
    limitations: [
      "No exact finite-horizon EV/regret solver for shared Focus has been implemented; comparisons use fixed deterministic resource policies and report paired score differences against DF-SYM, not regret against an oracle.",
      ...(budgetMode === "proportional-control" ? [`Research-only proportional budget uses round(3 * H / 10) = ${focusBudget}; it is not the approved fixed-3 experimental configuration.`] : []),
      "Post-Read action selection uses a simple explicit hole-aware heuristic, not a conditional EV solver; all other hand actions use the existing P1B solver.",
      "Cofre-only and Focus+Read are diagnostic controls. The free-swap control has zero Focus cost; the Focus+Read control still samples an unused reserve lane but hides and disables Cofre, which is distributionally inert only under infinite-rank sampling with replacement.",
      "Common random lanes provide reproducible offline coupling, not finite-shoe equivalence, live mirrored fairness, competitive skill evidence, or human playtest outcomes.",
      "Confidence intervals are marginal normal intervals over paired Night score differences; profiles share scenarios, comparisons are correlated and no multiplicity adjustment is applied.",
    ],
  };
}

function asConserveControl(baseline: RunResult, initialFocus: number, horizon: Horizon): RunResult {
  return { ...baseline, hands: { ...baseline.hands }, focusSpent: 0, focusRemaining: 0, focusExpired: initialFocus,
    readUses: 0, maneuverUses: 0, readsByRound: Array.from({ length: horizon }, () => 0),
    maneuversByRound: Array.from({ length: horizon }, () => 0), examples: [] };
}

function summarize(results: readonly RunResult[], horizon: Horizon, initialFocus: number): CofreFocoAgentSummary {
  const score = new Moments(); const baselineModelEvReference = new Moments();
  const focusSpent = new Moments(); const focusRemaining = new Moments();
  const focusExpired = new Moments(); const readUses = new Moments(); const maneuverUses = new Moments();
  const hands = { wins: 0, losses: 0, pushes: 0 };
  const readsByRound = Array.from({ length: horizon }, () => 0); const maneuversByRound = Array.from({ length: horizon }, () => 0);
  const decisionExamples: Record<string, unknown>[] = [];
  for (const result of results) {
    score.add(result.score); baselineModelEvReference.add(result.referenceEv);
    focusSpent.add(result.focusSpent); focusRemaining.add(result.focusRemaining); focusExpired.add(result.focusExpired);
    readUses.add(result.readUses); maneuverUses.add(result.maneuverUses);
    hands.wins += result.hands.wins; hands.losses += result.hands.losses; hands.pushes += result.hands.pushes;
    for (let i = 0; i < horizon; i++) {
      readsByRound[i] = readsByRound[i]! + result.readsByRound[i]!;
      maneuversByRound[i] = maneuversByRound[i]! + result.maneuversByRound[i]!;
    }
    for (const example of result.examples) if (decisionExamples.length < 8) decisionExamples.push(example);
    if (Math.abs(result.focusSpent + result.focusRemaining + result.focusExpired - initialFocus) > 1e-9) {
      throw new Error("Focus conservation invariant failed in a simulated Night.");
    }
  }
  const summary = score.summary();
  return { score: summary, scorePerRound: summary.mean / horizon,
    baselineModelEvReference: baselineModelEvReference.summary(), focusSpent: focusSpent.summary(),
    focusRemaining: focusRemaining.summary(), focusExpired: focusExpired.summary(), readUses: readUses.summary(),
    maneuverUses: maneuverUses.summary(), hands, readsByRound, maneuversByRound, decisionExamples };
}

function runBaselineNight(args: { seed: string; nightIndex: number; horizon: Horizon; payout: "3:2" | "1:1"; solver: EvSolver }): RunResult {
  const result = blankResult(args.horizon);
  for (let round = 0; round < args.horizon; round++) {
    const scenarioIndex = args.nightIndex * args.horizon + round;
    const initial = scenario(args.seed, scenarioIndex);
    const selection = bestPartition(args.solver, initial);
    result.referenceEv += selection.referenceEv;
    const state = playBaselineRound(args.seed, scenarioIndex, initial, selection.partition, args.solver,
      args.payout === "3:2" ? DF_SYM_01_3_TO_2 : DF_SYM_01_1_TO_1);
    result.score += state.score;
    result.hands.wins += state.hands.wins; result.hands.losses += state.hands.losses; result.hands.pushes += state.hands.pushes;
  }
  return result;
}

function playBaselineRound(seed: string, index: number, initial: InitialScenario, partition: Partition, solver: EvSolver,
  rules: typeof DF_SYM_01_3_TO_2 | typeof DF_SYM_01_1_TO_1) {
  const deal = [...initial.cards, initial.up, initial.hole]; let dealIndex = 0;
  const luz = new BenchmarkRandom(seed, index, "luz"); const sombra = new BenchmarkRandom(seed, index, "sombra");
  const dealerStream = new BenchmarkRandom(seed, index, "dealer");
  let state = compose(createRound(() => deal[dealIndex++]!, rules), partition);
  while (state.phase === "player") {
    const hand = state.currentHand!;
    const action = solver.actions(state.hands![hand].cards, state.dealerUp).best;
    state = applyAction(state, action, hand === "luz" ? () => luz.card() : () => sombra.card());
  }
  if (state.phase === "dealer") state = playDealer(state, () => dealerStream.card());
  return { score: roundScore(state), hands: { wins: Number(state.settlement!.luz.outcome === "win") + Number(state.settlement!.sombra.outcome === "win"),
    losses: Number(state.settlement!.luz.outcome === "loss") + Number(state.settlement!.sombra.outcome === "loss"),
    pushes: Number(state.settlement!.luz.outcome === "push") + Number(state.settlement!.sombra.outcome === "push") } };
}

function runExperimentalNight(args: { seed: string; nightIndex: number; horizon: Horizon; agent: ResourceAgent; rules: CofreFocoRules; solver: EvSolver }): RunResult {
  const result = blankResult(args.horizon); let night = createNight(args.rules, args.horizon);
  for (let roundIndex = 0; roundIndex < args.horizon; roundIndex++) {
    const scenarioIndex = args.nightIndex * args.horizon + roundIndex;
    const initial = scenario(args.seed, scenarioIndex);
    const selection = bestPartition(args.solver, initial);
    result.referenceEv += selection.referenceEv;
    let initialIndex = 0; let dealerIndex = 0;
    const dealer = new BenchmarkRandom(args.seed, scenarioIndex, "dealer");
    const cofre = new BenchmarkRandom(args.seed, scenarioIndex, "cofre");
    const luz = new BenchmarkRandom(args.seed, scenarioIndex, "luz");
    const sombra = new BenchmarkRandom(args.seed, scenarioIndex, "sombra");
    night = beginRound(night, {
      initial: () => initial.cards[initialIndex++]!,
      dealer: () => dealerIndex++ === 0 ? initial.up : dealerIndex === 2 ? initial.hole : dealer.card(),
      cofre: () => cofre.card(),
    });
    night = composeCofreFoco(night, selection.partition);
    const roundNumber = night.roundNumber;
    const before = projectCofreFoco(night, "solo-player");
    if (night.round?.phase === "focusWindow") {
      const read = shouldRead(args.agent, night, args.rules, args.horizon);
      night = read ? readDealerHole(night) : skipRead(night);
      if (read) {
        result.readUses++; result.readsByRound[roundIndex] = result.readsByRound[roundIndex]! + 1;
        if (result.examples.length < 8) result.examples.push({ event: "read", round: roundNumber,
          focusBefore: before.focusRemaining, focusAfter: night.focusRemaining,
          dealerUp: before.round?.dealerUp.rank, dealerHole: projectCofreFoco(night, "solo-player").round?.dealerHole?.rank });
      }
      const swap = shouldManeuver(args.agent, night, args.rules, args.horizon);
      if (swap) {
        const publicState = projectCofreFoco(night, "solo-player");
        night = maneuver(night, swap.hand, swap.cardIndex);
        result.maneuverUses++; result.maneuversByRound[roundIndex] = result.maneuversByRound[roundIndex]! + 1;
        if (result.examples.length < 8) result.examples.push({ event: "maneuver", round: roundNumber,
          hand: swap.hand, cardIndex: swap.cardIndex, focusBefore: publicState.focusRemaining,
          focusAfter: night.focusRemaining, cofre: publicState.round?.cofre?.rank });
      } else night = skipManeuver(night);
      if (night.round?.phase === "focusWindow") night = continueAfterAbilities(night);
    }
    while (night.round?.phase === "player") {
      const handName = night.round.currentHand!;
      const action = chooseExperimentalAction(night, handName, args.solver);
      const draw = handName === "luz" ? () => luz.card() : () => sombra.card();
      night = applyCofreFocoAction(night, action, draw);
    }
    if (night.round?.phase === "dealer") night = playCofreFocoDealer(night, () => dealer.card());
    const settled = night.round?.settlement;
    if (!settled || night.round?.phase !== "complete") throw new Error("Experimental round did not settle.");
    result.score += night.round.score ?? 0; addOutcomes(result.hands, settled);
  }
  result.focusSpent = night.focusSpent.read + night.focusSpent.maneuver;
  result.focusRemaining = night.focusRemaining;
  result.focusExpired = night.expiredFocus;
  return result;
}

function bestPartition(solver: EvSolver, initial: InitialScenario): { partition: Partition; referenceEv: number } {
  const inspection = solver.inspect(initial.cards, initial.up);
  const best = inspection.partitions[inspection.bestIndex]!;
  return { partition: best.partition, referenceEv: best.ev * solver.rules.initialExposure };
}

function shouldRead(agent: ResourceAgent, night: CofreFocoNight, rules: CofreFocoRules, horizon: Horizon): boolean {
  if (!rules.readEnabled || night.focusRemaining < rules.readCost || !night.round?.focusWindowOpened) return false;
  if (agent === "conserve") return false;
  return agent === "eager" || night.roundNumber === horizon;
}

function shouldManeuver(agent: ResourceAgent, night: CofreFocoNight, rules: CofreFocoRules, horizon: Horizon): { hand: HandName; cardIndex: number } | undefined {
  if (!rules.hasCofre || !rules.maneuverEnabled || night.focusRemaining < rules.maneuverCost || !night.round?.hands) return undefined;
  if (agent === "conserve" || (agent === "horizon" && night.roundNumber !== horizon)) return undefined;
  const view = projectCofreFoco(night, "solo-player");
  const reserve = view.round?.cofre;
  if (!reserve) return undefined;
  let best: { hand: HandName; cardIndex: number; improvement: number } | undefined;
  for (const hand of ["luz", "sombra"] as const) {
    const current = night.round.hands[hand];
    if (current.status !== "playing" || current.openingNatural || current.cards.length !== 2) continue;
    const currentValue = handValue(current.cards);
    for (let cardIndex = 0; cardIndex < 2; cardIndex++) {
      const nextCards = [...current.cards]; nextCards[cardIndex] = reserve;
      const nextValue = handValue(nextCards);
      if (nextValue.bust) continue;
      const target = night.round.dealerUp.rank === "2" || ["3", "4", "5", "6"].includes(night.round.dealerUp.rank) ? 18 : 19;
      const improvement = Math.abs(currentValue.total - target) - Math.abs(nextValue.total - target);
      if (improvement > (best?.improvement ?? 0)) best = { hand, cardIndex, improvement };
    }
  }
  return best;
}

function chooseExperimentalAction(night: CofreFocoNight, hand: HandName, solver: EvSolver) {
  const legal = legalCofreFocoActions(night, hand);
  if (legal.length === 0) throw new Error("Active experimental hand has no legal action.");
  const round = night.round!; const state = round.hands![hand];
  if (!round.readUsed) return solver.actions(state.cards, round.dealerUp).best;
  // Approximation used only after a paid Read; it consumes the revealed hole and no future draws.
  const dealerNow = handValue([round.dealerUp, round.dealerHole]).total;
  const total = handValue(state.cards).total;
  if (legal.includes("double") && total >= 9 && total <= 11 && dealerNow <= 16) return "double" as const;
  if (total >= 17) return "stand" as const;
  if (total <= 11) return "hit" as const;
  if (total >= 13 && dealerNow >= 15) return "stand" as const;
  return "hit" as const;
}

function blankResult(horizon: Horizon): RunResult {
  return { score: 0, referenceEv: 0, hands: { wins: 0, losses: 0, pushes: 0 }, focusSpent: 0, focusRemaining: 0, focusExpired: 0,
    readUses: 0, maneuverUses: 0, readsByRound: Array.from({ length: horizon }, () => 0),
    maneuversByRound: Array.from({ length: horizon }, () => 0), examples: [] };
}
function addOutcomes(target: RunResult["hands"], source: Readonly<Record<HandName, { outcome: "win" | "loss" | "push" }>>) {
  for (const name of ["luz", "sombra"] as const) target[source[name].outcome === "win" ? "wins" : source[name].outcome === "loss" ? "losses" : "pushes"]++;
}
