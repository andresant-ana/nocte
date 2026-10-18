// @vitest-environment node
import { DF_SYM_01_3_TO_2, partitions, type Card, type CardSource, type RuleProfile } from "@nocte/engine";
import { BenchmarkRandom } from "../../../sim/src/streams.js";
import { describe, expect, it } from "vitest";
import { prepareRound, type PreparedRound } from "./random";
import { SoloSession } from "./session";

const card = (rank: Card["rank"]): Card => ({ rank });
const source = (cards: Card[]): CardSource => {
  let index = 0;
  return () => {
    const next = cards[index++];
    if (!next) throw new Error("test card source exhausted");
    return next;
  };
};
const prepared = (initial: Card[], luz: Card[] = [], sombra: Card[] = [], dealer: Card[] = [], rules: RuleProfile = DF_SYM_01_3_TO_2): PreparedRound => ({
  seed: "test-seed", index: 0, rules,
  initial: source(initial),
  draws: { luz: source(luz), sombra: source(sombra), dealer: source(dealer) },
});

describe("browser random stream and solo session", () => {
  it("matches the P1B initial lane and keeps the hole card hidden until completion", async () => {
    const seed = "p2a-rng-regression";
    const scenarioIndex = 31;
    const session = SoloSession.start(await prepareRound(seed, scenarioIndex, DF_SYM_01_3_TO_2));
    const initial = session.currentPublic();
    const reference = new BenchmarkRandom(seed, scenarioIndex, "initial");
    expect(initial.originalCards).toEqual(Array.from({ length: 4 }, () => reference.card()));
    expect(initial.dealerUp).toEqual(reference.card());
    expect(initial).not.toHaveProperty("dealerHole");

    const choice = partitions(initial.originalCards)[0]!;
    const composed = session.compose(choice);
    expect(composed.phase).toBe("player");
    expect(composed).not.toHaveProperty("dealerHole");
    const hand = composed.currentHand!;
    const handReference = new BenchmarkRandom(seed, scenarioIndex, hand);
    expect(session.act("hit").hands?.[hand].cards.at(-1)).toEqual(handReference.card());
  });

  it("preserves a dealer natural through composition and reveals it only at the terminal round", () => {
    const session = SoloSession.start(prepared([card("5"), card("6"), card("8"), card("9"), card("A"), card("10")]));
    expect(session.currentPublic()).not.toHaveProperty("dealerHole");
    const complete = session.compose({ luz: [0, 1], sombra: [2, 3] });
    expect(complete.phase).toBe("complete");
    expect(complete.dealerHole).toEqual(card("10"));
    expect(complete.settlement?.luz.outcome).toBe("loss");
    expect(complete.settlement?.sombra.outcome).toBe("loss");
  });

  it("uses named hand/dealer sources and exposes no mutable internal references", () => {
    const session = SoloSession.start(prepared(
      [card("5"), card("6"), card("8"), card("9"), card("6"), card("10")],
      [card("2")], [], [card("5"), card("6")],
    ));
    const first = session.currentPublic();
    const mutable = first.originalCards as Card[];
    mutable[0] = card("A");
    expect(session.currentPublic().originalCards[0]).toEqual(card("5"));
    const playing = session.compose({ luz: [0, 1], sombra: [2, 3] });
    expect(playing.phase).toBe("player");
    const afterHit = session.act("hit");
    expect(afterHit.hands?.luz.cards.at(-1)).toEqual(card("2"));
    const next = session.act("stand");
    expect(next.currentHand).toBe("sombra");
    const dealerPhase = session.act("stand");
    expect(dealerPhase.phase).toBe("dealer");
    const complete = session.resolveDealer();
    expect(complete.phase).toBe("complete");
    expect(complete.dealerHole).toEqual(card("10"));
    expect(complete).toHaveProperty("settlement");
  });

  it("rejects a stale or illegal command without changing the public state", () => {
    const session = SoloSession.start(prepared([card("5"), card("6"), card("8"), card("9"), card("6"), card("10")]));
    const before = session.currentPublic();
    expect(() => session.act("hit")).toThrow(/ilegal/i);
    expect(session.currentPublic()).toEqual(before);
  });

  it("keeps the round unchanged if a prepared draw lane is exhausted", () => {
    const session = SoloSession.start(prepared(
      [card("5"), card("6"), card("8"), card("9"), card("6"), card("10")],
    ));
    const playing = session.compose({ luz: [0, 1], sombra: [2, 3] });
    const before = structuredClone(playing);
    expect(() => session.act("hit")).toThrow(/exhausted/i);
    expect(session.currentPublic()).toEqual(before);
  });
});
