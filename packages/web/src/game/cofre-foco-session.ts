import type { Action, HandName, Partition } from "@nocte/engine";
import {
  abandonNight as abandonCofreFocoNight,
  applyCofreFocoAction,
  beginRound,
  composeCofreFoco,
  continueAfterAbilities,
  createNight,
  legalCofreFocoActions,
  legalCofreFocoFocusOptions,
  maneuver,
  playCofreFocoDealer,
  projectCofreFoco,
  readDealerHole,
  skipManeuver,
  skipRead,
  type CofreFocoNight,
  type CofreFocoRules,
  type PublicCofreFocoNight,
} from "@nocte/engine/cofre-foco";
import type { PreparedCofreFocoRound } from "./random";

/** Client-only adapter. Internal Night and hole-card state never escape this boundary. */
export class CofreFocoSessionAdapter {
  #night: CofreFocoNight;
  #prepared: PreparedCofreFocoRound;

  private constructor(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, horizon: number) {
    this.#prepared = prepared;
    this.#night = beginRound(createNight(rules, horizon), prepared.draws);
  }

  static start(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, horizon = 10): CofreFocoSessionAdapter {
    return new CofreFocoSessionAdapter(prepared, rules, horizon);
  }

  get current(): PublicCofreFocoNight {
    return projectCofreFoco(this.#night, "solo-player");
  }

  get focusOptions() {
    const current = legalCofreFocoFocusOptions(this.#night);
    if (!current.canDecideRead || current.canDecideManeuver) return current;

    // Preview the engine's legal targets after a possible Read skip without
    // changing the session. This lets the UI show both choices at once.
    const afterReadSkip = legalCofreFocoFocusOptions(skipRead(this.#night));
    return {
      ...current,
      canDecideManeuver: afterReadSkip.canDecideManeuver,
      maneuverTargets: afterReadSkip.maneuverTargets,
    };
  }

  get legalActions(): readonly Action[] {
    return legalCofreFocoActions(this.#night);
  }

  compose(partition: Partition): PublicCofreFocoNight {
    this.#night = composeCofreFoco(this.#night, partition);
    return this.current;
  }

  skipRead(): PublicCofreFocoNight {
    this.#night = skipRead(this.#night);
    return this.current;
  }

  readDealerHole(): PublicCofreFocoNight {
    this.#night = readDealerHole(this.#night);
    return this.current;
  }

  skipManeuver(): PublicCofreFocoNight {
    this.#night = skipManeuver(this.#night);
    return this.current;
  }

  maneuver(hand: HandName, cardIndex: number): PublicCofreFocoNight {
    this.#night = maneuver(this.#night, hand, cardIndex);
    return this.current;
  }

  /** Apply a direct Manobra as one transaction, optionally skipping pending Read first. */
  maneuverDirect(hand: HandName, cardIndex: number): PublicCofreFocoNight {
    const afterReadDecision = this.#night.round?.readDecisionMade ? this.#night : skipRead(this.#night);
    const next = maneuver(afterReadDecision, hand, cardIndex);
    this.#night = next;
    return this.current;
  }

  continueAfterAbilities(): PublicCofreFocoNight {
    this.#night = continueAfterAbilities(this.#night);
    return this.current;
  }

  act(action: Action): PublicCofreFocoNight {
    const hand = this.#night.round?.currentHand;
    if (!hand) throw new Error("Não há mão ativa para receber a ação.");
    this.#night = applyCofreFocoAction(this.#night, action, this.#prepared.draws[hand]);
    return this.current;
  }

  resolveDealer(): PublicCofreFocoNight {
    this.#night = playCofreFocoDealer(this.#night, this.#prepared.draws.dealer);
    return this.current;
  }

  nextRound(prepared: PreparedCofreFocoRound): PublicCofreFocoNight {
    const next = beginRound(this.#night, prepared.draws);
    this.#night = next;
    this.#prepared = prepared;
    return this.current;
  }

  abandonNight(): PublicCofreFocoNight {
    if (this.#night.status !== "active") throw new Error("A Noite já terminou.");
    this.#night = abandonCofreFocoNight(this.#night);
    return this.current;
  }
}
