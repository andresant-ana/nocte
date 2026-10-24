import {
  DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2, handValue, partitions, type Action, type Card, type HandName, type Partition,
} from "@nocte/engine";
import {
  CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2, applyCofreFocoAction, applyPactImpetusDouble,
  beginPactBookHit, beginRound, choosePactCofre, composeCofreFoco, composePactBookCisao,
  continueAfterAbilities, createNight, legalCofreFocoActions, maneuver, maneuverWithPactPrivilege,
  playCofreFocoDealer, readDealerHole, readDealerHoleWithPactPrivilege, resolvePactBookHit,
  revealDealerHoleCategory, skipManeuver, skipRead, type CofreFocoNight, type CofreFocoRules,
} from "@nocte/engine/cofre-foco";
import {
  activatePactBookAudacity, assertPactBookActionAllowed, assertPactBookManeuverAllowed,
  canUsePactBookPrivilege, consumePactBookPrivilege, createPactBook, enterPactBookRound,
  expirePactBook, markPactBookCofreSealed, offerPactBook, pactBookRestrictions,
  PACT_BOOK_FAMILIES, PACT_BOOK_PACTS, refusePactBook, signPactBook,
  type PactBookState, type PactFamily, type PactId,
} from "@nocte/engine/pact-book";
import { CONDITIONAL_SOLVER_VERSION, ConditionalRoundSolver } from "./conditional-solver.js";
import { STREAM_VERSION, BenchmarkRandom } from "./streams.js";
import { SOLVER_VERSION, EvSolver, rankProbability, RANKS } from "./solver.js";
import { Moments } from "./statistics.js";

export const PACT_DEPTH_LAB_VERSION = "p8-pact-depth-paired-v1";
export const PACT_DEPTH_AGENT_VERSION = "public-state-heuristics-v1";
export type PactDepthPolicy = "conservative" | "myopic" | "intertemporal";
export type PactDepthChoice = "refuse" | "option-a" | "option-b" | "situational";
export type PactDepthStake = "fixed-1" | "fixed-5" | "variable";
export type PactDepthPayout = "3:2" | "1:1";
export type PactDepthFamily = typeof PACT_BOOK_FAMILIES[number];

type NightMetric = {
  score: number; bankDeltaTicks: number; finalBankTicks: number; fundedRounds: number; practiceRounds: number;
  focusSpent: number; focusReadSpent: number; focusManeuverSpent: number; focusExpired: number; privilegesUsed: number; privilegesExpired: number;
  paidReadUses: number; paidReadAfterPactPrivilegeConsumed: number; paidManeuverUses: number; paidManeuverUsesUnderPact: number;
  acceptedPactCount: number; renunciationBlocks: number; hits: number; stands: number; doubles: number;
};
type NightActionTrace = Readonly<{ stateKey: string; action: Action }>;
type NightRun = Readonly<{ metric: NightMetric; actionTrace: readonly NightActionTrace[] }>;
type CellKey = `${PactDepthPayout}|${PactDepthStake}|${PactDepthPolicy}|${PactDepthFamily}|${PactDepthChoice}`;

export type PactDepthSummary = Readonly<{
  n: number; mean: number; standardDeviation: number | null; standardError: number | null;
  confidence95: readonly [number, number] | null; min: number | null; max: number | null;
}>;
export type PactDepthReport = Readonly<{
  schemaVersion: 1; labVersion: typeof PACT_DEPTH_LAB_VERSION; catalogVersion: "PACT-BOOK-0.1";
  agentVersion: typeof PACT_DEPTH_AGENT_VERSION; cardStreamVersion: typeof STREAM_VERSION;
  actionSolverVersion: typeof SOLVER_VERSION; conditionalSolverVersion: typeof CONDITIONAL_SOLVER_VERSION;
  seed: string; nightsPerCell: number; horizon: 10; payouts: readonly PactDepthPayout[];
  families: readonly Readonly<{ family: PactDepthFamily; options: readonly [PactId, PactId] }>[];
  policies: Readonly<Record<PactDepthPolicy, string>>; stakePolicies: Readonly<Record<PactDepthStake, string>>;
  protocol: string; results: readonly Readonly<{
    payout: PactDepthPayout; stakePolicy: PactDepthStake; policy: PactDepthPolicy; family: PactDepthFamily;
    choice: PactDepthChoice; pactId: PactId | "refused" | "situational";
    metrics: Readonly<Record<keyof NightMetric, PactDepthSummary>>;
    pairedVsRefuse: Readonly<{ score: PactDepthSummary; bankrollTicks: PactDepthSummary; wins: number; losses: number; ties: number }> | null;
    pairedVsOpposite: Readonly<{ pactId: PactId; score: PactDepthSummary; bankrollTicks: PactDepthSummary; wins: number; losses: number; ties: number }> | null;
    actionDisagreement: Readonly<{ comparedPolicy: PactDepthPolicy; commonStates: PactDepthSummary; differingActions: PactDepthSummary;
      disagreementRate: PactDepthSummary | null }> | null;
  }>[];
  randomOfferAudit: Readonly<{ seeds: number; actII: Readonly<Record<PactDepthFamily, number>>;
    actIII: Readonly<Record<PactDepthFamily, number>>; repeatedFamilyCount: number }>;
  coverage: Readonly<{ catalogPacts: readonly PactId[]; forcedPairComparisons: number; choiceCells: readonly PactDepthChoice[];
    acceptedNightSamplesPerPact: Readonly<Record<PactId, number>>; privilegeUseEventsPerPact: Readonly<Record<PactId, number>>;
    unexercisedPrivileges: readonly PactId[]; untestedPacts: readonly PactId[] }>;
  limitations: readonly string[];
}>;

const policies: readonly PactDepthPolicy[] = ["conservative", "myopic", "intertemporal"];
const choices: readonly PactDepthChoice[] = ["refuse", "option-a", "option-b", "situational"];
const stakes: readonly PactDepthStake[] = ["fixed-1", "fixed-5", "variable"];
const payouts: readonly PactDepthPayout[] = ["3:2", "1:1"];
const pactIds = Object.keys(PACT_BOOK_PACTS) as PactId[];
const familyOptions: Readonly<Record<PactDepthFamily, readonly [PactId, PactId]>> = Object.freeze(
  Object.fromEntries(PACT_BOOK_FAMILIES.map(family => [family, pactIds.filter(id => PACT_BOOK_PACTS[id].family === family)])) as unknown as Record<PactDepthFamily, readonly [PactId, PactId]>,
);

