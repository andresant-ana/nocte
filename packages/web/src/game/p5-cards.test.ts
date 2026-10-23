import { describe, expect, it } from "vitest";
import { handValue } from "@nocte/engine";
import { beginRound, composeCofreFoco, createNight, maneuver, projectCofreFoco, skipRead } from "@nocte/engine/cofre-foco";
import { CF_LAB_01_3_TO_2 } from "@nocte/engine/cofre-foco";
import { p5ArtFromBuckets, P5_ART_STREAM_VERSION, prepareCofreFocoRound, prepareP5CofreFocoRound } from "./random";

describe("P5 display identity adapter", () => {
  it("maps the existing 13 rank buckets to 52 equally weighted face/suit identities without changing the ten-value mass", () => {
    const identities = new Map<string, number>();
    let tenValueBuckets = 0;
    for (let rankBucket = 0; rankBucket < 13; rankBucket += 1) {
      if (rankBucket >= 9) tenValueBuckets += 1;
      for (let faceBucket = 0; faceBucket < 4; faceBucket += 1) {
        for (let suitBucket = 0; suitBucket < 4; suitBucket += 1) {
          const art = p5ArtFromBuckets(rankBucket, faceBucket, suitBucket);
          const key = `${art.faceRank}:${art.suit}`;
          identities.set(key, (identities.get(key) ?? 0) + 1);
        }
      }
    }
    expect(tenValueBuckets / 13).toBe(4 / 13);
    expect(identities.size).toBe(52);
    expect(new Set(identities.values())).toEqual(new Set([4]));
    expect(P5_ART_STREAM_VERSION).not.toBe("sha256-counter-rejection-v1");
  });

  it("repeats face/suit identity by seed and index and leaves every legacy rank lane unchanged", async () => {
    const seed = "p5-art-regression-seed";
    const [legacyA, p5A, p5B] = await Promise.all([
      prepareCofreFocoRound(seed, 2), prepareP5CofreFocoRound(seed, 2), prepareP5CofreFocoRound(seed, 2),
    ]);
    const legacyNight = beginRound(createNight(CF_LAB_01_3_TO_2), legacyA.draws);
    const p5Night = beginRound(createNight(CF_LAB_01_3_TO_2), p5A.draws);
    const repeatedNight = beginRound(createNight(CF_LAB_01_3_TO_2), p5B.draws);
    expect(p5Night.round?.originalCards.map(card => card.rank)).toEqual(legacyNight.round?.originalCards.map(card => card.rank));
    expect(p5Night.round?.dealerUp.rank).toBe(legacyNight.round?.dealerUp.rank);
    expect(p5Night.round?.cofre.rank).toBe(legacyNight.round?.cofre.rank);
    expect(p5Night.round?.originalCards.map(card => card.art)).toEqual(repeatedNight.round?.originalCards.map(card => card.art));
    expect(p5Night.round?.originalCards.every(card => card.art?.suit && card.art.faceRank)).toBe(true);
    for (let draw = 0; draw < 32; draw += 1) {
      expect(p5A.draws.dealer().rank).toBe(legacyA.draws.dealer().rank);
      expect(p5A.draws.luz().rank).toBe(legacyA.draws.luz().rank);
      expect(p5A.draws.sombra().rank).toBe(legacyA.draws.sombra().rank);
    }
  });

  it("does not reveal the hole-card identity in public projection before Leitura", async () => {
    const prepared = await prepareP5CofreFocoRound("hidden-card-regression", 0);
    const night = beginRound(createNight(CF_LAB_01_3_TO_2), prepared.draws);
    const safe = JSON.stringify(projectCofreFoco(night, "solo-player"));
    expect(safe).not.toContain("dealerHole");
  });

  it("treats 10/J/Q/K as the same mathematical value with an Ace, including a post-Manobra figure", async () => {
    for (const faceRank of ["10", "J", "Q", "K"] as const) {
      expect(handValue([{ rank: "A" }, { rank: "10", art: { faceRank, suit: "hearts" } }])).toMatchObject({ total: 21, natural: true });
    }
    const draws = {
      initial: (() => { const cards = [{ rank: "8" as const }, { rank: "A" as const }, { rank: "9" as const }, { rank: "7" as const }]; return () => cards.shift()!; })(),
      dealer: (() => { const cards = [{ rank: "5" as const }, { rank: "9" as const }]; return () => cards.shift()!; })(),
      cofre: () => ({ rank: "10" as const, art: { faceRank: "K" as const, suit: "clubs" as const } }),
    };
    let night = beginRound(createNight(CF_LAB_01_3_TO_2), draws);
    night = composeCofreFoco(night, { luz: [0, 1], sombra: [2, 3] });
    night = maneuver(skipRead(night), "luz", 0);
    expect(night.round?.hands?.luz.cards[0]).toMatchObject({ rank: "10", art: { faceRank: "K", suit: "clubs" } });
    expect(night.round?.hands?.luz).toMatchObject({ openingNatural: false, maneuverTwentyOne: true, status: "stood" });
  });
});
