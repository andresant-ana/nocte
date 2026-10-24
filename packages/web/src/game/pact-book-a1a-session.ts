import { handValue, type Action, type Card, type HandName, type Partition } from "@nocte/engine";
import type { CofreFocoActionRestrictions, CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import {
  assertPactBookActionAllowed, canUsePactBookPrivilege, consumePactBookPrivilege, createPactBook,
  enterPactBookRound, expirePactBook, markPactBookCofreSealed, offerPactBook, pactActRoundsRemaining, pactBookRestrictions,
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
  sealedRound: number | null;
  blockedManeuverRound: number | null;
}>;

/** Isolated PACT-BOOK-0.1 browser laboratory. PACT-LAB-0.1 remains unchanged. */
export class PactBookA1aSessionAdapter {
  #rules: CofreFocoRules;
  #state: PactBookState = createPactBook();
  #base: BankrollA1aSessionAdapter;
  #seed: string | null = null;
  #sealedCofre: Readonly<{ card: Card; targetRound: number }> | null = null;
  #arremateOptions: readonly [Card, Card] | null = null;
  #orderPreview: Readonly<{ hand: HandName; card: Card }> | null = null;

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
      actStartRound: pact?.startRound ?? 0, actEndRound: pact?.endRound ?? 0,
      sealedRound: pact?.sealedRound ?? null, blockedManeuverRound: pact?.blockedManeuverRound ?? null });
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
  get canUseBastion(): boolean {
    const round = this.#base.current.round;
    const hand = round?.pendingHitHand && round.hands?.[round.pendingHitHand];
    return Boolean(round?.phase === "hitPending" && hand && round.pendingHitCard
      && handValue([...hand.cards, round.pendingHitCard]).bust && this.#state.current?.choice === "bastion"
      && canUsePactBookPrivilege(this.#state, round.roundNumber));
  }
  get canUseReflection(): boolean {
    const round = this.#base.current.round; const hand = round?.pendingHitHand;
    const other: HandName | null = hand === "luz" ? "sombra" : hand === "sombra" ? "luz" : null;
    const receiver = other && round?.hands?.[other];
    return Boolean(round?.phase === "hitPending" && receiver?.status === "playing" && this.#state.current?.choice === "reflection"
      && canUsePactBookPrivilege(this.#state, round.roundNumber));
  }
  get reflectionTarget(): HandName | null {
    const hand = this.#base.current.round?.pendingHitHand;
    const other: HandName | null = hand === "luz" ? "sombra" : hand === "sombra" ? "luz" : null;
    return other && this.#base.current.round?.hands?.[other].status === "playing" ? other : null;
  }
  get canUseChaos(): boolean {
    const round = this.#base.current.round;
    return Boolean(round?.phase === "hitPending" && this.#state.current?.choice === "chaos"
      && canUsePactBookPrivilege(this.#state, round.roundNumber));
  }
  get canUsePenhor(): boolean {
    const round = this.#base.current.round;
    return Boolean(round?.phase === "compose" && this.#state.current?.choice === "bond" && round.roundNumber < this.#state.current.endRound
      && canUsePactBookPrivilege(this.#state, round.roundNumber) && round.cofre);
  }
  get canUseArremate(): boolean {
    const round = this.#base.current.round;
    return Boolean(!this.#arremateOptions && round?.phase === "compose" && this.#state.current?.choice === "finale"
      && canUsePactBookPrivilege(this.#state, round.roundNumber));
  }
  get arremateOptions(): readonly [Card, Card] | null { return this.#arremateOptions; }
  get canUseOrder(): boolean {
    const round = this.#base.current.round;
    return Boolean(round?.phase === "player" && round.currentHand && this.#state.current?.choice === "order"
      && canUsePactBookPrivilege(this.#state, round.roundNumber));
  }
  get orderPreview(): Readonly<{ hand: HandName; card: Card }> | null { return this.#orderPreview; }
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
    if (this.#sealedCofre && this.#sealedCofre.targetRound !== round) throw new Error("O Cofre Selado só pode ser usado na rodada imediatamente seguinte do mesmo Ato.");
    const override = this.#sealedCofre?.targetRound === round ? this.#sealedCofre.card : undefined;
    const view = this.#base.startRound(prepared, stake, override);
    if (override) this.#sealedCofre = null;
    if (view.status === "complete") this.#state = expirePactBook(this.#state, "complete");
    return this.current;
  }
  compose(partition: Partition) {
    if (this.#arremateOptions) throw new Error("Escolha uma das duas cartas do Cofre antes de compor.");
    return this.#after(this.#base.compose(partition));
  }
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
  impetusDouble() {
    const round = this.#base.current.round;
    if (!round || !this.canUseImpetusDouble) throw new Error("Privilégio de Ímpeto indisponível; exige exatamente uma Compra normal.");
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.impetusDouble(); this.#state = next; return this.#after(result);
  }
  act(action: Action) {
    const round = this.#base.current.round;
    const handName = round?.currentHand;
    const hand = handName && round?.hands?.[handName];
    if (!round || !handName || !hand) throw new Error("Não há mão ativa para a ação.");
    assertPactBookActionAllowed(this.#state, round.roundNumber, handName, action, hand.cards);
    if (this.#orderPreview && action === "double") throw new Error("Após a prévia da Ordem, escolha somente Comprar ou Parar.");
    if (action === "hit" && this.#orderPreview) {
      if (this.#orderPreview.hand !== handName) throw new Error("A prévia da Ordem pertence a outra Face.");
      const nextCard = this.#base.peekNextForCurrentHand();
      if (JSON.stringify(nextCard) !== JSON.stringify(this.#orderPreview.card)) {
        throw new Error("A lane da Face divergiu da carta exata prévia da Ordem.");
      }
      const result = this.#base.act(action);
      this.#orderPreview = null;
      return this.#after(result);
    }
    const pact = this.#state.current?.choice;
    const available = round.phase === "player" && action === "hit" && canUsePactBookPrivilege(this.#state, round.roundNumber);
    if (available && (pact === "bastion" || pact === "reflection" || pact === "chaos")) {
      const other: HandName = handName === "luz" ? "sombra" : "luz";
      const receiver = pact === "reflection" && round.hands[other].status === "playing" ? other : null;
      if (pact !== "reflection" || receiver) {
        const pending = this.#base.beginPactHit();
        if (pact === "bastion" && !this.canUseBastion) return this.#after(this.#base.resolvePactHit("normal"));
        return this.#after(pending);
      }
    }
    const result = this.#base.act(action);
    // Order grants one preview for the *current* Face/decision only. If the
    // player Stands, discard it before the next Face or round starts.
    if (action === "stand" && this.#orderPreview) this.#orderPreview = null;
    return this.#after(result);
  }
  resolvePendingHit(choice: "normal" | "bastion" | "reflection" | "chaos"): PublicCofreFocoNight {
    const round = this.#base.current.round;
    if (!round || round.phase !== "hitPending" || !round.pendingHitHand) throw new Error("Não há Compra pendente.");
    if (choice === "bastion" && !this.canUseBastion) throw new Error("Privilégio do Bastião indisponível para esta Compra.");
    if (choice === "reflection" && !this.canUseReflection) throw new Error("Privilégio do Reflexo indisponível sem outra Face ativa.");
    if (choice === "chaos" && !this.canUseChaos) throw new Error("Privilégio do Caos indisponível.");
    const receiver = choice === "reflection" ? this.reflectionTarget ?? undefined : undefined;
    const next = choice === "normal" ? this.#state : consumePactBookPrivilege(this.#state, round.roundNumber);
    const result = this.#base.resolvePactHit(choice, receiver);
    this.#state = next;
    return this.#after(result);
  }
  sealCofre(): PublicCofreFocoNight {
    if (!this.canUsePenhor) throw new Error("Privilégio do Penhor indisponível nesta rodada.");
    const round = this.#base.current.round!;
    const card = round.cofre;
    if (!card) throw new Error("Não há Cofre conhecido para Selar.");
    const next = markPactBookCofreSealed(this.#state, round.roundNumber, round.roundNumber + 1);
    this.#sealedCofre = { card: structuredClone(card), targetRound: round.roundNumber + 1 };
    this.#state = next;
    return this.#base.current;
  }
  activateArremate(): readonly [Card, Card] {
    if (!this.canUseArremate) throw new Error("Privilégio do Arremate indisponível nesta rodada.");
    const round = this.#base.current.round!;
    if (!round.cofre) throw new Error("Não há Cofre para oferecer.");
    const alternate = this.#base.drawAlternateCofreCandidate();
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    this.#arremateOptions = [structuredClone(round.cofre), structuredClone(alternate)];
    this.#state = next;
    return this.#arremateOptions;
  }
  chooseArremate(index: 0 | 1): PublicCofreFocoNight {
    if (!this.#arremateOptions || (index !== 0 && index !== 1)) throw new Error("Escolha de Cofre do Arremate indisponível.");
    const selected = this.#arremateOptions[index];
    const result = this.#base.chooseCofre(selected);
    this.#arremateOptions = null;
    return this.#after(result);
  }
  revealOrderPreview(): Readonly<{ hand: HandName; card: Card }> {
    if (!this.canUseOrder) throw new Error("Privilégio da Ordem indisponível antes de uma decisão de Face.");
    const round = this.#base.current.round!;
    const hand = round.currentHand!;
    const card = this.#base.peekNextForCurrentHand();
    const next = consumePactBookPrivilege(this.#state, round.roundNumber);
    this.#state = next;
    this.#orderPreview = { hand, card: structuredClone(card) };
    return this.orderPreview!;
  }
  resolveDealer() { return this.#after(this.#base.resolveDealer()); }
  abandonBeforeDeal(): void { this.#base.abandonBeforeDeal(); this.#state = expirePactBook(this.#state, "abandoned"); this.#sealedCofre = null; this.#arremateOptions = null; this.#orderPreview = null; }
  abandonNight() { const result = this.#base.abandonNight(); this.#state = expirePactBook(this.#state, "abandoned"); this.#sealedCofre = null; this.#arremateOptions = null; this.#orderPreview = null; return result; }

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
    if (pactBookRestrictions(this.#state, round)?.forbidRead) return true;
    if (current.choice === "lighthouse") return true;
    if (current.choice !== "vigil" && current.choice !== "flare") return false;
    const early = round <= (current.endRound === 7 ? 5 : 8);
    return current.choice === "vigil" ? early : !early;
  }
  #maneuverForbidden(): boolean {
    const current = this.#state.current; const round = this.#base.isBetting ? this.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0;
    if (!current || current.status !== "active") return false;
    if (pactBookRestrictions(this.#state, round)?.forbidManeuver) return true;
    if (current.choice === "impetus") return true;
    if (current.choice !== "vigil" && current.choice !== "flare") return false;
    const early = round <= (current.endRound === 7 ? 5 : 8);
    return current.choice === "vigil" ? early : !early;
  }
}
