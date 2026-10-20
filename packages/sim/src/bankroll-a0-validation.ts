import type { Action, Card, HandName } from "@nocte/engine";
import { DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2 } from "@nocte/engine";
import {
  CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2, applyCofreFocoAction, beginRound, composeCofreFoco,
  continueAfterAbilities, createNight, maneuver, playCofreFocoDealer, readDealerHole, skipManeuver,
  skipRead, type CofreFocoNight, type CofreFocoRules,
} from "@nocte/engine/cofre-foco";
import { ConditionalRoundSolver, type ConditionalDecision, type Swap } from "./conditional-solver.js";
import { fitFocusValues } from "./conditional-lab.js";
import { BenchmarkRandom, scenario, STREAM_VERSION } from "./streams.js";
import { EvSolver } from "./solver.js";
import { Moments } from "./statistics.js";

export const BANKROLL_A0_VALIDATION_VERSION = "a0.1-paired-bankroll-sensitivity-v1";
export const A0_VALIDATION_BALANCES = [60, 100, 150, 200] as const;
export const A0_VALIDATION_COVERAGE = 40;
export type A0Policy = "conserve" | "myopic" | "intertemporal";
type Horizon = 5 | 10 | 20;
type Payout = "3:2" | "1:1";

export function wilsonInterval(successes: number, trials: number): readonly [number, number] | null {
  if (!Number.isSafeInteger(successes) || !Number.isSafeInteger(trials) || trials < 0 || successes < 0 || successes > trials) {
    throw new Error("Wilson interval requires integer counts with 0 <= successes <= trials.");
  }
  if (trials === 0) return null;
  const z = 1.96; const p = successes / trials; const z2 = z * z;
  const denominator = 1 + z2 / trials;
  const center = (p + z2 / (2 * trials)) / denominator;
  const half = z * Math.sqrt(p * (1 - p) / trials + z2 / (4 * trials * trials)) / denominator;
  return [Math.max(0, center - half), Math.min(1, center + half)];
}

function quantile(values: readonly number[], q: number): number {
  if (!values.length) throw new Error("Cannot calculate a quantile from an empty sample.");
  const sorted = [...values].sort((a, b) => a - b);
  const position = (sorted.length - 1) * q; const low = Math.floor(position); const fraction = position - low;
  return sorted[low]! + (sorted[Math.min(low + 1, sorted.length - 1)]! - sorted[low]!) * fraction;
}

function summary(values: readonly number[]) {
  const moments = new Moments(); for (const value of values) moments.add(value);
  return { ...moments.summary(), quantiles: { p05: quantile(values, 0.05), p25: quantile(values, 0.25), p50: quantile(values, 0.5), p75: quantile(values, 0.75), p95: quantile(values, 0.95) } };
}

export type BankrollA0ValidationReport = Readonly<{
  schemaVersion: 1;
  labVersion: typeof BANKROLL_A0_VALIDATION_VERSION;
  streamVersion: typeof STREAM_VERSION;
  seed: string;
  nights: number;
  horizon: Horizon;
  payout: Payout;
  startingBalances: typeof A0_VALIDATION_BALANCES;
  rules: Readonly<{ exposurePerHand: 10; coverage: 40; fundedWhenBalanceAtLeast: 40; practiceIsIrreversible: true }>;
  protocol: string;
  policies: Readonly<Record<A0Policy, Readonly<{
    definition: string;
    score: ReturnType<Moments["summary"]>;
      focusSpent: ReturnType<Moments["summary"]>;
      focusExpired: ReturnType<Moments["summary"]>;
    balances: readonly Readonly<{
      startingBalance: number;
      practiceProbability: Readonly<{ n: number; events: number; estimate: number; confidence95: readonly [number, number] | null }>;
      fundedRounds: ReturnType<Moments["summary"]>;
      practiceRounds: ReturnType<Moments["summary"]>;
      fundedFractionOfNight: ReturnType<Moments["summary"]>;
      finalBankroll: ReturnType<typeof summary>;
      bankDelta: ReturnType<Moments["summary"]>;
      zeroBalanceProbability: Readonly<{ n: number; events: number; estimate: number; confidence95: readonly [number, number] | null }>;
    }>[];
  }>>>;
  pairedPolicyScoreDifferences: Readonly<Record<"myopic-minus-conserve" | "intertemporal-minus-conserve" | "intertemporal-minus-myopic", Readonly<{
    scoreDifference: ReturnType<Moments["summary"]>; win: number; loss: number; tie: number;
  }>>>;
  pairedNoBankCheck: Readonly<{ scoreMeanDifference: number; scoreVarianceDifference: number; note: string }>;
  limitations: readonly string[];
}>;