function summarize(values: readonly number[]): PactDepthSummary {
  const moments = new Moments(); for (const value of values) moments.add(value);
  const result = moments.summary();
  return { n: result.n, mean: result.mean, standardDeviation: result.variance === null ? null : Math.sqrt(result.variance),
    standardError: result.standardError, confidence95: result.confidence95,
    min: values.length ? Math.min(...values) : null, max: values.length ? Math.max(...values) : null };
}

function summarizeTraceDisagreement(left: readonly NightRun[], right: readonly NightRun[], comparedPolicy: PactDepthPolicy) {
  const commonStates: number[] = []; const differingActions: number[] = []; const rates: number[] = [];
  for (let night = 0; night < Math.min(left.length, right.length); night++) {
    const leftByState = new Map(left[night]!.actionTrace.map(entry => [entry.stateKey, entry.action]));
    const rightByState = new Map(right[night]!.actionTrace.map(entry => [entry.stateKey, entry.action]));
    let shared = 0; let different = 0;
    for (const [state, action] of leftByState) {
      const other = rightByState.get(state);
      if (other === undefined) continue;
      shared++;
      if (other !== action) different++;
    }
    commonStates.push(shared); differingActions.push(different);
    if (shared > 0) rates.push(different / shared);
  }
  return { comparedPolicy, commonStates: summarize(commonStates), differingActions: summarize(differingActions),
    disagreementRate: rates.length ? summarize(rates) : null };
}

function cardSource(random: BenchmarkRandom) {
  let next: Card | undefined;
  const source = (() => { const card = next ?? random.card(); next = undefined; return card; }) as (() => Card) & { peek: () => Card };
  source.peek = () => { next ??= random.card(); return structuredClone(next); };
  return source;
}

function createStreams(seed: string, roundIndex: number) {
  return {
    initial: cardSource(new BenchmarkRandom(seed, roundIndex, "initial")),
    dealer: cardSource(new BenchmarkRandom(seed, roundIndex, "dealer")),
    luz: cardSource(new BenchmarkRandom(seed, roundIndex, "luz")),
    sombra: cardSource(new BenchmarkRandom(seed, roundIndex, "sombra")),
    cofre: cardSource(new BenchmarkRandom(seed, roundIndex, "cofre")),
  };
}

function chooseSituational(family: PactDepthFamily, policy: PactDepthPolicy, balanceTicks: number, focus: number,
  round: number, choiceRandom: BenchmarkRandom): PactId {
  const [a, b] = familyOptions[family];
  switch (family) {
    case "revelation": return focus >= 2 && policy !== "conservative" ? a : b;
    case "dominion": return policy === "conservative" || focus === 0 ? a : b;
    case "focus": return (round === 4 || round === 8) ? b : a;
    case "sacrifice": return policy === "conservative" ? b : (choiceRandom.integer(2) === 0 ? a : b);
    case "time": return round < 6 ? a : b;
    case "destiny": return policy === "myopic" ? b : a;
    case "bonding": return policy === "intertemporal" ? b : a;
    case "fortune": return balanceTicks < 240 ? a : (balanceTicks >= 400 && policy !== "conservative" ? b : a);
    case "choice": return policy === "intertemporal" ? b : a;
  }
}

function faceFor(pact: PactId): HandName | undefined {
  return ["iron", "bastion", "oath"].includes(pact) ? "luz" : undefined;
}

function selectOfferedPact(book: PactBookState, choice: PactDepthChoice, policy: PactDepthPolicy,
  balanceTicks: number, focus: number, round: number, random: BenchmarkRandom): PactId | null {
  const offer = book.current;
  if (!offer || offer.status !== "offered" || choice === "refuse") return null;
  if (choice === "option-a") return offer.options[0];
  if (choice === "option-b") return offer.options[1];
  return chooseSituational(offer.family, policy, balanceTicks, focus, round, random);
}

function bet(balanceTicks: number, policy: PactDepthStake, pact: PactId | null, useAudacity: boolean): { stake: number; coverage: 2 | 4 } {
  const coverage = useAudacity && pact === "audacity" ? 2 : 4;
  const standardMaximum = Math.floor(balanceTicks / (2 * coverage));
  const cap = pact === "lastro" ? Math.max(1, Math.floor(balanceTicks / 16)) : Number.MAX_SAFE_INTEGER;
  const maximum = Math.min(standardMaximum, cap);
  const requested = policy === "fixed-1" ? 1 : policy === "fixed-5" ? 5 : maximum;
  return { stake: maximum > 0 ? Math.max(1, Math.min(requested, maximum)) : 0, coverage };
}

function rankExpectedValue(cards: readonly Card[], up: Card, hole: Card, payoutRules: CofreFocoRules, conditional: ConditionalRoundSolver,
  suppressNatural: boolean): number {
  const natural = !suppressNatural && handValue(cards).natural;
  const dealerNatural = (up.rank === "A" && hole.rank === "10") || (up.rank === "10" && hole.rank === "A");
  if (dealerNatural) return natural ? 0 : -1;
  if (natural) return payoutRules.naturalPayout === "3:2" ? 1.5 : 1;
  return conditional.actionValue(cards, up, hole);
}

function categoryValue(cards: readonly Card[], up: Card, category: "ace" | "low" | "high", rules: CofreFocoRules,
  conditional: ConditionalRoundSolver, suppressNatural: boolean): number {
  const ranks = RANKS.filter(rank => rank === "A" ? category === "ace" : category === "low" ? Number(rank) >= 2 && Number(rank) <= 6 : Number(rank) >= 7);
  let mass = 0; let value = 0;
  for (const rank of ranks) {
    const probability = rankProbability(rank);
    const hole = { rank } as Card;
    const dealerNatural = (up.rank === "A" && rank === "10") || (up.rank === "10" && rank === "A");
    // A positive dealer peek is still a legal Farol/Balança category; actual settlement is handled by the motor.
    const result = rankExpectedValue(cards, up, hole, rules, conditional, suppressNatural);
    value += probability * result; mass += probability;
    if (dealerNatural) continue;
  }
  return mass ? value / mass : Number.NEGATIVE_INFINITY;
}

