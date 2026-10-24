import type { PactBookA1aSessionAdapter } from "../game/pact-book-a1a-session";
import type { PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import type { PactFamily, PactId } from "@nocte/engine/pact-book";

export const PACT_PLAYTEST_SCHEMA = "nocte-pact-playtest-1" as const;
export type PactPlaytestEndStatus = "complete" | "abandoned";
export type PactPlaytestAnswer = "1" | "2" | "3" | "4" | "5" | "unknown";
export type PactPlaytestClarity = "act-ii" | "act-iii" | "neither" | "unknown";

export type PactPlaytestEvent =
  | Readonly<{ type: "offer"; round: 4 | 8; act: 2 | 3; family: PactFamily; options: readonly [PactId, PactId] }>
  | Readonly<{ type: "choice"; round: 4 | 8; act: 2 | 3; choice: PactId | "refused"; affectedFace: "luz" | "sombra" | null }>
  | Readonly<{ type: "renunciation-active"; round: number; act: 2 | 3; pact: PactId; affectedFace: "luz" | "sombra" | null }>
  | Readonly<{ type: "renunciation-blocked"; round: number; act: 2 | 3; pact: PactId }>
  | Readonly<{ type: "privilege-consumed" | "privilege-expired"; round: number; act: 2 | 3; pact: PactId }> 
  | Readonly<{ type: "round-summary"; round: number; purchases: number; stops: number; doubles: number; maneuvers: number; reads: number; focusSpent: number }>;

export type PactPlaytestAnswers = Readonly<{
  understoodBeforeSigning?: PactPlaytestAnswer;
  renunciationAffectedPlay?: PactPlaytestAnswer;
  privilegeTimingInteresting?: PactPlaytestAnswer;
  wantsAnotherNight?: PactPlaytestAnswer;
  leastClearOffer?: PactPlaytestClarity;
}>;

export type PactPlaytestExport = Readonly<{
  schemaVersion: typeof PACT_PLAYTEST_SCHEMA;
  sessionId: string;
  variant: "PACT-BOOK-0.1";
  naturalPayout: "3:2" | "1:1";
  status: PactPlaytestEndStatus;
  events: readonly PactPlaytestEvent[];
  summary: Readonly<{
    strategicScore: number;
    bankrollDeltaTicks: number;
    focusSpent: number;
    fundedRounds: number;
    practiceRounds: number;
    finalBankrollStatus: string;
  }>;
  answers: PactPlaytestAnswers;
}>;

type SafeOffer = Readonly<{
  offerRound: 4 | 8;
  status: "offered" | "active" | "refused" | "expired";
  family: PactFamily;
  options: readonly [PactId, PactId];
  choice: PactId | "refused" | null;
  affectedFace: "luz" | "sombra" | null;
  privilege: "none" | "available" | "consumed" | "expired";
  usedRound: number | null;
}>;

type SafeRound = Readonly<{
  round: number;
  phase: string;
  hands?: Readonly<Record<"luz" | "sombra", Readonly<{ cards: readonly unknown[]; status: string }>>>;
  focusSpent?: Readonly<{ read: number; maneuver: number }>;
  readUsed?: boolean;
  maneuverUsed?: boolean;
}>;
type RoundCounts = { purchases: number; stops: number; doubles: number; maneuvers: number; reads: number; focusSpent: number; summarized: boolean };

export type PactPlaytestSnapshot = Readonly<{
  offers: readonly SafeOffer[];
  round: SafeRound | null;
  focusRemaining: number;
  totalScore: number;
  bankrollTicks: number;
  bankrollStatus: string;
  fundedRounds: number;
  practiceRounds: number;
}>;

/** Create only after explicit opt-in. The draft exists in memory and has no storage/network adapter. */
export function startPactPlaytest(naturalPayout: "3:2" | "1:1", sessionId = globalThis.crypto.randomUUID()): PactPlaytestRecorder {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(sessionId)) throw new Error("ID aleatório local de sessão inválido.");
  return new PactPlaytestRecorder(naturalPayout, sessionId);
}

