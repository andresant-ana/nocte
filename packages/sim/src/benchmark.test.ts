import { describe, expect, it } from "vitest";
import { DF_SYM_01_3_TO_2, type Card } from "@nocte/engine";
import { BenchmarkRandom, scenario } from "./streams.js";
import { benchmark, playCounterfactual } from "./benchmark.js";
import { Moments } from "./statistics.js";
import { EvSolver } from "./solver.js";
const c = (rank: Card["rank"]): Card => ({ rank });

describe("counterfactual streams and statistics", () => {
  it("replays each named lane independently of consumption in other lanes", () => {
    const luz = new BenchmarkRandom("s", 1, "luz");
    const dealer = new BenchmarkRandom("s", 1, "dealer");
    const replay = new BenchmarkRandom("s", 1, "dealer");
    Array.from({ length: 100 }, () => luz.card());
    expect(Array.from({ length: 20 }, () => dealer.card())).toEqual(
      Array.from({ length: 20 }, () => replay.card()),
    );
    expect(scenario("s", 1)).toEqual(scenario("s", 1));
    expect(scenario("s", 1)).not.toEqual(scenario("s", 2));
  });
  it("uses unbiased bounded-word sampling and excludes invalid bounds", () => {
    const random = new BenchmarkRandom("ranks", 0, "initial");
    expect(() => random.integer(0)).toThrow();
    expect(() => random.integer(1.5)).toThrow();
    expect(new Set(Array.from({ length: 1000 }, () => random.card().rank)).size).toBe(10);
  });
  it("computes independent hand-checkable sample variance and handles n=1", () => {
    const moments = new Moments();
    moments.add(1);
    expect(moments.summary().confidence95).toBeNull();
    moments.add(3); moments.add(5);
    expect(moments.summary()).toMatchObject({ n: 3, mean: 3, variance: 4 });
    expect(moments.summary().standardError).toBeCloseTo(Math.sqrt(4 / 3), 14);
  });
});

describe("EV agents run against the engine", () => {
  it("reports three agents with the same optimal action policy and deterministic data", () => {
    const options = { seed: "bench", scenarios: 100, rules: DF_SYM_01_3_TO_2 };
    const a = benchmark(options); const b = benchmark(options);
    expect(a).toEqual(b);
    expect(a.schemaVersion).toBe(2);
    expect(Object.keys(a.strategies)).toHaveLength(3);
    expect(a.strategies.optimal.optimalChoiceRate).toBe(1);
    expect(a.comparisons["optimal-minus-random"].ev.mean).toBeGreaterThanOrEqual(0);
    expect(benchmark({ ...options, scenarios: 1 }).strategies.optimal.score.confidence95).toBeNull();
    expect(() => benchmark({ ...options, scenarios: 0 })).toThrow();
  });
  it("keeps dealer future fixed across compositions and uses separate player-hand lanes", () => {
    const solver = new EvSolver(DF_SYM_01_3_TO_2);
    const initial = { cards: [c("5"), c("6"), c("10"), c("10")], up: c("7"), hole: c("6") };
    const run = (partition: { luz: readonly [number, number]; sombra: readonly [number, number] }) => {
      let dealerDraws = 0;
      const result = playCounterfactual(initial, partition, {
        luz: () => c("10"), sombra: () => c("2"), dealer: () => { dealerDraws++; return c("7"); },
      }, solver);
      return { result, dealerDraws };
    };
    const a = run({ luz: [0, 1], sombra: [2, 3] });
    const b = run({ luz: [0, 2], sombra: [1, 3] });
    expect(a.result.final.settlement?.luz.dealerTotal).toBe(20);
    expect(b.result.final.settlement?.luz.dealerTotal).toBe(20);
    expect(a.dealerDraws).toBe(1); expect(b.dealerDraws).toBe(1);
    expect(a.result.final.hands?.luz.cards).toEqual([c("5"), c("6"), c("10")]);
  });
  it("cross-checks ex-ante EV including dealer naturals against independent engine Monte Carlo", () => {
    const solver = new EvSolver(DF_SYM_01_3_TO_2);
    const cards = [c("A"), c("10"), c("5"), c("6")]; const up = c("A");
    const inspection = solver.inspect(cards, up); const choice = inspection.partitions[inspection.bestIndex]!;
    const score = new Moments();
    for (let i = 0; i < 20000; i++) {
      const hole = new BenchmarkRandom("mc-reference", i, "initial").card();
      const luz = new BenchmarkRandom("mc-reference", i, "luz");
      const sombra = new BenchmarkRandom("mc-reference", i, "sombra");
      const dealer = new BenchmarkRandom("mc-reference", i, "dealer");
      const result = playCounterfactual({ cards, up, hole }, choice.partition, {
        luz: () => luz.card(), sombra: () => sombra.card(), dealer: () => dealer.card(),
      }, solver);
      score.add(result.score);
    }
    const summary = score.summary();
    expect(Math.abs(summary.mean - 10 * choice.ev)).toBeLessThan(6 * summary.standardError!);
  });
});
