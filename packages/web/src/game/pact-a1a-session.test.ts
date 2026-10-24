import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { partitions } from "@nocte/engine";
import type { PreparedCofreFocoRound } from "./random";
import { PactA1aSessionAdapter } from "./pact-a1a-session";

const card = (rank: Card["rank"]): Card => ({ rank });
const lane = (cards: readonly Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("PACT test draw lane exhausted");
    return { ...next };
  };
};
const prepared = (index: number): PreparedCofreFocoRound => ({ seed: `pact-fixture-${index}`, index, draws: {
  initial: lane([card("8"), card("8"), card("9"), card("9")]),
  dealer: lane([card("6"), card("10"), card("10"), card("10")]),
  cofre: lane([card("5")]), luz: lane([card("2"), card("2")]), sombra: lane([card("2"), card("2")]),
} });
const preparedNaturalDealer = (index: number): PreparedCofreFocoRound => ({ seed: `pact-natural-fixture-${index}`, index, draws: {
  initial: lane([card("8"), card("8"), card("9"), card("9")]),
  dealer: lane([card("A"), card("10")]), cofre: lane([card("5")]), luz: lane([card("2")]), sombra: lane([card("2")]),
} });
const opening = partitions([card("8"), card("8"), card("9"), card("9")]).find(partition =>
  partition.luz[0] === 0 && partition.luz[1] === 1 && partition.sombra[0] === 2 && partition.sombra[1] === 3)!;

function finishRound(session: PactA1aSessionAdapter, roundIndex: number): void {
  session.compose(opening);
  const afterRead = session.skipRead();
  if (afterRead.round?.phase === "focusWindow") session.skipManeuver();
  session.continueAfterAbilities();
  session.act("stand");
  session.act("stand");
  session.resolveDealer();
  expect(session.current.round?.roundNumber).toBe(roundIndex + 1);
}

function reachOffer(): PactA1aSessionAdapter {
  const session = PactA1aSessionAdapter.start(CF_LAB_01_3_TO_2);
  for (let round = 0; round < 3; round += 1) {
    session.startRound(prepared(round), 1);
    finishRound(session, round);
    session.enterBetting();
  }
  expect(session.isPactOfferPending).toBe(true);
  expect(session.bankroll.completedRounds).toBe(3);
  return session;
}

describe("PACT-LAB-0.1 A1a session integration", () => {
  it("opens the offer before round-four betting and physically omits Véu upcard until composition", () => {
    const session = reachOffer();
    expect(session.contract.status).toBe("offered");
    expect(session.isBetting).toBe(true);
    session.sign("veil");
    expect(session.contract.status).toBe("signed");
    const dealt = session.startRound(prepared(3), 1);
    expect(dealt.round?.phase).toBe("compose");
    expect(dealt.round).not.toHaveProperty("dealerUp");

    const composed = session.compose(opening);
    expect(composed.round?.phase).toBe("focusWindow");
    expect(composed.round).toHaveProperty("dealerUp", card("6"));
    expect(session.canUseReadPrivilege).toBe(true);
    expect(session.roundsRemaining).toBe(4);
    const focusBefore = composed.focusRemaining;
    const privateRead = session.readDealerHoleWithPactPrivilege();
    expect(privateRead.focusRemaining).toBe(focusBefore);
    expect(privateRead.focusSpent).toEqual(composed.focusSpent);
    expect(privateRead.round?.readUsed).toBe(true);
    expect(session.contract.privilege).toBe("consumed");
    expect(session.contract.privilegeUsedRound).toBe(4);
    expect(session.canUseReadPrivilege).toBe(false);
    expect(() => session.readDealerHoleWithPactPrivilege()).toThrow(/indisponível/i);
  });

  it("refusal preserves normal rules for round four and beyond", () => {
    const session = reachOffer();
    session.refuse();
    const dealt = session.startRound(prepared(3), 1);
    expect(session.contract.status).toBe("refused");
    expect(dealt.round).toHaveProperty("dealerUp");
    const composed = session.compose(opening);
    expect(composed.round?.phase).toBe("focusWindow");
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).toContain("double");
  });

  it("Ferro blocks only the signed Face, grants one free Manobra, and expires before round eight", () => {
    const session = reachOffer();
    session.sign("iron", "sombra");
    session.startRound(prepared(3), 1);
    const composed = session.compose(opening);
    expect(session.canUseManeuverPrivilege).toBe(true);
    expect(session.focusOptionsWithPactPrivilege.maneuverTargets.length).toBeGreaterThan(0);
    const focusBefore = composed.focusRemaining;
    const freeSwap = session.maneuverDirectWithPactPrivilege("luz", 0);
    expect(freeSwap.focusRemaining).toBe(focusBefore);
    expect(freeSwap.round?.maneuverUsed).toBe(true);
    expect(session.contract.privilege).toBe("consumed");
    session.continueAfterAbilities();
    session.act("stand");
    expect(session.current.round?.currentHand).toBe("sombra");
    expect(session.legalActions).toEqual(["hit", "stand"]);
    expect(() => session.act("double")).toThrow(/Renúncia/);
    session.act("stand"); session.resolveDealer();

    for (let round = 4; round < 7; round += 1) {
      session.enterBetting(); session.startRound(prepared(round), 1);
      finishRound(session, round);
    }
    session.enterBetting(); session.startRound(prepared(7), 1);
    expect(session.contract.status).toBe("expired");
    expect(session.contract.privilege).toBe("consumed");
    const roundEight = session.compose(opening);
    expect(roundEight.round?.phase).toBe("focusWindow");
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).toContain("double");
  });

  it("preserves the Iron Privilégio when a normal paid Manobra is chosen first", () => {
    const session = reachOffer();
    session.sign("iron", "luz");
    session.startRound(prepared(3), 1);
    const window = session.compose(opening);
    session.skipRead();
    const before = window.focusRemaining;
    expect(session.maneuverDirect("sombra", 0).focusRemaining).toBe(before - 1);
    expect(session.contract.privilege).toBe("available");
  });

  it("does not open a privileged Read window after a dealer natural and keeps the unused Privilégio for a later legal round", () => {
    const session = reachOffer();
    session.sign("veil");
    session.startRound(preparedNaturalDealer(3), 1);
    const settled = session.compose(opening);
    expect(settled.round?.phase).toBe("complete");
    expect(settled.round?.naturalPeek).toBe(true);
    expect(session.canUseReadPrivilege).toBe(false);
    expect(session.contract.privilege).toBe("available");
    expect(() => session.readDealerHoleWithPactPrivilege()).toThrow();
    session.enterBetting(); session.startRound(prepared(4), 1);
    expect(session.contract.status).toBe("active");
    expect(session.canUseReadPrivilege).toBe(false); // composition has not yet been confirmed
    expect(session.current.round).not.toHaveProperty("dealerUp");
    const laterWindow = session.compose(opening);
    expect(laterWindow.round?.phase).toBe("focusWindow");
    expect(session.canUseReadPrivilege).toBe(true);
    expect(session.readDealerHoleWithPactPrivilege().focusRemaining).toBe(laterWindow.focusRemaining);
    expect(session.contract.privilege).toBe("consumed");
  });

  it("keeps the signature available regardless of practice status or score/bank changes", () => {
    const session = reachOffer();
    expect(session.bankroll.status).toBe("active");
    expect(session.contract.privilege).toBe("none");
    expect(session.bankroll.focusRemaining).toBe(3);
  });
});
