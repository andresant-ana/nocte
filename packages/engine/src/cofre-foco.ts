import {
  handValue,
  type Action,
  type Card,
  type CardSource,
  type HandName,
  type Outcome,
  type Partition,
  type SettledHand,
} from "./index.js";

export type { Rank, Card, HandName, Action, Partition, Outcome, SettledHand } from "./index.js";

export type CofreFocoRules = Readonly<{
  id: string;
  gameVersion: "DF-CF-0.1-lab";
  status: "EXPERIMENTAL";
  drawModel: "infinite-rank-with-replacement";
  dealerSoft17: "stand";
  dealerNaturalPeek: true;
  initialExposure: 10;
  naturalPayout: "3:2" | "1:1";
  focusPerNight: number;
  maneuverCost: number;
  readCost: number;
  hasCofre: boolean;
  maneuverEnabled: boolean;
  readEnabled: boolean;
  diagnosticControl: boolean;
}>;

/** Optional, version-specific rules context. Omitted for every existing profile. */
export type CofreFocoActionRestrictions = Readonly<{ forbiddenDoubleHand?: HandName; forbidManeuver?: boolean }>;
export type DealerHoleCategory = "ace" | "low" | "high";
export type PactPrivilegePayment = "focus" | "pact-privilege";

const profile = (payout: CofreFocoRules["naturalPayout"], id: CofreFocoRules["id"], options?: Partial<CofreFocoRules>): CofreFocoRules => Object.freeze({
  id, gameVersion: "DF-CF-0.1-lab", status: "EXPERIMENTAL", drawModel: "infinite-rank-with-replacement",
  dealerSoft17: "stand", dealerNaturalPeek: true, initialExposure: 10, naturalPayout: payout,
  focusPerNight: 3, maneuverCost: 1, readCost: 2, hasCofre: true, maneuverEnabled: true,
  readEnabled: true, diagnosticControl: false, ...options,
});

export const CF_LAB_01_3_TO_2 = profile("3:2", "DF-CF-0.1-lab-infinite-3to2");
export const CF_LAB_01_1_TO_1 = profile("1:1", "DF-CF-0.1-lab-infinite-1to1");
export const CF_LAB_01_BM_3_TO_2 = profile("3:2", "DF-CF-0.1-lab-bm-3to2", { readEnabled: false });
/** Non-gameplay control: free once-per-round reserve swap, with no Focus economy. */
export const CF_CONTROL_COFRE_FREE = profile("3:2", "DF-CF-0.1-control-cofre-free", {
  focusPerNight: 0, maneuverCost: 0, readCost: 4, readEnabled: false, diagnosticControl: true,
});
/** Non-gameplay control: private Read can spend Focus, while Cofre and Manobra are absent. */
export const CF_CONTROL_FOCUS_READ = profile("3:2", "DF-CF-0.1-control-focus-read", {
  hasCofre: false, maneuverEnabled: false, diagnosticControl: true,
});

export type CofreFocoDraws = Readonly<{
  /** Four player cards, kept on the same lane as the baseline. */
  initial: CardSource;
  /** Dealer upcard, hole and later dealer draws use a separate lane. */
  dealer: CardSource;
  /** The fifth card is isolated so it cannot shift any baseline draw. */
  cofre: CardSource;
}>;

export type CofreFocoHand = Readonly<{
  cards: readonly Card[];
  exposure: number;
  status: "playing" | "stood" | "busted" | "doubled";
  /** Set exactly once from the original two-card composition. */
  openingNatural: boolean;
  /** A post-maneuver A+10 is ordinary 21 and cannot act again. */
  maneuverTwentyOne: boolean;
}>;
export type CofreFocoRoundPhase = "compose" | "focusWindow" | "player" | "dealer" | "complete";
export type CofreFocoRound = Readonly<{
  phase: CofreFocoRoundPhase;
  roundNumber: number;
  originalCards: readonly Card[];
  dealerUp: Card;
  dealerHole: Card;
  dealerDraws: readonly Card[];
  cofre: Card;
  hands?: Readonly<Record<HandName, CofreFocoHand>>;
  currentHand?: HandName;
  naturalPeek: boolean;
  openingPartition?: Partition;
  openingNaturals?: Readonly<Record<HandName, boolean>>;
  focusAtStart: number;
  focusSpent: Readonly<{ read: number; maneuver: number }>;
  readDecisionMade: boolean;
  readUsed: boolean;
  maneuverDecisionMade: boolean;
  maneuverUsed: boolean;
  focusWindowOpened: boolean;
  settlement?: Readonly<Record<HandName, SettledHand>>;
  score?: number;
  /** P7 privilege: only an explicitly authorized coarse category, never the hidden card. */
  dealerHoleCategory?: DealerHoleCategory;
}>;

