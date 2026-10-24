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
  maneuverWithPactPrivilege,
  playCofreFocoDealer,
  projectCofreFoco,
  readDealerHole,
  readDealerHoleWithPactPrivilege,
  revealDealerHoleCategory,
  applyPactImpetusDouble,
  beginPactBookHit,
  choosePactCofre,
  resolvePactBookHit,
  skipManeuver,
  skipRead,
  type CofreFocoNight,
  type CofreFocoRules,
  type CofreFocoActionRestrictions,
  type PublicCofreFocoNight,
  type PactBookHitResolution,
  type Card,
} from "@nocte/engine/cofre-foco";
import type { PreparedCofreFocoRound } from "./random";

/** Client-only adapter. Internal Night and hole-card state never escape this boundary. */
export class CofreFocoSessionAdapter {
  #night: CofreFocoNight;
  #prepared: PreparedCofreFocoRound;
  #actionRestrictions: ((roundNumber: number) => CofreFocoActionRestrictions | undefined) | undefined;

  private constructor(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, horizon: number,
    actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined, cofreOverride?: Card) {
    this.#prepared = prepared;
    this.#actionRestrictions = actionRestrictions;
    this.#night = beginRound(createNight(rules, horizon), prepared.draws, cofreOverride);
  }

  static start(prepared: PreparedCofreFocoRound, rules: CofreFocoRules, horizon = 10,
    actionRestrictions?: (roundNumber: number) => CofreFocoActionRestrictions | undefined, cofreOverride?: Card): CofreFocoSessionAdapter {
    return new CofreFocoSessionAdapter(prepared, rules, horizon, actionRestrictions, cofreOverride);
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
    return legalCofreFocoActions(this.#night, undefined, this.#actionRestrictions?.(this.#night.roundNumber));
  }

  get focusOptionsWithPactPrivilege() {
    const current = legalCofreFocoFocusOptions(this.#night, true);
    if (!current.canDecideRead || current.canDecideManeuver) return current;
    const afterReadSkip = legalCofreFocoFocusOptions(skipRead(this.#night), true);
    return { ...current, canDecideManeuver: afterReadSkip.canDecideManeuver, maneuverTargets: afterReadSkip.maneuverTargets };
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

  readDealerHoleWithPactPrivilege(): PublicCofreFocoNight {
    this.#night = readDealerHoleWithPactPrivilege(this.#night);
    return this.current;
  }

  revealFarolCategory(): PublicCofreFocoNight {
    this.#night = revealDealerHoleCategory(this.#night);
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

  maneuverDirectWithPactPrivilege(hand: HandName, cardIndex: number): PublicCofreFocoNight {
    const afterReadDecision = this.#night.round?.readDecisionMade ? this.#night : skipRead(this.#night);
    this.#night = maneuverWithPactPrivilege(afterReadDecision, hand, cardIndex);
    return this.current;
  }

  continueAfterAbilities(): PublicCofreFocoNight {
    this.#night = continueAfterAbilities(this.#night);
    return this.current;
  }

  act(action: Action): PublicCofreFocoNight {
    const hand = this.#night.round?.currentHand;
    if (!hand) throw new Error("Não há mão ativa para receber a ação.");
    this.#night = applyCofreFocoAction(this.#night, action, this.#prepared.draws[hand], this.#actionRestrictions?.(this.#night.roundNumber));
    return this.current;
  }

  beginPactHit(): PublicCofreFocoNight {
    const hand = this.#night.round?.currentHand;
    if (!hand) throw new Error("Não há Face ativa para uma Compra P7.");
    this.#night = beginPactBookHit(this.#night, this.#prepared.draws[hand], this.#actionRestrictions?.(this.#night.roundNumber));
    return this.current;
  }

  resolvePactHit(resolution: PactBookHitResolution, transferTo?: HandName): PublicCofreFocoNight {
    const hand = this.#night.round?.pendingHitHand;
    if (!hand) throw new Error("Não há Compra P7 aguardando resolução.");
    this.#night = resolvePactBookHit(this.#night, resolution, resolution === "chaos" ? this.#prepared.draws[hand] : undefined,
      transferTo, this.#actionRestrictions?.(this.#night.roundNumber));
    return this.current;
  }

  peekNextForCurrentHand(): Card {
    const hand = this.#night.round?.currentHand;
    const peek = hand && this.#prepared.draws[hand].peek;
    if (!peek) throw new Error("Esta faixa não oferece prévia não consumível.");
    return peek();
  }

  drawAlternateCofreCandidate(): Card { return this.#prepared.draws.cofre(); }

  chooseCofre(card: Card): PublicCofreFocoNight {
    this.#night = choosePactCofre(this.#night, card);
    return this.current;
  }

  impetusDouble(): PublicCofreFocoNight {
    const hand = this.#night.round?.currentHand;
    if (!hand) throw new Error("Não há mão ativa para Ímpeto.");
    this.#night = applyPactImpetusDouble(this.#night, this.#prepared.draws[hand]);
    return this.current;
  }

  resolveDealer(): PublicCofreFocoNight {
    this.#night = playCofreFocoDealer(this.#night, this.#prepared.draws.dealer);
    return this.current;
  }

  nextRound(prepared: PreparedCofreFocoRound, cofreOverride?: Card): PublicCofreFocoNight {
    const next = beginRound(this.#night, prepared.draws, cofreOverride);
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
