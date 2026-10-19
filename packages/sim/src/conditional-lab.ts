import {
  CF_LAB_01_3_TO_2, CF_LAB_01_1_TO_1, type CofreFocoNight, type CofreFocoRules,
  type Card, type HandName, type Partition, type Rank,
  createNight, beginRound, composeCofreFoco, continueAfterAbilities, skipRead, skipManeuver,
  readDealerHole, maneuver, legalCofreFocoActions, applyCofreFocoAction, playCofreFocoDealer,
} from "@nocte/engine/cofre-foco";
import {
  DF_SYM_01_3_TO_2, DF_SYM_01_1_TO_1, applyAction, compose, createRound,
  handValue, playDealer, roundScore,
} from "@nocte/engine";
import { BenchmarkRandom, scenario, STREAM_VERSION } from "./streams.js";
import { EvSolver } from "./solver.js";
import { COFRE_FOCO_LAB_VERSION, runCofreFocoLab, type ResourceAgent } from "./cofre-foco-lab.js";
import { ConditionalRoundSolver, CONDITIONAL_SOLVER_VERSION, type ConditionalDecision, type FutureFocusValues } from "./conditional-solver.js";
import { Moments } from "./statistics.js";

export const CONDITIONAL_LAB_VERSION = "conditional-focus-sample-average-dp-v1";
export type ConditionalPolicyName = "baseline" | "conserve" | "immediate" | "intertemporal";
type PolicyAggregate = { realized: Moments; expected: Moments; pointsVsBaseline: Moments; expectedVsBaseline: Moments;
  focusSpent: Moments; focusExpired: Moments; readUses: Moments; maneuverUses: Moments };
export type ConditionalLabReport = Readonly<{
  schemaVersion: 1;
  labVersion: typeof CONDITIONAL_LAB_VERSION;
  solverVersion: typeof CONDITIONAL_SOLVER_VERSION;
  prngVersion: typeof STREAM_VERSION;
  seed: string;
  trainingSeed: string;
  evaluationSeed: string;
  trainingScenariosPerStage: number;
  evaluationNights: number;
  horizon: 5 | 10 | 20;
  payout: "3:2" | "1:1";
  rulesId: string;
  initialFocus: number;
  unit: "net match points";
  training: Readonly<{ method: string; valueByRoundsAndFocus: readonly (readonly number[])[];
    stageSamplingUncertaintyByRoundsAndFocus: readonly (readonly ReturnType<Moments["summary"]>[])[] }>;
  policies: Readonly<Record<ConditionalPolicyName, Readonly<{
    realizedPointsPerNight: ReturnType<Moments["summary"]>;
    exactConditionalExpectedPointsPerNight: ReturnType<Moments["summary"]>;
    pairedRealizedDifferenceVsBaseline: ReturnType<Moments["summary"]>;
    pairedExpectedDifferenceVsBaseline: ReturnType<Moments["summary"]>;
    focusSpent: ReturnType<Moments["summary"]>;
    focusExpired: ReturnType<Moments["summary"]>;
    readUses: ReturnType<Moments["summary"]>;
    maneuverUses: ReturnType<Moments["summary"]>;
  }>>>;
  intertemporalOpportunityDiagnostics: Readonly<{
    readEligibleStates: number; readPositiveEstimatedValueStates: number; readSelectedStates: number;
    readEstimatedMarginalValueInExposureUnits: ReturnType<Moments["summary"]>;
    maneuverEligibleStates: number; maneuverPositiveEstimatedValueStates: number; maneuverSelectedStates: number;
    maneuverEstimatedMarginalValueInExposureUnits: ReturnType<Moments["summary"]>;
  }>;
  perfectHoleInformationUpperBound: Readonly<{
    expectedPointsPerNight: ReturnType<Moments["summary"]>;
    pairedGapOverIntertemporalCurrentRoundEV: ReturnType<Moments["summary"]>;
    provenance: "exact-one-round-hole-information-upper-bound-not-player-policy";
  }>;
  inheritedP2BEPolicies: Readonly<Record<ResourceAgent, Readonly<{
    realizedPointsPerNight: number;
    pairedDifferenceVsBaseline: ReturnType<Moments["summary"]>;
    policyDefinition: string;
  }>>>;
  requiredCases?: Readonly<{
    cofreChangesComposition: Readonly<Record<string, unknown>>;
    positiveReadValue: Readonly<Record<string, unknown>>;
    savingFocusBeatsSpendingNow: Readonly<Record<string, unknown>>;
    searchScenarios: number;
  }>;
  pairedComparisons: Readonly<Record<string, ReturnType<Moments["summary"]>>>;
  optionValueProperty: string;
  limitations: readonly string[];
}>;

