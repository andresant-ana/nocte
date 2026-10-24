import { describe, expect, it } from "vitest";
import type { Card, CardSource } from "@nocte/engine";
import { partitions } from "@nocte/engine";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { PactBookA1aSessionAdapter } from "../game/pact-book-a1a-session";
import type { PreparedCofreFocoRound } from "../game/random";
import {
  pactPlaytestSnapshot, serializePactPlaytest, startPactPlaytest,
  type PactPlaytestSnapshot,
} from "./pact-playtest";

const card = (rank: Card["rank"]): Card => ({ rank });
const lane = (cards: readonly Card[]): CardSource => {
  let index = 0;
  const draw = (() => { const next = cards[index++]; if (!next) throw new Error("playtest fixture exhausted"); return { ...next }; }) as CardSource;
  draw.peek = () => { const next = cards[index]; if (!next) throw new Error("playtest fixture exhausted"); return { ...next }; };
  return draw;
};
const prepared = (index: number): PreparedCofreFocoRound => ({ seed: "fixture-seed-never-export", index, draws: {
  initial: lane([card("8"), card("8"), card("9"), card("9")]), dealer: lane([card("6"), card("10"), card("10")]),
  cofre: lane([card("5"), card("A")]), luz: lane([card("2"), card("3")]), sombra: lane([card("2"), card("3")]),
} });
const opening = partitions([card("8"), card("8"), card("9"), card("9")]).find(p => p.luz[0] === 0 && p.luz[1] === 1 && p.sombra[0] === 2 && p.sombra[1] === 3)!;

function snapshot(offers: PactPlaytestSnapshot["offers"], round: PactPlaytestSnapshot["round"] = null): PactPlaytestSnapshot {
  return { offers, round, focusRemaining: 3, totalScore: 0, bankrollTicks: 300,
    bankrollStatus: "active", fundedRounds: 0, practiceRounds: 0 };
}
const offer = (offerRound: 4 | 8, family: "revelation" | "choice", options: readonly ["veil", "lighthouse"] | readonly ["secondChance", "oath"]): PactPlaytestSnapshot["offers"][number] => ({
  offerRound, status: "offered", family, options, choice: null, affectedFace: null, privilege: "none", usedRound: null,
});

