import { partitions, type Card, type Partition } from "@nocte/engine";
import type { Policy } from "./depth-policies.js";
import type { CompositionInspection } from "./solver.js";
const compositionKey = (cards: readonly Card[], choice: Partition) => [choice.luz, choice.sombra]
  .map(pair => pair.map(i => cards[i]!.rank).sort().join("+")).sort().join("|");
export function* uniqueOrders(cards: readonly Card[]): Generator<Card[]> {
  if (!cards.length) { yield []; return; }
  const seen = new Set<string>();
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i]!; if (seen.has(card.rank)) continue; seen.add(card.rank);
    for (const rest of uniqueOrders(cards.filter((_, j) => i !== j))) yield [card, ...rest];
  }
}
export function publicSelections(cards: readonly Card[], up: Card, canonicalCards: readonly Card[], inspection: CompositionInspection, policies: readonly Policy[]) {
  const canonical = new Map(inspection.partitions.map((p, i) => [compositionKey(canonicalCards, p.partition), i]));
  const choices = partitions(cards);
  const canonicalIndices = choices.map(p => canonical.get(compositionKey(cards, p))!);
  const indices = Object.fromEntries(policies.map(p => [p.id, p.select(cards, up, choices)]));
  indices.optimal = canonicalIndices.findIndex(i => inspection.bestIndices.includes(i));
  return { choices, canonicalIndices, indices };
}
/** Each distinct dealt order is equally probable conditional on the rank multiset. */
export function orderDistribution(cards: readonly Card[], up: Card, inspection: CompositionInspection, policies: readonly Policy[]) {
  const orders = [...uniqueOrders(cards)];
  const probabilities = Object.fromEntries(policies.map(p => [p.id, inspection.partitions.map(() => 0)]));
  const overlap: Record<string, { same: number; equalEv: number }> = {};
  for (const ordered of orders) {
    const selected = publicSelections(ordered, up, cards, inspection, policies);
    const indices: Record<string, number> = {};
    for (const policy of policies) {
      const i = selected.canonicalIndices[selected.indices[policy.id]!]!;
      indices[policy.id] = i; probabilities[policy.id]![i]! += 1 / orders.length;
    }
    policies.forEach((a, i) => policies.slice(i + 1).forEach(b => {
      const key = `${a.id}|${b.id}`; const entry = overlap[key] ?? { same: 0, equalEv: 0 };
      if (indices[a.id] === indices[b.id]) entry.same += 1 / orders.length;
      if (Math.abs(inspection.partitions[indices[a.id]!]!.ev - inspection.partitions[indices[b.id]!]!.ev) <= 1e-12) entry.equalEv += 1 / orders.length;
      overlap[key] = entry;
    }));
  }
  return { orders: orders.length, probabilities, overlap };
}