export function runBankrollA0Validation(options: { seed: string; nights: number; horizon: Horizon | number; payout: Payout; trainingScenarios?: number }): BankrollA0ValidationReport {
  if (!options.seed.trim()) throw new Error("A non-empty reproducibility seed is required.");
  if (!Number.isSafeInteger(options.nights) || options.nights < 1 || options.nights > 10000) throw new Error("nights must be an integer in [1,10000].");
  if (![5, 10, 20].includes(options.horizon)) throw new Error("horizon must be 5, 10 or 20.");
  if (options.payout !== "3:2" && options.payout !== "1:1") throw new Error("payout must be 3:2 or 1:1.");
  const trainingScenarios = options.trainingScenarios ?? 512;
  if (!Number.isSafeInteger(trainingScenarios) || trainingScenarios < 1 || trainingScenarios > 10000) throw new Error("trainingScenarios must be an integer in [1,10000].");

  const horizon = options.horizon as Horizon; const payout = options.payout;
  const rules = payout === "3:2" ? CF_LAB_01_3_TO_2 : CF_LAB_01_1_TO_1;
  const baselineRules = payout === "3:2" ? DF_SYM_01_3_TO_2 : DF_SYM_01_1_TO_1;
  const conditional = new ConditionalRoundSolver(rules, baselineRules); const baseline = new EvSolver(baselineRules);
  const training = fitFocusValues({ seed: `NOCTE-P4-A0-V:train:${options.seed}`, maxHorizon: horizon, scenariosPerStage: trainingScenarios, payout });
  const evaluationSeed = `NOCTE-P4-A0-V:${options.seed}`;
  const nightScores = Object.fromEntries(( ["conserve", "myopic", "intertemporal"] as const).map(policy => [policy, [] as number[]])) as Record<A0Policy, number[]>;
  const nightFocusSpent = Object.fromEntries(( ["conserve", "myopic", "intertemporal"] as const).map(policy => [policy, [] as number[]])) as Record<A0Policy, number[]>;
  const nightFocusExpired = Object.fromEntries(( ["conserve", "myopic", "intertemporal"] as const).map(policy => [policy, [] as number[]])) as Record<A0Policy, number[]>;
  const ledgerPaths = Object.fromEntries(( ["conserve", "myopic", "intertemporal"] as const).map(policy => [policy, Object.fromEntries(A0_VALIDATION_BALANCES.map(balance => [balance, [] as { funded: number; practice: number; bank: number }[]]))])) as Record<A0Policy, Record<number, { funded: number; practice: number; bank: number }[]>>;

  for (let night = 0; night < options.nights; night++) {
    for (const policy of ["conserve", "myopic", "intertemporal"] as const) {
      let score = 0; let engineNight = createNight(rules, horizon);
      const roundScores: number[] = [];
      for (let round = 0; round < horizon; round++) {
        const index = night * horizon + round; const initial = scenario(evaluationSeed, index);
        const cofre = new BenchmarkRandom(evaluationSeed, index, "cofre").card();
        const solverFocus = policy === "conserve" ? 0 : engineNight.focusRemaining;
        const future = policy === "intertemporal" ? training.values[horizon - round - 1]! : Array.from({ length: rules.focusPerNight + 1 }, () => 0);
        const decision = conditional.evaluate({ visibleState: { cards: initial.cards, dealerUp: initial.up, cofre },
          beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: horizon - round, focus: solverFocus, futureValues: future });
        engineNight = playCofreFocoRound(engineNight, initial, cofre, decision, rules, evaluationSeed, index, conditional, baseline);
        const roundScore = engineNight.round?.score;
        if (roundScore === undefined) throw new Error("The engine did not complete a simulated A0 round.");
        score += roundScore; roundScores.push(roundScore);
      }
      nightScores[policy].push(score);
      nightFocusSpent[policy].push(rules.focusPerNight - engineNight.expiredFocus);
      nightFocusExpired[policy].push(engineNight.expiredFocus);
      for (const balance of A0_VALIDATION_BALANCES) ledgerPaths[policy][balance]!.push(settleBankrollPath(balance, roundScores));
    }
  }

  const definitions: Record<A0Policy, string> = {
    conserve: "DF-CF engine and P1B conditional actions; no Read or Manobra; Foco expires. Composition uses the public four-card P1B solver.",
    myopic: "P2B-F exact current-round solver with zero continuation values; spends only when its current-round conditional EV recommends it.",
    intertemporal: `P2B-F exact current-round solver with sample-average finite-horizon Focus values trained on ${trainingScenarios} independent scenarios per stage.`,
  };
  const policies = {} as Record<A0Policy, BankrollA0ValidationReport["policies"][A0Policy]>;
  for (const policy of ["conserve", "myopic", "intertemporal"] as const) {
    const balances = A0_VALIDATION_BALANCES.map(startingBalance => {
      const paths = ledgerPaths[policy][startingBalance]!; const practiceEvents = paths.filter(path => path.practice > 0).length;
      const zeroEvents = paths.filter(path => path.bank === 0).length;
      return {
        startingBalance,
        practiceProbability: { n: options.nights, events: practiceEvents, estimate: practiceEvents / options.nights, confidence95: wilsonInterval(practiceEvents, options.nights) },
        fundedRounds: summary(paths.map(path => path.funded)), practiceRounds: summary(paths.map(path => path.practice)),
        fundedFractionOfNight: summary(paths.map(path => path.funded / horizon)),
        finalBankroll: summary(paths.map(path => path.bank)), bankDelta: summary(paths.map(path => path.bank - startingBalance)),
        zeroBalanceProbability: { n: options.nights, events: zeroEvents, estimate: zeroEvents / options.nights, confidence95: wilsonInterval(zeroEvents, options.nights) },
      };
    });
    policies[policy] = { definition: definitions[policy], score: summarizeSimple(nightScores[policy]),
      focusSpent: summarizeSimple(nightFocusSpent[policy]), focusExpired: summarizeSimple(nightFocusExpired[policy]), balances };
  }
  const pairedPolicyScoreDifferences = {} as Record<"myopic-minus-conserve" | "intertemporal-minus-conserve" | "intertemporal-minus-myopic", { scoreDifference: ReturnType<Moments["summary"]>; win: number; loss: number; tie: number }>;
  for (const [left, right, key] of [["myopic", "conserve", "myopic-minus-conserve"], ["intertemporal", "conserve", "intertemporal-minus-conserve"], ["intertemporal", "myopic", "intertemporal-minus-myopic"]] as const) {
    const differences = nightScores[left].map((score, index) => score - nightScores[right][index]!); let win = 0; let loss = 0; let tie = 0;
    for (const difference of differences) { if (difference > 0) win++; else if (difference < 0) loss++; else tie++; }
    pairedPolicyScoreDifferences[key] = { scoreDifference: summarizeSimple(differences), win, loss, tie };
  }
  const scoreValues = nightScores.conserve;
  return {
    schemaVersion: 1, labVersion: BANKROLL_A0_VALIDATION_VERSION, streamVersion: STREAM_VERSION,
    seed: options.seed, nights: options.nights, horizon, payout, startingBalances: A0_VALIDATION_BALANCES,
    rules: { exposurePerHand: 10, coverage: A0_VALIDATION_COVERAGE, fundedWhenBalanceAtLeast: A0_VALIDATION_COVERAGE, practiceIsIrreversible: true },
    protocol: "One deterministic engine trajectory is generated per policy/Night, then replayed through every starting-balance ledger; bank balance never enters policy decisions. Engine scores, match_points and Focus therefore match the no-bank CF control exactly for the same policy/actions. Common named streams pair policy comparisons; this is not a finite shoe.",
    policies,
    pairedPolicyScoreDifferences,
    pairedNoBankCheck: { scoreMeanDifference: 0, scoreVarianceDifference: 0, note: `A0 is an accounting overlay; no-bank score mean ${summarizeSimple(scoreValues).mean.toFixed(6)} points/Night and variance ${summarizeSimple(scoreValues).variance?.toFixed(6) ?? "undefined"} are identical by construction for each policy.` },
    limitations: [
      "The A0 ledger is applied after engine trajectory generation; it cannot affect actions, match_points, Focus or random streams. This estimates threshold exposure conditional on each named policy, not a behavioral response to having a bank.",
      "Conserve and myopic are deterministic model policies, not human strategies. Intertemporal continuation values use finite sample-average Bellman training and are approximate; within-round decisions use the exact P2B-F model.",
      "Infinite ranks with replacement, S17, the selected experimental natural payout and versioned engine rules; no finite shoe, multiplayer mirror, server authority, human data, learning, enjoyment or retention inference.",
      "Wilson 95% intervals cover practice/depletion proportions; normal 95% intervals from sample means cover score, funded/practice counts and bankroll EV. Bank quantiles are empirical, without bootstrap intervals. Intervals are marginal, not multiplicity-adjusted.",
      "Starting balances 60/100/200 and horizon 5/20 are sensitivities only; they are not approved UI rules. A0.1 approved display remains 150 and 10 rounds. Payout 1:1 is a sensitivity profile, not a rule change.",
    ],
  };
}

