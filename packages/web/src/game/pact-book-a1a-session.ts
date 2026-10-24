import { handValue, type Action, type Card, type HandName, type Partition } from "@nocte/engine";
import type { CofreFocoActionRestrictions, CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import {
  assertPactBookActionAllowed, assertPactBookManeuverAllowed, activatePactBookAudacity, canUsePactBookPrivilege, consumePactBookPrivilege, createPactBook,
  enterPactBookRound, expirePactBook, markPactBookCofreSealed, offerPactBook, pactActRoundsRemaining, pactBookRestrictions,
  PACT_BOOK_FAMILIES, refusePactBook, signPactBook, type PactActState, type PactBookState, type PactFamily, type PactId,
} from "@nocte/engine/pact-book";
import type { PreparedCofreFocoRound } from "./random";
import { BankrollA1aSessionAdapter, type A1aRoundTerms, type PublicBankrollA1a } from "./bankroll-a1a-session";

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
  protectedFace: HandName | null;
  commitmentHand: HandName | null;
  informationCategory: string | null;
}>;

function category(card: Card): string {
  return card.rank === "A" ? "Ás" : Number(card.rank) >= 2 && Number(card.rank) <= 6 ? "Baixa (2–6)" : "Alta (7–K)";
}
function familiesWithoutFortune(): readonly PactFamily[] { return PACT_BOOK_FAMILIES.filter(family => family !== "fortune"); }

/** Isolated PACT-BOOK-0.1 browser laboratory. PACT-LAB-0.1 remains unchanged. */
export class PactBookA1aSessionAdapter {
  #rules: CofreFocoRules;
  #state: PactBookState = createPactBook();
  #base: BankrollA1aSessionAdapter;
  #seed: string | null = null;
  #sealedCofre: Readonly<{ card: Card; targetRound: number }> | null = null;
  #arremateOptions: readonly [Card, Card] | null = null;
  #orderPreview: Readonly<{ hand: HandName; card: Card }> | null = null;
  #audacityIntent = false;
  #lastroProtectionIntent: HandName | null = null;
  #protectedFaceThisRound: HandName | null = null;
  #balancaProposal: Partition | null = null;
  #balancaRecomposePending = false;
  #secondChancePending: HandName | null = null;
  #juramentoPreview: Readonly<{ hand: HandName; card: Card }> | null = null;
  #juramentoCommitmentHand: HandName | null = null;
  #juramentoCommittedCard: Card | null = null;

