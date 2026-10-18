import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  DF_SYM_01_1_TO_1, DF_SYM_01_3_TO_2, applyAction, compose, createRound,
  handValue, legalActions, partitions, playDealer, publicRound, roundScore,
  type Card, type Partition,
} from "./index.js";

const c = (rank: Card["rank"]): Card => ({ rank });
function sequence(cards: readonly Card[]): () => Card {
  let index = 0;
  return () => { const card = cards[index++]; if (!card) throw new Error("Test draw sequence exhausted."); return card; };
}
const initial = [c("5"), c("6"), c("10"), c("10"), c("7"), c("9")];
const firstPartition: Partition = { luz: [0, 1], sombra: [2, 3] };

describe("card values and composition", () => {
  it("handles soft aces, multiple aces, bust adjustment and naturals", () => {
    expect(handValue([c("A"), c("6")])).toMatchObject({ total: 17, soft: true, bust: false });
    expect(handValue([c("A"), c("A"), c("9")])).toMatchObject({ total: 21, soft: true });
    expect(handValue([c("A"), c("9"), c("9")])).toMatchObject({ total: 19, soft: false });
    expect(handValue([c("A"), c("10")]).natural).toBe(true);
    expect(handValue([c("7"), c("7"), c("7")]).natural).toBe(false);
  });
  it("returns three distinct unordered rank partitions and collapses duplicate outcomes", () => {
    expect(partitions([c("5"), c("6"), c("9"), c("10")])).toHaveLength(3);
    expect(partitions([c("5"), c("5"), c("6"), c("6")])).toHaveLength(2);
    expect(() => partitions([c("A")])).toThrow();
  });
  it("uses each source card once when composing", () => {
    const round = createRound(sequence(initial));
    expect(() => compose(round, { luz: [0, 0], sombra: [2, 3] })).toThrow(/Partição inválida/);
    expect(round.phase).toBe("compose");
  });
});