const policyNames: readonly ConditionalPolicyName[] = ["baseline", "conserve", "immediate", "intertemporal"];
const profile = (payout: "3:2" | "1:1"): { experimental: CofreFocoRules; baseline: typeof DF_SYM_01_3_TO_2 | typeof DF_SYM_01_1_TO_1 } => ({
  experimental: payout === "3:2" ? CF_LAB_01_3_TO_2 : CF_LAB_01_1_TO_1,
  baseline: payout === "3:2" ? DF_SYM_01_3_TO_2 : DF_SYM_01_1_TO_1,
});

export type FocusValueFit = Readonly<{ values: readonly (readonly number[])[];
  stageSamplingUncertaintyByRoundsAndFocus: readonly (readonly ReturnType<Moments["summary"]>[])[] }>;

/** Sample-average Bellman fit. Current-round action values are exact; expectation over public deal states is sampled. */
export function fitFocusValues(options: { seed: string; maxHorizon?: number; scenariosPerStage?: number; payout?: "3:2" | "1:1" }): FocusValueFit {
  const maxHorizon = options.maxHorizon ?? 20; const n = options.scenariosPerStage ?? 128; const payout = options.payout ?? "3:2";
  if (!Number.isSafeInteger(maxHorizon) || maxHorizon < 1 || maxHorizon > 20) throw new Error("maxHorizon must be an integer in [1,20].");
  if (!Number.isSafeInteger(n) || n < 1 || n > 10000) throw new Error("scenariosPerStage must be an integer in [1,10000].");
  const { experimental, baseline } = profile(payout); const solver = new ConditionalRoundSolver(experimental, baseline);
  const values: number[][] = [Array.from({ length: experimental.focusPerNight + 1 }, () => 0)];
  const uncertainty: ReturnType<Moments["summary"]>[][] = [Array.from({ length: experimental.focusPerNight + 1 }, () => new Moments().summary())];
  for (let rounds = 1; rounds <= maxHorizon; rounds++) {
    const accumulators = Array.from({ length: experimental.focusPerNight + 1 }, () => new Moments());
    for (let sample = 0; sample < n; sample++) {
      const state = scenario(`${CONDITIONAL_LAB_VERSION}:train:${options.seed}:${payout}:rounds-${rounds}`, sample + 1);
      const cofre = new BenchmarkRandom(`${CONDITIONAL_LAB_VERSION}:train:${options.seed}`, rounds * n + sample, "cofre").card();
      for (let focus = 0; focus <= experimental.focusPerNight; focus++) {
        accumulators[focus]!.add(solver.evaluate({ visibleState: { cards: state.cards, dealerUp: state.up, cofre },
          beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: rounds, focus, futureValues: values[rounds - 1]! }).ev);
      }
    }
    const summaries = accumulators.map(accumulator => accumulator.summary());
    values.push(summaries.map(summary => summary.mean)); uncertainty.push(summaries);
  }
  return { values: values.map(row => Object.freeze([...row])),
    stageSamplingUncertaintyByRoundsAndFocus: uncertainty.map(row => Object.freeze([...row])) };
}

