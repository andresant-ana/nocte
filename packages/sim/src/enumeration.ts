import type { Card } from "@nocte/engine";
import { EvSolver, RANKS, rankProbability } from "./solver.js";

/** Multiset quadrature independent from seeded sampling. 715 multisets × 10 upcards. */
export function enumerate(solver: EvSolver) {
  let classes = 0; let totalWeight = 0; let bestEv = 0; let randomDistinctEv = 0; let randomIndexedEv = 0;
  let gapAbove02 = 0; let optimalTies = 0;
  const factorial = [1, 1, 2, 6, 24];
  for (let a = 0; a < 10; a++) for (let b = a; b < 10; b++)
    for (let c = b; c < 10; c++) for (let d = c; d < 10; d++) {
      const cards: Card[] = [a, b, c, d].map(i => ({ rank: RANKS[i]! }));
      const counts = new Map<string, number>();
      for (const card of cards) counts.set(card.rank, (counts.get(card.rank) ?? 0) + 1);
      let weight = 24 * cards.reduce((p, card) => p * rankProbability(card.rank), 1);
      for (const count of counts.values()) weight /= factorial[count]!;
      for (const rank of RANKS) {
        const w = weight * rankProbability(rank); const result = solver.inspect(cards, { rank });
        classes++; totalWeight += w;
        bestEv += w * result.bestEv; randomDistinctEv += w * result.randomDistinctEv; randomIndexedEv += w * result.randomIndexedEv;
        if (result.bestEv - Math.min(...result.partitions.map(p => p.ev)) > 0.2) gapAbove02 += w;
        if (result.bestIndices.length > 1) optimalTies += w;
      }
    }
  return { classes, totalWeight, units: "initial-hand exposure (10 match points)" as const,
    bestEv, randomDistinctEv, randomIndexedEv, distinctMargin: bestEv - randomDistinctEv,
    indexedMargin: bestEv - randomIndexedEv, fractionBestWorstGapAbove02: gapAbove02,
    fractionMultipleOptimalDistinctPartitions: optimalTies };
}
