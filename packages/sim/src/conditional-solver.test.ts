import { describe, expect, it } from "vitest";
import { CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { DF_SYM_01_3_TO_2, handValue, type Card, type Rank } from "@nocte/engine";
import { ConditionalRoundSolver } from "./conditional-solver.js";
import { EvSolver } from "./solver.js";

const card = (rank: Rank): Card => ({ rank });
const ranks: readonly Rank[] = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
const p = (rank: Rank) => rank === "10" ? 4 / 13 : 1 / 13;

function independentDealerDistribution(cards: readonly Card[]): Record<string, number> {
  const total = handValue(cards).total;
  if (total > 21) return { bust: 1 };
  if (total >= 17) return { [String(total)]: 1 };
  return ranks.reduce<Record<string, number>>((all, rank) => {
    const branch = independentDealerDistribution([...cards, card(rank)]);
    for (const [outcome, probability] of Object.entries(branch)) all[outcome] = (all[outcome] ?? 0) + p(rank) * probability;
    return all;
  }, {});
}

describe("conditional Cofre + Foco solver", () => {
  it("matches an independent dealer enumeration for a revealed non-natural hole", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const distribution = independentDealerDistribution([card("6"), card("10")]);
    const expectedStand = Object.entries(distribution).reduce((sum, [outcome, probability]) =>
      sum + probability * (outcome === "bust" ? 1 : Math.sign(17 - Number(outcome))), 0);

    expect(solver.actionValue([card("10"), card("7")], card("6"), card("10"))).toBeCloseTo(expectedStand, 12);
  });

  it("matches the independent enumerator through a soft-Ace S17 state", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const distribution = independentDealerDistribution([card("A"), card("5")]);
    const expectedStand = Object.entries(distribution).reduce((sum, [outcome, probability]) =>
      sum + probability * (outcome === "bust" ? 1 : Math.sign(17 - Number(outcome))), 0);
    expect(handValue([card("A"), card("5")]).soft).toBe(true);
    expect(solver.actionValue([card("10"), card("7")], card("A"), card("5"))).toBeCloseTo(expectedStand, 12);
  });

  it("rejects a Read branch whose hole would contradict a negative dealer peek", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    expect(() => solver.actionValue([card("10"), card("7")], card("A"), card("10"))).toThrow(/natural/i);
  });

  it.each([[CF_LAB_01_3_TO_2, 1.5], [CF_LAB_01_1_TO_1, 1]] as const)("treats a post-Manobra Ace+10 as ordinary 21 under payout %s", (rules, naturalPayout) => {
    const solver = new ConditionalRoundSolver(rules, DF_SYM_01_3_TO_2);
    const ordinary = solver.actionValue([card("A"), card("10")], card("6"), undefined, true);
    const natural = solver.actionValue([card("A"), card("10")], card("6"));
    expect(natural).toBe(naturalPayout);
    expect(natural - ordinary).toBeGreaterThan(0);
  });

  it("keeps composition and Read decisions within the public state and the remaining Focus budget", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const input = { visibleState: { cards: [card("A"), card("9"), card("5"), card("6")], dealerUp: card("10"), cofre: card("2") },
      beliefState: "dealer-hole-unknown-before-peek" as const, roundsRemaining: 5, focus: 3 };
    const noFocus = solver.evaluate({ ...input, focus: 0 });
    const withFocus = solver.evaluate(input);
    expect(withFocus.ev).toBeGreaterThanOrEqual(noFocus.ev - 1e-12);
    expect(["conserve", "maneuver", "read", "read+maneuver"]).toContain(withFocus.ability);
    expect(withFocus.focusCost).toBeLessThanOrEqual(input.focus);
    expect(withFocus.dealerNaturalProbability).toBeCloseTo(1 / 13, 12);
    expect(withFocus.provenance).toBe("exact-current-round");
    expect(withFocus.optionValues.some(option => option.ability === "conserve")).toBe(true);
  });

  it("models dealer natural probability by upcard", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const cards = [card("A"), card("9"), card("5"), card("6")];
    const run = (up: Rank) => solver.evaluate({ visibleState: { cards, dealerUp: card(up), cofre: card("2") },
      beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 1, focus: 0 });
    expect(run("A").dealerNaturalProbability).toBeCloseTo(4 / 13, 12);
    expect(run("10").dealerNaturalProbability).toBeCloseTo(1 / 13, 12);
    expect(run("6").dealerNaturalProbability).toBe(0);
  });

  it("reduces exactly to the existing P1B composition value when Focus is unavailable", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const baseline = new EvSolver(DF_SYM_01_3_TO_2);
    const visibleState = { cards: [card("A"), card("9"), card("5"), card("6")], dealerUp: card("10"), cofre: card("2") };
    const decision = solver.evaluate({ visibleState, beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 1, focus: 0 });
    expect(decision.immediateEv).toBeCloseTo(baseline.inspect(visibleState.cards, visibleState.dealerUp).bestEv, 12);
  });

  it("can price current Focus against an estimated continuation value", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const decision = solver.evaluate({ visibleState: { cards: [card("A"), card("9"), card("5"), card("6")], dealerUp: card("10"), cofre: card("2") },
      beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 4, focus: 3,
      futureValues: [0, 0, 100, 100] });
    expect(decision.ability).toBe("conserve");
    expect(decision.focusCost).toBe(0);
    expect(decision.provenance).toBe("exact-current-round-plus-estimated-continuation");
  });

  it("rejects non-finite or non-monotone continuation tables that could reward wasting Focus", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const visibleState = { cards: [card("A"), card("9"), card("5"), card("6")], dealerUp: card("10"), cofre: card("2") };
    const base = { visibleState, beliefState: "dealer-hole-unknown-before-peek" as const, roundsRemaining: 3, focus: 3 };
    expect(() => solver.evaluate({ ...base, futureValues: [0, 10, 5, 20] })).toThrow(/non-decreasing/i);
    expect(() => solver.evaluate({ ...base, futureValues: [0, 1, Number.NaN, 3] })).toThrow(/finite/i);
  });

  it("reports an exact one-round perfect-hole-information upper bound without treating it as a policy", () => {
    const solver = new ConditionalRoundSolver(CF_LAB_01_3_TO_2, DF_SYM_01_3_TO_2);
    const visibleState = { cards: [card("A"), card("9"), card("5"), card("6")], dealerUp: card("10"), cofre: card("2") };
    const immediate = solver.evaluate({ visibleState, beliefState: "dealer-hole-unknown-before-peek", roundsRemaining: 1, focus: 3,
      futureValues: [0, 0, 0, 0] });
    const oracle = solver.evaluatePerfectHoleInformation({ visibleState, focus: 3 });
    expect(oracle.ev).toBeGreaterThanOrEqual(immediate.immediateEv - 1e-12);
    expect(oracle.provenance).toBe("exact-one-round-hole-information-upper-bound-not-player-policy");
  });
});
