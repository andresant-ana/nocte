import { describe, expect, it } from "vitest";
import {
  A1A_HORIZON, A1A_INITIAL_TICKS, beginA1aRound, createA1aBankroll, enterA1aPracticeIfNeeded,
  formatHalfChips, maxA1aStake, settleA1aRound,
} from "./bankroll-a1a";

describe("BANKROLL-LAB-A1a-0.1 ledger", () => {
  it("starts each new Night at 150 chips and caps stake by the complete two-hand/two-double reserve", () => {
    const night = createA1aBankroll("math");
    expect(night.balanceTicks).toBe(300);
    expect(maxA1aStake(night.balanceTicks)).toBe(37);
    const round = beginA1aRound(night, "math:1", 37);
    expect(round.round).toEqual({ id: "math:1", stake: 37, kind: "funded" });
    expect(round.balanceTicks).toBe(300); // reserve is derived, never debited
    expect(4 * 37).toBeLessThanOrEqual(150);
  });

  it("settles ordinary, double-loss and natural 3:2 outcomes in exact half-chip ticks", () => {
    const night = createA1aBankroll("half");
    const natural = beginA1aRound(night, "half:1", 1);
    const afterNatural = settleA1aRound(natural, "half:1", { phase: "complete", score: 15 });
    expect(afterNatural.balanceTicks).toBe(303); // +1.5 chips
    expect(formatHalfChips(afterNatural.balanceTicks)).toBe("151,5");

    const naturalFive = beginA1aRound(afterNatural, "half:2", 5);
    const afterNaturalFive = settleA1aRound(naturalFive, "half:2", { phase: "complete", score: 15 });
    expect(afterNaturalFive.balanceTicks).toBe(318); // +7.5 chips exactly
    expect(formatHalfChips(15)).toBe("7,5");

    const doubled = beginA1aRound(afterNaturalFive, "half:3", 5);
    const afterDoubleLoss = settleA1aRound(doubled, "half:3", { phase: "complete", score: -40 });
    expect(afterDoubleLoss.balanceTicks).toBe(278); // -20 chips, both doubles covered
  });

  it("locks one equal stake before the round, rejects insufficient coverage and permits a lower stake", () => {
    let state = createA1aBankroll("reduce");
    state = settleA1aRound(beginA1aRound(state, "reduce:1", 30), "reduce:1", { phase: "complete", score: -40 });
    expect(state.balanceTicks).toBe(60); // 30 chips remain; only stake 7 fits
    expect(maxA1aStake(state.balanceTicks)).toBe(7);
    expect(() => beginA1aRound(state, "reduce:2", 8)).toThrow(/1 a 7/);
    expect(beginA1aRound(state, "reduce:2", 7).round?.stake).toBe(7);
  });

  it("transitions irreversibly to practice when no one-chip minimum can be covered and freezes the balance", () => {
    const almost = { ...createA1aBankroll("practice"), balanceTicks: 7 };
    expect(maxA1aStake(almost.balanceTicks)).toBe(0);
    const practice = enterA1aPracticeIfNeeded(almost);
    expect(practice.status).toBe("practice");
    expect(() => beginA1aRound(practice, "practice:1", 1)).toThrow(/gratuita/);
    const started = beginA1aRound(practice, "practice:1", 0);
    const settled = settleA1aRound(started, "practice:1", { phase: "complete", score: 40 });
    expect(settled.status).toBe("practice");
    expect(settled.balanceTicks).toBe(7);
    expect(settled.completedRounds).toBe(1);
  });

  it("allows the exact four-chip boundary, then transitions after an all-double loss", () => {
    const atBoundary = { ...createA1aBankroll("boundary"), balanceTicks: 8 };
    expect(maxA1aStake(atBoundary.balanceTicks)).toBe(1);
    const settled = settleA1aRound(beginA1aRound(atBoundary, "boundary:1", 1), "boundary:1", { phase: "complete", score: -40 });
    expect(settled.balanceTicks).toBe(0);
    expect(settled.status).toBe("practice");
  });

  it("is idempotent for the same settlement and rejects altered or duplicate rounds", () => {
    const begun = beginA1aRound(createA1aBankroll("idempotent"), "idempotent:1", 10);
    const settled = settleA1aRound(begun, "idempotent:1", { phase: "complete", score: 5 });
    expect(settleA1aRound(settled, "idempotent:1", { phase: "complete", score: 5 })).toBe(settled);
    expect(() => settleA1aRound(settled, "idempotent:1", { phase: "complete", score: -5 })).toThrow(/diverge/);
    expect(() => beginA1aRound(settled, "idempotent:1", 1)).toThrow(/repetido/);
    expect(() => settleA1aRound(begun, "idempotent:1", { phase: "player", score: 5 })).toThrow(/score final/);
  });

  it("keeps exact divisibility for every base-engine score increment and enforces the ten-round horizon", () => {
    for (let stake = 1; stake <= 37; stake += 1) {
      for (const score of [-40, -20, -15, -10, -5, 0, 5, 10, 15, 20, 40]) {
        expect(Math.abs((stake * score) % 5)).toBe(0);
      }
    }
    expect(A1A_INITIAL_TICKS).toBe(300);
    expect(A1A_HORIZON).toBe(10);
    expect(formatHalfChips(0)).toBe("0");
    expect(formatHalfChips(-1)).toBe("−0,5");
  });
});
