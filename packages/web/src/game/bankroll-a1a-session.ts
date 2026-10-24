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

/** Stake is committed before this adapter starts or advances the card engine. */
export class BankrollA1aSessionAdapter {
  #rules: CofreFocoRules;
  #ledger: A1aBankroll;
  #session: CofreFocoSessionAdapter | null = null;
  #betting = true;
  #roundId: string | null = null;
  #actionRestrictions: ((roundNumber: number) => CofreFocoActionRestrictions | undefined) | undefined;

  private constructor(rules: CofreFocoRules, actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined) {
    this.#rules = rules;
    this.#actionRestrictions = actionRestrictions;
    this.#ledger = createA1aBankroll(`a1a-local-night-${++localNightSequence}`);
  }

  static start(rules: CofreFocoRules, actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined): BankrollA1aSessionAdapter {
    return new BankrollA1aSessionAdapter(rules, actionRestrictions);
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
      available: formatHalfChips(this.#ledger.balanceTicks - (round?.kind === "funded" ? 8 * round.stake : 0)),
      maxStake: maxA1aStake(this.#ledger.balanceTicks), currentStake: round ? round.kind === "funded" ? round.stake : 0
        : this.#ledger.lastSettlement?.kind === "funded" ? this.#ledger.lastSettlement.stake : null,
      lastStake: this.#ledger.lastStake,
      coverage: 4 * stake, fundedRounds: this.#ledger.fundedRounds,
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
    this.#ledger = enterA1aPracticeIfNeeded(this.#ledger);
    this.#betting = true;
  }

  startRound(prepared: PreparedCofreFocoRound, stake: number, cofreOverride?: Card): PublicCofreFocoNight {
    if (!this.#betting) throw new Error("A aposta da rodada já foi confirmada.");
    const roundId = `${this.#ledger.id}:round:${this.#ledger.completedRounds + 1}`;
    const nextLedger = beginA1aRound(this.#ledger, roundId, stake);
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
    this.#ledger = settleA1aRound(this.#ledger, this.#roundId, { phase: view.round.phase, score: view.round.score });
    return view;
  }

  #transition(operation: () => PublicCofreFocoNight): PublicCofreFocoNight {
    if (!this.#session || this.#betting) throw new Error("A rodada ainda aguarda a aposta.");
    return this.#applyCompleted(operation());
  }

  compose(partition: Partition) { return this.#transition(() => this.#session!.compose(partition)); }
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