describe("P9-H local PACT-BOOK playtest recorder", () => {
  it("records two public offers, signature/refusal, one use, and an unused expiry without duplicate observations", () => {
    const recorder = startPactPlaytest("3:2", "00000000-0000-4000-8000-000000000001");
    const actTwo = offer(4, "revelation", ["veil", "lighthouse"]);
    recorder.observe(snapshot([actTwo])); recorder.observe(snapshot([actTwo]));
    recorder.observe(snapshot([{ ...actTwo, status: "active", choice: "veil", privilege: "available" }]));
    const actThree = offer(8, "choice", ["secondChance", "oath"]);
    recorder.observe(snapshot([{ ...actTwo, status: "active", choice: "veil", privilege: "consumed", usedRound: 5 }, actThree]));
    recorder.observe(snapshot([{ ...actTwo, status: "expired", choice: "veil", privilege: "consumed", usedRound: 5 },
      { ...actThree, status: "active", choice: "oath", affectedFace: "luz", privilege: "available" }]));
    recorder.observe(snapshot([{ ...actTwo, status: "expired", choice: "veil", privilege: "consumed", usedRound: 5 },
      { ...actThree, status: "expired", choice: "oath", affectedFace: "luz", privilege: "expired" }]));
    recorder.observe(snapshot([{ ...actTwo, status: "expired", choice: "veil", privilege: "consumed", usedRound: 5 },
      { ...actThree, status: "expired", choice: "oath", affectedFace: "luz", privilege: "expired" }]));
    const data = recorder.finish("complete", snapshot([
      { ...actTwo, status: "expired", choice: "veil", privilege: "consumed", usedRound: 5 },
      { ...actThree, status: "expired", choice: "oath", affectedFace: "luz", privilege: "expired" },
    ], { round: 10, phase: "complete", hands: { luz: { cards: [], status: "stood" }, sombra: { cards: [], status: "stood" } } }));
    expect(data.events.filter(event => event.type === "offer")).toHaveLength(2);
    expect(data.events.filter(event => event.type === "choice")).toMatchObject([
      { round: 4, choice: "veil" }, { round: 8, choice: "oath", affectedFace: "luz" },
    ]);
    expect(data.events.filter(event => event.type === "privilege-consumed")).toEqual([
      { type: "privilege-consumed", round: 5, act: 2, pact: "veil" },
    ]);
    expect(data.events.filter(event => event.type === "privilege-expired")).toEqual([
      { type: "privilege-expired", round: 10, act: 3, pact: "oath" },
    ]);
    expect(data.events.filter(event => event.type === "renunciation-active")).toHaveLength(2);

    const refusalRecorder = startPactPlaytest("3:2", "00000000-0000-4000-8000-000000000002");
    const refusedOffer = offer(4, "revelation", ["veil", "lighthouse"]);
    refusalRecorder.observe(snapshot([refusedOffer]));
    refusalRecorder.observe(snapshot([{ ...refusedOffer, status: "refused", choice: "refused" }]));
    const refusalData = refusalRecorder.finish("abandoned", snapshot([{ ...refusedOffer, status: "refused", choice: "refused" }]));
    expect(refusalData.events.filter(event => event.type === "choice")).toEqual([
      { type: "choice", round: 4, act: 2, choice: "refused", affectedFace: null },
    ]);
    expect(refusalData.events.some(event => event.type === "renunciation-active")).toBe(false);
  });

  it("stores aggregate action counts and keeps forbidden fields out of manual JSON", () => {
    const recorder = startPactPlaytest("1:1", "00000000-0000-4000-8000-000000000003");
    recorder.observe(snapshot([], { round: 1, phase: "player", hands: {
      luz: { cards: [null, null], status: "playing" }, sombra: { cards: [null, null], status: "playing" },
    }, focusSpent: { read: 0, maneuver: 0 }, readUsed: false, maneuverUsed: false }));
    recorder.observe(snapshot([], { round: 1, phase: "player", hands: {
      luz: { cards: [null, null, null], status: "playing" }, sombra: { cards: [null, null], status: "playing" },
    }, focusSpent: { read: 0, maneuver: 0 }, readUsed: false, maneuverUsed: false }));
    recorder.observe(snapshot([], { round: 1, phase: "complete", hands: {
      luz: { cards: [null, null, null], status: "stood" }, sombra: { cards: [null, null], status: "stood" },
    }, focusSpent: { read: 0, maneuver: 0 }, readUsed: false, maneuverUsed: false }));
    recorder.recordRenunciationBlocked(4, "oath");
    const data = recorder.finish("complete", snapshot([]));
    const json = serializePactPlaytest(data);
    expect(json).toContain('"purchases": 1');
    expect(json).toContain('"stops": 2');
    expect(json).not.toMatch(/fixture-seed-never-export|dealerHole|dealerDraws|"cards"|"hands"|userAgent|timestamp/i);
    expect(data.events).toContainEqual({ type: "renunciation-blocked", round: 4, act: 2, pact: "oath" });
    const unsafe = { ...data, unexpectedPrivateField: { dealerHole: "A", seed: "do-not-export" } } as unknown as typeof data;
    expect(serializePactPlaytest(unsafe)).not.toMatch(/unexpectedPrivateField|dealerHole|do-not-export/i);
  });

  it("clears all in-memory events and answers immediately", () => {
    const recorder = startPactPlaytest("3:2", "00000000-0000-4000-8000-000000000004");
    recorder.observe(snapshot([offer(4, "revelation", ["veil", "lighthouse"])]));
    recorder.finish("abandoned", snapshot([]));
    expect(recorder.export()?.events.length).toBe(1);
    recorder.clear();
    expect(recorder.eventCount).toBe(0);
    expect(recorder.export()).toBeNull();
    expect(recorder.active).toBe(true);
  });

  it("observes the same deterministic round without changing any public game result", () => {
    const play = (instrument: boolean) => {
      const game = PactBookA1aSessionAdapter.start(CF_LAB_01_3_TO_2);
      const recorder = instrument ? startPactPlaytest("3:2", "00000000-0000-4000-8000-000000000005") : null;
      let view = game.startRound(prepared(0), 1);
      recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.compose(opening);
      recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.skipRead(); recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.skipManeuver(); recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.continueAfterAbilities(); recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.act("stand"); recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.act("stand"); recorder?.observe(pactPlaytestSnapshot(game, view));
      view = game.resolveDealer(); recorder?.observe(pactPlaytestSnapshot(game, view));
      return { view: game.current, bankroll: game.bankroll, contract: game.contract };
    };
    const normalize = (result: ReturnType<typeof play>) => ({ ...result,
      bankroll: { ...result.bankroll, lastSettlement: result.bankroll.lastSettlement && { ...result.bankroll.lastSettlement, roundId: "round" } },
    });
    expect(normalize(play(true))).toEqual(normalize(play(false)));
  });
});