export function pactPlaytestSnapshot(controller: PactBookA1aSessionAdapter, view?: PublicCofreFocoNight): PactPlaytestSnapshot {
  let roundView = view;
  if (!roundView && !controller.isBetting) {
    try { roundView = controller.current; } catch { /* a pre-deal abandonment has no public round */ }
  }
  const bankroll = controller.bankroll;
  return {
    offers: controller.state.offers.map(offer => ({ offerRound: offer.offerRound, status: offer.status,
      family: offer.family, options: [...offer.options] as unknown as readonly [PactId, PactId], choice: offer.choice,
      affectedFace: offer.affectedFace, privilege: offer.privilege, usedRound: offer.usedRound })),
    round: roundView?.round ? {
      round: roundView.round.roundNumber, phase: roundView.round.phase,
      ...(roundView.round.hands ? { hands: {
        luz: { cards: roundView.round.hands.luz.cards.map(() => null), status: roundView.round.hands.luz.status },
        sombra: { cards: roundView.round.hands.sombra.cards.map(() => null), status: roundView.round.hands.sombra.status },
      } } : {}),
      focusSpent: roundView.round.focusSpent,
      readUsed: roundView.round.readUsed,
      maneuverUsed: roundView.round.maneuverUsed,
    } : null,
    focusRemaining: bankroll.focusRemaining,
    totalScore: bankroll.totalScore,
    bankrollTicks: bankroll.balanceTicks,
    bankrollStatus: bankroll.status,
    fundedRounds: bankroll.fundedRounds,
    practiceRounds: bankroll.practiceRounds,
  };
}

export class PactPlaytestRecorder {
  readonly #naturalPayout: "3:2" | "1:1";
  readonly #sessionId: string;
  #events: PactPlaytestEvent[] = [];
  #answers: PactPlaytestAnswers = {};
  #finished: PactPlaytestExport | null = null;
  #seenOffers = new Set<number>();
  #seenChoices = new Set<number>();
  #seenPrivilegeChanges = new Set<string>();
  #previous: PactPlaytestSnapshot | null = null;
  #roundCounts = new Map<number, RoundCounts>();