describe("DF-SYM-0.1 state machine", () => {
  it("keeps dealer hole, natural status and future draws out of public pre-reveal state", () => {
    const naturalDealer = createRound(sequence([c("2"), c("3"), c("4"), c("5"), c("A"), c("10")]));
    const visible = publicRound(naturalDealer) as unknown as Record<string, unknown>;
    expect(visible.dealerHole).toBeUndefined();
    expect(visible.naturalPeek).toBeNull();
    expect(JSON.stringify(visible)).not.toContain("dealerDraws");
    const ended = compose(naturalDealer, firstPartition);
    expect(publicRound(ended).dealerHole).toEqual(c("10"));
    expect(publicRound(ended).naturalPeek).toBe(true);
  });
  it("natural dealer peek pushes composed natural and loses other hand", () => {
    const round = createRound(sequence([c("A"), c("10"), c("7"), c("8"), c("A"), c("10")]));
    const finished = compose(round, firstPartition);
    expect(finished.phase).toBe("complete");
    expect(finished.settlement?.luz.outcome).toBe("push");
    expect(finished.settlement?.sombra.outcome).toBe("loss");
    expect(roundScore(finished)).toBe(-10);
    expect(() => applyAction(finished, "stand", sequence([]))).toThrow(/ilegal/);
  });
  it("resolves tie as push, and bust loses even when dealer busts", () => {
    const tieRound = createRound(sequence([c("5"), c("6"), c("10"), c("10"), c("7"), c("9")]));
    let tied = compose(tieRound, firstPartition);
    tied = applyAction(tied, "stand", sequence([]));
    tied = applyAction(tied, "stand", sequence([]));
    tied = playDealer(tied, sequence([c("4")]));
    expect(tied.settlement?.sombra.outcome).toBe("push"); // 20 versus dealer 20

    const bustRound = createRound(sequence([c("10"), c("6"), c("10"), c("8"), c("10"), c("6")]));
    let busted = compose(bustRound, { luz: [0, 2], sombra: [1, 3] });
    busted = applyAction(busted, "hit", sequence([c("5")]));
    busted = applyAction(busted, "stand", sequence([]));
    busted = playDealer(busted, sequence([c("10")]));
    expect(handValue(busted.hands!.luz.cards).bust).toBe(true);
    expect(handValue([busted.dealerUp, busted.dealerHole, ...busted.dealerDraws]).bust).toBe(true);
    expect(busted.settlement?.luz.outcome).toBe("loss");
  });
  it("allows double only on two cards and draws exactly once", () => {
    const round = createRound(sequence([c("5"), c("6"), c("10"), c("10"), c("7"), c("9")]));
    let state = compose(round, firstPartition);
    expect(legalActions(state)).toEqual(["hit", "stand", "double"]);
    state = applyAction(state, "hit", sequence([c("2")]));
    expect(legalActions(state)).toEqual(["hit", "stand"]);
    expect(() => applyAction(state, "double", sequence([]))).toThrow(/ilegal/);
    const doubled = applyAction(state, "stand", sequence([]));
    expect(doubled.currentHand).toBe("sombra");
    const afterDouble = applyAction(doubled, "double", sequence([c("A")]));
    expect(afterDouble.hands?.sombra.cards).toHaveLength(3);
    expect(afterDouble.hands?.sombra.exposure).toBe(20);
    expect(afterDouble.hands?.sombra.status).toBe("doubled");
  });
  it("pays the configured natural sensitivity without making it ratified", () => {
    for (const [rules, expected] of [[DF_SYM_01_3_TO_2, 15], [DF_SYM_01_1_TO_1, 10]] as const) {
      let round = createRound(sequence([c("A"), c("7"), c("10"), c("9"), c("6"), c("9")]), rules);
      round = compose(round, { luz: [0, 2], sombra: [1, 3] });
      round = applyAction(round, "stand", sequence([]));
      round = playDealer(round, sequence([c("2")]));
      expect(round.settlement?.luz.score).toBe(expected);
      expect(rules.status).toBe("EXPERIMENTAL");
    }
  });
  it("stands on soft 17 and gives a composed natural priority over a non-natural 21 in this profile", () => {
    let soft17 = createRound(sequence([c("5"), c("6"), c("8"), c("9"), c("A"), c("6")]));
    soft17 = compose(soft17, firstPartition);
    soft17 = applyAction(soft17, "stand", sequence([]));
    soft17 = applyAction(soft17, "stand", sequence([]));
    soft17 = playDealer(soft17, sequence([]));
    expect(soft17.dealerDraws).toHaveLength(0);
    expect(soft17.settlement?.luz.dealerTotal).toBe(17);

    let natural = createRound(sequence([c("A"), c("7"), c("10"), c("8"), c("7"), c("7")]));
    natural = compose(natural, { luz: [0, 2], sombra: [1, 3] });
    natural = applyAction(natural, "stand", sequence([]));
    natural = playDealer(natural, sequence([c("7")]));
    expect(natural.settlement?.luz.dealerTotal).toBe(21);
    expect(natural.settlement?.luz.outcome).toBe("win");
    expect(natural.settlement?.luz.score).toBe(15);
  });
  it("rejects illegal transitions without mutating the original state", () => {
    const round = createRound(sequence(initial));
    expect(() => applyAction(round, "hit", sequence([]))).toThrow();
    expect(round.phase).toBe("compose");
  });
});

describe("property invariants", () => {
  it("all four input indices are covered exactly once by each partition", () => {
    fc.assert(fc.property(fc.array(fc.constantFrom<Card["rank"]>("A", "2", "3", "4", "5", "6", "7", "8", "9", "10"), { minLength: 4, maxLength: 4 }), ranks => {
      const cards = ranks.map(c);
      for (const partition of partitions(cards)) {
        expect([...partition.luz, ...partition.sombra].sort()).toEqual([0, 1, 2, 3]);
      }
      expect(partitions(cards).length).toBeGreaterThanOrEqual(1);
      expect(partitions(cards).length).toBeLessThanOrEqual(3);
    }), { numRuns: 300 });
  });
});