export function trainFocusValues(options: { seed: string; maxHorizon?: number; scenariosPerStage?: number; payout?: "3:2" | "1:1" }): readonly (readonly number[])[] {
  return fitFocusValues(options).values;
}

export function runConditionalLab(options: { seed: string; nights: number; horizon: 5 | 10 | 20; payout: "3:2" | "1:1"; trainingScenarios?: number; caseStudySearch?: boolean }): ConditionalLabReport {
  if (!options.seed.trim()) throw new Error("A non-empty reproducibility seed is required.");
  if (!Number.isSafeInteger(options.nights) || options.nights < 1 || options.nights > 10000) throw new Error("nights must be an integer in [1,10000].");
  if (![5, 10, 20].includes(options.horizon)) throw new Error("horizon must be 5, 10 or 20.");
  const trainingScenarios = options.trainingScenarios ?? 256;
  if (!Number.isSafeInteger(trainingScenarios) || trainingScenarios < 1 || trainingScenarios > 10000) throw new Error("trainingScenarios must be in [1,10000].");
  const { experimental, baseline } = profile(options.payout);
  const trainingSeed = `NOCTE-P2B-F:train:${options.seed}`;
  // Match P2B-E's named-lane seed so inherited policies and this report use the same deal/action scenarios.
  const evaluationSeed = `${COFRE_FOCO_LAB_VERSION}:${options.seed}`;
  const fit = fitFocusValues({ seed: trainingSeed, maxHorizon: options.horizon, scenariosPerStage: trainingScenarios, payout: options.payout });
  const values = fit.values;
  const inherited = runCofreFocoLab({ seed: options.seed, nights: options.nights, horizon: options.horizon, payout: options.payout, budgetMode: "fixed-3" });
  const conditional = new ConditionalRoundSolver(experimental, baseline); const basic = new EvSolver(baseline);
  const requiredCases: { cofreChangesComposition?: Record<string, unknown>; positiveReadValue?: Record<string, unknown>; savingFocusBeatsSpendingNow?: Record<string, unknown> } = {};
  const results = Object.fromEntries(policyNames.map(name => [name, newAggregate()])) as Record<ConditionalPolicyName, PolicyAggregate>;
  const policyPairings = new Map<string, Moments>();
  const readMarginal = new Moments(); const maneuverMarginal = new Moments();
  const oracleExpected = new Moments(); const oracleGap = new Moments();
  let readEligibleStates = 0; let readPositiveEstimatedValueStates = 0; let readSelectedStates = 0;
  let maneuverEligibleStates = 0; let maneuverPositiveEstimatedValueStates = 0; let maneuverSelectedStates = 0;
  for (const key of ["intertemporal-minus-immediate-realized", "intertemporal-minus-conserve-realized", "intertemporal-minus-immediate-expected", "intertemporal-minus-conserve-expected"]) policyPairings.set(key, new Moments());
  for (let nightIndex = 0; nightIndex < options.nights; nightIndex++) {
    const nightScores = {} as Record<ConditionalPolicyName, number>;
    const nightExpected = {} as Record<ConditionalPolicyName, number>;
    let oracleExpectedNight = 0;
    for (const name of policyNames) { nightScores[name] = 0; nightExpected[name] = 0; }
    const focusSpent = { conserve: 0, immediate: 0, intertemporal: 0 };
    const readUses = { conserve: 0, immediate: 0, intertemporal: 0 };
    const maneuverUses = { conserve: 0, immediate: 0, intertemporal: 0 };
    for (let round = 0; round < options.horizon; round++) {
      const index = nightIndex * options.horizon + round;
      const state = scenario(evaluationSeed, index);
      const cofre = new BenchmarkRandom(evaluationSeed, index, "cofre").card();
      const baselineChoice = basic.inspect(state.cards, state.up);
      const baselinePartition = baselineChoice.partitions[baselineChoice.bestIndex]!.partition;
      const baselineExpected = baselineChoice.bestEv * baseline.initialExposure;
      nightExpected.baseline += baselineExpected;
      nightScores.baseline += playBaseline(state, baselinePartition, baseline, evaluationSeed, index);
      for (const name of ["conserve", "immediate", "intertemporal"] as const) {
        const rulesWithFocus = experimental;
        const remaining = options.horizon - round;
        const future: FutureFocusValues = name === "intertemporal" ? values[remaining - 1]! : Array.from({ length: rulesWithFocus.focusPerNight + 1 }, () => 0);
        const focus = name === "conserve" ? 0 : Math.max(0, rulesWithFocus.focusPerNight - focusSpent[name]);
        const decision = conditional.evaluate({ visibleState: { cards: state.cards, dealerUp: state.up, cofre },
          beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: remaining, focus, futureValues: future });
        if (name === "intertemporal") {
          const oracle = conditional.evaluatePerfectHoleInformation({ visibleState: { cards: state.cards, dealerUp: state.up, cofre }, focus });
          oracleExpectedNight += oracle.ev * baseline.initialExposure;
          const activeHands = [decision.partition.luz, decision.partition.sombra]
            .map(indices => indices.map(i => state.cards[i]!)).filter(cards => !handValue(cards).natural);
          const illustrativeSwap = decision.ability === "maneuver" ? decision.swap
            : decision.ability === "read+maneuver" ? Object.values(decision.postReadManeuverByHole ?? {}).find(value => value !== null && value !== undefined) : undefined;
          if (illustrativeSwap) {
            const partitionChanged = JSON.stringify(baselinePartition) !== JSON.stringify(decision.partition);
            const hasPartitionChangedCase = requiredCases.cofreChangesComposition?.openingPartitionChanged === true;
            if (!requiredCases.cofreChangesComposition || (partitionChanged && !hasPartitionChangedCase)) requiredCases.cofreChangesComposition = {
              scenarioIndex: index, visibleCards: state.cards.map(card => card.rank), dealerUp: state.up.rank, cofre: cofre.rank,
              baselinePartition, experimentalPartition: decision.partition, openingPartitionChanged: partitionChanged,
              chosenAbility: decision.ability, illustrativeSwap,
              baselineEvExposureUnits: baselineChoice.bestEv, experimentalEvExposureUnits: decision.immediateEv,
              explanation: "The open fifth card changes the EV-optimal final hand composition through Manobra; the JSON states explicitly whether the original two-hand partition also changes.",
            };
          }
          if (activeHands.length > 0 && focus >= experimental.readCost) {
            readEligibleStates++; readMarginal.add(decision.estimatedReadMarginalValue);
            if (decision.estimatedReadMarginalValue > 1e-12) readPositiveEstimatedValueStates++;
            if (decision.ability === "read" || decision.ability === "read+maneuver") readSelectedStates++;
            if (!requiredCases.positiveReadValue && decision.estimatedReadMarginalValue > 1e-12
              && (decision.ability === "read" || decision.ability === "read+maneuver")) requiredCases.positiveReadValue = {
              scenarioIndex: index, visibleCards: state.cards.map(card => card.rank), dealerUp: state.up.rank, cofre: cofre.rank,
              roundsRemaining: remaining, focus, selectedAbility: decision.ability,
              estimatedReadMarginalValueExposureUnits: decision.estimatedReadMarginalValue,
              note: "The hole is not recorded; the positive marginal is estimated from the fitted continuation table.",
            };
          }
          if (activeHands.length > 0 && focus >= experimental.maneuverCost) {
            maneuverEligibleStates++; maneuverMarginal.add(decision.estimatedManeuverMarginalValue);
            if (decision.estimatedManeuverMarginalValue > 1e-12) maneuverPositiveEstimatedValueStates++;
            if (decision.ability === "maneuver" || decision.ability === "read+maneuver") maneuverSelectedStates++;
          }
          if (!requiredCases.savingFocusBeatsSpendingNow) {
            const immediate = conditional.evaluate({ visibleState: { cards: state.cards, dealerUp: state.up, cofre },
              beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: remaining, focus,
              futureValues: Array.from({ length: experimental.focusPerNight + 1 }, () => 0) });
            if (decision.ability === "conserve" && immediate.ability !== "conserve" && immediate.immediateEv > decision.immediateEv + 1e-12) {
              const spendNowOption = decision.optionValues.find(option => option.ability === immediate.ability);
              requiredCases.savingFocusBeatsSpendingNow = { scenarioIndex: index, visibleCards: state.cards.map(card => card.rank),
                dealerUp: state.up.rank, cofre: cofre.rank, roundsRemaining: remaining, focus,
                immediateGreedyAction: immediate.ability, immediateGreedyEvExposureUnits: immediate.immediateEv,
                fittedValueOfSpendingNow: spendNowOption?.expectedTotalEv,
                fittedValueOfConserving: decision.optionValues.find(option => option.ability === "conserve")?.expectedTotalEv,
                dynamicAction: decision.ability, dynamicImmediateEvExposureUnits: decision.immediateEv,
                dynamicTotalValueExposureUnits: decision.ev, continuationValueExposureUnits: decision.ev - decision.immediateEv,
                note: "Immediate EV spends now; the fitted horizon policy conserves due to estimated continuation value.", };
            }
          }
        }
        nightExpected[name] += decision.immediateEv * baseline.initialExposure;
        const run = playConditional(state, cofre, decision, rulesWithFocus, evaluationSeed, index, conditional);
        nightScores[name] += run.score;
        if (name !== "conserve") {
          focusSpent[name] += run.focusSpent; readUses[name] += run.readUses; maneuverUses[name] += run.maneuverUses;
        }
      }
    }
    oracleExpected.add(oracleExpectedNight);
    oracleGap.add(oracleExpectedNight - nightExpected.intertemporal);
    for (const name of policyNames) {
      const stats = results[name]; stats.realized.add(nightScores[name]!); stats.expected.add(nightExpected[name]!);
      stats.pointsVsBaseline.add(nightScores[name]! - nightScores.baseline!);
      stats.expectedVsBaseline.add(nightExpected[name]! - nightExpected.baseline!);
    }
    for (const name of policyNames.filter(policy => policy !== "baseline")) {
      results[name].focusSpent.add(focusSpent[name as keyof typeof focusSpent]!);
      results[name].focusExpired.add(experimental.focusPerNight - focusSpent[name as keyof typeof focusSpent]!);
      results[name].readUses.add(readUses[name as keyof typeof readUses]!);
      results[name].maneuverUses.add(maneuverUses[name as keyof typeof maneuverUses]!);
    }
    policyPairings.get("intertemporal-minus-immediate-realized")!.add(nightScores.intertemporal - nightScores.immediate);
    policyPairings.get("intertemporal-minus-conserve-realized")!.add(nightScores.intertemporal - nightScores.conserve);
    policyPairings.get("intertemporal-minus-immediate-expected")!.add(nightExpected.intertemporal - nightExpected.immediate);
    policyPairings.get("intertemporal-minus-conserve-expected")!.add(nightExpected.intertemporal - nightExpected.conserve);
  }
  const toReport = (name: ConditionalPolicyName) => {
    const result = results[name];
    return { realizedPointsPerNight: result.realized.summary(), exactConditionalExpectedPointsPerNight: result.expected.summary(),
      pairedRealizedDifferenceVsBaseline: result.pointsVsBaseline.summary(), pairedExpectedDifferenceVsBaseline: result.expectedVsBaseline.summary(),
      focusSpent: result.focusSpent.summary(), focusExpired: result.focusExpired.summary(), readUses: result.readUses.summary(), maneuverUses: result.maneuverUses.summary() };
  };
  const inheritedP2BEPolicies = {} as Record<ResourceAgent, { realizedPointsPerNight: number; pairedDifferenceVsBaseline: ReturnType<Moments["summary"]>; policyDefinition: string }>;
  for (const agent of ["conserve", "eager", "horizon"] as const) inheritedP2BEPolicies[agent] = {
    realizedPointsPerNight: inherited.profiles.combined.agents[agent].scorePerRound * options.horizon,
    pairedDifferenceVsBaseline: inherited.comparisonsAgainstBaseline[agent].combined.scoreDifference,
    policyDefinition: inherited.policies[agent],
  };
  const pairedComparisons = Object.fromEntries([...policyPairings].map(([key, moments]) => [key, moments.summary()]));
  let requiredCasesReport: ConditionalLabReport["requiredCases"];
  if (options.caseStudySearch !== false) {
    const missing = ["cofreChangesComposition", "positiveReadValue", "savingFocusBeatsSpendingNow"].filter(key => !(key in requiredCases));
    if (missing.length) throw new Error(`Required case studies not observed in the evaluation set: ${missing.join(", ")}.`);
    const { cofreChangesComposition, positiveReadValue, savingFocusBeatsSpendingNow } = requiredCases;
    if (!cofreChangesComposition || !positiveReadValue || !savingFocusBeatsSpendingNow) throw new Error("Required case-study payload is incomplete.");
    requiredCasesReport = { cofreChangesComposition, positiveReadValue, savingFocusBeatsSpendingNow, searchScenarios: options.nights * options.horizon };
  }
  return {
    schemaVersion: 1, labVersion: CONDITIONAL_LAB_VERSION, solverVersion: CONDITIONAL_SOLVER_VERSION, prngVersion: STREAM_VERSION,
    seed: options.seed, trainingSeed, evaluationSeed, trainingScenariosPerStage: trainingScenarios, evaluationNights: options.nights,
    horizon: options.horizon, payout: options.payout, rulesId: experimental.id, initialFocus: experimental.focusPerNight, unit: "net match points",
    training: { method: "backward sample-average Bellman recursion over finite Focus states; exact within-round decisions; independent rank-replacement training scenarios by rounds-remaining stage",
      valueByRoundsAndFocus: values, stageSamplingUncertaintyByRoundsAndFocus: fit.stageSamplingUncertaintyByRoundsAndFocus },
    policies: { baseline: toReport("baseline"), conserve: toReport("conserve"), immediate: toReport("immediate"), intertemporal: toReport("intertemporal") },
    intertemporalOpportunityDiagnostics: { readEligibleStates, readPositiveEstimatedValueStates, readSelectedStates,
      readEstimatedMarginalValueInExposureUnits: readMarginal.summary(), maneuverEligibleStates, maneuverPositiveEstimatedValueStates,
      maneuverSelectedStates, maneuverEstimatedMarginalValueInExposureUnits: maneuverMarginal.summary() },
    perfectHoleInformationUpperBound: { expectedPointsPerNight: oracleExpected.summary(), pairedGapOverIntertemporalCurrentRoundEV: oracleGap.summary(),
      provenance: "exact-one-round-hole-information-upper-bound-not-player-policy" },
    inheritedP2BEPolicies,
    ...(requiredCasesReport ? { requiredCases: requiredCasesReport } : {}),
    pairedComparisons,
    optionValueProperty: "With exact Bellman values, conserving Focus is a feasible action from every state; therefore the optimal expected value with optional abilities is at least the no-ability value. A finite-sample fitted value table is approximate and does not guarantee samplewise or out-of-sample policy dominance.",
    limitations: [
      "Conditional player/dealer recursion and each observed-state action evaluation are exact under infinite-rank sampling with replacement, S17, natural peek, and the configured experimental costs/payout.",
      "The finite-horizon Bellman expectation over future public deals is estimated by sample averages; it is not an exact global optimum. Training and evaluation use disjoint seed domains, but finite-sample value error remains.",
      "The simulator reports realized score separately from exact conditional expected score of the selected policy. Realized paired outcomes are noisy and do not establish human skill, balance or fun.",
      "No regret against a perfect-information oracle is computed; that oracle is not a feasible player policy. No human playtest, multiplayer mirror, finite shoe or deployment is included.",
      "Intervals are 95% normal intervals over paired Night means; no multiplicity adjustment is applied. Raise nights and training scenarios for tighter uncertainty.",
    ],
  };
}

