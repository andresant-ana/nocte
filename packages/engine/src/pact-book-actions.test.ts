import { describe, expect, it } from "vitest";
import type { Card, CardSource, Partition } from "./index.js";
import { partitions } from "./index.js";
import { CF_LAB_01_3_TO_2, beginRound, composeCofreFoco, continueAfterAbilities, createNight, legalCofreFocoActions,
  applyCofreFocoAction, beginPactBookHit, resolvePactBookHit, skipManeuver, skipRead, type CofreFocoDraws, type CofreFocoNight } from "./cofre-foco.js";

const card = (rank: Card["rank"]): Card => ({ rank });
function lane(cards: readonly Card[]) {
  let index = 0;
  const draw = (() => { const next = cards[index++]; if (!next) throw new Error("lane exhausted"); return { ...next }; }) as CardSource & { peek: () => Card };
  draw.peek = () => { const next = cards[index]; if (!next) throw new Error("lane exhausted"); return { ...next }; };
  return { draw, count: () => index };
}
function activeRound(luz: readonly Card[], sombra: readonly Card[], cofre = card("5")) {
  const initial = [luz[0]!, luz[1]!, sombra[0]!, sombra[1]!];
  const dealer = lane([card("6"), card("10"), card("10")]);
  const cofreLane = lane([cofre, card("A"), card("10")]);
  const luzLane = lane(luz.slice(2)); const sombraLane = lane(sombra.slice(2));
  const draws: CofreFocoDraws = { initial: lane(initial).draw, dealer: dealer.draw, cofre: cofreLane.draw };
  const opening = partitions(initial).find(p => p.luz.every((i, n) => i === n) && p.sombra.every((i, n) => i === n + 2)) as Partition;
  let night: CofreFocoNight = beginRound(createNight(CF_LAB_01_3_TO_2), draws);
  night = composeCofreFoco(night, opening);
  if (night.round?.phase === "focusWindow") night = continueAfterAbilities(skipManeuver(skipRead(night)));
  return { night, luzLane, sombraLane, cofreLane, dealer };
}

describe("PACT-BOOK-0.1 transactional hit hooks", () => {
  it("keeps a busting Bastião Compra pending until it is saved or resolved", () => {
    const fixture = activeRound([card("10"), card("9"), card("5")], [card("8"), card("8"), card("2")]);
    let draws = 0;
    const pending = beginPactBookHit(fixture.night, () => { draws += 1; return card("5"); });
    expect(draws).toBe(1);
    expect(pending.round?.phase).toBe("hitPending");
    expect(pending.round?.pendingHitCard).toEqual(card("5"));
    expect(pending.round?.hands?.luz.status).toBe("playing");
    const saved = resolvePactBookHit(pending, "bastion");
    expect(saved.round?.hands?.luz.cards).toHaveLength(2);
    expect(saved.round?.hands?.luz.status).toBe("stood");
    expect(saved.round?.phase).toBe("player");
    expect(() => resolvePactBookHit(saved, "normal")).toThrow();
  });

  it("transfers a Reflexo card once to the other active Face before evaluating its bust", () => {
    const fixture = activeRound([card("10"), card("9"), card("5")], [card("10"), card("2"), card("2")]);
    const pending = beginPactBookHit(fixture.night, () => card("5"));
    const next = resolvePactBookHit(pending, "reflection", undefined, "sombra");
    expect(next.round?.hands?.luz.cards).toHaveLength(2);
    expect(next.round?.hands?.luz.status).toBe("stood");
    expect(next.round?.hands?.sombra.cards).toEqual([card("10"), card("2"), card("5")]);
    expect(next.round?.hands?.sombra.status).toBe("playing");
  });

  it("Caos consumes one original and exactly one mandatory replacement from the same lane", () => {
    const fixture = activeRound([card("8"), card("9"), card("3"), card("2")], [card("10"), card("8"), card("4")]);
    const pending = beginPactBookHit(fixture.night, fixture.luzLane.draw);
    const result = resolvePactBookHit(pending, "chaos", fixture.luzLane.draw);
    expect(fixture.luzLane.count()).toBe(2);
    expect(result.round?.hands?.luz.cards).toEqual([card("8"), card("9"), card("2")]);
    expect(() => resolvePactBookHit(result, "chaos", fixture.luzLane.draw)).toThrow();
  });

  it("keeps Order preview non-consuming and the subsequent hit receives that exact card", () => {
    const fixture = activeRound([card("8"), card("9"), card("3")], [card("10"), card("8"), card("4")]);
    expect(fixture.luzLane.draw.peek()).toEqual(card("3"));
    expect(fixture.luzLane.count()).toBe(0);
    const afterHit = applyCofreFocoAction(fixture.night, "hit", fixture.luzLane.draw);
    expect(afterHit.round?.hands?.luz.cards.at(-1)).toEqual(card("3"));
    expect(fixture.luzLane.count()).toBe(1);
  });

  it("enforces Bastião and Reflexo action restrictions in both projection and executor", () => {
    const fixture = activeRound([card("8"), card("9"), card("3")], [card("10"), card("8"), card("4")]);
    let draws = 0;
    const bastion = { requiredHitBeforeStandHand: "luz" as const, autoStandAt21Hand: "luz" as const };
    expect(legalCofreFocoActions(fixture.night, undefined, bastion)).toEqual(["hit"]);
    expect(() => applyCofreFocoAction(fixture.night, "stand", () => { draws += 1; return card("2"); }, bastion)).toThrow(/Illegal/);
    expect(draws).toBe(0);
    expect(legalCofreFocoActions(fixture.night, undefined, { forbidDouble: true })).toEqual(["hit", "stand"]);
    expect(() => applyCofreFocoAction(fixture.night, "double", () => { draws += 1; return card("2"); }, { forbidDouble: true })).toThrow(/Illegal/);
    expect(draws).toBe(0);
  });
});
