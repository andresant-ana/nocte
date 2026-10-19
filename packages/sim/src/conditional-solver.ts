import { handValue, partitions, type Action, type Card, type HandName, type Partition, type RuleProfile, type Rank } from "@nocte/engine";
import type { CofreFocoRules } from "@nocte/engine/cofre-foco";
import { EvSolver, rankProbability, RANKS, EV_TOLERANCE } from "./solver.js";

export const CONDITIONAL_SOLVER_VERSION = "conditional-round-exact-focus-dp-approx-v1";
export type Ability = "conserve" | "maneuver" | "read" | "read+maneuver";
export type Swap = Readonly<{ hand: HandName; cardIndex: 0 | 1 }>;
export type FutureFocusValues = readonly number[];
export type ConditionalInput = Readonly<{
  visibleState: Readonly<{ cards: readonly Card[]; dealerUp: Card; cofre: Card }>;
  beliefState: "dealer-hole-unknown-before-peek";
  roundsRemaining: number;
  focus: number;
  /** V[r-1][remainingFocus], estimated by the separate training stream. */
  futureValues?: FutureFocusValues;
}>;
export type AbilityValue = Readonly<{ ability: Ability; ev: number; immediateEv: number; focusCost: number; swap?: Swap }>;
export type ConditionalDecision = Readonly<{
  ev: number;
  /** Exact expectation for the selected current-round policy; excludes future Nights. */
  immediateEv: number;
  rulesId: string;
  roundsRemaining: number;
  focusBudget: number;
  estimatedReadMarginalValue: number;
  estimatedManeuverMarginalValue: number;
  optionValues: readonly ConditionalActionValue[];
  partition: Partition;
  ability: Ability;
  focusCost: number;
  swap?: Swap;
  dealerNaturalProbability: number;
  noNaturalEv: number;
  provenance: "exact-current-round" | "exact-current-round-plus-estimated-continuation";
  postReadManeuverByHole?: Readonly<Partial<Record<Rank, Swap | null>>>;
}>;
export type ConditionalActionValue = Readonly<{ ability: Ability; expectedTotalEv: number; exactCurrentRoundEv: number;
  focusCost: number; partition: Partition; swap?: Swap; postReadManeuverByHole?: Readonly<Partial<Record<Rank, Swap | null>>> }>;
export type PerfectHoleInformationUpperBound = Readonly<{ ev: number; provenance: "exact-one-round-hole-information-upper-bound-not-player-policy" }>;

type Hand = { cards: readonly Card[]; natural: boolean; ordinaryTwentyOne: boolean };
type Composition = { luz: Hand; sombra: Hand };
type PlayerState = { low: number; ace: boolean };
type DealerDist = { bust: number; 17: number; 18: number; 19: number; 20: number; 21: number };
type ActionResult = Readonly<{ best: Action; ev: number; values: Readonly<Partial<Record<Action, number>>> }>;
const zeroDealer = (): DealerDist => ({ bust: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0 });
const addRank = (state: PlayerState, rank: Rank): PlayerState => ({ low: state.low + (rank === "A" ? 1 : Number(rank)), ace: state.ace || rank === "A" });
const totalOf = (state: PlayerState): number => state.ace && state.low + 10 <= 21 ? state.low + 10 : state.low;
const stateOf = (cards: readonly Card[]): PlayerState => cards.reduce<PlayerState>((state, card) => addRank(state, card.rank), { low: 0, ace: false });
const naturalProbability = (up: Card): number => up.rank === "A" ? 4 / 13 : up.rank === "10" ? 1 / 13 : 0;

/** Exact current-round values under the P2B-E rules; only continuation values are estimated. */
export class ConditionalRoundSolver {
  private readonly baseline: EvSolver;
  private readonly actionCache = new Map<string, ActionResult>();
  private readonly dealerCache = new Map<string, DealerDist>();
  constructor(readonly rules: CofreFocoRules, baselineRules: RuleProfile) {
    this.baseline = new EvSolver(baselineRules);
  }

