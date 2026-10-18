import {
  applyAction, compose, createRound, legalActions, playDealer, publicRound, roundScore,
  type Action, type CardSource, type InternalRound, type Partition, type PublicRound,
} from "@nocte/engine";
import type { PreparedRound } from "./random";

/** Owns the mutable-flow round. The only value returned across this boundary is a cloned PublicRound. */
export class SoloSession {
  private round?: InternalRound;
  private readonly prepared: PreparedRound;

  private constructor(prepared: PreparedRound) {
    this.prepared = prepared;
  }

  static start(prepared: PreparedRound): SoloSession {
    const session = new SoloSession(prepared);
    session.round = createRound(prepared.initial, prepared.rules);
    return session;
  }

  currentPublic(): PublicRound {
    if (!this.round) throw new Error("A rodada ainda não começou.");
    return publicRound(this.round);
  }

  compose(partition: Partition): PublicRound {
    const next = compose(this.requireRound(), partition);
    this.round = next;
    return publicRound(next);
  }

  act(action: Action): PublicRound {
    const round = this.requireRound();
    const allowed = legalActions(round);
    if (!allowed.includes(action)) throw new Error(`Ação ilegal ou desatualizada: ${action}.`);
    const hand = round.currentHand;
    if (!hand) throw new Error("Não há mão ativa para receber a ação.");
    const next = applyAction(round, action, this.prepared.draws[hand] as CardSource);
    this.round = next;
    return publicRound(next);
  }

  resolveDealer(): PublicRound {
    const round = this.requireRound();
    const next = playDealer(round, this.prepared.draws.dealer);
    this.round = next;
    return publicRound(next);
  }

  score(): number {
    return roundScore(this.requireRound());
  }

  private requireRound(): InternalRound {
    if (!this.round) throw new Error("A rodada ainda não começou.");
    return this.round;
  }
}
