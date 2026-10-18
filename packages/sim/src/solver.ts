import { partitions, type Action, type Card, type Partition, type Rank, type RuleProfile } from "@nocte/engine";

export const SOLVER_VERSION = "dp-infinite-s17-v1";
export const EV_TOLERANCE = 1e-12;
export const RANKS: readonly Rank[] = Object.freeze(["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"]);
export const rankProbability = (rank: Rank): number => rank === "10" ? 4 / 13 : 1 / 13;
export const dealerNaturalProbability = (up: Card): number => up.rank === "A" ? 4 / 13 : up.rank === "10" ? 1 / 13 : 0;
export type DealerDistribution = { natural: number; bust: number; 17: number; 18: number; 19: number; 20: number; 21: number };
export type ActionEvaluation = { values: Partial<Record<Action, number>>; best: Action; ev: number };
type State = { low: number; ace: boolean };
export type HandEvaluation = { exAnte: number; afterPeek: number };
export type CompositionEvaluation = { partition: Partition; luz: HandEvaluation; sombra: HandEvaluation; ev: number };
export type CompositionInspection = {
  partitions: CompositionEvaluation[]; bestIndex: number; bestIndices: number[]; bestEv: number;
  randomDistinctEv: number; randomIndexedEv: number; optimizedMargin: number;
};
const emptyDistribution = (): DealerDistribution => ({ natural: 0, bust: 0, 17: 0, 18: 0, 19: 0, 20: 0, 21: 0 });
const add = (s: State, rank: Rank): State => ({ low: s.low + (rank === "A" ? 1 : Number(rank)), ace: s.ace || rank === "A" });
const total = (s: State): number => s.ace && s.low + 10 <= 21 ? s.low + 10 : s.low;
const stateOf = (cards: readonly Card[]): State => cards.reduce<State>((s, card) => add(s, card.rank), { low: 0, ace: false });

/** Exact expectation under the declared infinite-deck profile, in initial-hand units.
 * Public decisions consume permitted information only. No seed, hole or draw parameter exists.
 */
export class EvSolver {
  readonly rules: RuleProfile;
  private readonly dealerCache = new Map<string, DealerDistribution>();
  private readonly distributionCache = new Map<string, DealerDistribution>();
  private readonly actionCache = new Map<string, ActionEvaluation>();
  constructor(rules: RuleProfile) { this.rules = Object.freeze({ ...rules }); }

  private dealer(s: State): DealerDistribution {
    const key = `${s.low}:${Number(s.ace)}`;
    const cached = this.dealerCache.get(key); if (cached) return cached;
    const d = emptyDistribution(); const t = total(s);
    if (t > 21) d.bust = 1;
    else if (t >= 17) d[t as 17 | 18 | 19 | 20 | 21] = 1;
    else for (const rank of RANKS) {
      const branch = this.dealer(add(s, rank));
      for (const key of Object.keys(d) as (keyof DealerDistribution)[]) d[key] += rankProbability(rank) * branch[key];
    }
    this.dealerCache.set(key, d); return d;
  }

  dealerDistribution(up: Card, condition: "ex-ante" | "no-natural"): DealerDistribution {
    return { ...this.distribution(up, condition) };
  }
  private distribution(up: Card, condition: "ex-ante" | "no-natural"): DealerDistribution {
    const key = `${up.rank}:${condition}`;
    const cached = this.distributionCache.get(key); if (cached) return cached;
    const d = emptyDistribution();
    const normalization = condition === "no-natural" ? 1 - dealerNaturalProbability(up) : 1;
    for (const rank of RANKS) {
      const natural = (up.rank === "A" && rank === "10") || (up.rank === "10" && rank === "A");
      if (natural && condition === "no-natural") continue;
      const p = rankProbability(rank) / normalization;
      if (natural) d.natural += p;
      else {
        const branch = this.dealer(add(stateOf([up]), rank));
        for (const k of Object.keys(d) as (keyof DealerDistribution)[]) d[k] += p * branch[k];
      }
    }
    this.distributionCache.set(key, d); return d;
  }

