import type { Action, HandName, Partition } from "@nocte/engine";
import {
  A0_BANKROLL_ROUNDS,
  abandonBankrollNight,
  beginBankrollRound,
  createBankrollNight,
  expireBankrollNight,
  settleBankrollRound,
  type BankrollNight,
} from "./bankroll-a0";
import { CofreFocoSessionAdapter } from "./cofre-foco-session";
import type { PreparedCofreFocoRound } from "./random";
import type { CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";

export type PublicBankrollA0 = Readonly<{
  status: BankrollNight["status"];
  bankroll: number;
  available: number;
  escrow: number;
  pendingKind: "funded" | "practice" | null;
  fundedRounds: number;
  practiceRounds: number;
  lastRoundKind: "funded" | "practice" | null;
  lastRoundScore: number | null;
  lastBankDelta: number | null;
  expiredBalance: number | null;
}>;

/**
 * Isolated A0.1 wrapper around the existing Cofre + Foco session. The motor
 * remains the sole source of round score; this wrapper only applies that score
 * to a local, per-Night ledger after the engine reports phase=complete.
 */
export class BankrollA0SessionAdapter {
  #session: CofreFocoSessionAdapter;
  #ledger: BankrollNight;
  #roundId: string;

  private constructor(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, nightId: string) {
    this.#ledger = beginBankrollRound(createBankrollNight(nightId), `${nightId}:round:1`);
    this.#roundId = `${nightId}:round:1`;
    this.#session = CofreFocoSessionAdapter.start(prepared, rules, A0_BANKROLL_ROUNDS);
    this.#applyCompleted(this.#session.current);
  }

  static start(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, nightId = prepared.seed): BankrollA0SessionAdapter {
    return new BankrollA0SessionAdapter(prepared, rules, nightId);
  }

  get current(): PublicCofreFocoNight { return this.#session.current; }

  get bankroll(): PublicBankrollA0 {
    const pending = this.#ledger.pendingRound;
    return Object.freeze({
      status: this.#ledger.status,
      bankroll: this.#ledger.bankroll,
      available: pending?.available ?? this.#ledger.bankroll,
      escrow: pending?.escrow ?? 0,
      pendingKind: pending?.kind ?? null,
      fundedRounds: this.#ledger.fundedRounds,
      practiceRounds: this.#ledger.practiceRounds,
      lastRoundKind: this.#ledger.lastSettlement?.kind ?? null,
      lastRoundScore: this.#ledger.lastSettlement?.score ?? null,
      lastBankDelta: this.#ledger.lastSettlement?.bankDelta ?? null,
      expiredBalance: this.#ledger.expiredBalance,
    });
  }

  get focusOptions() { return this.#session.focusOptions; }
  get legalActions(): readonly Action[] { return this.#session.legalActions; }

  #applyCompleted(view: PublicCofreFocoNight): PublicCofreFocoNight {
    if (view.round?.phase !== "complete") return view;
    if (view.round.score === undefined) throw new Error("O motor concluiu a rodada sem fornecer score para liquidação A0.1.");
    this.#ledger = settleBankrollRound(this.#ledger, this.#roundId, {
      phase: view.round.phase,
      score: view.round.score,
    });
    if (view.status === "complete") this.#ledger = expireBankrollNight(this.#ledger);
    return view;
  }

  #transition(operation: () => PublicCofreFocoNight): PublicCofreFocoNight {
    const view = operation();
    return this.#applyCompleted(view);
  }

  compose(partition: Partition): PublicCofreFocoNight { return this.#transition(() => this.#session.compose(partition)); }
  skipRead(): PublicCofreFocoNight { return this.#transition(() => this.#session.skipRead()); }
  readDealerHole(): PublicCofreFocoNight { return this.#transition(() => this.#session.readDealerHole()); }
  skipManeuver(): PublicCofreFocoNight { return this.#transition(() => this.#session.skipManeuver()); }
  maneuver(hand: HandName, cardIndex: number): PublicCofreFocoNight { return this.#transition(() => this.#session.maneuver(hand, cardIndex)); }
  maneuverDirect(hand: HandName, cardIndex: number): PublicCofreFocoNight {
    return this.#transition(() => this.#session.maneuverDirect(hand, cardIndex));
  }
  continueAfterAbilities(): PublicCofreFocoNight { return this.#transition(() => this.#session.continueAfterAbilities()); }
  act(action: Action): PublicCofreFocoNight { return this.#transition(() => this.#session.act(action)); }
  resolveDealer(): PublicCofreFocoNight { return this.#transition(() => this.#session.resolveDealer()); }

  nextRound(prepared: PreparedCofreFocoRound): PublicCofreFocoNight {
    if (this.#session.current.status !== "active" || this.#session.current.round?.phase !== "complete") {
      throw new Error("A rodada anterior precisa ser concluída antes de iniciar outra.");
    }
    if (this.#session.current.completedRounds >= A0_BANKROLL_ROUNDS) throw new Error("A Noite A0.1 já chegou ao limite de 10 rodadas.");
    const index = this.#session.current.completedRounds + 1;
    const nextRoundId = `${this.#ledger.id}:round:${index + 1}`;
    const nextLedger = beginBankrollRound(this.#ledger, nextRoundId);
    const view = this.#session.nextRound(prepared);
    this.#roundId = nextRoundId;
    this.#ledger = nextLedger;
    return this.#applyCompleted(view);
  }

  abandonNight(): PublicCofreFocoNight {
    const view = this.#session.abandonNight();
    this.#ledger = abandonBankrollNight(this.#ledger);
    return view;
  }
}
