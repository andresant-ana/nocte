import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  CF_CONTROL_COFRE_FREE, CF_CONTROL_FOCUS_READ, CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2, beginRound, composeCofreFoco,
  createNight, continueAfterAbilities, legalCofreFocoActions, maneuver, abandonNight,
  playCofreFocoDealer, projectCofreFoco, readDealerHole, readDealerHoleWithPactPrivilege, maneuverWithPactPrivilege, skipManeuver,
  skipRead, applyCofreFocoAction, type Card, type CofreFocoDraws,
  type CofreFocoNight,
} from "./cofre-foco.js";

const c = (rank: Card["rank"]): Card => ({ rank });
function draws(cards: Card[], reserve: Card, dealer: Card[] = []): CofreFocoDraws {
  let i = 0; let d = 0;
  const take = (source: Card[], label: string) => () => {
    const card = source[label === "initial" ? i++ : d++];
    if (!card) throw new Error(`Missing ${label} fixture card.`);
    return card;
  };
  return { initial: take(cards, "initial"), dealer: take(dealer, "dealer"), cofre: () => reserve };
}
const composeStandard = (cards = [c("8"), c("8"), c("9"), c("9")], reserve = c("4"), dealer = [c("6"), c("10")]) => {
  const started = beginRound(createNight(CF_LAB_01_3_TO_2, 2), draws(cards, reserve, dealer));
  return composeCofreFoco(started, { luz: [0, 1], sombra: [2, 3] });
};
function skipAbilityWindow(state: CofreFocoNight) {
  if (state.round?.phase !== "focusWindow") return state;
  let next = state;
  if (!next.round!.readDecisionMade) next = skipRead(next);
  if (!next.round!.maneuverDecisionMade) next = skipManeuver(next);
  return next.round?.phase === "focusWindow" ? continueAfterAbilities(next) : next;
}

