import { handValue, type Card, type Partition, type RuleProfile } from "@nocte/engine";
import { chooseHeuristicPartition } from "./simulation.js";

export const POLICY_VERSION = "depth-explanatory-v1";
export type Policy = { id: string; description: string; kind: "fixed" | "learned";
  select: (cards: readonly Card[], up: Card, choices: readonly Partition[]) => number };
export const FEATURE_NAMES = ["naturals", "twenties", "elevens", "softHands", "minTotal", "maxTotal", "sumTotal", "dealer", "weakDealer"] as const;
export function features(cards: readonly Card[], up: Card, choice: Partition): number[] {
  const hands = [choice.luz, choice.sombra].map(indices => handValue(indices.map(i => cards[i]!)));
  const totals = hands.map(h => h.total); const dealer = up.rank === "A" ? 11 : Number(up.rank);
  return [hands.filter(h => h.natural).length, totals.filter(t => t === 20).length,
    totals.filter(t => t === 11).length, hands.filter(h => h.soft).length, Math.min(...totals), Math.max(...totals),
    totals[0]! + totals[1]!, dealer, Number(dealer >= 2 && dealer <= 6)];
}
export function scoreChoice(cards: readonly Card[], choices: readonly Partition[], score: (hands: ReturnType<typeof handValue>[]) => number): number {
  let best = -Infinity; let selected = 0;
  choices.forEach((choice, i) => {
    const value = score([choice.luz, choice.sombra].map(pair => handValue(pair.map(j => cards[j]!))));
    if (value > best + 1e-12) { best = value; selected = i; }
  });
  return selected;
}
export function fixedPolicies(rules: RuleProfile): Policy[] {
  return [
    { id: "p1a", kind: "fixed", description: "Unchanged P1A hand-total preference, additive; no upcard.",
      select: (cards, _up, choices) => choices.indexOf(chooseHeuristicPartition(cards, choices)) },
    { id: "eleven-twenty", kind: "fixed", description: "Per hand: natural 7, 20→5, 11→4, 19→3, 18→2, 17→1; otherwise total/40. Sum scores.",
      select: (cards, _up, choices) => scoreChoice(cards, choices, hands => hands.reduce((s, h) =>
        s + (h.natural ? 7 : h.total === 20 ? 5 : h.total === 11 ? 4 : h.total === 19 ? 3 : h.total === 18 ? 2 : h.total === 17 ? 1 : h.total / 40), 0)) },
    { id: "maximin", kind: "fixed", description: "Maximize weaker total, then stronger total; scores 100×min+max.",
      select: (cards, _up, choices) => scoreChoice(cards, choices, h => 100 * Math.min(h[0]!.total, h[1]!.total) + Math.max(h[0]!.total, h[1]!.total)) },
    { id: "sum-totals", kind: "fixed", description: "Maximize sum of opening totals, with minimum total as tie break (0.001×min).",
      select: (cards, _up, choices) => scoreChoice(cards, choices, h => h[0]!.total + h[1]!.total + 0.001 * Math.min(h[0]!.total, h[1]!.total)) },
    { id: "upcard-pocket", kind: "fixed", description: "Fixed pocket utility: natural payout; soft19+ .6/18 .25/other .05; hard17+ (total−17)×.25 + (.1 weak/−.15 strong); 11 .65 weak/.45 up7–9/0 other; 10 .45 weak/.25 up7–8/−.15 other; 9 .2 weak/−.15 strong; 12–16 −.05 weak/−.45 strong; other −.25. Weak=2–6; sum hands.",
      select: (cards, up, choices) => {
        const u = up.rank === "A" ? 11 : Number(up.rank); const weak = u >= 2 && u <= 6;
        return scoreChoice(cards, choices, hands => hands.reduce((sum, h) => {
          let score: number;
          if (h.natural) score = rules.naturalPayout === "3:2" ? 1.5 : 1;
          else if (h.soft) score = h.total >= 19 ? 0.6 : h.total === 18 ? 0.25 : 0.05;
          else if (h.total >= 17) score = (h.total - 17) * 0.25 + (weak ? 0.1 : -0.15);
          else if (h.total === 11) score = weak ? 0.65 : u <= 9 ? 0.45 : 0;
          else if (h.total === 10) score = weak ? 0.45 : u <= 8 ? 0.25 : -0.15;
          else if (h.total === 9) score = weak ? 0.2 : -0.15;
          else score = h.total >= 12 ? weak ? -0.05 : -0.45 : -0.25;
          return sum + score;
        }, 0));
      } },
  ];
}
