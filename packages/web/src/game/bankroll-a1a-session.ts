import type { Action, Card, HandName, Partition } from "@nocte/engine";
import type { CofreFocoActionRestrictions, CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import type { PreparedCofreFocoRound } from "./random";
import { CofreFocoSessionAdapter } from "./cofre-foco-session";
import {
  A1A_BANKROLL_VERSION, A1A_HORIZON, abandonA1aNight, beginA1aRound, createA1aBankroll,
  enterA1aPracticeIfNeeded, formatHalfChips, maxA1aStake, settleA1aRound, type A1aBankroll,
} from "./bankroll-a1a";

let localNightSequence = 0;

export type PublicBankrollA1a = Readonly<{
  version: typeof A1A_BANKROLL_VERSION;
  status: A1aBankroll["status"];
  balanceTicks: number;
  balance: string;
  available: string;
  maxStake: number;
  lastStake: number | null;
  currentStake: number | null;
  coverage: number;
  fundedRounds: number;
  practiceRounds: number;
  completedRounds: number;
  totalScore: number;
  focusRemaining: number;
  focusTotal: number;
  lastSettlement: A1aBankroll["lastSettlement"];
}>;

export type A1aRoundTerms = Readonly<{ coveragePerStake?: number; stakeCap?: number }>;
export type A1aPactHooks = Readonly<{
  terms?: (balanceTicks: number, roundNumber: number) => A1aRoundTerms;
  refundTicks?: (view: PublicCofreFocoNight, stake: number, roundNumber: number) => number;
  practiceEligibility?: (balanceTicks: number, roundNumber: number, defaultEligible: number) => number;
}>;

/** Stake is committed before this adapter starts or advances the card engine. */
export class BankrollA1aSessionAdapter {
  #rules: CofreFocoRules;
  #ledger: A1aBankroll;
  #session: CofreFocoSessionAdapter | null = null;
  #betting = true;
  #roundId: string | null = null;
  #actionRestrictions: ((roundNumber: number) => CofreFocoActionRestrictions | undefined) | undefined;
  #pactHooks: A1aPactHooks;

  private constructor(rules: CofreFocoRules, actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined, pactHooks: A1aPactHooks = {}) {
    this.#rules = rules;
    this.#actionRestrictions = actionRestrictions;
    this.#pactHooks = pactHooks;
    this.#ledger = createA1aBankroll(`a1a-local-night-${++localNightSequence}`);
  }

  static start(rules: CofreFocoRules, actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined, pactHooks: A1aPactHooks = {}): BankrollA1aSessionAdapter {
    return new BankrollA1aSessionAdapter(rules, actionRestrictions, pactHooks);
  }
  #terms(roundNumber = this.#ledger.completedRounds + 1): A1aRoundTerms { return this.#pactHooks.terms?.(this.#ledger.balanceTicks, roundNumber) ?? {}; }
  #eligibleStake(roundNumber = this.#ledger.completedRounds + 1): number {
    const terms = this.#terms(roundNumber);
    return Math.min(maxA1aStake(this.#ledger.balanceTicks, terms.coveragePerStake ?? 4), terms.stakeCap ?? Number.MAX_SAFE_INTEGER);
  }
  #practiceEligibleStake(roundNumber = this.#ledger.completedRounds + 1): number {
    const regular = this.#eligibleStake(roundNumber);
    return this.#pactHooks.practiceEligibility?.(this.#ledger.balanceTicks, roundNumber, regular) ?? regular;
  }

  get current(): PublicCofreFocoNight {
    if (this.#betting || !this.#session) throw new Error("A rodada ainda aguarda a aposta.");
    return this.#session.current;
  }
  get isBetting(): boolean { return this.#betting; }
  get bankroll(): PublicBankrollA1a {
    const round = this.#ledger.round;
    const stake = round ? round.kind === "funded" ? round.stake : 0
      : this.#ledger.lastSettlement?.kind === "funded" ? this.#ledger.lastSettlement.stake : 0;
    return Object.freeze({ version: A1A_BANKROLL_VERSION, status: this.#ledger.status,
      balanceTicks: this.#ledger.balanceTicks, balance: formatHalfChips(this.#ledger.balanceTicks),
      available: formatHalfChips(this.#ledger.balanceTicks - (round?.kind === "funded" ? 2 * round.coveragePerStake * round.stake : 0)),
      maxStake: this.#ledger.status === "practice" ? 0 : this.#eligibleStake(), currentStake: round ? round.kind === "funded" ? round.stake : 0
        : this.#ledger.lastSettlement?.kind === "funded" ? this.#ledger.lastSettlement.stake : null,
      lastStake: this.#ledger.lastStake,
      coverage: (round?.coveragePerStake ?? 4) * stake, fundedRounds: this.#ledger.fundedRounds,
      practiceRounds: this.#ledger.practiceRounds, completedRounds: this.#ledger.completedRounds,
      totalScore: this.#session?.current.totalScore ?? 0,
      focusRemaining: this.#session?.current.focusRemaining ?? this.#rules.focusPerNight,
      focusTotal: this.#rules.focusPerNight,
      lastSettlement: this.#ledger.lastSettlement });
  }

  get focusOptions() { if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta."); return this.#session.focusOptions; }
  get focusOptionsWithPactPrivilege() { if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta."); return this.#session.focusOptionsWithPactPrivilege; }
  get legalActions(): readonly Action[] { if (!this.#session || this.#betting) return []; return this.#session.legalActions; }

  enterBetting(): void {
    if (!this.#session || this.#session.current.round?.phase !== "complete" || this.#betting) throw new Error("A rodada anterior precisa terminar antes da próxima aposta.");
    if (this.#ledger.completedRounds >= A1A_HORIZON) throw new Error("A Noite A1a já terminou.");
    this.#ledger = enterA1aPracticeIfNeeded(this.#ledger, this.#practiceEligibleStake());
    this.#betting = true;
  }

  startRound(prepared: PreparedCofreFocoRound, stake: number, cofreOverride?: Card): PublicCofreFocoNight {
    if (!this.#betting) throw new Error("A aposta da rodada já foi confirmada.");
    const roundId = `${this.#ledger.id}:round:${this.#ledger.completedRounds + 1}`;
    const nextLedger = beginA1aRound(this.#ledger, roundId, stake, this.#terms());
    const nextSession = this.#session
      ? (() => { this.#session!.nextRound(prepared, cofreOverride); return this.#session!; })()
      : CofreFocoSessionAdapter.start(prepared, this.#rules, A1A_HORIZON, this.#actionRestrictions, cofreOverride);
    this.#ledger = nextLedger;
    this.#session = nextSession;
    this.#roundId = roundId;
    this.#betting = false;
    return this.#applyCompleted(nextSession.current);
  }

  #applyCompleted(view: PublicCofreFocoNight): PublicCofreFocoNight {
    if (view.round?.phase !== "complete" || !this.#roundId) return view;
    if (view.round.score === undefined) throw new Error("O motor concluiu sem score para liquidação A1a.");
    const stake = this.#ledger.round?.stake ?? 0;
    const roundKind = this.#ledger.round?.kind;
    const roundNumber = this.#ledger.completedRounds + 1;
    const refundTicks = this.#pactHooks.refundTicks?.(view, stake, roundNumber) ?? 0;
    this.#ledger = settleA1aRound(this.#ledger, this.#roundId, { phase: view.round.phase, score: view.round.score, refundTicks });
    // A1a normally enters practice when the standard 4s reserve no longer
    // covers a minimum stake. An available Audácia privilege can instead
    // cover that minimum at 2s; keep the night funded until that option is
    // either used or no longer affordable. The default A1a mode is unchanged.
    if (roundKind === "funded" && this.#ledger.status === "practice" && this.#ledger.completedRounds < A1A_HORIZON) {
      const defaultEligible = maxA1aStake(this.#ledger.balanceTicks);
      const eligible = this.#pactHooks.practiceEligibility?.(this.#ledger.balanceTicks,
        this.#ledger.completedRounds + 1, defaultEligible) ?? defaultEligible;
      if (eligible > 0) this.#ledger = { ...this.#ledger, status: "active" };
    }
    return view;
  }

  #transition(operation: () => PublicCofreFocoNight): PublicCofreFocoNight {
    if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta.");
    return this.#applyCompleted(operation());
  }

  compose(partition: Partition, suppressOpeningNatural = false) { return this.#transition(() => this.#session!.compose(partition, suppressOpeningNatural)); }
  composeCisao(threeCardHand: HandName) { return this.#transition(() => this.#session!.composeCisao(threeCardHand)); }
  skipRead() { return this.#transition(() => this.#session!.skipRead()); }
  readDealerHole() { return this.#transition(() => this.#session!.readDealerHole()); }
  readDealerHoleWithPactPrivilege() { return this.#transition(() => this.#session!.readDealerHoleWithPactPrivilege()); }
  skipManeuver() { return this.#transition(() => this.#session!.skipManeuver()); }
  maneuverDirect(hand: HandName, cardIndex: number) { return this.#transition(() => this.#session!.maneuverDirect(hand, cardIndex)); }
  maneuverDirectWithPactPrivilege(hand: HandName, cardIndex: number) { return this.#transition(() => this.#session!.maneuverDirectWithPactPrivilege(hand, cardIndex)); }
  revealFarolCategory() { return this.#transition(() => this.#session!.revealFarolCategory()); }
  impetusDouble() { return this.#transition(() => this.#session!.impetusDouble()); }
  beginPactHit() { return this.#transition(() => this.#session!.beginPactHit()); }
  resolvePactHit(resolution: "normal" | "bastion" | "reflection" | "chaos", transferTo?: HandName) {
    return this.#transition(() => this.#session!.resolvePactHit(resolution, transferTo));
  }
  peekNextForCurrentHand(): Card { if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta."); return this.#session.peekNextForCurrentHand(); }
  drawAlternateCofreCandidate(): Card { if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta."); return this.#session.drawAlternateCofreCandidate(); }
  chooseCofre(card: Card) { return this.#transition(() => this.#session!.chooseCofre(card)); }
  continueAfterAbilities() { return this.#transition(() => this.#session!.continueAfterAbilities()); }
  act(action: Action) { return this.#transition(() => this.#session!.act(action)); }
  resolveDealer() { return this.#transition(() => this.#session!.resolveDealer()); }

  abandonBeforeDeal(): void {
    if (this.#ledger.status === "complete" || this.#ledger.status === "abandoned") throw new Error("A Noite A1a já terminou.");
    if (this.#session && !this.#betting) throw new Error("Use o encerramento da mesa durante uma rodada.");
    this.#ledger = abandonA1aNight(this.#ledger);
    this.#betting = false;
  }

  abandonNight(): PublicCofreFocoNight {
    if (this.#ledger.status === "complete" || this.#ledger.status === "abandoned") throw new Error("A Noite A1a já terminou.");
    if (!this.#session || this.#betting) throw new Error("Não há rodada ativa para encerrar pela mesa.");
    const view = this.#session.abandonNight();
    this.#ledger = abandonA1aNight(this.#ledger);
    return view;
  }
}