  evaluate(input: ConditionalInput): ConditionalDecision {
    this.validate(input);
    const { cards, dealerUp, cofre } = input.visibleState;
    const pNatural = naturalProbability(dealerUp);
    const future = input.futureValues ?? [];
    const continuation = (remaining: number) => future[remaining] ?? 0;
    let best: ConditionalDecision | undefined;
    const bestByAbility = new Map<Ability, ConditionalActionValue>();
    let bestWithoutRead = Number.NEGATIVE_INFINITY; let bestWithRead = Number.NEGATIVE_INFINITY;
    let bestWithoutManeuver = Number.NEGATIVE_INFINITY; let bestWithManeuver = Number.NEGATIVE_INFINITY;
    for (const partition of partitions(cards)) {
      const composition = this.composition(cards, partition);
      const naturalScore = this.dealerNaturalScore(composition);
      const options = this.noNaturalOptions(composition, dealerUp, cofre, input.focus, continuation);
      for (const option of options) {
        // Focus is untouched by an opening dealer natural; continuation value survives that branch.
        const ev = pNatural * (naturalScore + continuation(input.focus)) + (1 - pNatural) * option.ev;
        const currentEv = pNatural * naturalScore + (1 - pNatural) * option.immediateEv;
        const candidate: ConditionalActionValue = { ability: option.ability, expectedTotalEv: ev, exactCurrentRoundEv: currentEv,
          focusCost: option.focusCost, partition, ...(option.swap ? { swap: option.swap } : {}),
          ...(option.holePolicy ? { postReadManeuverByHole: option.holePolicy } : {}) };
        const oldAction = bestByAbility.get(option.ability);
        if (!oldAction || ev > oldAction.expectedTotalEv + EV_TOLERANCE) bestByAbility.set(option.ability, candidate);
        if (option.ability === "read" || option.ability === "read+maneuver") bestWithRead = Math.max(bestWithRead, ev);
        else bestWithoutRead = Math.max(bestWithoutRead, ev);
        if (option.ability === "maneuver" || option.ability === "read+maneuver") bestWithManeuver = Math.max(bestWithManeuver, ev);
        else bestWithoutManeuver = Math.max(bestWithoutManeuver, ev);
        if (!best || ev > best.ev + EV_TOLERANCE) {
          best = { ev, partition, ability: option.ability, focusCost: option.focusCost, ...(option.swap ? { swap: option.swap } : {}),
            rulesId: this.rules.id, roundsRemaining: input.roundsRemaining, focusBudget: input.focus,
            estimatedReadMarginalValue: 0, estimatedManeuverMarginalValue: 0, optionValues: [],
            immediateEv: pNatural * naturalScore + (1 - pNatural) * option.immediateEv,
            dealerNaturalProbability: pNatural, noNaturalEv: option.immediateEv,
            ...(option.holePolicy ? { postReadManeuverByHole: option.holePolicy } : {}),
            provenance: future.length ? "exact-current-round-plus-estimated-continuation" : "exact-current-round" };
        }
      }
    }
    if (!best) throw new Error("No legal composition was evaluated.");
    return { ...best,
      estimatedReadMarginalValue: Number.isFinite(bestWithRead) && Number.isFinite(bestWithoutRead) ? bestWithRead - bestWithoutRead : 0,
      estimatedManeuverMarginalValue: Number.isFinite(bestWithManeuver) && Number.isFinite(bestWithoutManeuver) ? bestWithManeuver - bestWithoutManeuver : 0,
      optionValues: [...bestByAbility.values()] };
  }