function bestPartitionByCategory(cards: readonly Card[], up: Card, category: "ace" | "low" | "high", rules: CofreFocoRules,
  conditional: ConditionalRoundSolver, suppressNatural: boolean): Partition {
  let best = partitions(cards)[0]!; let bestValue = Number.NEGATIVE_INFINITY;
  for (const partition of partitions(cards)) {
    const value = categoryValue(partition.luz.map(i => cards[i]!), up, category, rules, conditional, suppressNatural)
      + categoryValue(partition.sombra.map(i => cards[i]!), up, category, rules, conditional, suppressNatural);
    if (value > bestValue) { best = partition; bestValue = value; }
  }
  return best;
}

function bestCisao(cards: readonly Card[], up: Card, rules: CofreFocoRules, conditional: ConditionalRoundSolver): { hand: HandName; index: number } {
  let best: { hand: HandName; index: number } = { hand: "luz", index: 3 }; let bestValue = Number.NEGATIVE_INFINITY;
  for (const hand of ["luz", "sombra"] as const) for (let index = 0; index < 4; index++) {
    const triple = cards.filter((_, i) => i !== index);
    const [luz, sombra] = hand === "luz" ? [triple, [cards[index]!]] : [[cards[index]!], triple];
    const value = categoryValue(luz, up, "ace", rules, conditional, true) * (1 / 13)
      + categoryValue(luz, up, "low", rules, conditional, true) * (5 / 13)
      + categoryValue(luz, up, "high", rules, conditional, true) * (7 / 13)
      + categoryValue(sombra, up, "ace", rules, conditional, true) * (1 / 13)
      + categoryValue(sombra, up, "low", rules, conditional, true) * (5 / 13)
      + categoryValue(sombra, up, "high", rules, conditional, true) * (7 / 13);
    if (value > bestValue) { bestValue = value; best = { hand, index }; }
  }
  return best;
}

function chooseAction(policy: PactDepthPolicy, cards: readonly Card[], up: Card, hole: Card | undefined,
  allowed: readonly Action[], solver: EvSolver, conditional: ConditionalRoundSolver): Action {
  if (!allowed.length) throw new Error("A engine/domain state exposed zero actions para uma Face ativa.");
  // Cisão creates a legal one-card opening Face. Its first ordinary decision is to hit or stand;
  // the P1B solver contract is intentionally two-card-or-more, so the fixed policy hits once.
  if (cards.length === 1) return allowed.includes("hit") ? "hit" : allowed[0]!;
  if (policy === "conservative") {
    const total = handValue(cards).total;
    const target: Action = total >= 15 ? "stand" : "hit";
    return allowed.includes(target) ? target : allowed[0]!;
  }
  const exactKnownBest = hole ? conditional.bestAction(cards, up, hole) : undefined;
  if (hole) return exactKnownBest && allowed.includes(exactKnownBest)
    ? exactKnownBest : allowed.includes("stand") ? "stand" : allowed[0]!;
  const values = hole ? undefined : solver.actions(cards, up).values;
  let best = allowed[0]!; let bestValue = Number.NEGATIVE_INFINITY;
  for (const action of allowed) {
    let value: number;
    value = values?.[action] ?? Number.NEGATIVE_INFINITY;
    if (value > bestValue) { best = action; bestValue = value; }
  }
  return best;
}

function shouldUsePrivilege(policy: PactDepthPolicy, round: number, endRound: number, eligible: boolean, immediateWorthwhile = true): boolean {
  if (!eligible || policy === "conservative") return false;
  if (policy === "myopic") return immediateWorthwhile;
  // A transparent horizon heuristic: preserve one-use options until the last legal opportunity,
  // but spend if it expires this round. This is not a Bellman-optimal policy.
  return round >= endRound && immediateWorthwhile;
}

/** Free Pacto privileges and ordinary paid Focus are independent legal paths.
 * The P8 study must not silently disable paid actions when a privilege is absent
 * or was consumed earlier in the Act. Deterministic selection, no card peeking. */
export function selectFocusUse(
  ability: "read" | "maneuver", policy: PactDepthPolicy, round: number, freeEndRound: number,
  freeEligible: boolean, paidEligible: boolean, worthwhile: boolean, maneuverGain = 0,
): "free" | "paid" | "none" {
  if (policy === "conservative" || !worthwhile) return "none";
  if (shouldUsePrivilege(policy, round, freeEndRound, freeEligible, worthwhile)) return "free";
  if (!paidEligible) return "none";
  if (policy === "myopic") return "paid";
  // Explicit resource-sensitive heuristic, not a globally optimal Focus policy.
  if (ability === "maneuver" && round >= 6 && maneuverGain >= 0.75) return "paid";
  return "none";
}

