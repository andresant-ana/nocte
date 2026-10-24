import { describe, expect, it } from "vitest";
import { PACT_BOOK_FAMILIES, PACT_BOOK_PACTS, createPactBook, drawPactFamily, enterPactBookRound,
  offerPactBook, refusePactBook, signPactBook, consumePactBookPrivilege, pactBookRestrictions, expirePactBook,
  markPactBookCofreSealed, canUsePactBookPrivilege } from "./pact-book.js";

describe("PACT-BOOK-0.1 staged catalogue and offers", () => {
  it("exposes all nine complete versioned pairs and eighteen pacts", () => {
    expect(Object.keys(PACT_BOOK_PACTS)).toHaveLength(18);
    expect(PACT_BOOK_FAMILIES).toEqual(["revelation", "dominion", "focus", "sacrifice", "time", "destiny", "bonding", "fortune", "choice"]);
    expect(new Set(Object.values(PACT_BOOK_PACTS).map(p => p.family))).toEqual(new Set(PACT_BOOK_FAMILIES));
  });
  it("reproduces family draws independently by offer domain and uniformly rejects biased tails", () => {
    const a = drawPactFamily("seed-42", 4); const b = drawPactFamily("seed-42", 4);
    expect(a).toBe(b);
    expect(drawPactFamily("seed-42", 8, [a!])).not.toBe(a);
    expect(drawPactFamily("seed-42", 8, PACT_BOOK_FAMILIES)).toBeNull();
    const counts = new Map<string, number>();
    for (let i = 0; i < 12000; i += 1) {
      const family = drawPactFamily(`distribution-${i}`, 4)!;
      counts.set(family, (counts.get(family) ?? 0) + 1);
    }
    for (const family of PACT_BOOK_FAMILIES) expect(counts.get(family)).toBeGreaterThan(1000);
  });
  it("offers opposite complete pairs twice, forbids repeats even after refusal, and expires before Ato III", () => {
    let state = offerPactBook(createPactBook(), 4, "night-seed");
    const first = state.current!;
    expect(first.options).toHaveLength(2);
    expect(first.options.every(id => PACT_BOOK_PACTS[id].family === first.family)).toBe(true);
    state = refusePactBook(state);
    state = enterPactBookRound(state, 8);
    expect(state.current?.status).toBe("refused");
    state = offerPactBook(state, 8, "night-seed");
    expect(state.current?.family).not.toBe(first.family);
    expect(state.offers).toHaveLength(2);
    expect(state.offers[0]?.status).toBe("refused");
    expect(() => offerPactBook(state, 8, "night-seed")).toThrow(/Oferta anterior/i);
  });
  it("keeps Iron Renúncia after the privilege is consumed and removes it at the act boundary", () => {
    let state = offerPactBook(createPactBook(), 4, "iron-seed", ["dominion"]);
    state = signPactBook(state, "iron", "sombra");
    expect(pactBookRestrictions(state, 4)?.forbiddenDoubleHand).toBe("sombra");
    state = consumePactBookPrivilege(state, 5);
    expect(state.current?.privilege).toBe("consumed");
    expect(pactBookRestrictions(state, 7)?.forbiddenDoubleHand).toBe("sombra");
    state = enterPactBookRound(state, 8);
    expect(state.current?.privilege).toBe("consumed");
    expect(pactBookRestrictions(state, 8)).toBeUndefined();
  });
  it("keeps a free choice in refusal and terminal expiration", () => {
    const offered = offerPactBook(createPactBook(), 4, "refusal-seed", ["focus"]);
    const refused = expirePactBook(refusePactBook(offered), "abandoned");
    expect(refused.status).toBe("abandoned");
    expect(refused.current?.choice).toBe("refused");
  });
  it("records an explicit no-offer fallback when no complete pair is eligible", () => {
    const fallback = offerPactBook(createPactBook(), 4, "fallback-seed", []);
    expect(fallback.current).toBeNull();
    expect(fallback.offers).toHaveLength(0);
    expect(fallback.fallbackReason).toBe("no-complete-pair-eligible");
  });
  it("applies Bastião, Reflexo, Penhor, Arremate and Destino Renúncias while their Privilégio is available or consumed", () => {
    const signed = (pact: "bastion" | "reflection" | "bond" | "finale" | "order" | "chaos", family: "sacrifice" | "time" | "destiny", round = 4) =>
      signPactBook(offerPactBook(createPactBook(), round, `restriction-${pact}`, [family]), pact, pact === "bastion" ? "luz" : undefined);
    const bastion = signed("bastion", "sacrifice");
    expect(pactBookRestrictions(bastion, 4)).toMatchObject({ requiredHitBeforeStandHand: "luz", autoStandAt21Hand: "luz" });
    const reflection = signed("reflection", "sacrifice");
    expect(pactBookRestrictions(reflection, 4)).toMatchObject({ forbidDouble: true });
    const penhor = markPactBookCofreSealed(signed("bond", "time"), 5, 6);
    expect(pactBookRestrictions(penhor, 5)).toMatchObject({ forbidManeuver: true });
    expect(pactBookRestrictions(penhor, 6)).toBeUndefined();
    const arremate = consumePactBookPrivilege(signed("finale", "time"), 4);
    expect(pactBookRestrictions(arremate, 5)).toMatchObject({ forbidManeuver: true });
    expect(pactBookRestrictions(signed("order", "destiny"), 4)).toMatchObject({ forbidManeuver: true });
    expect(pactBookRestrictions(signed("chaos", "destiny"), 4)).toMatchObject({ forbidRead: true });
  });
  it("does not allow temporal Privilégios with no eligible within-Ato consequence", () => {
    const penhor = signPactBook(offerPactBook(createPactBook(), 4, "penhor-last", ["time"]), "bond");
    expect(() => markPactBookCofreSealed(penhor, 7, 7)).toThrow(/rodada seguinte/i);
    const first = offerPactBook(createPactBook(), 4, "finale-first", ["destiny"]);
    const thirdAct = offerPactBook(enterPactBookRound(first, 8), 8, "finale-last", ["time"]);
    const finale = signPactBook(thirdAct, "finale");
    expect(canUsePactBookPrivilege(finale, 10)).toBe(false);
  });
  it("enforces P7-C renunciations and atomic Audácia scope through the Act", async () => {
    const { activatePactBookAudacity, assertPactBookManeuverAllowed } = await import("./pact-book.js");
    const signed = (family: "bonding" | "fortune" | "choice", pact: "cisao" | "balanca" | "lastro" | "audacity" | "secondChance" | "oath", face?: "luz" | "sombra") =>
      signPactBook(offerPactBook(createPactBook(), 4, `p7c-${pact}`, [family]), pact, face);
    const cisao = signed("bonding", "cisao");
    expect(pactBookRestrictions(cisao, 4)).toMatchObject({ forbidDouble: true });
    expect(pactBookRestrictions(cisao, 7)).toMatchObject({ forbidDouble: true });
    expect(pactBookRestrictions(signed("bonding", "balanca"), 5)).toMatchObject({ forbidManeuver: true });
    expect(pactBookRestrictions(signed("fortune", "audacity"), 4)).toMatchObject({ forbidManeuver: true });
    const audacity = activatePactBookAudacity(signed("fortune", "audacity"), 5);
    expect(pactBookRestrictions(audacity, 5)).toMatchObject({ forbidDouble: true, forbidManeuver: true });
    expect(pactBookRestrictions(audacity, 6)).toMatchObject({ forbidManeuver: true });
    expect(() => activatePactBookAudacity(audacity, 5)).toThrow(/indisponível/i);
    expect(pactBookRestrictions(signed("choice", "secondChance"), 4)).toMatchObject({ forbidRead: true });
    const oath = signed("choice", "oath", "luz");
    expect(pactBookRestrictions(oath, 4)).toMatchObject({ forbiddenDoubleHand: "luz", forbiddenManeuverHand: "luz" });
    expect(() => assertPactBookManeuverAllowed(oath, 4, "luz")).toThrow(/Manobra/i);
    expect(() => assertPactBookManeuverAllowed(oath, 4, "sombra")).not.toThrow();
    expect(() => signPactBook(offerPactBook(createPactBook(), 4, "oath-invalid", ["choice"]), "oath")).toThrow(/Face/i);
  });
});
