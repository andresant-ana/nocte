import type { Action, Card, HandName, Partition } from "@nocte/engine";
import type { PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import {
  PACT_LAB_VERSION, assertPactActionAllowed, canUsePactPrivilege, completePactNight, consumePactPrivilege,
  createPactContract, enterPactRound, offerPact, pactActionRestrictions, pactHidesDealerUpcard, refusePacts,
  signPact, type PactContractState, type PactKind,
} from "@nocte/engine/pacts";
import type { CofreFocoRules } from "@nocte/engine/cofre-foco";
import type { PreparedCofreFocoRound } from "./random";
import { BankrollA1aSessionAdapter, type PublicBankrollA1a } from "./bankroll-a1a-session";

export type PactPublicNight = PublicCofreFocoNight;
export type PublicPactContract = PactContractState;

export class PactA1aSessionAdapter {
  #rules: CofreFocoRules;
  #contract = createPactContract();
  #base: BankrollA1aSessionAdapter;

  private constructor(rules: CofreFocoRules) {
    this.#rules = rules;
    this.#base = BankrollA1aSessionAdapter.start(rules, (roundNumber) => pactActionRestrictions(this.#contract, roundNumber));
  }

  static start(rules: CofreFocoRules): PactA1aSessionAdapter { return new PactA1aSessionAdapter(rules); }

  get version(): typeof PACT_LAB_VERSION { return PACT_LAB_VERSION; }
  get contract(): PublicPactContract { return Object.freeze({ ...this.#contract }); }
  get bankroll(): PublicBankrollA1a { return this.#base.bankroll; }
  get isBetting(): boolean { return this.#base.isBetting; }
  get isPactOfferPending(): boolean { return this.isBetting && this.#contract.status === "offered"; }
  get canUseReadPrivilege(): boolean {
    const round = this.#base.current.round;
    return Boolean(round && canUsePactPrivilege(this.#contract, round.roundNumber, "veil") && round.phase === "focusWindow"
      && !round.readDecisionMade && !round.readUsed && this.#base.focusOptionsWithPactPrivilege.canDecideRead);
  }
  get focusOptions() { return this.#base.focusOptions; }
  get focusOptionsWithPactPrivilege() { return this.#base.focusOptionsWithPactPrivilege; }
  get legalActions(): readonly Action[] { return this.#base.legalActions; }

  get current(): PactPublicNight {
    const view = this.#base.current;
    const round = view.round;
    if (!round || !pactHidesDealerUpcard(this.#contract, round.roundNumber, round.phase)) return view;
    const { dealerUp: _hidden, ...redactedRound } = round;
    return structuredClone({ ...view, round: redactedRound }) as unknown as PactPublicNight;
  }

  get roundsRemaining(): number {
    const round = this.#base.isBetting ? this.#base.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0;
    if (this.#contract.status === "signed") return Math.max(0, 7 - round + 1);
    return this.#contract.status === "active" ? Math.max(0, 7 - round + 1) : 0;
  }
  get canUseManeuverPrivilege(): boolean {
    const round = this.#base.current.round;
    return Boolean(round && canUsePactPrivilege(this.#contract, round.roundNumber, "iron") && round.phase === "focusWindow"
      && !round.maneuverDecisionMade && !round.maneuverUsed);
  }

  enterBetting(): void {
    this.#base.enterBetting();
    const nextRound = this.#base.bankroll.completedRounds + 1;
    this.#contract = enterPactRound(offerPact(this.#contract, nextRound), nextRound);
  }

  sign(pact: PactKind, ironFace?: HandName): void { this.#contract = signPact(this.#contract, pact, ironFace); }
  refuse(): void { this.#contract = refusePacts(this.#contract); }

  startRound(prepared: PreparedCofreFocoRound, stake: number): PactPublicNight {
    if (this.#contract.status === "offered") throw new Error("Resolva a oferta de Pactos antes de confirmar a aposta.");
    const roundNumber = this.#base.bankroll.completedRounds + 1;
    const previous = this.#contract;
    this.#contract = enterPactRound(this.#contract, roundNumber);
    try { return this.#afterTransition(this.#base.startRound(prepared, stake)); }
    catch (error) { this.#contract = previous; throw error; }
  }

  compose(partition: Partition): PactPublicNight { return this.#afterTransition(this.#base.compose(partition)); }
  skipRead(): PactPublicNight { return this.#afterTransition(this.#base.skipRead()); }
  readDealerHole(): PactPublicNight { return this.#afterTransition(this.#base.readDealerHole()); }
  readDealerHoleWithPactPrivilege(): PactPublicNight {
    const round = this.#base.current.round;
    if (!round || !canUsePactPrivilege(this.#contract, round.roundNumber, "veil")) throw new Error("Privilégio de Leitura indisponível.");
    const nextContract = consumePactPrivilege(this.#contract, round.roundNumber, "veil");
    const view = this.#base.readDealerHoleWithPactPrivilege();
    this.#contract = nextContract;
    return this.#afterTransition(view);
  }
  skipManeuver(): PactPublicNight { return this.#afterTransition(this.#base.skipManeuver()); }
  maneuverDirect(hand: HandName, cardIndex: number): PactPublicNight { return this.#afterTransition(this.#base.maneuverDirect(hand, cardIndex)); }
  maneuverDirectWithPactPrivilege(hand: HandName, cardIndex: number): PactPublicNight {
    const round = this.#base.current.round;
    if (!round || !canUsePactPrivilege(this.#contract, round.roundNumber, "iron")) throw new Error("Privilégio de Manobra indisponível.");
    const nextContract = consumePactPrivilege(this.#contract, round.roundNumber, "iron");
    const view = this.#base.maneuverDirectWithPactPrivilege(hand, cardIndex);
    this.#contract = nextContract;
    return this.#afterTransition(view);
  }
  continueAfterAbilities(): PactPublicNight { return this.#afterTransition(this.#base.continueAfterAbilities()); }
  act(action: Action): PactPublicNight {
    const round = this.#base.current.round;
    if (!round?.currentHand) throw new Error("Não há mão ativa para receber a ação.");
    assertPactActionAllowed(this.#contract, round.roundNumber, round.currentHand, action);
    return this.#afterTransition(this.#base.act(action));
  }
  resolveDealer(): PactPublicNight { return this.#afterTransition(this.#base.resolveDealer()); }
  abandonBeforeDeal(): void { this.#base.abandonBeforeDeal(); this.#contract = completePactNight(this.#contract); }
  abandonNight(): PactPublicNight { const result = this.#base.abandonNight(); this.#contract = completePactNight(this.#contract); return this.#project(result); }

  #afterTransition(view: PublicCofreFocoNight): PactPublicNight {
    if (view.status === "complete" || view.status === "abandoned") this.#contract = completePactNight(this.#contract);
    return this.#project(view);
  }

  #project(view: PublicCofreFocoNight): PactPublicNight {
    const round = view.round;
    if (!round || !pactHidesDealerUpcard(this.#contract, round.roundNumber, round.phase)) return view;
    const { dealerUp: _hidden, ...redactedRound } = round;
    return structuredClone({ ...view, round: redactedRound }) as unknown as PactPublicNight;
  }
}