describe("DF-CF-0.1-lab rules and hidden information", () => {
  it("deals four original cards, dealer up/hole and an independent fifth reserve", () => {
    const started = beginRound(createNight(CF_LAB_01_3_TO_2, 1), draws(
      [c("2"), c("3"), c("4"), c("5")], c("A"), [c("6"), c("7")],
    ));
    expect(started.round?.originalCards.map(x => x.rank)).toEqual(["2", "3", "4", "5"]);
    expect(started.round?.dealerUp.rank).toBe("6");
    expect(started.round?.cofre.rank).toBe("A");
    expect(started.focusRemaining).toBe(3);
  });

  it("keeps diagnostic controls explicitly separate from the approved full profile", () => {
    const free = beginRound(createNight(CF_CONTROL_COFRE_FREE, 1), draws(
      [c("8"), c("8"), c("9"), c("9")], c("4"), [c("6"), c("9")],
    ));
    const freeWindow = composeCofreFoco(free, { luz: [0, 1], sombra: [2, 3] });
    expect(freeWindow.focusRemaining).toBe(0);
    expect(maneuver(skipRead(freeWindow), "luz", 0).focusRemaining).toBe(0);
    const noReserve = beginRound(createNight(CF_CONTROL_FOCUS_READ, 1), draws(
      [c("8"), c("8"), c("9"), c("9")], c("4"), [c("6"), c("9")],
    ));
    const readWindow = composeCofreFoco(noReserve, { luz: [0, 1], sombra: [2, 3] });
    expect(projectCofreFoco(readWindow, "solo-player").round).not.toHaveProperty("cofre");
    expect(() => maneuver(skipRead(readWindow), "luz", 0)).toThrow();
  });

  it("applies free Pact privileges in the engine without spending Focus", () => {
    const composed = composeStandard();
    const read = readDealerHoleWithPactPrivilege(composed);
    expect(read.round?.readUsed).toBe(true);
    expect(read.focusRemaining).toBe(composed.focusRemaining);
    expect(read.focusSpent).toEqual(composed.focusSpent);
    const maneuverState = maneuverWithPactPrivilege(read, "luz", 0);
    expect(maneuverState.round?.maneuverUsed).toBe(true);
    expect(maneuverState.focusRemaining).toBe(composed.focusRemaining);
    expect(maneuverState.focusSpent).toEqual(composed.focusSpent);
  });

  it("enforces an Iron double restriction in engine legal actions and rejects a direct prohibited action", () => {
    const composed = composeStandard();
    let player = skipAbilityWindow(composed);
    player = applyCofreFocoAction(player, "stand", () => c("2"));
    expect(player.round?.currentHand).toBe("sombra");
    expect(legalCofreFocoActions(player, undefined, { forbiddenDoubleHand: "sombra" })).toEqual(["hit", "stand"]);
    expect(() => applyCofreFocoAction(player, "double", () => c("2"), { forbiddenDoubleHand: "sombra" })).toThrow(/Illegal/);
    expect(legalCofreFocoActions(player, undefined, { forbiddenDoubleHand: "luz" })).toContain("double");
  });

  it("hides the dealer hole before reading and reveals only it to the solo player after payment", () => {
    const uncomposed = beginRound(createNight(CF_LAB_01_3_TO_2, 2), draws(
      [c("8"), c("8"), c("9"), c("9")], c("4"), [c("A"), c("10")],
    ));
    expect(projectCofreFoco(uncomposed, "solo-player").round?.naturalPeek).toBeNull();
    const state = composeStandard();
    const before = JSON.stringify(projectCofreFoco(state, "solo-player"));
    expect(before).not.toContain("dealerHole");
    expect(before).not.toContain('"10"');
    const read = readDealerHole(state);
    expect(read.focusRemaining).toBe(1);
    expect(projectCofreFoco(read, "solo-player").round?.dealerHole).toEqual(c("10"));
    expect(projectCofreFoco(read, "observer").round?.dealerHole).toBeUndefined();
    expect(projectCofreFoco(state, "solo-player").round?.dealerHole).toBeUndefined();
    const detached = projectCofreFoco(read, "solo-player") as unknown as { round: { dealerHole: { rank: string }; cofre: { rank: string } } };
    detached.round.dealerHole.rank = "2";
    detached.round.cofre.rank = "3";
    expect(projectCofreFoco(read, "solo-player").round?.dealerHole).toEqual(c("10"));
    expect(read.round?.cofre).toEqual(c("4"));
  });

  it("preserves all five cards through an atomic one-card Cofre swap", () => {
    const state = composeStandard([c("8"), c("8"), c("9"), c("9")], c("4"));
    const moved = maneuver(skipRead(state), "luz", 1);
    expect(moved.focusRemaining).toBe(2);
    expect(moved.round?.hands?.luz.cards.map(x => x.rank)).toEqual(["8", "4"]);
    expect(moved.round?.cofre.rank).toBe("8");
    const cards = [...moved.round!.hands!.luz.cards, ...moved.round!.hands!.sombra.cards, moved.round!.cofre];
    expect(cards.map(x => x.rank).sort()).toEqual(["4", "8", "8", "9", "9"]);
  });

  it("conserves the rank multiset for every legal one-card swap", () => {
    fc.assert(fc.property(
      fc.tuple(
        fc.constantFrom<Card["rank"]>("2", "3", "4", "5", "6", "7", "8", "9"),
        fc.constantFrom<Card["rank"]>("2", "3", "4", "5", "6", "7", "8", "9"),
        fc.constantFrom<Card["rank"]>("2", "3", "4", "5", "6", "7", "8", "9"),
        fc.constantFrom<Card["rank"]>("2", "3", "4", "5", "6", "7", "8", "9"),
        fc.constantFrom<Card["rank"]>("A", "2", "3", "4", "5", "6", "7", "8", "9", "10"),
        fc.integer({ min: 0, max: 1 }),
      ), ([a, b, c1, d, reserve, cardIndex]) => {
        const cards = [c(a), c(b), c(c1), c(d)];
        const state = composeCofreFoco(beginRound(createNight(CF_LAB_01_3_TO_2, 2), draws(cards, c(reserve), [c("6"), c("9")])),
          { luz: [0, 1], sombra: [2, 3] });
        if (state.round?.phase !== "focusWindow" || state.round.hands?.luz.status !== "playing") return;
        const moved = maneuver(skipRead(state), "luz", cardIndex);
        const ranks = [...moved.round!.hands!.luz.cards, ...moved.round!.hands!.sombra.cards, moved.round!.cofre]
          .map(card => card.rank).sort();
        expect(ranks).toEqual([...cards.map(card => card.rank), reserve].sort());
        expect(moved.focusRemaining).toBe(2);
      }), { numRuns: 200, seed: 70014 });
  });

  it("makes a post-swap Ace+10 a non-natural 21 that auto-stands", () => {
    const state = composeStandard([c("A"), c("6"), c("8"), c("9")], c("10"));
    const moved = maneuver(skipRead(state), "luz", 1);
    expect(moved.round?.openingNaturals?.luz).toBe(false);
    expect(moved.round?.hands?.luz.cards.map(x => x.rank)).toEqual(["A", "10"]);
    expect(moved.round?.hands?.luz.status).toBe("stood");
    expect(legalCofreFocoActions(moved, "luz")).toEqual([]);
  });

  it("locks opening naturals and skips the focus window when both hands are terminal", () => {
    const state = composeStandard([c("A"), c("10"), c("A"), c("10")], c("5"));
    expect(state.round?.phase).toBe("dealer");
    expect(state.focusRemaining).toBe(3);
    expect(() => maneuver(state, "luz", 0)).toThrow();
    expect(() => readDealerHole(state)).toThrow();
  });

  it("allows Manobra only on the one non-natural active hand", () => {
    const state = composeStandard([c("A"), c("10"), c("8"), c("9")], c("4"));
    expect(state.round?.phase).toBe("focusWindow");
    const skippedRead = skipRead(state);
    expect(() => maneuver(skippedRead, "luz", 0)).toThrow();
    expect(maneuver(skippedRead, "sombra", 0).round?.hands?.sombra.cards[0]).toEqual(c("4"));
  });

  it("does not offer or spend Focus after a dealer natural", () => {
    const started = beginRound(createNight(CF_LAB_01_3_TO_2, 2), draws(
      [c("A"), c("7"), c("8"), c("9")], c("4"), [c("A"), c("10")],
    ));
    const state = composeCofreFoco(started, { luz: [0, 1], sombra: [2, 3] });
    expect(state.round?.phase).toBe("complete");
    expect(state.focusRemaining).toBe(3);
    expect(state.round?.focusWindowOpened).toBe(false);
  });

  it("does not give a swapped 21 natural priority over a non-natural dealer 21", () => {
    let state = composeStandard([c("A"), c("6"), c("8"), c("9")], c("10"), [c("10"), c("6")]);
    state = maneuver(skipRead(state), "luz", 1);
    state = skipAbilityWindow(state);
    state = applyCofreFocoAction(state, "stand", () => { throw new Error("stand draws nothing"); });
    state = playCofreFocoDealer(state, () => c("5"));
    expect(state.round?.settlement?.luz.dealerTotal).toBe(21);
    expect(state.round?.settlement?.luz.outcome).toBe("push");
    expect(state.round?.settlement?.luz.score).toBe(0);
  });

  it("rejects invalid, repeated and unaffordable abilities without mutation", () => {
    const state = composeStandard();
    const read = readDealerHole(state);
    const snapshot = structuredClone(read);
    expect(() => readDealerHole(read)).toThrow();
    const withManeuver = maneuver(read, "luz", 0);
    const after = structuredClone(withManeuver);
    expect(() => maneuver(withManeuver, "sombra", 0)).toThrow();
    expect(withManeuver).toEqual(after);
    expect(read).toEqual(snapshot);
    const onlyOneFocus = { ...state, focusRemaining: 1 };
    expect(() => readDealerHole(onlyOneFocus)).toThrow();
    expect(onlyOneFocus.focusRemaining).toBe(1);
  });

  it("retains double after a nonterminal maneuver and closes maneuvers after the first hand action", () => {
    const state = composeStandard();
    const moved = maneuver(skipRead(state), "luz", 0);
    const active = skipAbilityWindow(moved);
    expect(legalCofreFocoActions(active, "luz")).toEqual(["hit", "stand", "double"]);
    const afterHit = applyCofreFocoAction(active, "hit", () => c("2"));
    expect(() => maneuver(afterHit, "sombra", 0)).toThrow();
  });

  it("keeps double legal after Manobra and uses exactly one forced card", () => {
    let state = composeStandard();
    state = maneuver(skipRead(state), "luz", 1);
    state = skipAbilityWindow(state);
    state = applyCofreFocoAction(state, "double", () => c("5"));
    expect(state.round?.hands?.luz.cards.map(card => card.rank)).toEqual(["8", "4", "5"]);
    expect(state.round?.hands?.luz.exposure).toBe(20);
    expect(state.round?.hands?.luz.status).toBe("doubled");
    expect(() => maneuver(state, "sombra", 0)).toThrow();
  });

  it("settles both experimental payout profiles while distinguishing swapped 21 from opening natural", () => {
    for (const [rules, naturalScore] of [[CF_LAB_01_3_TO_2, 15], [CF_LAB_01_1_TO_1, 10]] as const) {
      let state = composeStandard([c("A"), c("6"), c("8"), c("9")], c("10"), [c("6"), c("10")]);
      state = { ...state, rules };
      state = maneuver(skipRead(state), "luz", 1);
      state = skipAbilityWindow(state);
      state = applyCofreFocoAction(state, "stand", () => { throw new Error("stand draws nothing"); });
      state = playCofreFocoDealer(state, () => c("4"));
      expect(state.round?.settlement?.luz.score).toBe(10);
      expect(naturalScore).toBe(rules.naturalPayout === "3:2" ? 15 : 10);
      expect(state.round?.settlement?.luz.playerTotal).toBe(21);
    }
  });

  it("preserves the selected opening-natural payout without applying it to post-swap 21", () => {
    for (const [rules, expected] of [[CF_LAB_01_3_TO_2, 15], [CF_LAB_01_1_TO_1, 10]] as const) {
      let state = composeStandard([c("A"), c("10"), c("8"), c("9")], c("5"), [c("6"), c("9")]);
      state = { ...state, rules };
      state = skipAbilityWindow(state);
      state = applyCofreFocoAction(state, "stand", () => { throw new Error("stand draws nothing"); });
      state = playCofreFocoDealer(state, () => c("2"));
      expect(state.round?.settlement?.luz.score).toBe(expected);
    }
  });

  it("carries Focus between rounds without regeneration and expires the remainder at Night end", () => {
    let state = composeStandard([c("8"), c("8"), c("9"), c("9")], c("4"), [c("6"), c("10")]);
    state = readDealerHole(state);
    state = skipManeuver(state);
    state = continueAfterAbilities(state);
    state = applyCofreFocoAction(state, "stand", () => c("2"));
    state = applyCofreFocoAction(state, "stand", () => c("2"));
    state = playCofreFocoDealer(state, () => c("5"));
    expect(state.focusRemaining).toBe(1);
    const next = beginRound(state, draws([c("A"), c("10"), c("A"), c("10")], c("6"), [c("7"), c("8")]));
    expect(next.focusRemaining).toBe(1);
    expect(next.roundNumber).toBe(2);
    expect(next.round?.cofre.rank).toBe("6");
    const natural = composeCofreFoco(next, { luz: [0, 1], sombra: [2, 3] });
    expect(natural.round?.phase).toBe("dealer");
    const finished = playCofreFocoDealer(natural, () => c("2"));
    expect(finished.status).toBe("complete");
    expect(finished.focusRemaining).toBe(0);
    expect(finished.expiredFocus).toBe(1);
  });

  it("expires remaining Focus on an explicit Night abandonment", () => {
    const started = createNight(CF_LAB_01_3_TO_2, 10);
    const abandoned = abandonNight(started);
    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.focusRemaining).toBe(0);
    expect(abandoned.expiredFocus).toBe(3);
    expect(() => beginRound(abandoned, draws([c("2"), c("3"), c("4"), c("5")], c("6"), [c("7"), c("8")]))).toThrow();
  });
});
