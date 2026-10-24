export type Rank = "A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10";
export type FaceRank = Rank | "J" | "Q" | "K";
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
/** Presentation-only identity. `rank` remains the immutable mathematical value consumed by every ruleset and solver. */
export type CardArt = Readonly<{ faceRank: FaceRank; suit: Suit }>;
export type Card = Readonly<{ rank: Rank; art?: CardArt }>;
export type HandName = "luz" | "sombra";
export type Action = "hit" | "stand" | "double";
export type NaturalPayout = "3:2" | "1:1";
export type RuleProfile = Readonly<{
  id: "DF-SYM-0.1-lab-infinite-3to2-peek-natural-first" | "DF-SYM-0.1-lab-infinite-1to1-peek-natural-first";
  gameVersion: "DF-SYM-0.1";
  status: "EXPERIMENTAL";
  drawModel: "infinite-rank-with-replacement";
  dealerSoft17: "stand";
  dealerNaturalPeek: true;
  composedNaturalBeatsNonNatural21: true;
  initialExposure: 10;
  naturalPayout: NaturalPayout;
}>;

export const DF_SYM_01_3_TO_2: RuleProfile = Object.freeze({
  id: "DF-SYM-0.1-lab-infinite-3to2-peek-natural-first", gameVersion: "DF-SYM-0.1",
  status: "EXPERIMENTAL", drawModel: "infinite-rank-with-replacement",
  dealerSoft17: "stand", dealerNaturalPeek: true, composedNaturalBeatsNonNatural21: true,
  initialExposure: 10, naturalPayout: "3:2",
});
export const DF_SYM_01_1_TO_1: RuleProfile = Object.freeze({ ...DF_SYM_01_3_TO_2,
  id: "DF-SYM-0.1-lab-infinite-1to1-peek-natural-first", naturalPayout: "1:1",
});

export type HandValue = Readonly<{ total: number; soft: boolean; bust: boolean; natural: boolean }>;
export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    if (card.rank === "A") { total += 11; aces += 1; }
    else total += card.rank === "10" ? 10 : Number(card.rank);
  }
  while (total > 21 && aces > 0) { total -= 10; aces -= 1; }
  const soft = aces > 0;
  return { total, soft, bust: total > 21, natural: cards.length === 2 && total === 21 };
}

export type Partition = Readonly<{ luz: readonly [number, number]; sombra: readonly [number, number] }>;
const pairKey = (cards: readonly Card[], pair: readonly number[]) => JSON.stringify(pair.map(i => cards[i]!.rank).sort());
export function partitions(cards: readonly Card[]): Partition[] {
  if (cards.length !== 4) throw new Error("A composição exige exatamente quatro cartas.");
  const all = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]] as const;
  const seen = new Set<string>();
  const result: Partition[] = [];
  for (const [a, b, c, d] of all) {
    const left = [a, b] as const; const right = [c, d] as const;
    const keys = [pairKey(cards, left), pairKey(cards, right)].sort();
    const key = JSON.stringify(keys);
    if (!seen.has(key)) { seen.add(key); result.push({ luz: left, sombra: right }); }
  }
  return result;
}

export type HandState = Readonly<{ cards: readonly Card[]; exposure: number; status: "playing" | "stood" | "busted" | "doubled" }>;
export type RoundPhase = "compose" | "player" | "dealer" | "complete";
export type Outcome = "win" | "loss" | "push";
export type SettledHand = Readonly<{ outcome: Outcome; score: number; playerTotal: number; dealerTotal: number }>;
export type InternalRound = {
  readonly rules: RuleProfile;
  readonly originalCards: readonly Card[];
  readonly dealerUp: Card;
  readonly dealerHole: Card;
  readonly dealerDraws: Card[];
  readonly hands?: Record<HandName, HandState>;
  readonly currentHand?: HandName;
  readonly phase: RoundPhase;
  readonly naturalPeek: boolean;
  readonly settlement?: Record<HandName, SettledHand>;
};
export type PublicRound = Readonly<{
  rulesId: RuleProfile["id"];
  gameVersion: "DF-SYM-0.1";
  phase: RoundPhase;
  originalCards: readonly Card[];
  dealerUp: Card;
  dealerHole?: Card;
  /** Dealer draws are visible only in the detached terminal projection. */
  dealerDraws?: readonly Card[];
  hands?: Record<HandName, HandState>;
  currentHand?: HandName;
  legalActions: readonly Action[];
  /** null until the post-composition peek is revealed; never a pre-peek oracle. */
  naturalPeek: boolean | null;
  settlement?: Record<HandName, SettledHand>;
}>;
/** Optional non-consuming preview for isolated, explicitly authorized Pact privileges. */
export type CardSource = (() => Card) & { peek?: () => Card };

export function createRound(draw: CardSource, rules: RuleProfile = DF_SYM_01_3_TO_2): InternalRound {
  const originalCards = [draw(), draw(), draw(), draw()];
  const dealerUp = draw(); const dealerHole = draw();
  const naturalPeek = handValue([dealerUp, dealerHole]).natural;
  return { rules, originalCards, dealerUp, dealerHole, dealerDraws: [], phase: "compose", naturalPeek };
}

export function legalActions(round: InternalRound): readonly Action[] {
  if (round.phase !== "player" || !round.currentHand || !round.hands || round.naturalPeek) return [];
  const hand = round.hands[round.currentHand];
  if (hand.status !== "playing") return [];
  return hand.cards.length === 2 ? ["hit", "stand", "double"] : ["hit", "stand"];
}