  constructor(naturalPayout: "3:2" | "1:1", sessionId: string) { this.#naturalPayout = naturalPayout; this.#sessionId = sessionId; }
  get eventCount(): number { return this.#events.length; }
  get active(): boolean { return this.#finished === null; }

  observe(snapshot: PactPlaytestSnapshot): void {
    if (!this.active) return;
    for (const offer of snapshot.offers) {
      const act = offer.offerRound === 4 ? 2 : 3;
      if (offer.status === "offered" && !this.#seenOffers.has(offer.offerRound)) {
        this.#seenOffers.add(offer.offerRound);
        this.#push({ type: "offer", round: offer.offerRound, act, family: offer.family, options: offer.options });
      }
      if ((offer.status === "active" || offer.status === "refused") && !this.#seenChoices.has(offer.offerRound)) {
        this.#seenChoices.add(offer.offerRound);
        const choice = offer.choice ?? "refused";
        this.#push({ type: "choice", round: offer.offerRound, act, choice, affectedFace: offer.affectedFace });
        if (choice !== "refused") this.#push({ type: "renunciation-active", round: offer.offerRound, act, pact: choice, affectedFace: offer.affectedFace });
      }
      if (offer.choice && offer.choice !== "refused" && offer.privilege === "consumed" && offer.usedRound !== null) {
        const key = `used-${offer.offerRound}`;
        if (!this.#seenPrivilegeChanges.has(key)) {
          this.#seenPrivilegeChanges.add(key);
          this.#push({ type: "privilege-consumed", round: offer.usedRound, act, pact: offer.choice });
        }
      }
      if (offer.choice && offer.choice !== "refused" && offer.privilege === "expired") {
        const key = `expired-${offer.offerRound}`;
        if (!this.#seenPrivilegeChanges.has(key)) {
          this.#seenPrivilegeChanges.add(key);
          this.#push({ type: "privilege-expired", round: offer.offerRound === 4 ? 7 : 10, act, pact: offer.choice });
        }
      }
    }
    this.#observeRound(snapshot.round);
    this.#previous = snapshot;
  }

  recordRenunciationBlocked(round: number, pact: PactId): void {
    if (!this.active || (round < 4 || round > 10)) return;
    this.#push({ type: "renunciation-blocked", round, act: round <= 7 ? 2 : 3, pact });
  }

  setAnswers(answers: PactPlaytestAnswers): void {
    if (this.#finished) this.#finished = { ...this.#finished, answers: { ...answers } };
    this.#answers = { ...answers };
  }

  finish(status: PactPlaytestEndStatus, snapshot: PactPlaytestSnapshot): PactPlaytestExport {
    this.observe(snapshot);
    for (const [round, counts] of this.#roundCounts) this.#summarize(round, counts);
    const result: PactPlaytestExport = {
      schemaVersion: PACT_PLAYTEST_SCHEMA, sessionId: this.#sessionId, variant: "PACT-BOOK-0.1",
      naturalPayout: this.#naturalPayout, status, events: [...this.#events],
      summary: { strategicScore: snapshot.totalScore, bankrollDeltaTicks: snapshot.bankrollTicks - 300,
        focusSpent: [...this.#roundCounts.values()].reduce((sum, counts) => sum + counts.focusSpent, 0),
        fundedRounds: snapshot.fundedRounds, practiceRounds: snapshot.practiceRounds, finalBankrollStatus: snapshot.bankrollStatus },
      answers: { ...this.#answers },
    };
    this.#finished = result;
    return structuredClone(result);
  }

  export(): PactPlaytestExport | null { return this.#finished ? structuredClone(this.#finished) : null; }
  clear(): void {
    this.#events = []; this.#answers = {}; this.#finished = null; this.#seenOffers.clear();
    this.#seenChoices.clear(); this.#seenPrivilegeChanges.clear(); this.#previous = null; this.#roundCounts.clear();
  }

  #observeRound(round: SafeRound | null): void {
    if (!round) return;
    let counts = this.#roundCounts.get(round.round) ?? { purchases: 0, stops: 0, doubles: 0, maneuvers: 0, reads: 0, focusSpent: 0, summarized: false };
    const previous = this.#previous?.round?.round === round.round ? this.#previous.round : null;
    if (previous && round.hands && previous.hands) {
      for (const hand of ["luz", "sombra"] as const) {
        const before = previous.hands[hand]; const after = round.hands[hand];
        const countDelta = after.cards.length - before.cards.length;
        if (countDelta > 0 && after.status === "doubled" && before.status !== "doubled") counts.doubles += 1;
        else if (countDelta > 0 && previous.phase !== "hitPending" && round.phase !== "compose" && round.phase !== "focusWindow") counts.purchases += 1;
        if (before.status === "playing" && after.status === "stood") counts.stops += 1;
      }
      if (round.phase === "hitPending" && previous.phase === "player") counts.purchases += 1;
      if (!previous.readUsed && round.readUsed) counts.reads += 1;
      if (!previous.maneuverUsed && round.maneuverUsed) counts.maneuvers += 1;
      const spent = round.focusSpent ?? { read: 0, maneuver: 0 };
      const priorSpent = previous.focusSpent ?? { read: 0, maneuver: 0 };
      counts.focusSpent += Math.max(0, spent.read + spent.maneuver - priorSpent.read - priorSpent.maneuver);
    }
    if (round.phase === "complete" && !counts.summarized) this.#summarize(round.round, counts);
    this.#roundCounts.set(round.round, counts);
  }

  #summarize(round: number, counts: RoundCounts): void {
    if (counts.summarized) return;
    counts.summarized = true;
    this.#push({ type: "round-summary", round, purchases: counts.purchases, stops: counts.stops,
      doubles: counts.doubles, maneuvers: counts.maneuvers, reads: counts.reads, focusSpent: counts.focusSpent });
  }

  #push(event: PactPlaytestEvent): void { this.#events.push(Object.freeze({ ...event }) as PactPlaytestEvent); }
}

export function serializePactPlaytest(data: PactPlaytestExport): string {
  const events = data.events.map(event => {
    switch (event.type) {
      case "offer": return { type: event.type, round: event.round, act: event.act, family: event.family, options: [...event.options] };
      case "choice": return { type: event.type, round: event.round, act: event.act, choice: event.choice, affectedFace: event.affectedFace };
      case "renunciation-active": return { type: event.type, round: event.round, act: event.act, pact: event.pact, affectedFace: event.affectedFace };
      case "renunciation-blocked":
      case "privilege-consumed":
      case "privilege-expired": return { type: event.type, round: event.round, act: event.act, pact: event.pact };
      case "round-summary": return { type: event.type, round: event.round, purchases: event.purchases, stops: event.stops,
        doubles: event.doubles, maneuvers: event.maneuvers, reads: event.reads, focusSpent: event.focusSpent };
    }
  });
  return JSON.stringify({ schemaVersion: data.schemaVersion, sessionId: data.sessionId, variant: data.variant,
    naturalPayout: data.naturalPayout, status: data.status, events,
    summary: { strategicScore: data.summary.strategicScore, bankrollDeltaTicks: data.summary.bankrollDeltaTicks,
      focusSpent: data.summary.focusSpent, fundedRounds: data.summary.fundedRounds, practiceRounds: data.summary.practiceRounds,
      finalBankrollStatus: data.summary.finalBankrollStatus },
    answers: { understoodBeforeSigning: data.answers.understoodBeforeSigning, renunciationAffectedPlay: data.answers.renunciationAffectedPlay,
      privilegeTimingInteresting: data.answers.privilegeTimingInteresting, wantsAnotherNight: data.answers.wantsAnotherNight,
      leastClearOffer: data.answers.leastClearOffer },
  }, null, 2);
}
