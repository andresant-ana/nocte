import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { partitions } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { drawPactFamily, type PactFamily } from "@nocte/engine/pact-book";
import type { PreparedCofreFocoRound } from "./random";
import { PactBookA1aSessionAdapter } from "./pact-book-a1a-session";

const card = (rank: Card["rank"]): Card => ({ rank });
const lane = (cards: readonly Card[]): CardSource => {
  let i = 0;
  const draw = (() => { const c = cards[i++]; if (!c) throw Error("fixture exhausted"); return { ...c }; }) as CardSource;
  draw.peek = () => { const c = cards[i]; if (!c) throw Error("fixture exhausted"); return { ...c }; };
  return draw;
};
const prepared = (seed: string, index: number, initial: readonly Card[] = [card("8"), card("8"), card("9"), card("9")], luzCards: readonly Card[] = [card("2"), card("3"), card("4"), card("2")], dealerCards: readonly Card[] = [card("6"), card("10"), card("10"), card("10")]): PreparedCofreFocoRound => ({ seed, index, draws: {
  initial: lane(initial), dealer: lane(dealerCards),
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
function seedFor(family: PactFamily): string {
  for (let n = 0; n < 1000; n += 1) { const seed = `P7-test-seed-${n}`; if (drawPactFamily(seed, 4) === family) return seed; }
  throw Error("No seed fixture found");
}
function reachFour(family: PactFamily): { session: PactBookA1aSessionAdapter; seed: string } {
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

  it("Ordem clears the preview after Parar so the next Face can act and Dobrar normally", () => {
    const { session, seed } = reachFour("destiny");
    session.sign("order"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.revealOrderPreview()).toEqual({ hand: "luz", card: card("2") });
    expect(session.contract.privilege).toBe("consumed");
    const advanced = session.act("stand");
    expect(advanced.round?.currentHand).toBe("sombra");
    expect(session.orderPreview).toBeNull();
    expect(session.legalActions).toContain("double");
    expect(() => session.act("double")).not.toThrow();
    expect(session.contract.privilege).toBe("consumed");
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

  it("Cisão composes exactly 3+1, suppresses naturals, and honors dealer-natural settlement", () => {
    const { session, seed } = reachFour("bonding");
    session.sign("cisao");
    session.startRound(prepared(seed, 3, [card("A"), card("10"), card("2"), card("9")], undefined, [card("A"), card("10")] ), 1);
    const result = session.composeCisao("luz");
    expect(result.round?.hands?.luz.cards).toEqual([card("A"), card("10"), card("2")]);
    expect(result.round?.hands?.sombra.cards).toEqual([card("9")]);
    expect(result.round?.openingPartition).toEqual({ luz: [0, 1, 2], sombra: [3] });
    expect(result.round?.hands?.luz.openingNatural).toBe(false);
    expect(result.round?.hands?.sombra.openingNatural).toBe(false);
    expect(result.round?.settlement?.luz.outcome).toBe("loss");
    expect(result.round?.settlement?.sombra.outcome).toBe("loss");
    expect(result.round?.score).toBe(-20);
    expect(session.contract.privilege).toBe("consumed");
    expect(() => session.composeCisao("sombra")).toThrow(/indisponível/i);
  });

  it("Cisão supports all eight player-selected 3+1 layouts without consuming privilege on invalid index", () => {
    for (const threeCardHand of ["luz", "sombra"] as const) {
      for (let isolated = 0; isolated < 4; isolated += 1) {
        const { session, seed } = reachFour("bonding");
        session.sign("cisao"); session.startRound(prepared(seed, 3), 1);
        const result = session.composeCisao(threeCardHand, isolated);
        const partition = result.round?.openingPartition;
        const singleFace = threeCardHand === "luz" ? "sombra" : "luz";
        expect(partition?.[singleFace]).toEqual([isolated]);
        expect(partition?.[threeCardHand]).toEqual([0, 1, 2, 3].filter(index => index !== isolated));
        expect(result.round?.hands?.[singleFace].cards).toHaveLength(1);
        expect(result.round?.hands?.[threeCardHand].cards).toHaveLength(3);
      }
    }
    const { session, seed } = reachFour("bonding");
    session.sign("cisao"); session.startRound(prepared(seed, 3), 1);
    const initial = session.current;
    expect(() => session.composeCisao("luz", 4)).toThrow(/carta isolada/i);
    expect(session.current).toEqual(initial);
    expect(session.contract.privilege).toBe("available");
  });

  it("Balança reveals only a coarse category, requires one final recomposition, and suppresses natural bonus", () => {
    const { session, seed } = reachFour("bonding");
    session.sign("balanca");
    session.startRound(prepared(seed, 3, [card("A"), card("10"), card("8"), card("9")], undefined, [card("A"), card("10")] ), 1);
    expect(session.current.round?.naturalPeek).toBeNull();
    expect(() => session.revealBalancaCategory()).toThrow(/proposta inicial/i);
    expect(session.current.round?.dealerHoleCategory).toBeUndefined();
    session.proposeBalanca(opening);
    expect(session.current.round?.phase).toBe("compose");
    expect(session.revealBalancaCategory()).toBe("Alta (7–K)");
    expect(session.current.round?.dealerHoleCategory).toBe("high");
    expect(session.current.round).not.toHaveProperty("dealerHole");
    expect(session.current.round?.naturalPeek).toBeNull();
    expect(session.balancaRecomposePending).toBe(true);
    const final = session.compose(opening);
    expect(final.round?.hands?.luz.openingNatural).toBe(false);
    expect(final.round?.settlement?.luz.outcome).toBe("loss");
    expect(final.round?.settlement?.luz.score).toBe(-10);
    expect(session.contract.privilege).toBe("consumed");
    expect(session.balancaRecomposePending).toBe(false);
  });

  it("Lastro reduces the Ato stake cap and refunds exactly half a protected single-hand loss in ticks", () => {
    const { session, seed } = reachFour("fortune");
    session.sign("lastro");
    expect(session.bankroll.maxStake).toBe(Math.min(Math.floor(Number(session.bankroll.balance) / 4), Math.max(1, Math.floor(Number(session.bankroll.balance) / 8))));
    session.setLastroProtectionFace("luz");
    const beforeTicks = session.bankroll.balanceTicks;
    session.startRound(prepared(seed, 3, [card("10"), card("9"), card("8"), card("8")], [card("2"), card("3")], [card("10"), card("10")]), 1);
    const partition = { luz: [0, 1] as const, sombra: [2, 3] as const };
    session.compose(partition); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    while (session.current.round?.phase === "player") session.act("stand");
    const settled = session.resolveDealer();
    expect(settled.round?.settlement?.luz).toMatchObject({ outcome: "loss", score: -10 });
    expect(settled.round?.score).toBe(-20);
    expect(session.bankroll.balanceTicks).toBe(beforeTicks - 3);
    expect(session.bankroll.lastSettlement).toMatchObject({ deltaTicks: -3, refundTicks: 1, score: -20 });
    expect(session.bankroll.focusRemaining).toBe(3);
  });

  it("Lastro refunds half of a doubled loss exactly and does not change the strategic score", () => {
    const { session, seed } = reachFour("fortune");
    session.sign("lastro"); session.setLastroProtectionFace("luz");
    const beforeTicks = session.bankroll.balanceTicks;
    session.startRound(prepared(seed, 3, [card("8"), card("8"), card("8"), card("9")], [card("2"), card("3")], [card("10"), card("9")]), 1);
    session.compose(opening); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).toContain("double");
    session.act("double"); session.act("stand");
    const settled = session.resolveDealer();
    expect(settled.round?.score).toBe(-30);
    expect(session.bankroll.lastSettlement).toMatchObject({ score: -30, refundTicks: 2, deltaTicks: -4 });
    expect(session.bankroll.balanceTicks).toBe(beforeTicks - 4);
  });

  it("Audácia raises only the chosen-round covered stake, blocks both doubles, and prevents negative balance", () => {
    const { session, seed } = reachFour("fortune");
    session.sign("audacity");
    const regularMaximum = Math.floor(Number(session.bankroll.balance) / 4);
    expect(session.bankroll.maxStake).toBe(regularMaximum);
    session.setAudacityIntent(true);
    const audacityMaximum = Math.floor(Number(session.bankroll.balance) / 2);
    expect(session.bankroll.maxStake).toBe(audacityMaximum);
    const completedBeforeInvalidStake = session.bankroll.completedRounds;
    expect(() => session.startRound(prepared(seed, 3), audacityMaximum + 1)).toThrow(/Aposta inelegível/i);
    expect(session.isBetting).toBe(true);
    expect(session.bankroll.completedRounds).toBe(completedBeforeInvalidStake);
    expect(session.contract.privilege).toBe("available");
    expect(session.audacityIntent).toBe(true);
    session.startRound(prepared(seed, 3, [card("8"), card("8"), card("9"), card("9")], [card("2"), card("3")], [card("10"), card("9")]), audacityMaximum);
    expect(session.bankroll.coverage).toBe(2 * audacityMaximum);
    expect(session.contract.privilege).toBe("consumed");
    session.compose(opening); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    expect(session.legalActions).toEqual(["hit", "stand"]);
    const handBefore = session.current.round?.hands?.luz.cards;
    expect(() => session.act("double")).toThrow(/proibido pela Renúncia/i);
    expect(session.current.round?.hands?.luz.cards).toEqual(handBefore);
    while (session.current.round?.phase === "player") session.act("stand");
    const settled = session.resolveDealer();
    expect(settled.round?.score).toBe(-20);
    expect(session.bankroll.balanceTicks).toBe(0);
    expect(session.bankroll.status).toBe("practice");
  });

  it("keeps Audácia eligible at a 3-chip balance where standard A1a coverage would enter practice", () => {
    const { session, seed } = reachFour("fortune");
    session.sign("audacity");
    const preRoundBalance = Number(session.bankroll.balance);
    const stake = Math.floor(preRoundBalance / 4) - 1;
    session.startRound(prepared(seed, 3, [card("8"), card("8"), card("10"), card("10")], [card("10")], [card("10"), card("10")]), stake);
    session.compose(opening); session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    session.act("double");
    expect(session.current.round?.hands?.luz.exposure).toBe(20);
    expect(session.current.round?.currentHand).toBe("sombra");
    session.act("double");
    expect(session.current.round?.hands?.sombra.exposure).toBe(20);
    expect(session.current.round?.hands?.sombra.cards).toEqual([card("10"), card("10"), card("2")]);
    expect(session.current.round?.hands?.sombra.status).toBe("busted");
    const ended = session.resolveDealer();
    expect(ended.round?.settlement).toMatchObject({ luz: { score: -20 }, sombra: { outcome: "loss", score: -20 } });
    expect(ended.round?.score).toBe(-40);
    session.enterBetting();
    expect(session.bankroll.balance).toBe("4");
    session.startRound(prepared(seed, 4, [card("10"), card("10"), card("9"), card("10")], [card("10")], [card("10"), card("10")]), 1);
    session.compose({ luz: [2, 3], sombra: [0, 1] });
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    session.act("stand"); session.act("stand");
    expect(session.resolveDealer().round?.score).toBe(-10);
    expect(session.bankroll.balance).toBe("3");
    session.enterBetting();
    expect(session.bankroll.status).toBe("active");
    expect(session.bankroll.maxStake).toBe(0);
    session.setAudacityIntent(true);
    expect(session.bankroll.maxStake).toBe(1);
  });

  it("Segunda Chance suspends Parar before advancing and permits exactly one forced Compra", () => {
    const { session, seed } = reachFour("choice");
    session.sign("secondChance"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    const pending = session.act("stand");
    expect(pending.round?.currentHand).toBe("luz");
    expect(session.secondChancePending).toBe("luz");
    expect(session.legalActions).toEqual([]);
    const resolved = session.resolveSecondChance(true);
    expect(resolved.round?.hands?.luz.cards).toHaveLength(3);
    expect(resolved.round?.hands?.luz.status).toBe("stood");
    expect(resolved.round?.currentHand).toBe("sombra");
    expect(session.contract.privilege).toBe("consumed");
    expect(() => session.resolveSecondChance(true)).toThrow(/não está disponível/i);
  });

  it("Juramento consumes on category reveal, keeps the exact card private, and forces the accepted Compra then Parar", () => {
    const { session, seed } = reachFour("choice");
    session.sign("oath", "luz"); session.startRound(prepared(seed, 3), 1); session.compose(opening);
    session.skipRead(); session.skipManeuver(); session.continueAfterAbilities();
    const focus = session.bankroll.focusRemaining;
    expect(session.canUseJuramento).toBe(true);
    expect(session.revealJuramento()).toEqual({ hand: "luz", category: "Baixa (2–6)" });
    expect(session.current.round?.hands?.luz.cards).toHaveLength(2);
    expect(session.current.round).not.toHaveProperty("juramentoPreview");
    expect(session.contract.privilege).toBe("consumed");
    expect(() => session.revealJuramento()).toThrow(/indisponível/i);
    session.resolveJuramento(true);
    expect(session.legalActions).not.toContain("double");
    expect(() => session.act("stand")).toThrow(/Juramento exige/i);
    const result = session.act("hit");
    expect(result.round?.hands?.luz.cards.at(-1)).toEqual(card("2"));
    expect(result.round?.hands?.luz.status).toBe("stood");
    expect(session.contract.commitmentHand).toBeNull();
    expect(session.bankroll.focusRemaining).toBe(focus);
    expect(() => session.maneuverDirect("luz", 0)).toThrow(/proibida/i);
  });
});
