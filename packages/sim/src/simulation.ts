import {
  DF_SYM_01_3_TO_2, applyAction, compose, createRound, handValue, legalActions,
  partitions, playDealer, roundScore,
  type Card, type HandName, type InternalRound, type Partition, type RuleProfile,
} from "@nocte/engine";
import { SeededRandom } from "./random.js";

export type StrategyName = "random-partition" | "heuristic-partition";
export type StrategySummary = Readonly<{
  scenarios: number; totalScore: number; meanScorePerRound: number;
  wins: number; losses: number; pushes: number; busts: number;
}>;
export type SimulationReport = Readonly<{
  schemaVersion: 1; simulatorVersion: "0.1.0"; rngVersion: "fnv1a32-xorshift32-v1";
  seed: string; scenarios: number; rules: RuleProfile["id"];
  comparison: "same initial scenario seeds; independent strategy runs; not mirrored multiplayer";
  strategies: Record<StrategyName, StrategySummary>;
  pairedMeanScoreDifference: number;
  uncertainty: Readonly<{
    method: "normal approximation over paired per-scenario score differences";
    standardError: number | null;
    confidence95: readonly [number, number] | null;
  }>;
  optimality: "heuristic-partition is a transparent baseline heuristic, not an exact solver; random-partition is uniformly selected among distinct rank partitions.";
}>;

export function chooseRandomPartition(candidates: readonly Partition[], random: SeededRandom): Partition {
  return candidates[random.integer(candidates.length)]!;
}

function handPreference(cards: readonly Card[]): number {
  const value = handValue(cards);
  if (value.bust) return -20;
  if (value.natural) return 5.5;
  if (value.total >= 20) return 4 + (value.total - 20) * 0.3;
  if (value.total === 19) return 3;
  if (value.total === 18) return 2;
  if (value.total === 17) return 1;
  if (value.total >= 13) return 0.25;
  return (value.total - 12) * 0.1;
}

/** Simple composition-ranking heuristic; it does not calculate expected value. */
export function chooseHeuristicPartition(cards: readonly Card[], candidates: readonly Partition[]): Partition {
  const ranked = candidates.map(partition => {
    const luz = partition.luz.map(i => cards[i]!);
    const sombra = partition.sombra.map(i => cards[i]!);
    return { partition, score: handPreference(luz) + handPreference(sombra) };
  });
  return ranked.sort((a, b) => b.score - a.score)[0]!.partition;
}

function chooseAction(round: InternalRound, hand: HandName): "hit" | "stand" | "double" {
  const state = round.hands![hand];
  const total = handValue(state.cards).total;
  const up = handValue([round.dealerUp]).total;
  const legal = legalActions(round);
  if (legal.includes("double") && (total === 10 || total === 11) && up >= 2 && up <= 9) return "double";
  return total < 17 ? "hit" : "stand";
}

function playScenario(strategy: StrategyName, seed: string, rules: RuleProfile): { score: number; outcomes: { wins: number; losses: number; pushes: number; busts: number } } {
  const cardsRandom = new SeededRandom(seed);
  const choiceRandom = new SeededRandom(`${seed}:partition`);
  let round = createRound(() => cardsRandom.card(), rules);
  const choices = partitions(round.originalCards);
  const partition = strategy === "random-partition"
    ? chooseRandomPartition(choices, choiceRandom)
    : chooseHeuristicPartition(round.originalCards, choices);
  round = compose(round, partition);
  while (round.phase === "player") {
    const hand = round.currentHand!;
    round = applyAction(round, chooseAction(round, hand), () => cardsRandom.card());
  }
  if (round.phase === "dealer") round = playDealer(round, () => cardsRandom.card());
  const settlements = round.settlement!;
  const values = [settlements.luz, settlements.sombra];
  return {
    score: roundScore(round),
    outcomes: {
      wins: values.filter(value => value.outcome === "win").length,
      losses: values.filter(value => value.outcome === "loss").length,
      pushes: values.filter(value => value.outcome === "push").length,
      busts: [round.hands?.luz, round.hands?.sombra].filter(hand => hand && handValue(hand.cards).bust).length,
    },
  };
}

export function simulate(options: { seed: string; scenarios: number; rules?: RuleProfile }): SimulationReport {
  if (!Number.isSafeInteger(options.scenarios) || options.scenarios < 1 || options.scenarios > 1_000_000) {
    throw new Error("scenarios deve ser inteiro entre 1 e 1000000.");
  }
  const rules = options.rules ?? DF_SYM_01_3_TO_2;
  const names: StrategyName[] = ["random-partition", "heuristic-partition"];
  const acc = Object.fromEntries(names.map(name => [name, { totalScore: 0, wins: 0, losses: 0, pushes: 0, busts: 0 }])) as Record<StrategyName, { totalScore: number; wins: number; losses: number; pushes: number; busts: number }>;
  let pairedDifferenceMean = 0;
  let pairedDifferenceM2 = 0;
  for (let i = 0; i < options.scenarios; i += 1) {
    const scenarioSeed = `${options.seed}:${i}`;
    const random = playScenario("random-partition", scenarioSeed, rules);
    const heuristic = playScenario("heuristic-partition", scenarioSeed, rules);
    for (const [name, result] of [["random-partition", random], ["heuristic-partition", heuristic]] as const) {
      const target = acc[name];
      target.totalScore += result.score;
      target.wins += result.outcomes.wins; target.losses += result.outcomes.losses;
      target.pushes += result.outcomes.pushes; target.busts += result.outcomes.busts;
    }
    const difference = heuristic.score - random.score;
    const count = i + 1;
    const delta = difference - pairedDifferenceMean;
    pairedDifferenceMean += delta / count;
    pairedDifferenceM2 += delta * (difference - pairedDifferenceMean);
  }
  const strategies = Object.fromEntries(names.map(name => {
    const result = acc[name];
    return [name, { scenarios: options.scenarios, ...result, meanScorePerRound: result.totalScore / options.scenarios }];
  })) as Record<StrategyName, StrategySummary>;
  return {
    schemaVersion: 1, simulatorVersion: "0.1.0", rngVersion: "fnv1a32-xorshift32-v1",
    seed: options.seed, scenarios: options.scenarios, rules: rules.id,
    comparison: "same initial scenario seeds; independent strategy runs; not mirrored multiplayer",
    strategies, pairedMeanScoreDifference: pairedDifferenceMean,
    uncertainty: options.scenarios > 1
      ? (() => {
        const standardError = Math.sqrt((pairedDifferenceM2 / (options.scenarios - 1)) / options.scenarios);
        return {
          method: "normal approximation over paired per-scenario score differences" as const,
          standardError,
          confidence95: [pairedDifferenceMean - 1.96 * standardError, pairedDifferenceMean + 1.96 * standardError] as const,
        };
      })()
      : { method: "normal approximation over paired per-scenario score differences", standardError: null, confidence95: null },
    optimality: "heuristic-partition is a transparent baseline heuristic, not an exact solver; random-partition is uniformly selected among distinct rank partitions.",
  };
}
