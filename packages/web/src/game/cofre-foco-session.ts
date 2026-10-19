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
    return legalCofreFocoFocusOptions(this.#night);
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
