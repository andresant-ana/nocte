// @vitest-environment node
import { describe, expect, it } from "vitest";
import {
  abandonBankrollNight,
  beginBankrollRound,
  createBankrollNight,
  expireBankrollNight,
  settleBankrollRound,
} from "./bankroll-a0";

describe("BANKROLL-LAB-A0-0.1 ledger", () => {
  it.each([
    [39, "practice", 0, 39],
    [40, "funded", 40, 0],
    [41, "funded", 40, 1],
  ] as const)("uses the exact coverage boundary at balance %i", (balance, expectedKind, escrow, available) => {
    const night = { ...createBankrollNight("night-boundary"), bankroll: balance };
    const started = beginBankrollRound(night, "round-1");
    expect(started.pendingRound?.kind).toBe(expectedKind);
    expect(started.pendingRound?.escrow).toBe(escrow);
    expect(started.pendingRound?.available).toBe(available);
    expect(started.bankroll).toBe(balance);
  });

  it("starts each Night at 150 and reserves 40 without debiting the balance", () => {
    const night = beginBankrollRound(createBankrollNight("new-night"), "r1");
    expect(night.bankroll).toBe(150);
    expect(night.pendingRound).toEqual({ id: "r1", kind: "funded", escrow: 40, available: 110 });
  });

  it.each([[10, 160], [15, 165], [-10, 140], [-20, 130], [-40, 110], [0, 150]] as const)(
    "applies the finalized engine score %i exactly once",
    (score, expectedBalance) => {
      const pending = beginBankrollRound(createBankrollNight("settlement"), "r1");
      const settled = settleBankrollRound(pending, "r1", { phase: "complete", score });
      const replay = settleBankrollRound(settled, "r1", { phase: "complete", score });
      expect(settled.bankroll).toBe(expectedBalance);
      expect(settled.pendingRound).toBeNull();
      expect(replay).toEqual(settled);
      expect(() => settleBankrollRound(settled, "r1", { phase: "complete", score: score + 1 })).toThrow();
    },
  );

  it("rejects incomplete, out-of-coverage, and negative-result settlements without partial mutation", () => {
    const pending = beginBankrollRound(createBankrollNight("invalid"), "r1");
    expect(() => settleBankrollRound(pending, "r1", { phase: "player", score: -40 })).toThrow();
    expect(() => settleBankrollRound(pending, "r1", { phase: "complete", score: -41 })).toThrow();
    expect(() => settleBankrollRound(pending, "r1", { phase: "complete", score: 41 })).toThrow();
    const low = { ...beginBankrollRound(createBankrollNight("negative"), "r1"), bankroll: 20 };
    expect(() => settleBankrollRound(low, "r1", { phase: "complete", score: -40 })).toThrow();
    expect(pending.bankroll).toBe(150);
    expect(pending.pendingRound?.escrow).toBe(40);
  });

  it("funds a round at 40, permits the full -40 double loss, then irreversibly freezes practice", () => {
    const atForty = { ...createBankrollNight("last-funded"), bankroll: 40 };
    const funded = beginBankrollRound(atForty, "r1");
    expect(funded.pendingRound?.kind).toBe("funded");
    const broke = settleBankrollRound(funded, "r1", { phase: "complete", score: -40 });
    expect(broke.bankroll).toBe(0);
    const practice = beginBankrollRound(broke, "r2");
    expect(practice.status).toBe("practice");
    const wonPractice = settleBankrollRound(practice, "r2", { phase: "complete", score: 30 });
    expect(wonPractice.bankroll).toBe(0);
    const morePractice = beginBankrollRound(wonPractice, "r3");
    expect(morePractice.status).toBe("practice");
    const secondWin = settleBankrollRound(morePractice, "r3", { phase: "complete", score: 20 });
    expect(secondWin.bankroll).toBe(0);
    expect(beginBankrollRound(secondWin, "r4").status).toBe("practice");
  });

  it("expires bank and reservation on completion or abandonment and never creates an unfinished delta", () => {
    const pending = beginBankrollRound(createBankrollNight("abandoned"), "r1");
    const abandoned = abandonBankrollNight(pending);
    expect(abandoned.status).toBe("abandoned");
    expect(abandoned.pendingRound).toBeNull();
    expect(abandoned.expiredBalance).toBe(150);
    expect(() => settleBankrollRound(abandoned, "r1", { phase: "complete", score: 10 })).toThrow();

    const completed = expireBankrollNight(beginBankrollRound(createBankrollNight("complete"), "r1"));
    expect(completed.status).toBe("complete");
    expect(completed.expiredBalance).toBe(150);
    expect(completed.bankroll).toBe(150);
    expect(completed.pendingRound).toBeNull();
  });

  it("keeps an old round replay idempotent while distinct round ids settle independently", () => {
    const first = beginBankrollRound(createBankrollNight("ids"), "night-1:round-1");
    const settled = settleBankrollRound(first, "night-1:round-1", { phase: "complete", score: 10 });
    const second = beginBankrollRound(settled, "night-1:round-2");
    expect(settleBankrollRound(second, "night-1:round-1", { phase: "complete", score: 10 })).toEqual(second);
    expect(() => beginBankrollRound(second, "night-1:round-2")).toThrow();
    const secondSettled = settleBankrollRound(second, "night-1:round-2", { phase: "complete", score: -10 });
    expect(secondSettled.bankroll).toBe(150);
  });
});
