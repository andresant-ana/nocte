import {
  type Action,
  type Partition,
  type PublicRound,
} from "@nocte/engine";
import { SoloSession } from "./session";
import type { PreparedRound } from "./random";

export type DecisionRecord = Readonly<{
  hand: "luz" | "sombra";
  action: Action;
  durationMs: number;
}>;

export type CompletedRoundDetails = Readonly<{
  seed: string;
  index: number;
  rulesId: PublicRound["rulesId"];
  initialCards: PublicRound["originalCards"];
  dealerUp: PublicRound["dealerUp"];
  dealerHole: NonNullable<PublicRound["dealerHole"]>;
  composition: Partition;
  compositionDurationMs: number;
  actions: readonly DecisionRecord[];
  result: PublicRound;
  score: number;
}>;

export class SoloRoundController {
  readonly #session: SoloSession;
  #view: PublicRound;
  #composition?: Partition;
  #compositionDurationMs?: number;
  #actions: DecisionRecord[] = [];
  readonly #seed: string;
  readonly #index: number;

  private constructor(prepared: PreparedRound) {
    this.#seed = prepared.seed;
    this.#index = prepared.index;
    this.#session = SoloSession.start(prepared);
    this.#view = this.#session.currentPublic();
  }

  static start(prepared: PreparedRound): SoloRoundController {
    return new SoloRoundController(prepared);
  }

  get current(): PublicRound {
    this.#view = this.#session.currentPublic();
    return this.#view;
  }

  compose(partition: Partition, durationMs: number): PublicRound {
    const duration = this.duration(durationMs);
    const next = this.#session.compose(partition);
    this.#composition = structuredClone(partition);
    this.#compositionDurationMs = duration;
    this.#view = next;
    return next;
  }

  act(action: Action, durationMs: number): PublicRound {
    const duration = this.duration(durationMs);
    const hand = this.#view.currentHand;
    if (!hand) throw new Error("Não há mão ativa para receber a ação.");
    const next = this.#session.act(action);
    this.#actions.push({ hand, action, durationMs: duration });
    this.#view = next;
    return next;
  }

  resolveDealer(): PublicRound {
    this.#view = this.#session.resolveDealer();
    return this.#view;
  }

  score(): number {
    return this.#session.score();
  }

  completedDetails(): CompletedRoundDetails | null {
    const result = this.current;
    if (result.phase !== "complete") return null;
    if (!this.#composition || this.#compositionDurationMs === undefined || !result.dealerHole) {
      throw new Error("A rodada concluída não possui metadados suficientes.");
    }
    return {
      seed: this.#seed,
      index: this.#index,
      rulesId: result.rulesId,
      initialCards: structuredClone(result.originalCards),
      dealerUp: structuredClone(result.dealerUp),
      dealerHole: structuredClone(result.dealerHole),
      composition: structuredClone(this.#composition),
      compositionDurationMs: this.#compositionDurationMs,
      actions: structuredClone(this.#actions),
      result,
      score: this.#session.score(),
    };
  }

  private duration(value: number): number {
    if (!Number.isFinite(value) || value < 0) throw new Error("Duração de decisão inválida.");
    return value;
  }
}

export function beginRound(prepared: PreparedRound): SoloRoundController {
  return SoloRoundController.start(prepared);
}