  /** Exact current-round action values for one already composed public state. */
  actionValue(cards: readonly Card[], up: Card, hole?: Card, ordinaryTwentyOne = false): number {
    if (hole && ((up.rank === "A" && hole.rank === "10") || (up.rank === "10" && hole.rank === "A"))) {
      throw new Error("Conditional Read hole contradicts the negative dealer natural peek.");
    }
    const state = stateOf(cards);
    const total = totalOf(state);
    if (total > 21) return -1;
    if (cards.length === 2 && total === 21 && !ordinaryTwentyOne) {
      return this.rules.naturalPayout === "3:2" ? 1.5 : 1;
    }
    const dist = hole ? this.dealerAfterHole(up, hole) : this.baseline.dealerDistribution(up, "no-natural");
    if (cards.length === 2 && total === 21) return this.stand(total, dist);
    return this.solvePlayer(state, cards.length === 2, dist, `${up.rank}:${hole?.rank ?? "?"}`).ev;
  }
  /** Exact one-round upper bound: knows the dealer hole before composition, at no Read cost; never a realizable agent. */
  evaluatePerfectHoleInformation(input: Omit<ConditionalInput, "futureValues" | "beliefState" | "roundsRemaining">): PerfectHoleInformationUpperBound {
    if (input.visibleState.cards.length !== 4) throw new Error("Perfect-information bound requires exactly four initial player cards.");
    if (!Number.isSafeInteger(input.focus) || input.focus < 0 || input.focus > this.rules.focusPerNight) throw new Error("Focus budget is outside the configured profile.");
    let ev = 0;
    for (const rank of RANKS) {
      const hole = { rank } as Card; const probability = rankProbability(rank);
      const dealerNatural = (input.visibleState.dealerUp.rank === "A" && rank === "10") || (input.visibleState.dealerUp.rank === "10" && rank === "A");
      let best = Number.NEGATIVE_INFINITY;
      for (const partition of partitions(input.visibleState.cards)) {
        const composed = this.composition(input.visibleState.cards, partition);
        if (dealerNatural) best = Math.max(best, this.dealerNaturalScore(composed));
        else {
          let value = this.readValue(composed, input.visibleState.dealerUp, hole);
          if (this.rules.hasCofre && this.rules.maneuverEnabled && input.focus >= this.rules.maneuverCost) {
            for (const name of ["luz", "sombra"] as const) {
              const hand = composed[name]; if (hand.natural) continue;
              for (const cardIndex of [0, 1] as const) {
                value = Math.max(value, this.readValue(this.swapped(composed, input.visibleState.cofre, { hand: name, cardIndex }), input.visibleState.dealerUp, hole));
              }
            }
          }
          best = Math.max(best, value);
        }
      }
      ev += probability * best;
    }
    return { ev, provenance: "exact-one-round-hole-information-upper-bound-not-player-policy" };
  }
  bestAction(cards: readonly Card[], up: Card, hole?: Card, ordinaryTwentyOne = false): Action {
    if (hole && ((up.rank === "A" && hole.rank === "10") || (up.rank === "10" && hole.rank === "A"))) throw new Error("Conditional Read hole contradicts the negative dealer natural peek.");
    if (!hole && !ordinaryTwentyOne) return this.baseline.actions(cards, up).best;
    const state = stateOf(cards);
    if (totalOf(state) > 21 || (cards.length === 2 && totalOf(state) === 21)) return "stand";
    const dist = hole ? this.dealerAfterHole(up, hole) : this.baseline.dealerDistribution(up, "no-natural");
    return this.solvePlayer(state, cards.length === 2, dist, `${up.rank}:${hole?.rank ?? "?"}`).best;
  }