export type CofreFocoNight = Readonly<{
  rules: CofreFocoRules;
  horizon: number;
  roundNumber: number;
  completedRounds: number;
  focusRemaining: number;
  focusSpent: Readonly<{ read: number; maneuver: number }>;
  totalScore: number;
  expiredFocus: number;
  status: "active" | "complete" | "abandoned";
  round?: CofreFocoRound;
}>;

export type CofreFocoRecipient = "solo-player" | "observer";
export type PublicCofreFocoRound = Readonly<Omit<CofreFocoRound, "dealerHole" | "dealerDraws" | "openingNaturals" | "focusAtStart" | "naturalPeek" | "cofre"> & {
  cofre?: Card;
  dealerHole?: Card;
  dealerDraws?: readonly Card[];
  dealerTotal?: number;
  focusAtStart?: number;
  naturalPeek: boolean | null;
}>;
export type PublicCofreFocoNight = Readonly<Omit<CofreFocoNight, "rules" | "round"> & {
  rulesId: CofreFocoRules["id"];
  round?: PublicCofreFocoRound;
}>;

const handNames: readonly HandName[] = ["luz", "sombra"];
const clone = <T>(value: T): T => structuredClone(value);
const hasPendingHand = (round: CofreFocoRound): boolean => handNames.some(name => round.hands?.[name].status === "playing");

export function createNight(rules: CofreFocoRules = CF_LAB_01_3_TO_2, horizon = 10): CofreFocoNight {
  if (!Number.isSafeInteger(horizon) || horizon < 1 || horizon > 100) throw new Error("Night horizon must be an integer in [1,100].");
  const rulesSnapshot = Object.freeze({ ...rules });
  return { rules: rulesSnapshot, horizon, roundNumber: 0, completedRounds: 0, focusRemaining: rulesSnapshot.focusPerNight,
    focusSpent: { read: 0, maneuver: 0 }, totalScore: 0, expiredFocus: 0, status: "active" };
}

export function beginRound(night: CofreFocoNight, draws: CofreFocoDraws): CofreFocoNight {
  if (night.status !== "active") throw new Error("Cannot deal a round in a finished Night.");
  if (night.completedRounds >= night.horizon) throw new Error("Night horizon is already complete.");
  if (night.round && night.round.phase !== "complete") throw new Error("The previous round is not complete.");
  const originalCards = Array.from({ length: 4 }, () => clone(draws.initial()));
  const dealerUp = clone(draws.dealer());
  const dealerHole = clone(draws.dealer());
  const cofre = clone(draws.cofre());
  const roundNumber = night.completedRounds + 1;
  const round: CofreFocoRound = {
    phase: "compose", roundNumber, originalCards, dealerUp, dealerHole, dealerDraws: [], cofre,
    naturalPeek: handValue([dealerUp, dealerHole]).natural, focusAtStart: night.focusRemaining,
    focusSpent: { read: 0, maneuver: 0 }, readDecisionMade: false, readUsed: false,
    maneuverDecisionMade: false, maneuverUsed: false, focusWindowOpened: false,
  };
  return { ...night, roundNumber, round };
}

function validPartition(partition: Partition): boolean {
  const indices = [...partition.luz, ...partition.sombra];
  return indices.length === 4 && new Set(indices).size === 4 && indices.every(i => Number.isInteger(i) && i >= 0 && i < 4);
}

function makeHand(cards: readonly Card[], exposure: number): CofreFocoHand {
  const openingNatural = handValue(cards).natural;
  return { cards: [...cards], exposure, status: openingNatural ? "stood" : "playing", openingNatural, maneuverTwentyOne: false };
}