  private constructor(rules: CofreFocoRules) {
    this.#rules = rules;
    this.#base = BankrollA1aSessionAdapter.start(rules,
      round => {
        const restrictions = pactBookRestrictions(this.#state, round);
        return (this.#audacityIntent ? { ...restrictions, forbidDouble: true } : restrictions) as CofreFocoActionRestrictions | undefined;
      },
      { terms: (balanceTicks, round) => this.#roundTerms(balanceTicks, round),
        refundTicks: (view, stake, round) => this.#lastroRefund(view, stake, round),
        practiceEligibility: (balanceTicks, round, normal) => this.#audacityAvailable(round)
          ? Math.max(normal, Math.floor(balanceTicks / 4)) : normal });
  }
  static start(rules: CofreFocoRules): PactBookA1aSessionAdapter { return new PactBookA1aSessionAdapter(rules); }
  get version() { return this.#state.version; }
  get state(): PactBookState { return this.#state; }
  get contract(): PactBookPublicContract {
    const pact = this.#state.current;
    return Object.freeze({ status: pact?.status ?? "unoffered", pact: pact?.choice && pact.choice !== "refused" ? pact.choice : null,
      affectedFace: pact?.affectedFace ?? null, ironFace: pact?.affectedFace ?? null, privilege: pact?.privilege ?? "none", family: pact?.family ?? null,
      actStartRound: pact?.startRound ?? 0, actEndRound: pact?.endRound ?? 0,
      sealedRound: pact?.sealedRound ?? null, blockedManeuverRound: pact?.blockedManeuverRound ?? null,
      protectedFace: this.#protectedFaceThisRound ?? this.#lastroProtectionIntent,
      commitmentHand: this.#juramentoCommitmentHand,
      informationCategory: this.juramentoCategory });
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
      ...(this.#maneuverForbidden() ? { maneuverTargets: [] } : { maneuverTargets: options.maneuverTargets.filter(target => !this.#forbiddenManeuverHand(target.hand)) }) };
  }
  get focusOptionsWithPactPrivilege() {
    const options = this.#base.focusOptionsWithPactPrivilege;
    return { ...options, ...(this.#maneuverForbidden() ? { maneuverTargets: [] } : { maneuverTargets: options.maneuverTargets.filter(target => !this.#forbiddenManeuverHand(target.hand)) }) };
  }
  get legalActions(): readonly Action[] {
    if (this.#secondChancePending || this.#juramentoPreview) return [];
    const actions = this.#base.legalActions;
    return this.#juramentoCommitmentHand ? actions.filter(action => action === "hit") : actions;
  }
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
      && round.phase === "focusWindow" && !round.maneuverDecisionMade && this.focusOptionsWithPactPrivilege.maneuverTargets.length > 0);
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
  get canUseCisao(): boolean { return Boolean(this.#base.current.round?.phase === "compose" && this.#state.current?.choice === "cisao" && canUsePactBookPrivilege(this.#state, this.#base.current.round.roundNumber)); }
  get canUseBalanca(): boolean { return Boolean(this.#base.current.round?.phase === "compose" && this.#state.current?.choice === "balanca" && !this.#balancaRecomposePending && canUsePactBookPrivilege(this.#state, this.#base.current.round.roundNumber)); }
  get balancaProposalMade(): boolean { return this.#balancaProposal !== null; }
  get balancaRecomposePending(): boolean { return this.#balancaRecomposePending; }
  get canUseLastro(): boolean { return Boolean(this.#base.isBetting && this.bankroll.status === "active" && this.#state.current?.choice === "lastro" && canUsePactBookPrivilege(this.#state, this.bankroll.completedRounds + 1)); }
  get canUseAudacity(): boolean { return Boolean(this.#base.isBetting && this.bankroll.status === "active" && this.#state.current?.choice === "audacity" && canUsePactBookPrivilege(this.#state, this.bankroll.completedRounds + 1)); }
  get audacityIntent(): boolean { return this.#audacityIntent; }
  get canUseSecondChance(): boolean { return Boolean(this.#secondChancePending && this.#state.current?.choice === "secondChance" && canUsePactBookPrivilege(this.#state, this.#base.current.round?.roundNumber ?? 0)); }
  get secondChancePending(): HandName | null { return this.#secondChancePending; }
  get canUseJuramento(): boolean { const r = this.#base.current.round; return Boolean(r?.phase === "player" && r.currentHand && this.#base.legalActions.includes("hit") && this.#state.current?.choice === "oath" && !this.#juramentoPreview && !this.#juramentoCommitmentHand && canUsePactBookPrivilege(this.#state, r.roundNumber)); }
  get juramentoPreview(): Readonly<{ hand: HandName; category: string }> | null { return this.#juramentoPreview ? { hand: this.#juramentoPreview.hand, category: category(this.#juramentoPreview.card) } : null; }
  get juramentoCategory(): string | null { return this.juramentoPreview?.category ?? null; }
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
  get balancaCategory(): string | null { return this.#state.current?.choice === "balanca" && this.#balancaRecomposePending ? this.farolCategory : null; }

  enterBetting(): void {
    this.#base.enterBetting();
    const next = this.#base.bankroll.completedRounds + 1;
    this.#state = enterPactBookRound(this.#state, next);
    if ((next === 4 || next === 8) && this.#seed) {
      const eligible = this.#base.bankroll.status === "practice" || this.#base.bankroll.maxStake < 1
        ? familiesWithoutFortune() : undefined;
      this.#state = offerPactBook(this.#state, next, this.#seed, eligible);
    }
  }
  sign(pact: PactId, face?: HandName): void { this.#state = signPactBook(this.#state, pact, face); }
  refuse(): void { this.#state = refusePactBook(this.#state); }
  startRound(prepared: PreparedCofreFocoRound, stake: number): PublicCofreFocoNight {
    if (this.isPactOfferPending) throw new Error("Resolva a oferta antes de confirmar a aposta.");
    if (this.#seed && this.#seed !== prepared.seed) throw new Error("A semente da Noite não pode ser trocada entre rodadas.");
    const round = this.#base.bankroll.completedRounds + 1;
    const nextPactState = enterPactBookRound(this.#state, round);
    if (this.#sealedCofre && this.#sealedCofre.targetRound !== round) throw new Error("O Cofre Selado só pode ser usado na rodada imediatamente seguinte do mesmo Ato.");
    const override = this.#sealedCofre?.targetRound === round ? this.#sealedCofre.card : undefined;
    const selectedProtection = this.#lastroProtectionIntent;
    const useAudacity = this.#audacityIntent;
    const view = this.#base.startRound(prepared, stake, override);
    this.#seed = prepared.seed;
    this.#state = nextPactState;
    this.#balancaProposal = null;
    this.#balancaRecomposePending = false;
    this.#secondChancePending = null;
    this.#juramentoPreview = null;
    this.#juramentoCommitmentHand = null;
    this.#juramentoCommittedCard = null;
    this.#orderPreview = null;
    this.#protectedFaceThisRound = null;
    if (override) this.#sealedCofre = null;
    const pactRound = round;
    if (selectedProtection) {
      this.#state = consumePactBookPrivilege(this.#state, pactRound);
      this.#protectedFaceThisRound = selectedProtection;
    }
    if (useAudacity) this.#state = activatePactBookAudacity(this.#state, pactRound);
    this.#lastroProtectionIntent = null;
    this.#audacityIntent = false;
    if (view.status === "complete") this.#state = expirePactBook(this.#state, "complete");
    return this.current;
  }
  compose(partition: Partition) {
    if (this.#arremateOptions) throw new Error("Escolha uma das duas cartas do Cofre antes de compor.");
    if (this.#balancaRecomposePending) {
      const result = this.#base.compose(partition, true);
      this.#balancaProposal = null; this.#balancaRecomposePending = false;
      return this.#after(result);
    }
    const result = this.#base.compose(partition);
    this.#balancaProposal = null;
    return this.#after(result);
  }
  composeCisao(threeCardHand: HandName, singleCardIndex = 3) {
    if (!this.canUseCisao) throw new Error("Privilégio da Cisão indisponível nesta composição.");
    const round = this.#base.current.round!.roundNumber;
    const result = this.#base.composeCisao(threeCardHand, singleCardIndex);
    this.#state = consumePactBookPrivilege(this.#state, round);
    return this.#after(result);
  }
  proposeBalanca(partition: Partition): void {
    if (this.#base.current.round?.phase !== "compose" || this.#state.current?.choice !== "balanca" || this.#balancaRecomposePending) throw new Error("Proposta inicial da Balança indisponível.");
    const indices = [...partition.luz, ...partition.sombra];
    if (indices.length !== 4 || new Set(indices).size !== 4 || indices.some(i => !Number.isInteger(i) || i < 0 || i > 3)) throw new Error("Proposta inválida: use cada carta inicial uma vez.");
    this.#balancaProposal = structuredClone(partition);
  }
  revealBalancaCategory(): string {
    if (!this.canUseBalanca || !this.#balancaProposal) throw new Error("Balança exige uma proposta inicial e uma oportunidade disponível.");
    const round = this.#base.current.round!.roundNumber;
    const revealed = this.#base.revealFarolCategory();
    const value = revealed.round?.dealerHoleCategory;
    if (!value) throw new Error("Categoria parcial da Balança indisponível.");
    const next = consumePactBookPrivilege(this.#state, round);
    this.#state = next; this.#balancaRecomposePending = true;
    return value === "ace" ? "Ás" : value === "low" ? "Baixa (2–6)" : "Alta (7–K)";
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
    const round = this.#base.current.round?.roundNumber;
    if (round) assertPactBookManeuverAllowed(this.#state, round, hand);
    return this.#after(this.#base.maneuverDirect(hand, cardIndex));
  }
  maneuverPrivilege(hand: HandName, cardIndex: number) {
    const round = this.#base.current.round; const pact = this.#state.current?.choice;
    if (!round || !this.canUseManeuverPrivilege) throw new Error("Privilégio de Manobra indisponível nesta janela.");
    assertPactBookManeuverAllowed(this.#state, round.roundNumber, hand);
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
    if (this.#secondChancePending) throw new Error("Resolva a decisão pendente da Segunda Chance antes de outra ação.");
    if (this.#juramentoCommitmentHand && (action !== "hit" || handName !== this.#juramentoCommitmentHand)) throw new Error("O Juramento exige a Compra comprometida antes de qualquer outra ação.");
    if (this.#juramentoCommitmentHand && action === "hit") {
      const nextCard = this.#base.peekNextForCurrentHand();
      if (!this.#juramentoCommittedCard || JSON.stringify(nextCard) !== JSON.stringify(this.#juramentoCommittedCard)) throw new Error("A lane divergiu da carta autorizada pelo Juramento.");
    }
    if (this.#juramentoPreview) throw new Error("Aceite ou decline a Compra após a informação do Juramento.");
    assertPactBookActionAllowed(this.#state, round.roundNumber, handName, action, hand.cards);
    if (action === "stand" && this.#state.current?.choice === "secondChance" && canUsePactBookPrivilege(this.#state, round.roundNumber)) {
      this.#secondChancePending = handName;
      return this.current;
    }
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
    let result = this.#base.act(action);
    if (this.#juramentoCommitmentHand && action === "hit") {
      const committedHand = this.#juramentoCommitmentHand;
      this.#juramentoCommitmentHand = null;
      this.#juramentoCommittedCard = null;
      if (result.round?.currentHand === committedHand && result.round.phase === "player") result = this.#base.act("stand");
    }
    // Order grants one preview for the *current* Face/decision only. If the
    // player Stands, discard it before the next Face or round starts.
    if (action === "stand" && this.#orderPreview) this.#orderPreview = null;
    return this.#after(result);
  }
  resolveSecondChance(accept: boolean): PublicCofreFocoNight {
    const hand = this.#secondChancePending; const round = this.#base.current.round;
    if (!hand || !round || round.phase !== "player" || round.currentHand !== hand || !this.canUseSecondChance) throw new Error("Decisão da Segunda Chance não está disponível.");
    if (!accept) { this.#secondChancePending = null; return this.#after(this.#base.act("stand")); }
    const nextState = consumePactBookPrivilege(this.#state, round.roundNumber);
    const hit = this.#base.act("hit");
    this.#secondChancePending = null;
    this.#state = nextState;
    if (hit.round?.phase === "player" && hit.round.currentHand === hand && hit.round.hands?.[hand].status === "playing") return this.#after(this.#base.act("stand"));
    return this.#after(hit);
  }
  revealJuramento(): Readonly<{ hand: HandName; category: string }> {
    if (!this.canUseJuramento) throw new Error("Privilégio do Juramento indisponível para esta Face.");
    const round = this.#base.current.round!; const hand = round.currentHand!;
    const card = this.#base.peekNextForCurrentHand();
    this.#state = consumePactBookPrivilege(this.#state, round.roundNumber);
    this.#juramentoPreview = { hand, card: structuredClone(card) };
    return this.juramentoPreview!;
  }
  resolveJuramento(accept: boolean): PublicCofreFocoNight {
    const preview = this.#juramentoPreview;
    if (!preview) throw new Error("Não há informação do Juramento para resolver.");
    const hand = preview.hand;
    this.#juramentoPreview = null;
    if (accept) { this.#juramentoCommitmentHand = hand; this.#juramentoCommittedCard = structuredClone(preview.card); }
    return this.current;
  }
  setLastroProtectionFace(face: HandName | null): void {
    if (face !== null && !this.canUseLastro) throw new Error("Privilégio do Lastro indisponível antes da aposta.");
    if (face !== null && face !== "luz" && face !== "sombra") throw new Error("Face protegida inválida.");
    this.#lastroProtectionIntent = face;
  }
  setAudacityIntent(enabled: boolean): void {
    if (enabled && !this.canUseAudacity) throw new Error("Privilégio da Audácia indisponível antes da aposta.");
    this.#audacityIntent = enabled;
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
  #roundTerms(balanceTicks: number, round: number): A1aRoundTerms {
    const current = this.#state.current;
    const active = current?.status === "active" && round >= current.startRound && round <= current.endRound;
    const audacity = active && current.choice === "audacity" && this.#audacityIntent;
    const lastro = active && current.choice === "lastro";
    return { coveragePerStake: audacity ? 2 : 4,
      ...(lastro ? { stakeCap: Math.max(1, Math.floor((balanceTicks / 2) / 8)) } : {}) };
  }
  #audacityAvailable(round: number): boolean {
    const current = this.#state.current;
    return Boolean(current?.status === "active" && current.choice === "audacity" && current.privilege === "available"
      && round >= current.startRound && round <= current.endRound);
  }
  #forbiddenManeuverHand(hand: HandName): boolean {
    const round = this.#base.isBetting ? this.bankroll.completedRounds + 1 : this.#base.current.round?.roundNumber ?? 0;
    return pactBookRestrictions(this.#state, round)?.forbiddenManeuverHand === hand;
  }
  #lastroRefund(view: PublicCofreFocoNight, stake: number, roundNumber: number): number {
    const face = this.#protectedFaceThisRound ?? this.#lastroProtectionIntent;
    if (!face || this.#state.current?.choice !== "lastro" || this.#state.current.status !== "active"
      || roundNumber < this.#state.current.startRound || roundNumber > this.#state.current.endRound) return 0;
    const handResult = view.round?.settlement?.[face];
    if (handResult?.outcome !== "loss") return 0;
    const ticks = stake * Math.abs(handResult.score) / 10;
    if (!Number.isSafeInteger(ticks)) throw new Error("Restituição do Lastro não cabe em ticks exatos de meia ficha.");
    return ticks;
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
