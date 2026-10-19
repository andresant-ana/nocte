// @vitest-environment node
import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import type { PreparedCofreFocoRound } from "./random";
import { CofreFocoSessionAdapter } from "./cofre-foco-session";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: readonly Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("test draw lane exhausted");
    return { ...next };
  };
};
const prepared = (seed: string, index: number, initial: Card[], dealer: Card[], cofre: Card): PreparedCofreFocoRound => ({
  seed, index,
  draws: { initial: source(initial), dealer: source(dealer), cofre: source([cofre]), luz: source([card("2")]), sombra: source([card("2")]) },
});

describe("Cofre + Foco browser session boundary", () => {
  it("projects only public state and exposes only engine-approved Focus targets", () => {
    const session = CofreFocoSessionAdapter.start(prepared("private-seed", 0,
      [card("8"), card("8"), card("9"), card("9")], [card("6"), card("10")], card("4")), CF_LAB_01_3_TO_2, 2);
    const opening = session.current as unknown as Record<string, unknown>;
    expect(opening).not.toHaveProperty("seed");
    expect(opening.round).not.toHaveProperty("dealerHole");
    expect(opening.round).not.toHaveProperty("dealerDraws");

    const focus = session.compose({ luz: [0, 1], sombra: [2, 3] });
    expect(focus.round?.phase).toBe("focusWindow");
    expect(focus.round).not.toHaveProperty("dealerHole");
    expect(session.focusOptions.canRead).toBe(true);
    expect(session.focusOptions.maneuverTargets).toHaveLength(0);
    const targets = session.skipRead();
    expect(session.focusOptions.maneuverTargets).toEqual([
      { hand: "luz", cardIndex: 0 }, { hand: "luz", cardIndex: 1 },
      { hand: "sombra", cardIndex: 0 }, { hand: "sombra", cardIndex: 1 },
    ]);
    expect(targets.round).not.toHaveProperty("dealerHole");
  });

  it("reveals only the read hole, carries Focus into a second round, and reveals all dealer cards only at settlement", () => {
    const session = CofreFocoSessionAdapter.start(prepared("night-seed", 0,
      [card("8"), card("8"), card("9"), card("9")], [card("6"), card("10"), card("5")], card("4")), CF_LAB_01_3_TO_2, 2);
    session.compose({ luz: [0, 1], sombra: [2, 3] });
    const read = session.readDealerHole();
    expect(read.focusRemaining).toBe(1);
    expect(read.round?.dealerHole).toEqual(card("10"));
    expect(read.round).not.toHaveProperty("dealerDraws");
    const attacked = read as unknown as { round: { dealerHole: { rank: string }; cofre: { rank: string } } };
    attacked.round.dealerHole.rank = "2";
    attacked.round.cofre.rank = "3";
    expect(session.current.round?.dealerHole).toEqual(card("10"));
    expect(session.current.round?.cofre).toEqual(card("4"));

    session.skipManeuver();
    session.continueAfterAbilities();
    session.act("stand");
    session.act("stand");
    const settled = session.resolveDealer();
    expect(settled.completedRounds).toBe(1);
    expect(settled.focusRemaining).toBe(1);
    expect(settled.round?.dealerHole).toEqual(card("10"));
    expect(settled.round?.dealerDraws).toEqual([card("5")]);

    const next = session.nextRound(prepared("night-seed", 1,
      [card("A"), card("10"), card("A"), card("10")], [card("7"), card("8")], card("6")));
    expect(next.round?.roundNumber).toBe(2);
    expect(next.focusRemaining).toBe(1);
    expect(next.round).not.toHaveProperty("dealerHole");
  });

  it("expires Focus through the engine on abandonment and rejects later actions", () => {
    const session = CofreFocoSessionAdapter.start(prepared("night-seed", 0,
      [card("8"), card("8"), card("9"), card("9")], [card("6"), card("10")], card("4")), CF_LAB_01_3_TO_2, 10);
    const ended = session.abandonNight();
    expect(ended.status).toBe("abandoned");
    expect(ended.focusRemaining).toBe(0);
    expect(ended.expiredFocus).toBe(3);
    expect(() => session.nextRound(prepared("night-seed", 1,
      [card("8"), card("8"), card("9"), card("9")], [card("6"), card("10")], card("4")))).toThrow();
  });
});
