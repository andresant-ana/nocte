import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { partitions } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { drawPactFamily } from "@nocte/engine/pact-book";
import type { PreparedCofreFocoRound } from "./random";
import { PactBookA1aSessionAdapter } from "./pact-book-a1a-session";

const card = (rank: Card["rank"]): Card => ({ rank });
const lane = (cards: readonly Card[]): CardSource => {
  let i = 0;
  const draw = (() => { const c = cards[i++]; if (!c) throw Error("fixture exhausted"); return { ...c }; }) as CardSource;
  draw.peek = () => { const c = cards[i]; if (!c) throw Error("fixture exhausted"); return { ...c }; };
  return draw;
};
const prepared = (seed: string, index: number, initial: readonly Card[] = [card("8"), card("8"), card("9"), card("9")], luzCards: readonly Card[] = [card("2"), card("3"), card("4")]): PreparedCofreFocoRound => ({ seed, index, draws: {
  initial: lane(initial), dealer: lane([card("6"), card("10"), card("10"), card("10")]),
  cofre: lane([card("5"), card("A")]), luz: lane(luzCards), sombra: lane([card("2"), card("3"), card("4")]),
} });
const opening = partitions([card("8"), card("8"), card("9"), card("9")]).find(p => p.luz[0] === 0 && p.luz[1] === 1 && p.sombra[0] === 2 && p.sombra[1] === 3)!;
function finish(session: PactBookA1aSessionAdapter, seed: string, round: number): void {
  if (session.current.round?.phase === "compose") session.compose(opening);
  if (session.current.round?.phase === "focusWindow") { session.skipRead(); session.skipManeuver(); session.continueAfterAbilities(); }
  while (session.current.round?.phase === "player") session.act("stand");
  if (session.current.round?.phase === "dealer") session.resolveDealer();
  expect(session.current.round?.roundNumber).toBe(round);
  if (round < 10) session.enterBetting();
}
function seedFor(family: "revelation" | "dominion" | "focus" | "sacrifice" | "time" | "destiny"): string {
  for (let n = 0; n < 1000; n += 1) { const seed = `P7-test-seed-${n}`; if (drawPactFamily(seed, 4) === family) return seed; }
  throw Error("No seed fixture found");
}
function reachFour(family: "revelation" | "dominion" | "focus" | "sacrifice" | "time" | "destiny"): { session: PactBookA1aSessionAdapter; seed: string } {
  const seed = seedFor(family); const session = PactBookA1aSessionAdapter.start(CF_LAB_01_3_TO_2);
  session.startRound(prepared(seed, 0), 1); finish(session, seed, 1);
  session.startRound(prepared(seed, 1), 1); finish(session, seed, 2);
  session.startRound(prepared(seed, 2), 1); finish(session, seed, 3);
  expect(session.isPactOfferPending).toBe(true);
  return { session, seed };
}