export function compose(round: InternalRound, partition: Partition): InternalRound {
  if (round.phase !== "compose") throw new Error("Composição ilegal fora da fase compose.");
  const indices = [...partition.luz, ...partition.sombra];
  if (indices.length !== 4 || new Set(indices).size !== 4 || indices.some(i => !Number.isInteger(i) || i < 0 || i > 3)) {
    throw new Error("Partição inválida: cada carta inicial deve ser usada uma vez.");
  }
  const hands: Record<HandName, HandState> = {
    luz: { cards: partition.luz.map(i => round.originalCards[i]!), exposure: round.rules.initialExposure, status: round.naturalPeek ? "stood" : "playing" },
    sombra: { cards: partition.sombra.map(i => round.originalCards[i]!), exposure: round.rules.initialExposure, status: round.naturalPeek ? "stood" : "playing" },
  };
  if (round.naturalPeek) {
    return { ...round, hands, phase: "complete", settlement: dealerNaturalSettlement(round, hands) };
  }
  const first = handValue(hands.luz.cards).natural ? "sombra" : "luz";
  const state: InternalRound = { ...round, hands, currentHand: first, phase: "player" };
  return advanceHand(state);
}

function advanceHand(round: InternalRound): InternalRound {
  if (!round.hands) return round;
  const hands = { ...round.hands };
  for (const name of ["luz", "sombra"] as const) {
    const hand = hands[name];
    if (hand.status === "playing" && !handValue(hand.cards).natural) return { ...round, hands, currentHand: name, phase: "player" };
    if (hand.status === "playing") hands[name] = { ...hand, status: "stood" };
  }
  const { currentHand: _completedHand, ...withoutCurrentHand } = round;
  return { ...withoutCurrentHand, hands, phase: "dealer" };
}

export function applyAction(round: InternalRound, action: Action, draw: CardSource): InternalRound {
  const allowed = legalActions(round);
  if (!allowed.includes(action)) throw new Error(`Ação ilegal: ${action}.`);
  const name = round.currentHand!; const current = round.hands![name];
  let cards = [...current.cards]; let exposure = current.exposure; let status: HandState["status"] = current.status;
  if (action === "hit" || action === "double") cards.push(draw());
  if (action === "double") { exposure += round.rules.initialExposure; status = "doubled"; }
  if (action === "stand") status = "stood";
  if (handValue(cards).bust) status = "busted";
  const hands = { ...round.hands!, [name]: { cards, exposure, status } };
  return advanceHand({ ...round, hands });
}

export function playDealer(round: InternalRound, draw: CardSource): InternalRound {
  if (round.phase !== "dealer" || !round.hands) throw new Error("Compra do dealer ilegal fora da fase dealer.");
  const dealerCards = [round.dealerUp, round.dealerHole, ...round.dealerDraws];
  while (handValue(dealerCards).total < 17) dealerCards.push(draw());
  const dealerDraws = dealerCards.slice(2);
  const dealer = handValue(dealerCards);
  const settlement: Record<HandName, SettledHand> = { luz: settle(round, round.hands.luz, dealer), sombra: settle(round, round.hands.sombra, dealer) };
  return { ...round, dealerDraws, phase: "complete", settlement };
}

function settle(round: InternalRound, hand: HandState, dealer: HandValue): SettledHand {
  const player = handValue(hand.cards);
  let outcome: Outcome;
  if (player.bust) outcome = "loss";
  else if (dealer.bust || player.total > dealer.total) outcome = "win";
  else if (round.rules.composedNaturalBeatsNonNatural21 && player.natural && dealer.total === 21 && !dealer.natural) outcome = "win";
  else if (player.total < dealer.total) outcome = "loss";
  else outcome = "push";
  const naturalBonus = player.natural && round.rules.naturalPayout === "3:2" ? 1.5 : 1;
  const score = outcome === "win" ? hand.exposure * (player.natural ? naturalBonus : 1) : outcome === "loss" ? -hand.exposure : 0;
  return { outcome, score, playerTotal: player.total, dealerTotal: dealer.total };
}

function dealerNaturalSettlement(round: InternalRound, hands: Record<HandName, HandState>): Record<HandName, SettledHand> {
  const settleOne = (cards: readonly Card[]): SettledHand => {
    const natural = handValue(cards).natural;
    return { outcome: natural ? "push" : "loss", score: natural ? 0 : -round.rules.initialExposure,
      playerTotal: handValue(cards).total, dealerTotal: handValue([round.dealerUp, round.dealerHole]).total };
  };
  return { luz: settleOne(hands.luz.cards), sombra: settleOne(hands.sombra.cards) };
}

export function publicRound(round: InternalRound): PublicRound {
  const base: PublicRound = {
    rulesId: round.rules.id, gameVersion: round.rules.gameVersion, phase: round.phase,
    originalCards: round.originalCards, dealerUp: round.dealerUp,
    ...(round.phase === "complete" ? { dealerHole: round.dealerHole, dealerDraws: round.dealerDraws } : {}),
    legalActions: legalActions(round), naturalPeek: round.phase === "compose" ? null : round.naturalPeek,
    ...(round.hands ? { hands: round.hands } : {}),
    ...(round.currentHand ? { currentHand: round.currentHand } : {}),
    ...(round.settlement ? { settlement: round.settlement } : {}),
  };
  // Readonly is a compile-time contract; detach every nested object at runtime.
  return structuredClone(base);
}

export function roundScore(round: InternalRound): number {
  if (round.phase !== "complete" || !round.settlement) throw new Error("Pontuação indisponível antes do término.");
  return round.settlement.luz.score + round.settlement.sombra.score;
}