  private stand(s: State, up: Card): number {
    const t = total(s); if (t > 21) return -1;
    const d = this.distribution(up, "no-natural");
    let value = d.bust;
    for (const dealerTotal of [17, 18, 19, 20, 21] as const) value += d[dealerTotal] * Math.sign(t - dealerTotal);
    return value;
  }
  private solveState(s: State, up: Card, canDouble: boolean): ActionEvaluation {
    const key = `${up.rank}:${s.low}:${Number(s.ace)}:${Number(canDouble)}`;
    const cached = this.actionCache.get(key); if (cached) return cached;
    const values: Partial<Record<Action, number>> = { stand: this.stand(s, up) };
    let hit = 0; let double = 0;
    for (const rank of RANKS) {
      const next = add(s, rank); const p = rankProbability(rank);
      hit += p * (total(next) > 21 ? -1 : this.solveState(next, up, false).ev);
      if (canDouble) double += p * 2 * this.stand(next, up);
    }
    values.hit = hit;
    if (canDouble) values.double = double;
    let best: Action = "stand"; let ev = values.stand!;
    for (const action of ["hit", "double"] as const) {
      const v = values[action];
      if (v !== undefined && v > ev + EV_TOLERANCE) { best = action; ev = v; }
    }
    const result = { values, best, ev }; this.actionCache.set(key, result); return result;
  }
  actions(cards: readonly Card[], up: Card): ActionEvaluation {
    if (cards.length < 2) throw new Error("Player hand requires at least two cards.");
    const s = stateOf(cards);
    if (total(s) > 21) throw new Error("Bust hands cannot act.");
    if (cards.length === 2 && total(s) === 21) {
      const payout = this.rules.naturalPayout === "3:2" ? 1.5 : 1;
      return { values: { stand: payout }, best: "stand", ev: payout };
    }
    return structuredClone(this.solveState(s, up, cards.length === 2));
  }
  evaluateHand(cards: readonly Card[], up: Card): HandEvaluation {
    const s = stateOf(cards); const natural = cards.length === 2 && total(s) === 21;
    const afterPeek = this.actions(cards, up).ev;
    const p = dealerNaturalProbability(up);
    return { exAnte: p * (natural ? 0 : -1) + (1 - p) * afterPeek, afterPeek };
  }
  inspect(cards: readonly Card[], up: Card): CompositionInspection {
    const evaluations = partitions(cards).map(partition => {
      const luz = this.evaluateHand(partition.luz.map(i => cards[i]!), up);
      const sombra = this.evaluateHand(partition.sombra.map(i => cards[i]!), up);
      return { partition, luz, sombra, ev: luz.exAnte + sombra.exAnte };
    });
    const bestEv = Math.max(...evaluations.map(p => p.ev));
    const bestIndices = evaluations.flatMap((p, i) => bestEv - p.ev <= EV_TOLERANCE ? [i] : []);
    const randomDistinctEv = evaluations.reduce((s, p) => s + p.ev, 0) / evaluations.length;
    const randomIndexedEv = [[0, 1, 2, 3], [0, 2, 1, 3], [0, 3, 1, 2]].reduce((sum, indices) =>
      sum + this.evaluateHand(indices.slice(0, 2).map(i => cards[i]!), up).exAnte
        + this.evaluateHand(indices.slice(2).map(i => cards[i]!), up).exAnte, 0) / 3;
    return { partitions: evaluations, bestIndex: bestIndices[0]!, bestIndices, bestEv, randomDistinctEv,
      randomIndexedEv, optimizedMargin: bestEv - randomDistinctEv };
  }
  cacheSizes() { return { dealerStates: this.dealerCache.size, distributions: this.distributionCache.size, actionStates: this.actionCache.size }; }
}