export function composeCofreFoco(night: CofreFocoNight, partition: Partition): CofreFocoNight {
  const round = night.round;
  if (night.status !== "active" || !round || round.phase !== "compose") throw new Error("Composition is illegal outside compose phase.");
  if (!validPartition(partition)) throw new Error("Invalid partition: each original card must be used exactly once.");
  const hands: Record<HandName, CofreFocoHand> = {
    luz: makeHand(partition.luz.map(i => clone(round.originalCards[i]!)), night.rules.initialExposure),
    sombra: makeHand(partition.sombra.map(i => clone(round.originalCards[i]!)), night.rules.initialExposure),
  };
  const openingNaturals = { luz: hands.luz.openingNatural, sombra: hands.sombra.openingNatural };
  const composed: CofreFocoRound = { ...round, hands, openingPartition: clone(partition), openingNaturals };
  if (round.naturalPeek) {
    const settled = dealerNaturalSettlement(night.rules, hands, [round.dealerUp, round.dealerHole]);
    return completeRound(night, { ...composed, phase: "complete", focusWindowOpened: false, settlement: settled,
      score: settled.luz.score + settled.sombra.score });
  }
  if (!hasPendingHand(composed)) return { ...night, round: { ...composed, phase: "dealer", focusWindowOpened: false,
    readDecisionMade: true, maneuverDecisionMade: true } };
  return { ...night, round: { ...composed, phase: "focusWindow", focusWindowOpened: true } };
}

export function skipRead(night: CofreFocoNight): CofreFocoNight {
  const round = requirePhase(night, "focusWindow");
  if (round.readDecisionMade) throw new Error("Read was already decided this round.");
  return { ...night, round: { ...round, readDecisionMade: true } };
}

export function readDealerHole(night: CofreFocoNight): CofreFocoNight {
  return readDealerHoleWithPayment(night, "focus");
}

/** PACT-LAB-0.1 only: marks Read used while leaving the Focus ledger untouched. */
export function readDealerHoleWithPactPrivilege(night: CofreFocoNight): CofreFocoNight {
  return readDealerHoleWithPayment(night, "pact-privilege");
}

/** P7 Farol: reveal a coarse hole-card category before composition without exposing rank or card. */
export function revealDealerHoleCategory(night: CofreFocoNight): CofreFocoNight {
  const round = requirePhase(night, "compose");
  if (round.dealerHoleCategory) throw new Error("A categoria do Farol já foi revelada nesta rodada.");
  const rank = round.dealerHole.rank;
  const category: DealerHoleCategory = rank === "A" ? "ace" : Number(rank) >= 2 && Number(rank) <= 6 ? "low" : "high";
  return { ...night, round: { ...round, dealerHoleCategory: category } };
}

function readDealerHoleWithPayment(night: CofreFocoNight, payment: PactPrivilegePayment): CofreFocoNight {
  const round = requirePhase(night, "focusWindow");
  if (!night.rules.readEnabled) throw new Error("Read is disabled in this diagnostic profile.");
  if (round.readDecisionMade || round.readUsed) throw new Error("Read is only available once per round.");
  if (!hasPendingHand(round)) throw new Error("Read requires at least one pending hand decision.");
  const cost = payment === "focus" ? night.rules.readCost : 0;
  if (night.focusRemaining < cost) throw new Error("Insufficient Focus for Read.");
  const spent = { ...round.focusSpent, read: cost };
  return { ...night, focusRemaining: night.focusRemaining - cost,
    focusSpent: { ...night.focusSpent, read: night.focusSpent.read + cost },
    round: { ...round, readDecisionMade: true, readUsed: true, focusSpent: spent } };
}

export function skipManeuver(night: CofreFocoNight): CofreFocoNight {
  const round = requirePhase(night, "focusWindow");
  if (!round.readDecisionMade) throw new Error("Decide Read before Manobra.");
  if (round.maneuverDecisionMade) throw new Error("Manobra was already decided this round.");
  return { ...night, round: { ...round, maneuverDecisionMade: true } };
}

export function maneuver(night: CofreFocoNight, handName: HandName, cardIndex: number): CofreFocoNight {
  return maneuverWithPayment(night, handName, cardIndex, "focus");
}

