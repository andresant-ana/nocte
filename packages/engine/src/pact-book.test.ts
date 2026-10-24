import { describe, expect, it } from "vitest";
import { PACT_BOOK_FAMILIES, PACT_BOOK_PACTS, createPactBook, drawPactFamily, enterPactBookRound,
  offerPactBook, refusePactBook, signPactBook, consumePactBookPrivilege, pactBookRestrictions, expirePactBook } from "./pact-book.js";

describe("PACT-BOOK-0.1 staged catalogue and offers", () => {
  it("exposes only complete versioned first-delivery pairs", () => {
    expect(Object.keys(PACT_BOOK_PACTS)).toHaveLength(6);
    expect(PACT_BOOK_FAMILIES).toEqual(["revelation", "dominion", "focus"]);
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
    for (const family of PACT_BOOK_FAMILIES) expect(counts.get(family)).toBeGreaterThan(3800);
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
});