function newAggregate(): PolicyAggregate { return { realized: new Moments(), expected: new Moments(), pointsVsBaseline: new Moments(), expectedVsBaseline: new Moments(),
  focusSpent: new Moments(), focusExpired: new Moments(), readUses: new Moments(), maneuverUses: new Moments() }; }
function playBaseline(state: ReturnType<typeof scenario>, partition: Partition, rules: typeof DF_SYM_01_3_TO_2 | typeof DF_SYM_01_1_TO_1, seed: string, index: number): number {
  const deal = [...state.cards, state.up, state.hole]; let cursor = 0;
  const luz = new BenchmarkRandom(seed, index, "luz"); const sombra = new BenchmarkRandom(seed, index, "sombra"); const dealer = new BenchmarkRandom(seed, index, "dealer");
  let round = compose(createRound(() => deal[cursor++]!, rules), partition);
  while (round.phase === "player") {
    const name = round.currentHand!; const cards = round.hands![name].cards;
    const action = new EvSolver(rules).actions(cards, round.dealerUp).best;
    round = applyAction(round, action, name === "luz" ? () => luz.card() : () => sombra.card());
  }
  if (round.phase === "dealer") round = playDealer(round, () => dealer.card());
  return roundScore(round);
}

function playConditional(state: ReturnType<typeof scenario>, cofreCard: Card, decision: ConditionalDecision, rules: CofreFocoRules,
  seed: string, index: number, solver: ConditionalRoundSolver): { score: number; focusSpent: number; readUses: number; maneuverUses: number } {
  let initialIndex = 0; let dealerIndex = 0;
  const dealer = new BenchmarkRandom(seed, index, "dealer"); const luz = new BenchmarkRandom(seed, index, "luz");
  const sombra = new BenchmarkRandom(seed, index, "sombra");
  const runRules = { ...rules, focusPerNight: decision.focusBudget };
  let night: CofreFocoNight = createNight(runRules, 1);
  night = beginRound(night, { initial: () => state.cards[initialIndex++]!,
    dealer: () => dealerIndex++ === 0 ? state.up : dealerIndex === 2 ? state.hole : dealer.card(), cofre: () => cofreCard });
  night = composeCofreFoco(night, decision.partition);
  let reads = 0; let maneuvers = 0;
  if (night.round?.phase === "focusWindow") {
    if (decision.ability === "read" || decision.ability === "read+maneuver") { night = readDealerHole(night); reads++; }
    else night = skipRead(night);
    let swap = decision.swap;
    if (decision.ability === "read+maneuver") swap = decision.postReadManeuverByHole?.[state.hole.rank] ?? undefined;
    if (swap && night.focusRemaining >= rules.maneuverCost) { night = maneuver(night, swap.hand, swap.cardIndex); maneuvers++; }
    else night = skipManeuver(night);
    if (night.round?.phase === "focusWindow") night = continueAfterAbilities(night);
  }
  while (night.round?.phase === "player") {
    const handName = night.round.currentHand!; const hand = night.round.hands![handName];
    const action = solver.bestAction(hand.cards, night.round.dealerUp, night.round.readUsed ? state.hole : undefined, hand.maneuverTwentyOne);
    night = applyCofreFocoAction(night, action, handName === "luz" ? () => luz.card() : () => sombra.card());
  }
  if (night.round?.phase === "dealer") night = playCofreFocoDealer(night, () => dealer.card());
  return { score: night.round?.score ?? 0, focusSpent: runRules.focusPerNight - night.focusRemaining - night.expiredFocus,
    readUses: reads, maneuverUses: maneuvers };
}