/** PACT-LAB-0.1 only: performs a normal legal Manobra without charging Focus. */
export function maneuverWithPactPrivilege(night: CofreFocoNight, handName: HandName, cardIndex: number): CofreFocoNight {
  return maneuverWithPayment(night, handName, cardIndex, "pact-privilege");
}

function maneuverWithPayment(night: CofreFocoNight, handName: HandName, cardIndex: number, payment: PactPrivilegePayment): CofreFocoNight {
  const round = requirePhase(night, "focusWindow");
  if (!night.rules.maneuverEnabled || !night.rules.hasCofre) throw new Error("Manobra is disabled in this diagnostic profile.");
  if (!round.readDecisionMade) throw new Error("Decide Read before Manobra.");
  if (round.maneuverDecisionMade || round.maneuverUsed) throw new Error("Manobra is only available once per round.");
  if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex > 1) throw new Error("Manobra card index must be 0 or 1.");
  const target = round.hands?.[handName];
  if (!target || target.status !== "playing" || target.openingNatural || target.cards.length !== 2) {
    throw new Error("Manobra requires an active original two-card hand.");
  }
  const cost = payment === "focus" ? night.rules.maneuverCost : 0;
  if (night.focusRemaining < cost) throw new Error("Insufficient Focus for Manobra.");
  const replaced = target.cards[cardIndex]!;
  const cards = [...target.cards]; cards[cardIndex] = clone(round.cofre);
  const postSwap = handValue(cards);
  const maneuverTwentyOne = postSwap.total === 21;
  const hands = { ...round.hands!, [handName]: { ...target, cards, openingNatural: false,
    maneuverTwentyOne, status: maneuverTwentyOne ? "stood" as const : target.status } };
  const swapped: CofreFocoRound = { ...round, hands, cofre: clone(replaced), maneuverDecisionMade: true,
    maneuverUsed: true, focusSpent: { ...round.focusSpent, maneuver: cost } };
  const nextNight = { ...night, focusRemaining: night.focusRemaining - cost,
    focusSpent: { ...night.focusSpent, maneuver: night.focusSpent.maneuver + cost } };
  return hasPendingHand(swapped) ? { ...nextNight, round: swapped } : { ...nextNight, round: { ...swapped, phase: "dealer" } };
}

export function continueAfterAbilities(night: CofreFocoNight): CofreFocoNight {
  const round = requirePhase(night, "focusWindow");
  if (!round.readDecisionMade || !round.maneuverDecisionMade) throw new Error("Resolve or skip both abilities before player actions.");
  return hasPendingHand(round) ? advanceToPlayer(night, round) : { ...night, round: { ...round, phase: "dealer" } };
}

export function legalCofreFocoActions(night: CofreFocoNight, handName?: HandName, restrictions?: CofreFocoActionRestrictions): readonly Action[] {
  const round = night.round;
  if (!round || night.status !== "active" || round.phase !== "player" || !round.currentHand || !round.hands) return [];
  if (handName && round.currentHand !== handName) return [];
  const hand = round.hands[round.currentHand];
  if (hand.status !== "playing" || hand.openingNatural || hand.maneuverTwentyOne) return [];
  if (hand.cards.length !== 2) return ["hit", "stand"];
  if (restrictions?.forbiddenDoubleHand === round.currentHand) return ["hit", "stand"];
  return ["hit", "stand", "double"];
}

export type LegalCofreFocoFocusOptions = Readonly<{
  canRead: boolean;
  canDecideRead: boolean;
  canDecideManeuver: boolean;
  maneuverTargets: readonly Readonly<{ hand: HandName; cardIndex: number }>[];
}>;

/** Legal Focus options for the current state; UI callers must not reimplement eligibility. */
export function legalCofreFocoFocusOptions(night: CofreFocoNight, freeManeuver = false): LegalCofreFocoFocusOptions {
  const round = night.round;
  const inWindow = night.status === "active" && round?.phase === "focusWindow";
  const canDecideRead = Boolean(inWindow && !round!.readDecisionMade);
  const canRead = Boolean(inWindow && night.rules.readEnabled && !round!.readDecisionMade && !round!.readUsed
    && hasPendingHand(round!) && night.focusRemaining >= night.rules.readCost);
  const canDecideManeuver = Boolean(inWindow && round!.readDecisionMade && !round!.maneuverDecisionMade);
  const canAffordManeuver = freeManeuver || night.focusRemaining >= night.rules.maneuverCost;
  const maneuverTargets = canDecideManeuver && canAffordManeuver && night.rules.maneuverEnabled && night.rules.hasCofre
    ? handNames.flatMap(hand => {
      const target = round!.hands?.[hand];
      return target && target.status === "playing" && !target.openingNatural && target.cards.length === 2
        ? ([0, 1] as const).map(cardIndex => ({ hand, cardIndex })) : [];
    }) : [];
  return structuredClone({ canRead, canDecideRead, canDecideManeuver, maneuverTargets });
}