function runNight(input: { seed: string; index: number; family: PactDepthFamily; choice: PactDepthChoice;
  policy: PactDepthPolicy; stakePolicy: PactDepthStake; payout: PactDepthPayout;
  rules: CofreFocoRules; solver: EvSolver; conditional: ConditionalRoundSolver }): NightRun {
  const { seed, index, family, choice, policy, stakePolicy, payout, rules, solver, conditional } = input;
  let night = createNight(rules, 10); let book = createPactBook(); let balanceTicks = 300;
  let practice = false; let fundedRounds = 0; let practiceRounds = 0; let renunciationBlocks = 0;
  let privilegesUsed = 0; let paidReadUses = 0; let paidReadAfterPactPrivilegeConsumed = 0; let paidManeuverUses = 0; let paidManeuverUsesUnderPact = 0;
  let hits = 0; let stands = 0; let doubles = 0;
  let sealedCofre: { card: Card; round: number } | null = null;
  let protectedFace: HandName | null = null;
  let score = 0;
  const actionTrace: NightActionTrace[] = [];
  const streamCache = new Map<number, ReturnType<typeof createStreams>>();
  const getStreams = (round: number) => {
    let streams = streamCache.get(round);
    if (!streams) { streams = createStreams(`${seed}:cards`, index * 10 + round - 1); streamCache.set(round, streams); }
    return streams;
  };

  for (let roundNumber = 1; roundNumber <= 10; roundNumber++) {
    book = enterPactBookRound(book, roundNumber);
    const random = new BenchmarkRandom(`${seed}:policy`, index * 10 + roundNumber, "choice");
    if (roundNumber === 4) book = offerPactBook(book, 4, `${seed}:offers`, [family])!;
    if (roundNumber === 8) {
      // The family comparison is isolated in Act II; Act III uses a real non-repeating offer.
      const eligible = !practice && Math.floor(balanceTicks / 8) > 0 ? undefined : PACT_BOOK_FAMILIES.filter(item => item !== "fortune");
      book = offerPactBook(book, 8, `${seed}:offers`, eligible)!;
    }
    if (book.current?.status === "offered") {
      const activeChoice = roundNumber === 4 ? choice : choice === "situational" ? "situational" : "refuse";
      const pact = selectOfferedPact(book, activeChoice, policy, balanceTicks, night.focusRemaining, roundNumber, random);
      book = pact ? signPactBook(book, pact, faceFor(pact)) : refusePactBook(book);
    }
    const pactId = book.current?.status === "active" && book.current.choice !== "refused" ? book.current.choice : null;
    const actEnd = book.current?.endRound ?? roundNumber;
    const privilegeLegal = (pactId: PactId) => canUsePactBookPrivilege(book, roundNumber, pactId);

    const audacityEligible = !practice && pactId === "audacity" && privilegeLegal("audacity");
    const canKeepFundedWithAudacity = !practice && Math.floor(balanceTicks / 4) > 0 && audacityEligible;
    if (!practice && Math.floor(balanceTicks / 8) === 0 && !canKeepFundedWithAudacity) practice = true;
    let useAudacity = shouldUsePrivilege(policy, roundNumber, actEnd, audacityEligible, true);
    if (useAudacity) { book = activatePactBookAudacity(book, roundNumber); privilegesUsed++; }
    const terms = bet(balanceTicks, stakePolicy, pactId, useAudacity);
    if (!practice && pactId === "lastro" && Math.min(Math.floor(balanceTicks / 8), Math.max(1, Math.floor(balanceTicks / 16))) < Math.floor(balanceTicks / 8)) {
      renunciationBlocks++;
    }
    if (!practice && terms.stake === 0) practice = true;
    const stake = practice ? 0 : terms.stake;
    const roundKind = practice ? "practice" : "funded";
    if (practice) practiceRounds++; else fundedRounds++;
    if (!practice && pactId === "lastro" && privilegeLegal("lastro")) {
      protectedFace = policy === "intertemporal" && roundNumber % 2 === 0 ? "sombra" : "luz";
      if (shouldUsePrivilege(policy, roundNumber, actEnd, true)) privilegesUsed++;
      else protectedFace = null;
      if (protectedFace) book = consumePactBookPrivilege(book, roundNumber);
    }

    const streams = getStreams(roundNumber);
    const cofreOverride = sealedCofre?.round === roundNumber ? sealedCofre.card : undefined;
    night = beginRound(night, { initial: streams.initial, dealer: streams.dealer, cofre: streams.cofre }, cofreOverride);
    if (cofreOverride) sealedCofre = null;
    const round = night.round!;
    let pactCategory: "ace" | "low" | "high" | undefined;
    if ((pactId === "lighthouse" && privilegeLegal("lighthouse"))
      && shouldUsePrivilege(policy, roundNumber, actEnd, true)) {
      night = revealDealerHoleCategory(night); book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
      pactCategory = night.round!.dealerHoleCategory;
    }
    if (pactId === "finale" && privilegeLegal("finale") && roundNumber < actEnd
      && shouldUsePrivilege(policy, roundNumber, actEnd - 1, true, true)) {
      const alternate = streams.cofre();
      const currentCofre = night.round!.cofre;
      const choiceA = conditional.evaluate({ visibleState: { cards: night.round!.originalCards, dealerUp: night.round!.dealerUp, cofre: currentCofre },
        beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 10 - roundNumber + 1, focus: night.focusRemaining }).ev;
      const choiceB = conditional.evaluate({ visibleState: { cards: night.round!.originalCards, dealerUp: night.round!.dealerUp, cofre: alternate },
        beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 10 - roundNumber + 1, focus: night.focusRemaining }).ev;
      const chosen = choiceB > choiceA ? alternate : currentCofre;
      night = choosePactCofre(night, chosen); book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
    }
    if (pactId === "bond" && privilegeLegal("bond") && roundNumber < actEnd
      && shouldUsePrivilege(policy, roundNumber, actEnd - 1, true, handValue([night.round!.cofre]).total >= 6)) {
      sealedCofre = { card: structuredClone(night.round!.cofre), round: roundNumber + 1 };
      book = markPactBookCofreSealed(book, roundNumber, roundNumber + 1); privilegesUsed++;
    }

    const cards = night.round!.originalCards;
    let partition = pactCategory
      ? bestPartitionByCategory(cards, night.round!.dealerUp, pactCategory, rules, conditional, false)
      : solver.inspect(cards, night.round!.dealerUp).partitions[solver.inspect(cards, night.round!.dealerUp).bestIndex]!.partition;
    if (pactId === "balanca" && privilegeLegal("balanca")
      && shouldUsePrivilege(policy, roundNumber, actEnd, true, true)) {
      const proposal = partition;
      night = revealDealerHoleCategory(night);
      const category = night.round!.dealerHoleCategory!;
      book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
      partition = bestPartitionByCategory(cards, night.round!.dealerUp, category, rules, conditional, true);
      // P7's adapter suppresses opening-natural status on the one final Balança composition.
      void proposal;
      night = composeCofreFoco(night, partition, { suppressOpeningNatural: true });
    } else if (pactId === "cisao" && privilegeLegal("cisao")
      && shouldUsePrivilege(policy, roundNumber, actEnd, true, true)) {
      const selected = bestCisao(cards, night.round!.dealerUp, rules, conditional);
      night = composePactBookCisao(night, selected.hand, selected.index);
      book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
    } else {
      night = composeCofreFoco(night, partition);
    }

    if (night.round?.phase === "complete") {
      const settled = settleBankroll(roundKind, stake, terms.coverage, night.round.score!, night.round.settlement!, protectedFace);
      balanceTicks += settled.deltaTicks; protectedFace = null;
      if (balanceTicks < 0) throw new Error("Invariant P8: settlement made bankroll negative.");
      if (roundKind === "funded" && Math.floor(balanceTicks / 8) === 0) practice = true;
      score += night.round.score!; continue;
    }

    if (night.round?.phase === "focusWindow") {
      const current = book.current;
      const inFocusWindow = (id: PactId) => id === "vigil" ? roundNumber >= (roundNumber <= 7 ? 6 : 9)
        : id === "flare" ? roundNumber <= (roundNumber <= 7 ? 5 : 8) : true;
      const freeReadId = pactId && ["veil", "vigil", "flare"].includes(pactId) && inFocusWindow(pactId) ? pactId : null;
      const readForbidden = pactBookRestrictions(book, roundNumber)?.forbidRead || pactId === "lighthouse"
        || (pactId === "vigil" && !inFocusWindow("vigil")) || (pactId === "flare" && !inFocusWindow("flare"));
      if (readForbidden && policy === "myopic" && night.focusRemaining >= rules.readCost
        && (night.round!.dealerUp.rank === "A" || night.round!.dealerUp.rank === "10")) renunciationBlocks++;
      const privilegeWindowEnd = pactId === "flare" ? (actEnd === 7 ? 5 : 8) : actEnd;
      const readMethod = selectFocusUse("read", policy, roundNumber, freeReadId ? privilegeWindowEnd : actEnd,
        !readForbidden && Boolean(freeReadId && privilegeLegal(freeReadId)),
        !readForbidden && night.focusRemaining >= rules.readCost,
        night.round!.dealerUp.rank === "A" || night.round!.dealerUp.rank === "10");
      let holeKnown: Card | undefined;
      if (readMethod === "free") {
        night = readDealerHoleWithPactPrivilege(night); book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
        holeKnown = night.round!.dealerHole;
      } else if (readMethod === "paid") {
        night = readDealerHole(night); holeKnown = night.round!.dealerHole;
        paidReadUses++;
        if (book.current?.status === "active" && book.current.privilege === "consumed") paidReadAfterPactPrivilegeConsumed++;
      } else night = skipRead(night);

      const freeManeuverId = pactId && ["iron", "vigil", "flare"].includes(pactId) && inFocusWindow(pactId) ? pactId : null;
      const restrictions = pactBookRestrictions(book, roundNumber);
      const maneuverForbidden = Boolean(restrictions?.forbidManeuver || restrictions?.forbiddenManeuverHand);
      const freeManeuver = Boolean(freeManeuverId && privilegeLegal(freeManeuverId) && !maneuverForbidden);
      const canPayManeuver = !maneuverForbidden && night.focusRemaining >= rules.maneuverCost;
      const targets = (["luz", "sombra"] as const).flatMap(handName => {
        const hand = night.round!.hands?.[handName];
        return hand?.status === "playing" && hand.cards.length === 2 && !hand.openingNatural
          ? ([0, 1] as const).map(cardIndex => ({ hand: handName, cardIndex })) : [];
      });
      let bestSwap: { hand: HandName; cardIndex: 0 | 1; value: number } | null = null;
      for (const target of targets) {
        const hand = night.round!.hands![target.hand]; const replaced = hand.cards[target.cardIndex]!;
        const swapped = [...hand.cards]; swapped[target.cardIndex] = night.round!.cofre;
        const before = solver.actions(hand.cards, night.round!.dealerUp).ev;
        const after = solver.actions(swapped, night.round!.dealerUp).ev;
        if (after > before + 1e-9 && (!bestSwap || after - before > bestSwap.value)) bestSwap = { ...target, value: after - before };
        void replaced;
      }
      if (maneuverForbidden && policy === "myopic" && night.focusRemaining >= rules.maneuverCost && bestSwap) renunciationBlocks++;
      const maneuverMethod = selectFocusUse("maneuver", policy, roundNumber,
        freeManeuverId === "flare" ? (actEnd === 7 ? 5 : 8) : actEnd,
        freeManeuver, canPayManeuver, Boolean(bestSwap), bestSwap?.value ?? 0);
      if (maneuverMethod !== "none" && bestSwap) {
        assertPactBookManeuverAllowed(book, roundNumber, bestSwap.hand);
        if (maneuverMethod === "free") {
          night = maneuverWithPactPrivilege(night, bestSwap.hand, bestSwap.cardIndex);
          book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
        } else {
          night = maneuver(night, bestSwap.hand, bestSwap.cardIndex); paidManeuverUses++;
          if (book.current?.status === "active") paidManeuverUsesUnderPact++;
        }
      } else night = skipManeuver(night);
      if (night.round?.phase === "focusWindow") night = continueAfterAbilities(night);
      void current;
      if (holeKnown) void holeKnown;
    }

    while (night.round?.phase === "player") {
      const round = night.round; const handName = round.currentHand!; const hand = round.hands![handName];
      const restrictions = pactBookRestrictions(book, roundNumber);
      const legal = legalCofreFocoActions(night, handName, restrictions);
      const recordAction = (action: Action, revealedNext?: string) => {
        const current = night.round!; const activeHand = current.hands![handName];
        actionTrace.push({ stateKey: JSON.stringify({ round: roundNumber, hand: handName, cards: activeHand.cards.map(card => card.rank),
          up: current.dealerUp.rank, legal: legalCofreFocoActions(night, handName, pactBookRestrictions(book, roundNumber)),
          focus: night.focusRemaining, pact: pactId, privilege: book.current?.privilege ?? "none",
          hole: current.readUsed ? current.dealerHole.rank : "unknown", category: current.dealerHoleCategory ?? "unknown",
          next: revealedNext ?? "unknown" }), action });
      };
      const ordinaryBest = chooseAction(policy, hand.cards, round.dealerUp, round.readUsed ? round.dealerHole : undefined, legal,
        solver, conditional);
      const unrestricted = chooseAction(policy, hand.cards, round.dealerUp, round.readUsed ? round.dealerHole : undefined,
        ["hit", "stand", "double"].filter(action => action !== "double" || hand.cards.length === 2) as Action[], solver, conditional);
      if (!legal.includes(unrestricted)) renunciationBlocks++;

      if (pactId === "order" && privilegeLegal("order") && shouldUsePrivilege(policy, roundNumber, actEnd, true,
        policy !== "conservative")) {
        const draw = getStreams(roundNumber)[handName];
        const preview = draw.peek();
        book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
        const withCard = [...hand.cards, preview];
        const after = handValue(withCard).bust ? -1 : solver.actions(withCard, round.dealerUp).ev;
        const stand = solver.actions(hand.cards, round.dealerUp).values.stand ?? -1;
        const action: Action = after > stand ? "hit" : "stand";
        recordAction(action, preview.rank);
        if (action === "hit" && legal.includes("hit")) { night = applyCofreFocoAction(night, "hit", draw, restrictions); hits++; }
        else { night = applyCofreFocoAction(night, "stand", draw, restrictions); stands++; }
        continue;
      }

      if (pactId === "oath" && privilegeLegal("oath")
        && shouldUsePrivilege(policy, roundNumber, actEnd, true, policy !== "conservative")) {
        const draw = getStreams(roundNumber)[handName];
        const nextCategory = cardCategory(draw.peek());
        book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
        const accept = nextCategory === "low" && legal.includes("hit");
        if (accept) {
          const nextCard = draw.peek();
          recordAction("hit", nextCategory);
          assertPactBookActionAllowed(book, roundNumber, handName, "hit", hand.cards);
          night = applyCofreFocoAction(night, "hit", draw, restrictions); hits++;
          const stillCurrent = night.round?.phase === "player" && night.round.currentHand === handName;
          if (stillCurrent && JSON.stringify(night.round!.hands![handName].cards.at(-1)) !== JSON.stringify(nextCard)) throw new Error("Juramento replay diverged from its public category preview.");
          if (stillCurrent && night.round!.hands![handName].status === "playing") { recordAction("stand"); night = applyCofreFocoAction(night, "stand", draw, restrictions); stands++; }
        } else {
          recordAction(ordinaryBest, nextCategory);
          assertPactBookActionAllowed(book, roundNumber, handName, ordinaryBest, hand.cards);
          night = applyCofreFocoAction(night, ordinaryBest, draw, restrictions);
          if (ordinaryBest === "hit") hits++; else if (ordinaryBest === "stand") stands++; else doubles++;
        }
        continue;
      }

      if (ordinaryBest === "stand" && pactId === "secondChance" && privilegeLegal("secondChance")
        && shouldUsePrivilege(policy, roundNumber, actEnd, true, handValue(hand.cards).total < 17)) {
        book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++;
        recordAction("hit");
        night = applyCofreFocoAction(night, "hit", getStreams(roundNumber)[handName], restrictions); hits++;
        if (night.round?.phase === "player" && night.round.currentHand === handName && night.round.hands![handName].status === "playing") {
          recordAction("stand");
          night = applyCofreFocoAction(night, "stand", getStreams(roundNumber)[handName], restrictions); stands++;
        }
        continue;
      }

      if (ordinaryBest === "stand" && pactId === "secondChance" && privilegeLegal("secondChance")) {
        // Declining is not consumption; it is a plain, legal stand through the same engine action.
      }

      if (ordinaryBest === "hit" && pactId === "impetus" && hand.cards.length === 3 && privilegeLegal("impetus")
        && shouldUsePrivilege(policy, roundNumber, actEnd, true, handValue(hand.cards).total >= 12)) {
        book = consumePactBookPrivilege(book, roundNumber);
        recordAction("double");
        night = applyPactImpetusDouble(night, getStreams(roundNumber)[handName]);
        privilegesUsed++; doubles++; continue;
      }

      if (ordinaryBest === "hit" && ["bastion", "reflection", "chaos"].includes(pactId ?? "")
        && privilegeLegal(pactId as PactId) && policy !== "conservative") {
        const draw = getStreams(roundNumber)[handName];
        const nextCard = draw();
        const pending = beginPactBookHit(night, () => nextCard, restrictions);
        const busts = handValue([...hand.cards, pending.round!.pendingHitCard!]).bust;
        let resolution: "normal" | "bastion" | "reflection" | "chaos" = "normal";
        let replacement: (() => Card) | undefined;
        let receiver: HandName | undefined;
        if (busts && pactId === "bastion") resolution = "bastion";
        else if (busts && pactId === "reflection") {
          const other: HandName = handName === "luz" ? "sombra" : "luz";
          const otherHand = round.hands![other];
          if (otherHand.status === "playing" && !handValue([...otherHand.cards, nextCard]).bust) { resolution = "reflection"; receiver = other; }
        } else if (busts && pactId === "chaos") { resolution = "chaos"; replacement = getStreams(roundNumber)[handName]; }
        if (resolution !== "normal") { book = consumePactBookPrivilege(book, roundNumber); privilegesUsed++; }
        recordAction("hit");
        night = resolvePactBookHit(pending, resolution, replacement, receiver, restrictions);
        hits++; continue;
      }

      const draw = getStreams(roundNumber)[handName];
      assertPactBookActionAllowed(book, roundNumber, handName, ordinaryBest, hand.cards);
      recordAction(ordinaryBest);
      night = applyCofreFocoAction(night, ordinaryBest, draw, restrictions);
      if (ordinaryBest === "hit") hits++; else if (ordinaryBest === "stand") stands++; else doubles++;
    }
    if (night.round?.phase === "dealer") night = playCofreFocoDealer(night, getStreams(roundNumber).dealer);
    if (night.round?.phase !== "complete" || night.round.score === undefined) throw new Error(`Round ${roundNumber} failed to settle in P8 simulator.`);
    const settled = settleBankroll(roundKind, stake, terms.coverage, night.round.score, night.round.settlement!, protectedFace);
    balanceTicks += settled.deltaTicks; protectedFace = null;
    if (balanceTicks < 0) throw new Error("Invariant P8: settlement made bankroll negative.");
    if (roundKind === "funded" && Math.floor(balanceTicks / 8) === 0) {
      const canUseRemainingAudacity = book.current?.choice === "audacity" && book.current.privilege === "available" && Math.floor(balanceTicks / 4) > 0;
      if (!canUseRemainingAudacity) practice = true;
    }
    score += night.round.score;
  }
  book = expirePactBook(book, "complete");
  const privilegesExpired = book.offers.filter(offer => offer.privilege === "expired").length;
  const acceptedPactCount = book.offers.filter(offer => offer.status === "expired" || offer.status === "active").length;
  const focusReadSpent = night.focusSpent.read; const focusManeuverSpent = night.focusSpent.maneuver;
  const focusSpent = focusReadSpent + focusManeuverSpent;
  return { metric: { score, bankDeltaTicks: balanceTicks - 300, finalBankTicks: balanceTicks, fundedRounds, practiceRounds,
    focusSpent, focusReadSpent, focusManeuverSpent, focusExpired: night.expiredFocus, privilegesUsed, privilegesExpired,
    paidReadUses, paidReadAfterPactPrivilegeConsumed, paidManeuverUses, paidManeuverUsesUnderPact, acceptedPactCount,
    renunciationBlocks, hits, stands, doubles }, actionTrace };
}

