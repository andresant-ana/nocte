import { describe, expect, it } from "vitest";
import {
  PACT_LAB_VERSION, assertPactActionAllowed, canUsePactPrivilege, completePactNight, consumePactPrivilege,
  createPactContract, enterPactRound, offerPact, pactActionRestrictions, pactHidesDealerUpcard, refusePacts, signPact,
} from "./pacts.js";

describe("PACT-LAB-0.1 contract", () => {
  it("offers exactly before round four, before any contract action or deal is implied", () => {
    const initial = createPactContract();
    expect(initial.version).toBe(PACT_LAB_VERSION);
    expect(offerPact(initial, 3)).toBe(initial);
    expect(offerPact(initial, 4).status).toBe("offered");
    expect(() => signPact(initial, "veil")).toThrow(/oferta/i);
  });

  it("allows declining both and never reopens the offer", () => {
    const refused = refusePacts(offerPact(createPactContract(), 4));
    expect(refused.status).toBe("refused");
    expect(offerPact(refused, 4)).toBe(refused);
    expect(refused.privilege).toBe("none");
  });

  it("activates Veil for rounds four through seven and expires the unused privilege before round eight", () => {
    let pact = signPact(offerPact(createPactContract(), 4), "veil");
    pact = enterPactRound(pact, 4);
    expect(pact.status).toBe("active");
    expect(canUsePactPrivilege(pact, 4, "veil")).toBe(true);
    expect(["compose", "focusWindow", "player", "dealer", "complete"].map(phase => pactHidesDealerUpcard(pact, 4, phase)))
      .toEqual([true, false, false, false, false]);
    expect(pactHidesDealerUpcard(pact, 7, "compose")).toBe(true);
    pact = enterPactRound(pact, 8);
    expect(pact.status).toBe("expired");
    expect(pact.privilege).toBe("expired");
    expect(canUsePactPrivilege(pact, 8, "veil")).toBe(false);
  });

  it("makes Iron face-specific, blocks only its double, and keeps normal double after expiration", () => {
    let pact = enterPactRound(signPact(offerPact(createPactContract(), 4), "iron", "sombra"), 4);
    expect(pactActionRestrictions(pact, 4)?.forbiddenDoubleHand).toBe("sombra");
    expect(() => assertPactActionAllowed(pact, 4, "sombra", "double")).toThrow(/Renúncia/);
    expect(() => assertPactActionAllowed(pact, 4, "luz", "double")).not.toThrow();
    expect(() => assertPactActionAllowed(pact, 7, "sombra", "double")).toThrow();
    pact = enterPactRound(pact, 8);
    expect(pactActionRestrictions(pact, 8)).toBeUndefined();
    expect(() => assertPactActionAllowed(pact, 8, "sombra", "double")).not.toThrow();
  });

  it("consumes a Privilégio at most once, records its round and expires active contracts on abandonment", () => {
    const active = enterPactRound(signPact(offerPact(createPactContract(), 4), "iron", "luz"), 4);
    const consumed = consumePactPrivilege(active, 6, "iron");
    expect(consumed.privilege).toBe("consumed");
    expect(consumed.privilegeUsedRound).toBe(6);
    expect(() => consumePactPrivilege(consumed, 6, "iron")).toThrow(/indisponível/i);
    expect(completePactNight(active).status).toBe("expired");
    expect(completePactNight(active).privilege).toBe("expired");
    expect(completePactNight(offerPact(createPactContract(), 4)).status).toBe("expired");
  });
});