export function applyCofreFocoAction(night: CofreFocoNight, action: Action, draw: CardSource, restrictions?: CofreFocoActionRestrictions): CofreFocoNight {
  const allowed = legalCofreFocoActions(night, undefined, restrictions);
  if (!allowed.includes(action)) throw new Error(`Illegal Duas Faces action: ${action}.`);
  const round = night.round!;
  const name = round.currentHand!;
  const current = round.hands![name];
  const cards = [...current.cards]; let exposure = current.exposure;
  let status: CofreFocoHand["status"] = current.status;
  if (action === "hit" || action === "double") cards.push(clone(draw()));
  if (action === "double") { exposure += night.rules.initialExposure; status = "doubled"; }
  if (action === "stand") status = "stood";
  if (handValue(cards).bust) status = "busted";
  const hands = { ...round.hands!, [name]: { ...current, cards, exposure, status } };
  const { currentHand: _currentHand, ...withoutCurrentHand } = round;
  const advanced = { ...withoutCurrentHand, hands, phase: "player" as const };
  return advanceHands(night, advanced);
}

/** P7 Ímpeto: only a three-card hand (exactly one normal Compra) may use the special post-hit double. */
export function applyPactImpetusDouble(night: CofreFocoNight, draw: CardSource): CofreFocoNight {
  const round = requirePhase(night, "player");
  const name = round.currentHand;
  const hand = name && round.hands?.[name];
  if (!name || !hand || hand.status !== "playing" || hand.cards.length !== 3 || hand.openingNatural || hand.maneuverTwentyOne) {
    throw new Error("Ímpeto só permite Dobrar depois de exatamente uma Compra normal.");
  }
  const cards = [...hand.cards, clone(draw())];
  const nextHand: CofreFocoHand = { ...hand, cards, exposure: hand.exposure + night.rules.initialExposure,
    status: handValue(cards).bust ? "busted" : "doubled" };
  const hands = { ...round.hands!, [name]: nextHand };
  const { currentHand: _currentHand, ...withoutCurrentHand } = round;
  return advanceHands(night, { ...withoutCurrentHand, hands, phase: "player" });
}

export function playCofreFocoDealer(night: CofreFocoNight, draw: CardSource): CofreFocoNight {
  const round = night.round;
  if (!round || night.status !== "active" || round.phase !== "dealer" || !round.hands) throw new Error("Dealer draw is illegal outside dealer phase.");
  const dealerCards = [round.dealerUp, round.dealerHole, ...round.dealerDraws].map(clone);
  while (handValue(dealerCards).total < 17) dealerCards.push(clone(draw()));
  const dealer = handValue(dealerCards);
  const dealerDraws = dealerCards.slice(2);
  const settlement: Record<HandName, SettledHand> = {
    luz: settle(night.rules, round.hands.luz, dealer),
    sombra: settle(night.rules, round.hands.sombra, dealer),
  };
  const completed: CofreFocoRound = { ...round, phase: "complete", dealerDraws, settlement,
    score: settlement.luz.score + settlement.sombra.score };
  return completeRound(night, completed);
}

export function abandonNight(night: CofreFocoNight): CofreFocoNight {
  if (night.status !== "active") throw new Error("Night is already finished.");
  return { ...night, status: "abandoned", expiredFocus: night.focusRemaining, focusRemaining: 0 };
}