function cardCategory(card: Card): "ace" | "low" | "high" { return card.rank === "A" ? "ace" : Number(card.rank) <= 6 ? "low" : "high"; }

function settleBankroll(kind: "funded" | "practice", stake: number, coverage: number, score: number,
  settlement: Readonly<Record<HandName, Readonly<{ outcome: string; score: number }>>>, protectedFace: HandName | null) {
  const deltaTicks = kind === "funded" ? stake * score / 5 : 0;
  if (!Number.isSafeInteger(deltaTicks)) throw new Error("P8 A1a score did not settle in exact half-chip ticks.");
  if (deltaTicks < -2 * coverage * stake) throw new Error("P8 A1a score exceeded its reserve.");
  let refundTicks = 0;
  if (kind === "funded" && protectedFace && settlement[protectedFace]?.outcome === "loss") {
    refundTicks = stake * Math.abs(settlement[protectedFace]!.score) / 10;
    if (!Number.isSafeInteger(refundTicks) || refundTicks < 0 || refundTicks > 2 * stake) throw new Error("P8 Lastro refund is not valid half-chip ticks.");
  }
  return { deltaTicks: deltaTicks + refundTicks };
}

function emptyMetric(): NightMetric { return { score: 0, bankDeltaTicks: 0, finalBankTicks: 0, fundedRounds: 0, practiceRounds: 0,
  focusSpent: 0, focusReadSpent: 0, focusManeuverSpent: 0, focusExpired: 0, privilegesUsed: 0, privilegesExpired: 0,
  paidReadUses: 0, paidReadAfterPactPrivilegeConsumed: 0, paidManeuverUses: 0, paidManeuverUsesUnderPact: 0,
  acceptedPactCount: 0, renunciationBlocks: 0,
  hits: 0, stands: 0, doubles: 0 }; }