describe("PACT-BOOK-0.1 first playable slice", () => {
  it("offers before round-four deal and round-eight deal, never repeats refused family, and expires the first contract", () => {
    const { session, seed } = reachFour("revelation");
    const first = session.offerFamily;
    expect(session.offerOptions).toEqual(["veil", "lighthouse"]);
    expect(() => session.startRound(prepared(seed, 3), 1)).toThrow(/oferta/i);
    session.refuse(); session.startRound(prepared(seed, 3), 1); finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1); finish(session, seed, 5);
    session.startRound(prepared(seed, 5), 1); finish(session, seed, 6);
    session.startRound(prepared(seed, 6), 1); finish(session, seed, 7);
    expect(session.isPactOfferPending).toBe(true);
    expect(session.offerFamily).not.toBe(first);
    expect(session.state.offers[0]?.status).toBe("refused");
    expect(session.bankroll.completedRounds).toBe(7);
  });

  it("Farol reveals only the category before composition, spends no Focus, and disables Leitura in executor", () => {
    const { session, seed } = reachFour("revelation");
    session.sign("lighthouse"); session.startRound(prepared(seed, 3), 1);
    expect(session.current.round?.dealerHoleCategory).toBeUndefined();
    const before = session.bankroll.focusRemaining;
    session.farol();
    expect(session.farolCategory).toBe("Alta (7–K)");
    expect(session.current.round).not.toHaveProperty("dealerHole");
    expect(session.current.round).not.toHaveProperty("naturalPeek", true);
    expect(session.bankroll.focusRemaining).toBe(before);
    session.compose(opening);
    expect(() => session.readDealerHole()).toThrow(/Renúncia/i);
  });

  it("Véu physically redacts dealer upcard and consumes a free Leitura only after its legal window succeeds", () => {
    const { session, seed } = reachFour("revelation");
    session.sign("veil"); session.startRound(prepared(seed, 3), 1);
    expect(session.current.round).not.toHaveProperty("dealerUp");
    const composed = session.compose(opening);
    expect(composed.round?.dealerUp).toEqual(card("6"));
    expect(session.canUseReadPrivilege).toBe(true);
    const focus = session.bankroll.focusRemaining;
    expect(session.readPrivilege().focusRemaining).toBe(focus);
    expect(session.contract.privilege).toBe("consumed");
  });

  it("P7 Ferro keeps its free Manobra distinct from the chosen-Face Double Renúncia", () => {
    const { session, seed } = reachFour("dominion");
    session.sign("iron", "sombra"); session.startRound(prepared(seed, 3), 1);
    const composed = session.compose(opening); const focus = session.bankroll.focusRemaining;
    expect(session.canUseManeuverPrivilege).toBe(true);
    expect(session.maneuverPrivilege("luz", 0).focusRemaining).toBe(focus);
    expect(session.contract.privilege).toBe("consumed");
    session.continueAfterAbilities(); session.act("stand");
    expect(session.legalActions).toEqual(["hit", "stand"]);
    expect(() => session.act("double")).toThrow(/Renúncia/i);
    expect(session.bankroll.focusRemaining).toBe(focus);
    expect(composed.focusRemaining).toBe(focus);
  });

  it("Bastião discards only a pending bust, consumes once, and keeps its Renúncia active", () => {
    const { session, seed } = reachFour("sacrifice");
    session.sign("bastion", "luz");
    session.startRound(prepared(seed, 3, [card("10"), card("9"), card("8"), card("9")], [card("5")]), 1);
    const partition = partitions([card("10"), card("9"), card("8"), card("9")]).find(p => p.luz[0] === 0 && p.luz[1] === 1 && p.sombra[0] === 2 && p.sombra[1] === 3)!;
    session.compose(partition); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).not.toContain("stand");
    expect(() => session.resolvePendingHit("bastion")).toThrow(/Compra pendente/i);
    session.act("hit");
    expect(session.current.round?.phase).toBe("hitPending");
    expect(session.canUseBastion).toBe(true);
    const saved = session.resolvePendingHit("bastion");
    expect(saved.round?.hands?.luz.cards).toEqual([card("10"), card("9")]);
    expect(saved.round?.hands?.luz.status).toBe("stood");
    expect(session.contract.privilege).toBe("consumed");
    expect(session.state.current?.status).toBe("active");
  });

  it("Reflexo transfers a pending card once, while forbidding Dobrar on both Faces", () => {
    const { session, seed } = reachFour("sacrifice");
    session.sign("reflection"); session.startRound(prepared(seed, 3, [card("10"), card("9"), card("8"), card("8")] ), 1);
    session.compose(partitions([card("10"), card("9"), card("8"), card("8")]).find(p => p.luz[0] === 0 && p.luz[1] === 1 && p.sombra[0] === 2 && p.sombra[1] === 3)!);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).not.toContain("double");
    expect(() => session.act("double")).toThrow(/Dobrar está proibido/i);
    session.act("hit");
    expect(session.current.round?.phase).toBe("hitPending");
    expect(session.current.round?.pendingHitHand).toBeDefined();
    expect(session.current.round?.hands?.sombra.status).toBe("playing");
    expect(session.canUseReflection).toBe(true);
    const transferred = session.resolvePendingHit("reflection");
    expect(transferred.round?.hands?.luz.cards).toHaveLength(2);
    expect(transferred.round?.hands?.luz.status).toBe("stood");
    expect(transferred.round?.hands?.sombra.cards).toEqual([card("8"), card("8"), card("2")]);
    expect(session.contract.privilege).toBe("consumed");
  });

  it("Penhor preserves the selected Cofre into only the next round and only blocks Manobra while sealing", () => {
    const { session, seed } = reachFour("time");
    session.sign("bond"); session.startRound(prepared(seed, 3), 1);
    expect(session.current.round?.cofre).toEqual(card("5"));
    session.sealCofre();
    expect(session.contract.privilege).toBe("consumed");
    session.compose(opening);
    expect(session.focusOptions.maneuverTargets).toHaveLength(0);
    finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1);
    expect(session.current.round?.cofre).toEqual(card("5"));
    session.compose(opening);
    expect(session.focusOptions.maneuverTargets.length).toBeGreaterThan(0);
  });

  it("Arremate offers exactly two Cofres, commits one choice before composition, and its Renúncia lasts one round", () => {
    const { session, seed } = reachFour("time");
    session.sign("finale"); session.startRound(prepared(seed, 3), 1);
    expect(session.canUseArremate).toBe(true);
    expect(session.activateArremate()).toEqual([card("5"), card("A")]);
    expect(() => session.compose(opening)).toThrow(/Escolha uma das duas/i);
    session.chooseArremate(1);
    expect(session.current.round?.cofre).toEqual(card("A"));
    session.compose(opening);
    finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1); session.compose(opening);
    expect(session.focusOptions.maneuverTargets).toHaveLength(0);
    finish(session, seed, 5);
    session.startRound(prepared(seed, 5), 1); session.compose(opening);
    expect(session.focusOptions.maneuverTargets.length).toBeGreaterThan(0);
  });

  it("Ordem reveals one non-consuming exact preview and Comprar receives that card", () => {
    const { session, seed } = reachFour("destiny");
    session.sign("order"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    const preview = session.revealOrderPreview();
    expect(preview).toEqual({ hand: "luz", card: card("2") });
    expect(session.contract.privilege).toBe("consumed");
    expect(() => session.revealOrderPreview()).toThrow(/indisponível/i);
    const result = session.act("hit");
    expect(result.round?.hands?.luz.cards.at(-1)).toEqual(preview.card);
    expect(session.orderPreview).toBeNull();
  });

  it("Caos permits a normal first Compra, then consumes exactly one pending and one forced replacement from that Face", () => {
    const { session, seed } = reachFour("destiny");
    session.sign("chaos"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    expect(session.focusOptions.canRead).toBe(false);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    session.act("hit");
    expect(session.current.round?.phase).toBe("hitPending");
    session.resolvePendingHit("normal");
    expect(session.contract.privilege).toBe("available");
    session.act("hit");
    expect(session.current.round?.pendingHitCard).toEqual(card("3"));
    expect(session.canUseChaos).toBe(true);
    const result = session.resolvePendingHit("chaos");
    expect(result.round?.hands?.luz.cards).toEqual([card("8"), card("8"), card("2"), card("4")]);
    expect(session.contract.privilege).toBe("consumed");
    expect(() => session.resolvePendingHit("chaos")).toThrow(/Compra pendente/i);
  });

  it("Ímpeto preserves ordinary two-card double, disables Manobra, and consumes only on the post-hit double", () => {
    const { session, seed } = reachFour("dominion");
    session.sign("impetus"); session.startRound(prepared(seed, 3), 1);
    session.compose(opening);
    expect(() => session.maneuverDirect("luz", 0)).toThrow(/Renúncia/i);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).toContain("double");
    expect(() => session.impetusDouble()).toThrow(/uma Compra normal/i);
    expect(session.contract.privilege).toBe("available");
    session.act("hit");
    expect(session.canUseImpetusDouble).toBe(true);
    const result = session.impetusDouble();
    expect(result.round?.hands?.luz.status).toBe("doubled");
    expect(result.round?.hands?.luz.exposure).toBe(20);
    expect(session.contract.privilege).toBe("consumed");
    expect(session.canUseImpetusDouble).toBe(false);
    expect(() => session.impetusDouble()).toThrow(/Privilégio/i);
  });

  it("Vigília/Fulgor block normal Focus only in the correct subperiod and retain one shared free use", () => {
    const { session, seed } = reachFour("focus");
    session.sign("vigil"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    expect(session.focusAbilityRenunciation).toContain("indisponíveis");
    expect(session.focusOptions.canRead).toBe(false);
    expect(session.canUseReadPrivilege || session.canUseManeuverPrivilege).toBe(false);
    expect(() => session.readDealerHole()).toThrow(/Renúncia/i);
    if (!session.current.round?.readDecisionMade) session.skipRead();
    if (!session.current.round?.maneuverDecisionMade) session.skipManeuver();
    session.continueAfterAbilities(); finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1); finish(session, seed, 5);
    session.startRound(prepared(seed, 5), 1); session.compose(opening);
    expect(session.focusAbilityRenunciation).toBeNull();
    expect(session.canUseReadPrivilege || session.canUseManeuverPrivilege).toBe(true);
  });

  it("Fulgor makes early normal Focus legal, offers one free action, and disables normal Focus late", () => {
    const { session, seed } = reachFour("focus");
    session.sign("flare"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    expect(session.focusAbilityRenunciation).toBeNull();
    expect(session.focusOptions.canRead).toBe(true);
    expect(session.canUseReadPrivilege || session.canUseManeuverPrivilege).toBe(true);
    const before = session.bankroll.focusRemaining;
    if (session.canUseReadPrivilege) expect(session.readPrivilege().focusRemaining).toBe(before);
    else expect(session.maneuverPrivilege("luz", 0).focusRemaining).toBe(before);
    expect(session.contract.privilege).toBe("consumed");
    if (!session.current.round?.readDecisionMade) session.skipRead();
    if (!session.current.round?.maneuverDecisionMade) session.skipManeuver();
    session.continueAfterAbilities(); finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1); finish(session, seed, 5);
    session.startRound(prepared(seed, 5), 1); session.compose(opening);
    expect(session.focusAbilityRenunciation).toContain("indisponíveis");
    expect(session.focusOptions.canRead).toBe(false);
    expect(session.focusOptions.maneuverTargets).toHaveLength(0);
  });

  it("accepts an independent Ato III pact after the Ato II contract has expired", () => {
    const { session, seed } = reachFour("dominion");
    session.sign("iron", "luz");
    session.startRound(prepared(seed, 3), 1); finish(session, seed, 4);
    session.startRound(prepared(seed, 4), 1); finish(session, seed, 5);
    session.startRound(prepared(seed, 5), 1); finish(session, seed, 6);
    session.startRound(prepared(seed, 6), 1); finish(session, seed, 7);
    const firstFamily = session.state.offers[0]?.family;
    const nextPact = session.offerOptions[0]!;
    session.sign(nextPact, nextPact === "iron" ? "sombra" : undefined);
    expect(session.state.offers[0]?.status).toBe("expired");
    expect(session.state.offers[0]?.family).not.toBe(session.state.current?.family);
    session.startRound(prepared(seed, 7), 1);
    expect(session.contract.status).toBe("active");
    expect(session.contract.actStartRound).toBe(8);
    expect(session.state.offers[0]?.family).toBe(firstFamily);
  });

  it.each([CF_LAB_01_3_TO_2, { ...CF_LAB_01_3_TO_2, id: "P7-test-1to1", naturalPayout: "1:1" as const }])("keeps the selected natural payout profile unchanged under P7 (%s)", rules => {
    const seed = seedFor("revelation"); const session = PactBookA1aSessionAdapter.start(rules);
    for (let round = 1; round <= 3; round += 1) {
      session.startRound(prepared(seed, round - 1), 1); finish(session, seed, round);
    }
    session.sign("veil");
    session.startRound(prepared(seed, 3, [card("A"), card("10"), card("8"), card("9")]), 1);
    const natural = partitions([card("A"), card("10"), card("8"), card("9")]).find(p => p.luz[0] === 0 && p.luz[1] === 1 && p.sombra[0] === 2 && p.sombra[1] === 3)!;
    session.compose(natural); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    session.act("stand");
    const settled = session.resolveDealer();
    expect(settled.round?.settlement?.luz.outcome).toBe("win");
    expect(settled.round?.settlement?.luz.score).toBe(rules.naturalPayout === "3:2" ? 15 : 10);
  });
});
