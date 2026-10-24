import type { Action, HandName, Partition } from "@nocte/engine";
import type { CofreFocoActionRestrictions, CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import {
  assertPactBookActionAllowed, canUsePactBookPrivilege, consumePactBookPrivilege, createPactBook,
  enterPactBookRound, expirePactBook, offerPactBook, pactActRoundsRemaining, pactBookRestrictions,
  refusePactBook, signPactBook, type PactActState, type PactBookState, type PactFamily, type PactId,
} from "@nocte/engine/pact-book";
import type { PreparedCofreFocoRound } from "./random";
import { BankrollA1aSessionAdapter, type PublicBankrollA1a } from "./bankroll-a1a-session";

export type PactBookPublicContract = Readonly<{
  status: PactActState["status"] | "unoffered";
  pact: PactId | null;
  affectedFace: HandName | null;
  ironFace: HandName | null;
  privilege: PactActState["privilege"];
  family: PactFamily | null;
  actStartRound: number;
  actEndRound: number;
}>;

/** Isolated PACT-BOOK-0.1 browser laboratory. PACT-LAB-0.1 remains unchanged. */
export class PactBookA1aSessionAdapter {
  #rules: CofreFocoRules;
  #state: PactBookState = createPactBook();
  #base: BankrollA1aSessionAdapter;
  #seed: string | null = null;

  private constructor(rules: CofreFocoRules) {
    this.#rules = rules;
    this.#base = BankrollA1aSessionAdapter.start(rules, round => pactBookRestrictions(this.#state, round) as CofreFocoActionRestrictions | undefined);
  }
  static start(rules: CofreFocoRules): PactBookA1aSessionAdapter { return new PactBookA1aSessionAdapter(rules); }
  get version() { return this.#state.version; }
  get state(): PactBookState { return this.#state; }
  get contract(): PactBookPublicContract {
    const pact = this.#state.current;
    return Object.freeze({ status: pact?.status ?? "unoffered", pact: pact?.choice && pact.choice !== "refused" ? pact.choice : null,
      affectedFace: pact?.affectedFace ?? null, ironFace: pact?.affectedFace ?? null, privilege: pact?.privilege ?? "none", family: pact?.family ?? null,
      actStartRound: pact?.startRound ?? 0, actEndRound: pact?.endRound ?? 0 });
  }
  get offerFamily(): PactFamily | null { return this.#state.current?.status === "offered" ? this.#state.current.family : null; }
  get offerOptions(): readonly PactId[] { return this.#state.current?.status === "offered" ? this.#state.current.options : []; }
  get isPactOfferPending(): boolean { return this.isBetting && this.#state.current?.status === "offered"; }
  get bankroll(): PublicBankrollA1a { return this.#base.bankroll; }
  get isBetting(): boolean { return this.#base.isBetting; }
  get roundsRemaining(): number { return pactActRoundsRemaining(this.#state, this.#base.isBetting ? this.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0); }
  get focusOptions() {
    const options = this.#base.focusOptions;
    return { ...options, ...(this.#readForbidden() ? { canRead: false } : {}),
      ...(this.#maneuverForbidden() ? { maneuverTargets: [] } : {}) };
  }
  get focusOptionsWithPactPrivilege() { return this.#base.focusOptionsWithPactPrivilege; }
  get legalActions(): readonly Action[] { return this.#base.legalActions; }
  get current(): PublicCofreFocoNight {
    const view = this.#base.current;
    const round = view.round;
    if (!round || this.#state.current?.choice !== "veil" || this.#state.current.status !== "active"
      || round.roundNumber > this.#state.current.endRound || round.phase !== "compose") return view;
    const { dealerUp: _hidden, ...redacted } = round;
    return structuredClone({ ...view, round: redacted }) as unknown as PublicCofreFocoNight;
  }
  get canUseReadPrivilege(): boolean {
    const round = this.#base.current.round; const pact = this.#state.current?.choice;
    return Boolean(round && (pact === "veil" || pact === "vigil" || pact === "flare") && this.#privilegeWindow(round.roundNumber)
      && round.phase === "focusWindow" && !round.readDecisionMade && this.#base.focusOptionsWithPactPrivilege.canDecideRead);
  }
  get canUseManeuverPrivilege(): boolean {
    const round = this.#base.current.round; const pact = this.#state.current?.choice;
    return Boolean(round && (pact === "iron" || pact === "vigil" || pact === "flare") && this.#privilegeWindow(round.roundNumber)
      && round.phase === "focusWindow" && !round.maneuverDecisionMade && this.#base.focusOptionsWithPactPrivilege.maneuverTargets.length > 0);
  }
  get canUseFarol(): boolean {
    const round = this.#base.current.round;
    return Boolean(round && this.#state.current?.choice === "lighthouse" && this.#privilegeWindow(round.roundNumber)
      && round.phase === "compose" && !round.dealerHoleCategory);
  }
  get canUseImpetusDouble(): boolean {
    const round = this.#base.current.round; const handName = round?.currentHand; const hand = handName && round?.hands?.[handName];
    return Boolean(round?.phase === "player" && hand?.status === "playing" && hand.cards.length === 3
      && this.#state.current?.choice === "impetus" && this.#privilegeWindow(round.roundNumber));
  }
  get focusAbilityRenunciation(): string | null {
    const round = this.#base.current.round;
    if (!round || !this.#state.current || !["vigil", "flare"].includes(this.#state.current.choice ?? "")) return null;
    const early = round.roundNumber <= (round.roundNumber <= 7 ? 5 : 8);
    const disabled = this.#state.current.choice === "vigil" ? early : !early;
    return disabled ? "Leitura e Manobra normais indisponíveis neste período" : null;
  }
  get farolCategory(): string | null {
    const c = this.#base.current.round?.dealerHoleCategory;
    return c === "ace" ? "Ás" : c === "low" ? "Baixa (2–6)" : c === "high" ? "Alta (7–K)" : null;
  }

  enterBetting(): void {
    this.#base.enterBetting();
    const next = this.#base.bankroll.completedRounds + 1;
    this.#state = enterPactBookRound(this.#state, next);
    if ((next === 4 || next === 8) && this.#seed) this.#state = offerPactBook(this.#state, next, this.#seed);
  }
  sign(pact: PactId, face?: HandName): void { this.#state = signPactBook(this.#state, pact, face); }
  refuse(): void { this.#state = refusePactBook(this.#state); }
  startRound(prepared: PreparedCofreFocoRound, stake: number): PublicCofreFocoNight {
    if (this.isPactOfferPending) throw new Error("Resolva a oferta antes de confirmar a aposta.");
    if (this.#seed && this.#seed !== prepared.seed) throw new Error("A semente da Noite não pode ser trocada entre rodadas.");
    this.#seed = prepared.seed;
    const round = this.#base.bankroll.completedRounds + 1;
    this.#state = enterPactBookRound(this.#state, round);
    const view = this.#base.startRound(prepared, stake);
    if (view.status === "complete") this.#state = expirePactBook(this.#state, "complete");
    return this.current;
  }
  compose(partition: Partition) { return this.#after(this.#base.compose(partition)); }
  skipRead() { return this.#after(this.#base.skipRead()); }
  readDealerHole() {
    if (this.#readForbidden()) throw new Error("Leitura está indisponível pela Renúncia vigente.");
    return this.#after(this.#base.readDealerHole());
  }
  readPrivilege() {
    const round = this.#base.current.round;
    if (!round || !this.canUseReadPrivilege) throw new Error("Privilégio de Leitura indisponível nesta janela.");
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.readDealerHoleWithPactPrivilege(); this.#state = next; return this.#after(result);
  }
  farol() {
    if (!this.canUseFarol) throw new Error("Privilégio do Farol indisponível antes da composição.");
    const round = this.#base.current.round!; const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.revealFarolCategory(); this.#state = next; return this.#after(result);
  }
  skipManeuver() { return this.#after(this.#base.skipManeuver()); }
  maneuverDirect(hand: HandName, cardIndex: number) {
    if (this.#maneuverForbidden()) throw new Error("Manobra está indisponível pela Renúncia vigente.");
    return this.#after(this.#base.maneuverDirect(hand, cardIndex));
  }
  maneuverPrivilege(hand: HandName, cardIndex: number) {
    const round = this.#base.current.round; const pact = this.#state.current?.choice;
    if (!round || !this.canUseManeuverPrivilege) throw new Error("Privilégio de Manobra indisponível nesta janela.");
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.maneuverDirectWithPactPrivilege(hand, cardIndex); this.#state = next; return this.#after(result);
  }
  continueAfterAbilities() { return this.#after(this.#base.continueAfterAbilities()); }
  act(action: Action) {
    const round = this.#base.current.round;
    if (!round?.currentHand) throw new Error("Não há mão ativa para a ação.");
    assertPactBookActionAllowed(this.#state, round.roundNumber, round.currentHand, action);
    return this.#after(this.#base.act(action));
  }
  impetusDouble() {
    const round = this.#base.current.round;
    if (!round || !this.canUseImpetusDouble) throw new Error("Privilégio de Ímpeto indisponível; exige exatamente uma Compra normal.");
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.impetusDouble(); this.#state = next; return this.#after(result);
  }
  resolveDealer() { return this.#after(this.#base.resolveDealer()); }
  abandonBeforeDeal(): void { this.#base.abandonBeforeDeal(); this.#state = expirePactBook(this.#state, "abandoned"); }
  abandonNight() { const result = this.#base.abandonNight(); this.#state = expirePactBook(this.#state, "abandoned"); return result; }

  #privilegeWindow(round: number): boolean {
    const current = this.#state.current;
    if (!canUsePactBookPrivilege(this.#state, round) || !current?.choice) return false;
    const early = current.endRound === 7 ? round <= 5 : round === 8;
    if (current.choice === "vigil") return !early;
    if (current.choice === "flare") return early;
    return true;
  }
  #after(view: PublicCofreFocoNight): PublicCofreFocoNight {
    if (view.status === "complete") this.#state = expirePactBook(this.#state, "complete");
    return view;
  }
  #readForbidden(): boolean {
    const current = this.#state.current; const round = this.#base.isBetting ? this.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0;
    if (!current || current.status !== "active") return false;
    if (current.choice === "lighthouse") return true;
    if (current.choice !== "vigil" && current.choice !== "flare") return false;
    const early = round <= (current.endRound === 7 ? 5 : 8);
    return current.choice === "vigil" ? early : !early;
  }
  #maneuverForbidden(): boolean {
    const current = this.#state.current; const round = this.#base.isBetting ? this.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0;
    if (!current || current.status !== "active") return false;
    if (current.choice === "impetus") return true;
    if (current.choice !== "vigil" && current.choice !== "flare") return false;
    const early = round <= (current.endRound === 7 ? 5 : 8);
    return current.choice === "vigil" ? early : !early;
  }
}
