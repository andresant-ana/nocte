import {
  applyAction, compose, createRound, playDealer, publicRound, roundScore,
  type CardSource, type Partition, type PublicRound, type RuleProfile,
} from "@nocte/engine";
import { chooseHeuristicPartition } from "./simulation.js";
import { EvSolver, SOLVER_VERSION } from "./solver.js";
import { BenchmarkRandom, scenario, STREAM_VERSION, type InitialScenario } from "./streams.js";
import { Moments } from "./statistics.js";

export const BENCHMARK_VERSION = "composition-optimal-actions-v2";
export const SCORING_VERSION = "df-sym-net-points-natural-priority-v1";
export type Agent = "random" | "heuristic" | "optimal";
const agents: readonly Agent[] = ["random", "heuristic", "optimal"];
const pairs = [["optimal-minus-random", "optimal", "random"], ["optimal-minus-heuristic", "optimal", "heuristic"],
  ["heuristic-minus-random", "heuristic", "random"]] as const;

export function optimalAction(view: Pick<PublicRound, "hands" | "currentHand" | "dealerUp">, solver: EvSolver) {
  if (!view.currentHand || !view.hands) throw new Error("No active player hand.");
  return solver.actions(view.hands[view.currentHand].cards, view.dealerUp).best;
}

/** The driver knows the environment; the policy only receives public state. */
export function playCounterfactual(initial: InitialScenario, partition: Partition,
  streams: { luz: CardSource; sombra: CardSource; dealer: CardSource }, solver: EvSolver) {
  const deal = [...initial.cards, initial.up, initial.hole]; let index = 0;
  let round = compose(createRound(() => {
    const card = deal[index++]; if (!card) throw new Error("Invalid initial scenario."); return card;
  }, solver.rules), partition);
  while (round.phase === "player") {
    const action = optimalAction(publicRound(round), solver);
    round = applyAction(round, action, streams[round.currentHand!]);
  }
  if (round.phase === "dealer") round = playDealer(round, streams.dealer);
  return { score: roundScore(round), final: publicRound(round) };
}

export function benchmark(options: { seed: string; scenarios: number; rules: RuleProfile }) {
  if (!Number.isSafeInteger(options.scenarios) || options.scenarios < 1 || options.scenarios > 1_000_000) throw new Error("scenarios must be an integer in [1,1000000].");
  const solver = new EvSolver(options.rules);
  const acc = Object.fromEntries(agents.map(agent => [agent, {
    ev: new Moments(), policyEv: new Moments(), score: new Moments(), luckResidual: new Moments(), optimalChoices: 0,
  }])) as Record<Agent, { ev: Moments; policyEv: Moments; score: Moments; luckResidual: Moments; optimalChoices: number }>;
  const differences = Object.fromEntries(pairs.map(([key]) => [key, { ev: new Moments(), score: new Moments(), luckResidual: new Moments() }])) as
    Record<(typeof pairs)[number][0], { ev: Moments; score: Moments; luckResidual: Moments }>;
  let tiedOptima = 0; let singleChoices = 0;
  for (let i = 0; i < options.scenarios; i++) {
    const initial = scenario(options.seed, i);
    // Only cards/upcard are passed to inspect: composition must precede the peek.
    const inspection = solver.inspect(initial.cards, initial.up);
    if (inspection.bestIndices.length > 1) tiedOptima++;
    if (inspection.partitions.length === 1) singleChoices++;
    const choices = inspection.partitions.map(p => p.partition);
    const selection: Record<Agent, number> = {
      random: new BenchmarkRandom(options.seed, i, "choice").integer(choices.length),
      heuristic: choices.indexOf(chooseHeuristicPartition(initial.cards, choices)), optimal: inspection.bestIndex,
    };
    const scores = {} as Record<Agent, number>; const evs = {} as Record<Agent, number>;
    for (const agent of agents) {
      const choice = inspection.partitions[selection[agent]]!;
      const luz = new BenchmarkRandom(options.seed, i, "luz");
      const sombra = new BenchmarkRandom(options.seed, i, "sombra");
      const dealer = new BenchmarkRandom(options.seed, i, "dealer");
      const played = playCounterfactual(initial, choice.partition, {
        luz: () => luz.card(), sombra: () => sombra.card(), dealer: () => dealer.card(),
      }, solver);
      const ev = choice.ev * options.rules.initialExposure;
      const policyEv = (agent === "random" ? inspection.randomDistinctEv : choice.ev) * options.rules.initialExposure;
      scores[agent] = played.score; evs[agent] = ev;
      acc[agent].ev.add(ev); acc[agent].policyEv.add(policyEv); acc[agent].score.add(played.score);
      acc[agent].luckResidual.add(played.score - ev);
      if (inspection.bestIndices.includes(selection[agent])) acc[agent].optimalChoices++;
    }
    for (const [key, a, b] of pairs) {
      const ev = evs[a] - evs[b]; const score = scores[a] - scores[b];
      differences[key].ev.add(ev); differences[key].score.add(score); differences[key].luckResidual.add(score - ev);
    }
  }
  const strategies = Object.fromEntries(agents.map(agent => [agent, {
    ev: acc[agent].ev.summary(), policyEv: acc[agent].policyEv.summary(), score: acc[agent].score.summary(),
    luckResidual: acc[agent].luckResidual.summary(), optimalChoiceRate: acc[agent].optimalChoices / options.scenarios,
  }])) as Record<Agent, { ev: ReturnType<Moments["summary"]>; policyEv: ReturnType<Moments["summary"]>; score: ReturnType<Moments["summary"]>;
    luckResidual: ReturnType<Moments["summary"]>; optimalChoiceRate: number }>;
  const comparisons = Object.fromEntries(pairs.map(([key]) => [key, {
    ev: differences[key].ev.summary(), score: differences[key].score.summary(), luckResidual: differences[key].luckResidual.summary(),
  }])) as Record<(typeof pairs)[number][0], { ev: ReturnType<Moments["summary"]>; score: ReturnType<Moments["summary"]>; luckResidual: ReturnType<Moments["summary"]> }>;
  return {
    schemaVersion: 2, benchmarkVersion: BENCHMARK_VERSION, solverVersion: SOLVER_VERSION,
    prngVersion: STREAM_VERSION, scoringVersion: SCORING_VERSION, rules: options.rules.id,
    seed: options.seed, scenarios: options.scenarios, units: "net match points per round; 10 points per initial hand exposure",
    actionPolicy: "identical EV-optimal negative-peek actions for all agents", randomPolicy: "uniform distinct rank partitions",
    pairing: "common initial/dealer/luz/sombra lanes; counterfactual lab only, not physical mirroring",
    strategies, comparisons, multipleOptimalDistinctPartitionsRate: tiedOptima / options.scenarios,
    singleDistinctPartitionRate: singleChoices / options.scenarios,
    cacheSizes: solver.cacheSizes(),
  };
}