export function projectCofreFoco(night: CofreFocoNight, recipient: CofreFocoRecipient): PublicCofreFocoNight {
  const round = night.round;
  let projected: PublicCofreFocoRound | undefined;
  if (round) {
    const { dealerHole: _hole, dealerDraws, openingNaturals: _naturals, focusAtStart: _focusAtStart,
      naturalPeek, cofre, ...safe } = round;
    const terminal = round.phase === "complete";
    projected = {
      ...safe,
      ...(night.rules.hasCofre ? { cofre: clone(cofre) } : {}),
      naturalPeek: round.phase === "compose" ? null : naturalPeek,
      ...(terminal || (recipient === "solo-player" && round.readUsed) ? { dealerHole: clone(round.dealerHole) } : {}),
      ...(terminal ? { dealerDraws: clone(dealerDraws), dealerTotal: handValue([round.dealerUp, round.dealerHole, ...dealerDraws]).total } : {}),
      ...(terminal ? { focusAtStart: round.focusAtStart } : {}),
    };
  }
  return clone({ rulesId: night.rules.id, horizon: night.horizon, roundNumber: night.roundNumber,
    completedRounds: night.completedRounds, focusRemaining: night.focusRemaining, focusSpent: night.focusSpent,
    totalScore: night.totalScore, expiredFocus: night.expiredFocus, status: night.status, ...(projected ? { round: projected } : {}) });
}

function requirePhase(night: CofreFocoNight, phase: CofreFocoRoundPhase): CofreFocoRound {
  if (night.status !== "active" || !night.round || night.round.phase !== phase) throw new Error(`Action is illegal outside ${phase} phase.`);
  return night.round;
}

function advanceToPlayer(night: CofreFocoNight, round: CofreFocoRound): CofreFocoNight {
  const { currentHand: _currentHand, ...withoutCurrentHand } = round;
  return advanceHands(night, { ...withoutCurrentHand, phase: "player" });
}

function advanceHands(night: CofreFocoNight, round: CofreFocoRound): CofreFocoNight {
  if (!round.hands) throw new Error("Hands must be composed before actions.");
  const hands = { ...round.hands };
  for (const name of handNames) {
    const hand = hands[name];
    if (hand.status === "playing" && !hand.openingNatural && !hand.maneuverTwentyOne) {
      return { ...night, round: { ...round, hands, phase: "player", currentHand: name } };
    }
    if (hand.status === "playing") hands[name] = { ...hand, status: "stood" };
  }
  const { currentHand: _current, ...withoutCurrent } = round;
  return { ...night, round: { ...withoutCurrent, hands, phase: "dealer" } };
}

function completeRound(night: CofreFocoNight, round: CofreFocoRound): CofreFocoNight {
  const completedRounds = night.completedRounds + 1;
  const totalScore = night.totalScore + (round.score ?? 0);
  const atEnd = completedRounds >= night.horizon;
  return { ...night, completedRounds, totalScore, round, status: atEnd ? "complete" : "active",
    ...(atEnd ? { expiredFocus: night.focusRemaining, focusRemaining: 0 } : {}) };
}

function dealerNaturalSettlement(rules: CofreFocoRules, hands: Record<HandName, CofreFocoHand>, dealerCards: readonly Card[]): Record<HandName, SettledHand> {
  const dealerTotal = handValue(dealerCards).total;
  return Object.fromEntries(handNames.map(name => {
    const hand = hands[name];
    return [name, { outcome: hand.openingNatural ? "push" : "loss", score: hand.openingNatural ? 0 : -rules.initialExposure,
      playerTotal: handValue(hand.cards).total, dealerTotal }];
  })) as Record<HandName, SettledHand>;
}

function settle(rules: CofreFocoRules, hand: CofreFocoHand, dealer: ReturnType<typeof handValue>): SettledHand {
  const player = handValue(hand.cards);
  let outcome: Outcome;
  if (player.bust) outcome = "loss";
  else if (dealer.bust || player.total > dealer.total) outcome = "win";
  else if (hand.openingNatural && player.total === 21 && dealer.total === 21 && !dealer.natural) outcome = "win";
  else if (player.total < dealer.total) outcome = "loss";
  else outcome = "push";
  const payout = hand.openingNatural && rules.naturalPayout === "3:2" ? 1.5 : 1;
  return { outcome, score: outcome === "win" ? hand.exposure * payout : outcome === "loss" ? -hand.exposure : 0,
    playerTotal: player.total, dealerTotal: dealer.total };
}