export function runPactDepthLab(options: { seed: string; nights: number }): PactDepthReport {
  if (!options.seed.trim()) throw new Error("A non-empty P8 seed is required.");
  if (!Number.isSafeInteger(options.nights) || options.nights < 1 || options.nights > 10000) throw new Error("nights must be in [1,10000].");
  const aggregate = new Map<CellKey, NightRun[]>();
  const pairedRefusal = new Map<string, Map<number, NightRun>>();
  const familyOptionsReported = PACT_BOOK_FAMILIES.map(family => ({ family, options: familyOptions[family] }));
  const solvers = Object.fromEntries(payouts.map(payout => {
    const rules = payout === "3:2" ? CF_LAB_01_3_TO_2 : CF_LAB_01_1_TO_1;
    const baselineRules = payout === "3:2" ? DF_SYM_01_3_TO_2 : DF_SYM_01_1_TO_1;
    return [payout, { rules, action: new EvSolver(baselineRules), conditional: new ConditionalRoundSolver(rules, baselineRules) }];
  })) as Record<PactDepthPayout, { rules: CofreFocoRules; action: EvSolver; conditional: ConditionalRoundSolver }>;

  for (const payout of payouts) for (const stakePolicy of stakes) for (const policy of policies) for (const family of PACT_BOOK_FAMILIES) for (const choice of choices) {
    const key = `${payout}|${stakePolicy}|${policy}|${family}|${choice}` as CellKey;
    const values: NightRun[] = [];
    for (let night = 0; night < options.nights; night++) {
      // The same scenario seed is reused across A/B/refusal and policy cells. Within a lane,
      // paths may diverge after decisions consume different numbers of cards.
      const seed = `NOCTE-P8-S:${options.seed}`;
      const run = runNight({ seed, index: night, family, choice, policy, stakePolicy, payout,
        rules: solvers[payout].rules, solver: solvers[payout].action, conditional: solvers[payout].conditional });
      values.push(run);
      if (choice === "refuse") {
        const pairKey = `${payout}|${stakePolicy}|${policy}|${family}`;
        let byNight = pairedRefusal.get(pairKey); if (!byNight) { byNight = new Map(); pairedRefusal.set(pairKey, byNight); }
        byNight.set(night, run);
      }
    }
    aggregate.set(key, values);
  }

  const results: PactDepthReport["results"][number][] = [];
  const metricNames = Object.keys(emptyMetric()) as (keyof NightMetric)[];
  for (const [key, values] of aggregate) {
    const [payout, stakePolicy, policy, family, choice] = key.split("|") as [PactDepthPayout, PactDepthStake, PactDepthPolicy, PactDepthFamily, PactDepthChoice];
    const pair = pairedRefusal.get(`${payout}|${stakePolicy}|${policy}|${family}`);
    const metricValues = values.map(run => run.metric);
    const differences = (name: "score" | "bankDeltaTicks") => metricValues.map((metric, i) => metric[name] - (pair?.get(i)?.metric[name] ?? metric[name]));
    const deltas = differences("score"); let wins = 0; let losses = 0; let ties = 0;
    for (const delta of deltas) { if (delta > 0) wins++; else if (delta < 0) losses++; else ties++; }
    const selectedPact = choice === "option-a" ? familyOptions[family][0] : choice === "option-b" ? familyOptions[family][1]
      : choice === "refuse" ? "refused" as const : "situational" as const;
    const oppositeChoice = choice === "option-a" ? "option-b" : choice === "option-b" ? "option-a" : null;
    const oppositeValues = oppositeChoice ? aggregate.get(`${payout}|${stakePolicy}|${policy}|${family}|${oppositeChoice}` as CellKey) : undefined;
    const oppositeDifferences = oppositeValues?.map((run, index) => metricValues[index]!.score - run.metric.score);
    let opponentWins = 0; let opponentLosses = 0; let opponentTies = 0;
    for (const difference of oppositeDifferences ?? []) { if (difference > 0) opponentWins++; else if (difference < 0) opponentLosses++; else opponentTies++; }
    const comparedPolicy: PactDepthPolicy | null = policy === "myopic" ? "conservative" : policy === "intertemporal" ? "myopic" : null;
    const peerRuns = comparedPolicy ? aggregate.get(`${payout}|${stakePolicy}|${comparedPolicy}|${family}|${choice}` as CellKey) : undefined;
    const actionDisagreement = peerRuns ? summarizeTraceDisagreement(values, peerRuns, comparedPolicy!) : null;
    results.push({ payout, stakePolicy, policy, family, choice, pactId: selectedPact,
      metrics: Object.fromEntries(metricNames.map(name => [name, summarize(metricValues.map(metric => metric[name]))])) as Record<keyof NightMetric, PactDepthSummary>,
      pairedVsRefuse: choice === "refuse" ? null : { score: summarize(differences("score")), bankrollTicks: summarize(differences("bankDeltaTicks")), wins, losses, ties },
      pairedVsOpposite: oppositeChoice && oppositeValues && oppositeDifferences ? { pactId: oppositeChoice === "option-a" ? familyOptions[family][0] : familyOptions[family][1],
        score: summarize(oppositeDifferences), bankrollTicks: summarize(metricValues.map((metric, index) => metric.bankDeltaTicks - oppositeValues[index]!.metric.bankDeltaTicks)),
        wins: opponentWins, losses: opponentLosses, ties: opponentTies } : null,
      actionDisagreement });
  }

  const audit: Record<PactDepthFamily, number> = Object.fromEntries(PACT_BOOK_FAMILIES.map(family => [family, 0])) as Record<PactDepthFamily, number>;
  const actIII: Record<PactDepthFamily, number> = Object.fromEntries(PACT_BOOK_FAMILIES.map(family => [family, 0])) as Record<PactDepthFamily, number>;
  let repeatedFamilyCount = 0;
  for (let i = 0; i < Math.max(10000, options.nights); i++) {
    const offerSeed = `NOCTE-P8-S:offer-audit:${options.seed}:${i}`;
    const first = refusePactBook(offerPactBook(createPactBook(), 4, offerSeed)!);
    const second = offerPactBook(first, 8, offerSeed)!;
    if (!first.current || !second.current) throw new Error("P8 random offer audit unexpectedly had no complete pair.");
    audit[first.current.family]++; actIII[second.current.family]++;
    if (first.current.family === second.current.family) repeatedFamilyCount++;
  }
  const acceptedNightSamplesPerPact = Object.fromEntries(pactIds.map(id => [id, 0])) as Record<PactId, number>;
  const privilegeUseEventsPerPact = Object.fromEntries(pactIds.map(id => [id, 0])) as Record<PactId, number>;
  for (const result of results) {
    if (result.choice !== "option-a" && result.choice !== "option-b") continue;
    const id = result.pactId as PactId;
    // Metrics are means over integer Night counts; round the reconstructed totals to
    // avoid floating-point artifacts such as 581.9999999999999 in the audit metadata.
    acceptedNightSamplesPerPact[id] += Math.round(result.metrics.acceptedPactCount.mean * result.metrics.acceptedPactCount.n);
    privilegeUseEventsPerPact[id] += Math.round(result.metrics.privilegesUsed.mean * result.metrics.privilegesUsed.n);
  }
  return { schemaVersion: 1, labVersion: PACT_DEPTH_LAB_VERSION, catalogVersion: "PACT-BOOK-0.1",
    agentVersion: PACT_DEPTH_AGENT_VERSION, cardStreamVersion: STREAM_VERSION,
    actionSolverVersion: SOLVER_VERSION, conditionalSolverVersion: CONDITIONAL_SOLVER_VERSION,
    seed: options.seed, nightsPerCell: options.nights, horizon: 10, payouts, families: familyOptionsReported,
    policies: { conservative: "Risk-averse threshold: stand at 15+, otherwise hit when legal; no voluntary Focus spending; free Privilege usage only on terminally forced paths (none are assumed optimum).",
      myopic: "Exact current-round solver for ordinary hit/stand/double decisions with currently legal information; privileges are used eagerly when the configured deterministic trigger applies.",
      intertemporal: "Exact current-round actions plus a transparent heuristic that delays one-use Privileges until their last eligible round and preserves paid Focus unless current exposed-state trigger is strong. Not a Bellman optimum." },
    stakePolicies: { "fixed-1": "Stake one chip per Face when covered; otherwise smaller maximum covered stake, then practice if none.",
      "fixed-5": "Stake five chips per Face when covered; otherwise maximum stake below five, then practice if none.",
      variable: "Maximum covered integer stake per Face for each round; Lastro cap and Audácia reserve rules apply." },
    protocol: "Each cell runs complete ten-round nights through @nocte/engine Cofre+Foco transitions, PactBook state, restrictions, pending-hit/settlement primitives, and the P7 experimental deal model. Act II is forced to one complete family to compare A/B/refusal under matched offers; Act III draws a seeded real non-repeating family and fixed A/B/refusal cells decline it, while situational cells apply the declared public-state selector. Each seed/payout/stake-policy is shared across strategy and pact-choice cells as common random numbers; per-lane streams are domain-separated and consumption can diverge after choices. Bet ledger is an analysis overlay using the P7/A1a tick contract; it never changes engine scores, Focus or skill points.",
    results, randomOfferAudit: { seeds: Math.max(10000, options.nights), actII: audit, actIII, repeatedFamilyCount },
    coverage: { catalogPacts: pactIds, forcedPairComparisons: PACT_BOOK_FAMILIES.length,
      choiceCells: choices, acceptedNightSamplesPerPact, privilegeUseEventsPerPact,
      unexercisedPrivileges: pactIds.filter(id => privilegeUseEventsPerPact[id] === 0), untestedPacts: [] },
    limitations: [
      "This is an offline model study, not a human playtest and not evidence of fun, learning, fairness or final-game balance.",
      "The action agents are three fixed heuristics; only ordinary current-round hit/stand/double evaluation is exact for the myopic/intertemporal agents. Privilege timing, composition with partial information, pact selection and bankroll sizing are heuristic; no policy is globally optimal.",
      "For isolated pair estimates, only the Act II family is forced; Act III is a valid seeded non-repeating offer but is declined in fixed A/B/refusal cells. Situational cells accept a heuristic-selected Act III pact. This does not estimate factorial interactions between two signed pacts.",
      "A/B/refusal comparisons use common random numbers and paired nights, but card sequences diverge after decisions consume different cards; paired confidence intervals describe this coupling, not identical observed cards or causal identification under a finite shoe.",
      "The infinite rank-with-replacement, S17, PACT-BOOK-0.1 / Cofre+Foco and A1a fictional-bankroll contracts are used. Stake is an accounting overlay and is not optimized jointly with strategic score; score, bankroll, Focus, privilege usage and blocked actions are separate outcomes.",
      "Confidence intervals are unadjusted paired normal 95% intervals over Night-level differences. Nine families, three policies and multiple metrics create multiplicity; treat subgroup and dominance scans as exploratory, not confirmatory.",
      "Situational pact selection fixes Luz for Iron/Bastião/Juramento unless the declared strategy-specific Lastro protection rule applies; optimal face-selection policies, imperfect human understanding and multiplayer mirrors are untested.",
      "The random-offer audit measures deterministic PRNG output across artificial seeds; it does not establish cryptographic security or real-world fairness.",
    ] };
}