function summarizeSimple(values: readonly number[]): ReturnType<Moments["summary"]> {
  const moments = new Moments(); for (const value of values) moments.add(value); return moments.summary();
}

function settleBankrollPath(start: number, scores: readonly number[]) {
  let bank = start; let practice = false; let funded = 0; let practiceRounds = 0;
  for (const score of scores) {
    const roundKind = !practice && bank >= A0_VALIDATION_COVERAGE ? "funded" : "practice";
    if (roundKind === "funded") { funded++; bank += score; if (bank < 0) throw new Error("A0.1 coverage invariant failed: a funded settlement created a negative balance."); }
    else { practice = true; practiceRounds++; }
    if (bank < A0_VALIDATION_COVERAGE) practice = true;
  }
  return { funded, practice: practiceRounds, bank };
}

function playCofreFocoRound(startNight: CofreFocoNight, initial: ReturnType<typeof scenario>, cofre: Card, decision: ConditionalDecision,
  rules: CofreFocoRules, seed: string, index: number, solver: ConditionalRoundSolver, baseline: EvSolver): CofreFocoNight {
  const initialCards = [...initial.cards]; let initialCursor = 0; let dealerCursor = 0;
  const dealer = new BenchmarkRandom(seed, index, "dealer"); const luz = new BenchmarkRandom(seed, index, "luz"); const sombra = new BenchmarkRandom(seed, index, "sombra");
  let night = beginRound(startNight, { initial: () => initialCards[initialCursor++]!, dealer: () => dealerCursor++ === 0 ? initial.up : dealerCursor === 2 ? initial.hole : dealer.card(), cofre: () => cofre });
  night = composeCofreFoco(night, decision.partition);
  if (night.round?.phase === "focusWindow") {
    let swap: Swap | undefined = decision.swap;
    if (decision.ability === "read" || decision.ability === "read+maneuver") {
      night = readDealerHole(night);
      if (decision.ability === "read+maneuver") swap = decision.postReadManeuverByHole?.[initial.hole.rank] ?? undefined;
    } else night = skipRead(night);
    if (swap && night.focusRemaining >= rules.maneuverCost) night = maneuver(night, swap.hand, swap.cardIndex);
    else night = skipManeuver(night);
    if (night.round?.phase === "focusWindow") night = continueAfterAbilities(night);
  }
  while (night.round?.phase === "player") {
    const handName = night.round.currentHand!; const hand = night.round.hands![handName];
    const action: Action = policyAction(policySource(decision, handName, hand.cards, night.round.dealerUp, night.round.readUsed ? initial.hole : undefined, hand.maneuverTwentyOne, solver, baseline), decision);
    night = applyCofreFocoAction(night, action, handName === "luz" ? () => luz.card() : () => sombra.card());
  }
  if (night.round?.phase === "dealer") night = playCofreFocoDealer(night, () => dealer.card());
  if (night.round?.score === undefined || night.round.phase !== "complete") throw new Error("The engine did not complete a simulated A0 round.");
  return night;
}

// Conserving uses the P1B public action choice. Resource policies use the P2B-F conditional solver.
function policySource(decision: ConditionalDecision, hand: HandName, cards: readonly Card[], up: Card, hole: Card | undefined,
  ordinaryTwentyOne: boolean, solver: ConditionalRoundSolver, baseline: EvSolver) {
  return decision.focusBudget === 0 ? baseline.actions(cards, up).best : solver.bestAction(cards, up, hole, ordinaryTwentyOne);
}
function policyAction(action: Action, _decision: ConditionalDecision): Action { return action; }