  private validate(input: ConditionalInput) {
    if (input.visibleState.cards.length !== 4) throw new Error("Conditional solver requires exactly four visible player cards.");
    if (!Number.isSafeInteger(input.focus) || input.focus < 0 || input.focus > this.rules.focusPerNight) throw new Error("Focus budget is outside the configured profile.");
    if (!Number.isSafeInteger(input.roundsRemaining) || input.roundsRemaining < 1) throw new Error("roundsRemaining must be a positive integer.");
    if (input.beliefState !== "dealer-hole-unknown-before-peek") throw new Error("Unsupported dealer-hole belief state.");
    if (input.futureValues && input.futureValues.length < input.focus + 1) throw new Error("Continuation value table must cover every remaining Focus amount.");
    if (input.futureValues && input.futureValues.some((value, index, values) => !Number.isFinite(value)
      || (index > 0 && value < values[index - 1]! - EV_TOLERANCE))) {
      throw new Error("Continuation values must be finite and non-decreasing with remaining Focus.");
    }
  }
  private composition(cards: readonly Card[], p: Partition): Composition {
    const make = (indices: readonly number[]): Hand => {
      const handCards = indices.map(index => cards[index]!);
      const natural = handValue(handCards).natural;
      return { cards: handCards, natural, ordinaryTwentyOne: false };
    };
    return { luz: make(p.luz), sombra: make(p.sombra) };
  }
  private dealerNaturalScore(c: Composition): number {
    return (c.luz.natural ? 0 : -1) + (c.sombra.natural ? 0 : -1);
  }
  private noNaturalOptions(c: Composition, up: Card, cofre: Card, focus: number, continuation: (f: number) => number): (AbilityValue & { holePolicy?: Partial<Record<Rank, Swap | null>> })[] {
    const options: (AbilityValue & { holePolicy?: Partial<Record<Rank, Swap | null>> })[] = [];
    const hands: readonly HandName[] = ["luz", "sombra"];
    const base = (hand: Hand) => hand.natural ? (this.rules.naturalPayout === "3:2" ? 1.5 : 1)
      : this.actionValue(hand.cards, up, undefined, hand.ordinaryTwentyOne);
    const conserve = base(c.luz) + base(c.sombra);
    options.push({ ability: "conserve", ev: conserve + continuation(focus), immediateEv: conserve, focusCost: 0 });
    const swaps: Swap[] = [];
    if (this.rules.hasCofre && this.rules.maneuverEnabled && focus >= this.rules.maneuverCost) {
      for (const name of hands) {
        const hand = c[name];
        if (hand.natural || hand.cards.length !== 2) continue;
        for (const cardIndex of [0, 1] as const) swaps.push({ hand: name, cardIndex });
      }
      for (const swap of swaps) {
        const altered = this.swapped(c, cofre, swap);
        const ev = base(altered.luz) + base(altered.sombra) + continuation(focus - this.rules.maneuverCost);
        options.push({ ability: "maneuver", ev, immediateEv: ev - continuation(focus - this.rules.maneuverCost), focusCost: this.rules.maneuverCost, swap });
      }
    }
    if (this.rules.readEnabled && focus >= this.rules.readCost && (!c.luz.natural || !c.sombra.natural)) {
      const readNoSwap = this.readExpectation(c, up) + continuation(focus - this.rules.readCost);
      options.push({ ability: "read", ev: readNoSwap, immediateEv: readNoSwap - continuation(focus - this.rules.readCost), focusCost: this.rules.readCost });
      if (this.rules.hasCofre && this.rules.maneuverEnabled && focus >= this.rules.readCost + this.rules.maneuverCost) {
        const readAndManeuver = this.readManeuverExpectation(c, up, cofre, focus, continuation);
        if (readAndManeuver) options.push({ ability: "read+maneuver", ev: readAndManeuver.ev, immediateEv: readAndManeuver.immediateEv,
          focusCost: readAndManeuver.focusCost, holePolicy: readAndManeuver.holePolicy });
      }
    }
    return options;
  }
  private readExpectation(c: Composition, up: Card): number {
    const probabilities = this.noNaturalHoleDistribution(up);
    let ev = 0;
    for (const [hole, p] of probabilities) {
      const luz = c.luz.natural ? (this.rules.naturalPayout === "3:2" ? 1.5 : 1) : this.actionValue(c.luz.cards, up, hole);
      const sombra = c.sombra.natural ? (this.rules.naturalPayout === "3:2" ? 1.5 : 1) : this.actionValue(c.sombra.cards, up, hole);
      ev += p * (luz + sombra);
    }
    return ev;
  }
  private readManeuverExpectation(c: Composition, up: Card, cofre: Card, focus: number, continuation: (f: number) => number): { ev: number; immediateEv: number; focusCost: number; holePolicy: Partial<Record<Rank, Swap | null>> } | undefined {
    let total = 0; let immediateTotal = 0; let usedManeuverProbability = 0; const probabilities = this.noNaturalHoleDistribution(up);
    const holePolicy: Partial<Record<Rank, Swap | null>> = {};
    for (const [hole, p] of probabilities) {
      let bestEv = this.readValue(c, up, hole) + continuation(focus - this.rules.readCost);
      let bestSwap: Swap | undefined;
      for (const name of ["luz", "sombra"] as const) {
        const hand = c[name];
        if (hand.natural || hand.cards.length !== 2) continue;
        for (const cardIndex of [0, 1] as const) {
          const swap = { hand: name, cardIndex } as const;
          const altered = this.swapped(c, cofre, swap);
          const value = this.readValue(altered, up, hole) + continuation(focus - this.rules.readCost - this.rules.maneuverCost);
          if (value > bestEv + EV_TOLERANCE) { bestEv = value; bestSwap = swap; }
        }
      }
      holePolicy[hole.rank] = bestSwap ?? null;
      if (bestSwap) usedManeuverProbability += p;
      total += p * bestEv;
      immediateTotal += p * (bestSwap ? this.readValue(this.swapped(c, cofre, bestSwap), up, hole) : this.readValue(c, up, hole));
    }
    return { ev: total, immediateEv: immediateTotal, focusCost: this.rules.readCost + usedManeuverProbability * this.rules.maneuverCost, holePolicy };
  }
  private readValue(c: Composition, up: Card, hole: Card): number {
    const value = (hand: Hand) => hand.natural ? (this.rules.naturalPayout === "3:2" ? 1.5 : 1) : this.actionValue(hand.cards, up, hole, hand.ordinaryTwentyOne);
    return value(c.luz) + value(c.sombra);
  }
  private swapped(c: Composition, cofre: Card, swap: Swap): Composition {
    const result = { luz: { ...c.luz }, sombra: { ...c.sombra } };
    const target = result[swap.hand]; const cards = [...target.cards];
    const removed = cards[swap.cardIndex]!; cards[swap.cardIndex] = cofre;
    const total = handValue(cards).total;
    result[swap.hand] = { cards, natural: false, ordinaryTwentyOne: total === 21 };
    // The discarded hand card becomes the visible reserve, though it does not change later options in this round.
    void removed;
    return result;
  }
  private noNaturalHoleDistribution(up: Card): readonly (readonly [Card, number])[] {
    const norm = 1 - naturalProbability(up);
    return RANKS.flatMap(rank => {
      if ((up.rank === "A" && rank === "10") || (up.rank === "10" && rank === "A")) return [];
      return [[{ rank } as Card, rankProbability(rank) / norm] as const];
    });
  }
  private dealerAfterHole(up: Card, hole: Card): DealerDist {
    return this.dealerAfterState(stateOf([up, hole]));
  }
  private dealerAfterState(state: PlayerState): DealerDist {
    const key = `${state.low}:${Number(state.ace)}`;
    const cached = this.dealerCache.get(key); if (cached) return cached;
    const dist = zeroDealer(); const total = totalOf(state);
    if (total > 21) dist.bust = 1;
    else if (total >= 17) dist[total as 17 | 18 | 19 | 20 | 21] = 1;
    else for (const rank of RANKS) {
      const next = this.dealerAfterState(addRank(state, rank));
      for (const key of Object.keys(dist) as (keyof DealerDist)[]) dist[key] += rankProbability(rank) * next[key];
    }
    this.dealerCache.set(key, dist); return dist;
  }
  private stand(total: number, dealer: DealerDist): number {
    if (total > 21) return -1;
    return dealer.bust + [17, 18, 19, 20, 21].reduce((sum, t) => sum + dealer[t as 17 | 18 | 19 | 20 | 21] * Math.sign(total - t), 0);
  }
  private solvePlayer(state: PlayerState, canDouble: boolean, dealer: DealerDist, dealerKey: string): ActionResult {
    const key = `${dealerKey}:${state.low}:${Number(state.ace)}:${Number(canDouble)}`;
    const cached = this.actionCache.get(key); if (cached !== undefined) return cached;
    const total = totalOf(state); if (total > 21) return { best: "stand", ev: -1, values: { stand: -1 } };
    const stand = this.stand(total, dealer); const values: Partial<Record<Action, number>> = { stand };
    let hit = 0; let double = 0;
    for (const rank of RANKS) {
      const next = addRank(state, rank); const weight = rankProbability(rank);
      hit += weight * (totalOf(next) > 21 ? -1 : this.solvePlayer(next, false, dealer, dealerKey).ev);
      if (canDouble) double += weight * 2 * this.stand(totalOf(next), dealer);
    }
    values.hit = hit; if (canDouble) values.double = double;
    let best: Action = "stand"; let ev = stand;
    for (const action of ["hit", "double"] as const) {
      const value = values[action];
      if (value !== undefined && value > ev + EV_TOLERANCE) { best = action; ev = value; }
    }
    const result = { best, ev, values };
    this.actionCache.set(key, result); return result;
  }
}
