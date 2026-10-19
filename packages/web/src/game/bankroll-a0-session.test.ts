// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { BankrollA0SessionAdapter } from "./bankroll-a0-session";
import { CofreFocoSessionAdapter } from "./cofre-foco-session";
import type { PreparedCofreFocoRound } from "./random";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: readonly Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("test draw lane exhausted");
    return { ...next };
  };
};
const preparedScenario = (seed: string, index: number, initial: Card[], dealer: Card[], cofre: Card, luz: Card[] = [card("10")], sombra: Card[] = [card("10")]): PreparedCofreFocoRound => ({
  seed, index,
  draws: {
    initial: source(initial),
    dealer: source(dealer),
    cofre: source([cofre]),
    luz: source(luz),
    sombra: source(sombra),
  },
});
const prepared = (seed: string, index = 0): PreparedCofreFocoRound => preparedScenario(seed, index,
  [card("8"), card("8"), card("8"), card("8")], [card("6"), card("10"), card("10")], card("5"));

function loseBothDoubledHands(session: Pick<BankrollA0SessionAdapter, "compose" | "skipRead" | "skipManeuver" | "continueAfterAbilities" | "act" | "resolveDealer">) {
  session.compose({ luz: [0, 1], sombra: [2, 3] });
  session.skipRead();
  session.skipManeuver();
  session.continueAfterAbilities();
  session.act("double");
  session.act("double");
  return session.resolveDealer();
}

describe("BANKROLL-LAB-A0-0.1 Cofre + Foco adapter", () => {
  it("settles the exact completed engine round score and keeps reserve until settlement", () => {
    const session = BankrollA0SessionAdapter.start(prepared("night-loss"), CF_LAB_01_3_TO_2);
    expect(session.bankroll).toMatchObject({ bankroll: 150, available: 110, escrow: 40, pendingKind: "funded" });
    expect(session.current.totalScore).toBe(0);

    const complete = loseBothDoubledHands(session);
    expect(complete.round?.score).toBe(-40);
    expect(session.current.totalScore).toBe(-40);
    expect(session.bankroll).toMatchObject({ bankroll: 110, available: 110, escrow: 0, fundedRounds: 1 });
  });

  it("settles a dealer natural from the engine's peek result without opening abilities", () => {
    const session = BankrollA0SessionAdapter.start(preparedScenario("dealer-natural", 0,
      [card("8"), card("8"), card("9"), card("9")], [card("A"), card("10")], card("5")), CF_LAB_01_3_TO_2);
    const result = session.compose({ luz: [0, 1], sombra: [2, 3] });
    expect(result.round?.phase).toBe("complete");
    expect(result.round?.score).toBe(-20);
    expect(session.bankroll.bankroll).toBe(130);
  });

  it.each([[CF_LAB_01_3_TO_2, 180], [CF_LAB_01_1_TO_1, 170]] as const)(
    "uses the selected engine natural payout and applies its aggregate score (%s)",
    (rules, expectedBalance) => {
      const session = BankrollA0SessionAdapter.start(preparedScenario("two-naturals", 0,
        [card("A"), card("10"), card("A"), card("10")], [card("6"), card("10"), card("5")], card("4")), rules);
      const composed = session.compose({ luz: [0, 1], sombra: [2, 3] });
      expect(composed.round?.phase).toBe("dealer");
      const result = session.resolveDealer();
      expect(result.round?.score).toBe(expectedBalance - 150);
      expect(session.bankroll.bankroll).toBe(expectedBalance);
    },
  );

  it("preserves identical engine score and Focus to the no-bank CF session for the same cards and actions", () => {
    const a0 = BankrollA0SessionAdapter.start(prepared("paired", 0), CF_LAB_01_3_TO_2, "paired-a0");
    const control = CofreFocoSessionAdapter.start(prepared("paired", 0), CF_LAB_01_3_TO_2, 10);
    const a0Result = loseBothDoubledHands(a0);
    const controlResult = loseBothDoubledHands(control);
    expect(a0Result.totalScore).toBe(controlResult.totalScore);
    expect(a0Result.focusRemaining).toBe(controlResult.focusRemaining);
    expect(a0.bankroll.bankroll).toBe(110);
    expect(control.current.totalScore).toBe(-40);
  });

  it("continues full engine rounds after three maximum losses while the practice bank stays frozen", () => {
    const session = BankrollA0SessionAdapter.start(prepared("practice-transition", 0), CF_LAB_01_3_TO_2, "practice-transition");
    for (let loss = 0; loss < 3; loss += 1) {
      const result = loseBothDoubledHands(session);
      expect(result.round?.score).toBe(-40);
      expect(session.bankroll.bankroll).toBe(150 - (loss + 1) * 40);
      if (loss < 2) session.nextRound(prepared("practice-transition", loss + 1));
    }
    expect(session.bankroll.bankroll).toBe(30);
    expect(session.current.totalScore).toBe(-120);

    session.nextRound(prepared("practice-transition", 3));
    expect(session.bankroll).toMatchObject({ status: "practice", pendingKind: "practice", bankroll: 30, escrow: 0 });
    const practiceResult = loseBothDoubledHands(session);
    expect(practiceResult.round?.score).toBe(-40);
    expect(session.current.totalScore).toBe(-160);
    expect(session.bankroll).toMatchObject({ status: "practice", bankroll: 30, lastRoundKind: "practice", lastBankDelta: 0 });

    session.nextRound(prepared("practice-transition", 4));
    expect(session.bankroll).toMatchObject({ status: "practice", pendingKind: "practice", bankroll: 30 });
    expect(session.current.round?.roundNumber).toBe(5);
  });

  it("does not settle an unfinished round on abandonment and expires the whole local bank", () => {
    const session = BankrollA0SessionAdapter.start(prepared("abandon"), CF_LAB_01_3_TO_2);
    session.compose({ luz: [0, 1], sombra: [2, 3] });
    session.abandonNight();
    expect(session.bankroll).toMatchObject({ status: "abandoned", bankroll: 150, escrow: 0, expiredBalance: 150 });
    expect(session.current.completedRounds).toBe(0);
  });

  it("starts a fresh Night with 150 and does not expose seed or ledger identifiers", () => {
    const session = BankrollA0SessionAdapter.start(prepared("private-seed"), CF_LAB_01_3_TO_2, "private-night");
    expect(session.bankroll.bankroll).toBe(150);
    expect(session.bankroll).not.toHaveProperty("id");
    expect(session.bankroll).not.toHaveProperty("settledRoundIds");
    expect(session.current).not.toHaveProperty("seed");
  });
});
