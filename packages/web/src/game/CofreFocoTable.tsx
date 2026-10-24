import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handValue, partitions, type Action, type Card, type HandName, type Partition } from "@nocte/engine";
import type { CofreFocoRules, PublicCofreFocoNight, PublicCofreFocoRound } from "@nocte/engine/cofre-foco";
import type { CofreFocoSessionAdapter } from "./cofre-foco-session";
import type { PublicBankrollA0 } from "./bankroll-a0-session";
import type { PublicBankrollA1a } from "./bankroll-a1a-session";
import { A1A_INITIAL_TICKS, formatHalfChips } from "./bankroll-a1a";
import { PlayingCard } from "./PlayingCard";
import type { PactPublicNight } from "./pact-a1a-session";
import type { PactBookPublicContract } from "./pact-book-a1a-session";

// Pact projections physically omit dealerUp at runtime during composition.
export type VisibleTableNight = Omit<PublicCofreFocoNight, "round"> & { round?: Omit<PublicCofreFocoRound, "dealerUp"> & { dealerUp?: Card } };
type CofreSession = {
  current: VisibleTableNight;
  focusOptions: CofreFocoSessionAdapter["focusOptions"];
  focusOptionsWithPactPrivilege: CofreFocoSessionAdapter["focusOptionsWithPactPrivilege"];
  legalActions: readonly Action[];
  compose: (partition: Partition) => VisibleTableNight;
  skipRead: () => VisibleTableNight;
  readDealerHole: () => VisibleTableNight;
  skipManeuver: () => VisibleTableNight;
  maneuverDirect: (hand: HandName, cardIndex: number) => VisibleTableNight;
  continueAfterAbilities: () => VisibleTableNight;
  act: (action: Action) => VisibleTableNight;
  resolveDealer: () => VisibleTableNight;
  abandonNight: () => VisibleTableNight;
};
type PactActions = Readonly<{
  contract: PactBookPublicContract | Readonly<{ status: string; pact: "veil" | "iron" | null; ironFace: HandName | null; privilege: string }>;
  roundsRemaining: number;
  canUseReadPrivilege: boolean;
  canUseManeuverPrivilege: boolean;
  readPrivilege: () => PactPublicNight;
  maneuverPrivilege: (hand: HandName, cardIndex: number) => PactPublicNight;
  canUseFarol?: boolean;
  farolCategory?: string | null;
  revealFarol?: () => PublicCofreFocoNight;
  canUseImpetusDouble?: boolean;
  impetusDouble?: () => PublicCofreFocoNight;
  focusAbilityRenunciation?: string | null;
  renunciationText?: string;
  privilegeText?: string;
  pactName?: string;
}>;

type Props = {
  session: CofreSession;
  night: VisibleTableNight;
  rules: CofreFocoRules;
  bankroll?: PublicBankrollA0 | PublicBankrollA1a;
  error?: string | null;
  onNightChange: (night: PublicCofreFocoNight) => void;
  onNextRound: () => void;
  onReturnToSetup: () => void;
  cardIdentityMode?: boolean;
  pact?: PactActions;
};

const actionLabels: Record<Action, string> = { hit: "Comprar", stand: "Parar", double: "Dobrar" };
const outcomes = { win: "Vitória", loss: "Derrota", push: "Empate" } as const;
const statuses = { playing: "em jogo", stood: "parou", busted: "estourou", doubled: "dobrou" } as const;
const scoreText = (score: number) => score < 0 ? `−${Math.abs(score)}` : `${score}`;
const faceLabel = (card: Card) => card.art?.faceRank ?? card.rank;

function Cards({ cards, label }: { cards: readonly Card[]; label: string }) {
  return <div className="card-row" role="list" aria-label={label}>
    {cards.map((card, index) => card.art
      ? <div role="listitem" key={`${card.rank}-${card.art.faceRank}-${card.art.suit}-${index}`}><PlayingCard card={card} /></div>
      : <span className="playing-card" role="listitem" key={`${card.rank}-${index}`} aria-label={`Carta ${card.rank}`}>{card.rank}</span>)}
  </div>;
}

function ClosedCard({ label = "Carta do dealer fechada" }: { label?: string }) {
  return <span className="playing-card card-closed" role="img" aria-label={label}>?</span>;
}

function phaseLabel(night: VisibleTableNight): string {
  const round = night.round;
  if (!round) return "A Noite ainda não tem rodada ativa.";
  if (round.phase === "compose") return "Componha Luz e Sombra.";
  if (round.phase === "focusWindow") return "Janela de Foco: escolha uma habilidade ou conserve.";
  if (round.phase === "player") return `Vez de ${round.currentHand === "luz" ? "Luz" : "Sombra"}.`;
  if (round.phase === "dealer") return "Ações encerradas. Resolva o dealer.";
  return "Rodada concluída.";
}

export function CofreFocoTable({ session, night, rules, bankroll, error, onNightChange, onNextRound, onReturnToSetup, cardIdentityMode = false, pact }: Props) {
  const round = night.round;
  const [selectedPartition, setSelectedPartition] = useState(0);
  const [selectedSwap, setSelectedSwap] = useState<Readonly<{ hand: HandName; cardIndex: number }> | null>(null);
  const [maneuverChooserOpen, setManeuverChooserOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"read" | "read-privilege" | "maneuver" | "maneuver-privilege" | null>(null);
  const [maneuverPayment, setManeuverPayment] = useState<"focus" | "privilege">("focus");
  const [showInfo, setShowInfo] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = useRef(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const infoCloseButton = useRef<HTMLButtonElement>(null);
  const infoTrigger = useRef<HTMLElement | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (confirmation) confirmButton.current?.focus();
    else if (showInfo) infoCloseButton.current?.focus();
    else if (returnFocus.current?.isConnected) returnFocus.current.focus();
  }, [confirmation, showInfo]);

  useEffect(() => {
    if (!confirmation && !showInfo) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (confirmation) setConfirmation(null);
      else setShowInfo(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmation, showInfo]);

  const trapDialogFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled), input:not(:disabled), [href], [tabindex]:not([tabindex='-1'])"));
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  };

  const update = (operation: () => VisibleTableNight): boolean => {
    if (busy.current) return false;
    busy.current = true;
    let succeeded = false;
    try {
      setLocalError(null);
      const next = operation();
      onNightChange(next as PublicCofreFocoNight);
      if (next.round?.roundNumber !== round?.roundNumber) setSelectedPartition(0);
      succeeded = true;
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Ação indisponível. Confira o estado da rodada.");
    } finally { busy.current = false; }
    return succeeded;
  };

  const requestConfirmation = (kind: "read" | "read-privilege" | "maneuver" | "maneuver-privilege", trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setConfirmation(kind);
  };
  const confirmRead = () => { if (update(() => session.readDealerHole())) setConfirmation(null); };
  const confirmReadPrivilege = () => { if (pact && update(() => pact.readPrivilege())) setConfirmation(null); };
  const confirmManeuver = () => { if (update(() => {
    if (!selectedSwap) throw new Error("Selecione uma carta elegível para Manobra.");
    if (maneuverPayment === "privilege") {
      if (!pact) throw new Error("Privilégio de Manobra indisponível.");
      return pact.maneuverPrivilege(selectedSwap.hand, selectedSwap.cardIndex);
    }
    return session.maneuverDirect(selectedSwap.hand, selectedSwap.cardIndex);
  })) { setConfirmation(null); setManeuverChooserOpen(false); setSelectedSwap(null); } };
  const continueWithoutMoreAbilities = () => update(() => {
    let next = session.current;
    if (next.round && !next.round.readDecisionMade) next = session.skipRead();
    if (next.round && !next.round.maneuverDecisionMade) next = session.skipManeuver();
    return session.continueAfterAbilities();
  });
  const abandon = () => {
    const bankAmount = bankroll && "version" in bankroll ? bankroll.balance : bankroll?.bankroll;
    const prompt = bankroll
      ? `Encerrar esta Noite? O saldo remanescente de ${bankAmount} fichas fictícias e a reserva expirarão. Não há reembolso nem persistência.`
      : "Encerrar esta Noite? O Foco restante expirará.";
    if (window.confirm(prompt)) update(() => session.abandonNight());
  };
  const openInfo = (trigger: HTMLElement) => { infoTrigger.current = trigger; setShowInfo(true); };
  const closeInfo = () => { setShowInfo(false); window.setTimeout(() => infoTrigger.current?.focus(), 0); };

  const partitionsForRound = round?.phase === "compose" ? partitions(round.originalCards) : [];
  const focusOptions = session.focusOptions;
  const handNames: readonly HandName[] = ["luz", "sombra"];
  const dealerCards = round?.phase === "complete" && round.dealerUp && round.dealerHole
    ? [round.dealerUp, round.dealerHole, ...(round.dealerDraws ?? [])]
    : [round?.dealerUp, ...(round?.dealerHole ? [round.dealerHole] : [])].filter((card): card is Card => Boolean(card));
  const dealerValue = dealerCards.length > 1 ? handValue(dealerCards) : null;

  if (!round) return <section className="game-table viewport-table"><p role="alert">A Noite não possui uma rodada visível.</p></section>;

  return (
    <section className={`game-table viewport-table cofre-foco-table${cardIdentityMode ? " card-lab-table" : ""}`} aria-labelledby="cofre-table-title" data-game-phase={round.phase}>
      <header className="table-heading">
        <div className="table-title-block">
          <p className="eyebrow">NOITE · RODADA {round.roundNumber} DE {night.horizon}</p>
          <h2 id="cofre-table-title">Duas Faces · Cofre + Foco</h2>
          <p className="table-profile">{cardIdentityMode ? "Laboratório P5 de cartas · " : ""}{night.rulesId} · EXPERIMENTAL · natural {rules.naturalPayout}</p>
          {pact && <p className="pact-status-strip" role="status">
            {pact.contract.status === "refused" ? "Pactos recusados · regras A1a normais"
              : pact.contract.pact ? <>Pacto {pact.pactName ?? (pact.contract.pact === "veil" ? "Véu" : pact.contract.pact === "iron" ? "Ferro" : pact.contract.pact)} · {pact.contract.status === "expired" ? "expirado" : `${"actStartRound" in pact.contract && pact.contract.actStartRound === 8 ? "Ato III" : "Ato II"} · ${pact.roundsRemaining} rodada${pact.roundsRemaining === 1 ? "" : "s"} restante${pact.roundsRemaining === 1 ? "" : "s"}`}
                  <span>Renúncia: {pact.renunciationText ?? (pact.contract.pact === "veil" ? "upcard oculta na composição" : `sem Dobrar ${pact.contract.ironFace === "luz" ? "Luz" : "Sombra"}`)}</span>
                  <span>Privilégio: {pact.privilegeText ?? (pact.contract.pact === "veil" ? "Leitura" : "Manobra")} · {pact.contract.privilege === "available" ? "Disponível" : pact.contract.privilege === "consumed" ? "Consumido" : pact.contract.privilege === "expired" ? "Expirado" : "—"}</span>
                  {pact.focusAbilityRenunciation && <span>{pact.focusAbilityRenunciation}</span>}
                </> : null}
          </p>}
        </div>
        <div className="table-hud">
          {bankroll && "version" in bankroll
            ? <div className="hud-stat" aria-label="Lucro da Noite"><span>Lucro da Noite</span><strong aria-live="polite">{formatHalfChips(bankroll.balanceTicks - A1A_INITIAL_TICKS)} fichas</strong></div>
            : <div className="hud-stat" aria-label="Placar da Noite"><span>Pontos</span><strong aria-live="polite">{scoreText(night.totalScore)}</strong></div>}
          <div className="hud-stat" aria-label="Foco restante"><span>Foco</span><strong aria-live="polite">{night.focusRemaining} de {rules.focusPerNight} restantes</strong></div>
          {bankroll && <div className="hud-stat bank-stat" role="region" aria-label={`Banca fictícia ${"version" in bankroll ? "A1a" : "A0.1"}`}>
            <span>Banca · {bankroll.status === "practice" || ("pendingKind" in bankroll && bankroll.pendingKind === "practice") ? "prática" : "financiada"}</span>
            <strong aria-live="polite">{"version" in bankroll ? bankroll.balance : bankroll.bankroll} fichas</strong>
            {"version" in bankroll && bankroll.currentStake !== null && <small>{bankroll.currentStake} por mão · reserva {bankroll.coverage} · livre {bankroll.available}</small>}
            {"pendingKind" in bankroll && bankroll.pendingKind === "funded" && <small>10+10 · reserva {bankroll.escrow} · disponível {bankroll.available}</small>}
            {bankroll.status === "practice" && <small>Saldo congelado até o fim da Noite</small>}
          </div>}
          <button type="button" className="hud-button secondary-action" onClick={(event) => openInfo(event.currentTarget)}>Guia e dados</button>
          {night.status === "active" && <button type="button" className="hud-button secondary-action" onClick={abandon}>Encerrar</button>}
        </div>
      </header>

      <div className="table-status-row">
        <p className="phase-status" role="status" aria-live="polite">{phaseLabel(night)}</p>
        {(error || localError) && <p className="recoverable-error" role="alert">{localError ?? error}</p>}
      </div>

      <section className="table-board" aria-label="Mesa de jogo">
        <section className="dealer-area table-zone" aria-labelledby="cf-dealer-title">
          <h3 id="cf-dealer-title">Dealer</h3>
          <div className="card-row" role="list" aria-label="Cartas visíveis do dealer">
            {round.dealerUp?.art
              ? <div role="listitem"><PlayingCard card={round.dealerUp} label="Carta aberta do dealer" /></div>
              : round.dealerUp
                ? <span className="playing-card" role="listitem" aria-label={`Carta ${round.dealerUp.rank}`}>{round.dealerUp.rank}</span>
              : <div role="listitem"><ClosedCard label={round.dealerUp ? "Carta fechada do dealer" : "Carta aberta do dealer oculta pelo Pacto do Véu durante composição"} /></div>}
            {round.dealerHole
              ? round.dealerHole.art
                ? <div role="listitem"><PlayingCard card={round.dealerHole} label={`Carta lida do dealer: ${faceLabel(round.dealerHole)}`} /></div>
                : <span className="playing-card" role="listitem" aria-label={`Carta lida ${round.dealerHole.rank}`}>{round.dealerHole.rank}</span>
              : round.phase !== "complete" ? <div role="listitem"><ClosedCard /></div> : null}
            {round.phase === "complete" && (round.dealerDraws ?? []).map((card, index) => card.art
              ? <div role="listitem" key={`${card.rank}-${card.art.faceRank}-${card.art.suit}-${index}`}><PlayingCard card={card} label={`Compra do dealer: ${faceLabel(card)}`} /></div>
              : <span className="playing-card" role="listitem" aria-label={`Compra do dealer ${card.rank}`} key={`${card.rank}-${index}`}>{card.rank}</span>)}
          </div>
          {round.phase === "complete" && dealerValue && <span className="dealer-note">Total {dealerValue.total} · {dealerCards.map(faceLabel).join(" + ")}</span>}
          {round.dealerHole && round.phase !== "complete" && <span role="status" className="dealer-note">Leitura privada usada. Compras futuras continuam ocultas.</span>}
          {!round.dealerHole && round.phase !== "complete" && <span className="dealer-note">{round.dealerUp ? "Carta fechada" : "Cartas do dealer ocultas durante a composição"}</span>}
          {round.naturalPeek === true && <span className="dealer-note">Natural do dealer · liquidado pelo peek.</span>}
        </section>

        {round.cofre && <section className="cofre-card cofre-card-persistent table-zone" aria-labelledby="cf-cofre-title">
          <h3 id="cf-cofre-title">Cofre</h3><Cards cards={[round.cofre]} label="Carta do Cofre" />
        </section>}

        <div className="table-play-area">
          {night.status === "active" && round.phase === "compose" && <section className="compose-area table-zone" aria-labelledby="cf-compose-title">
            <div className="compose-copy"><h3 id="cf-compose-title">Quatro cartas · componha as mãos</h3><span className="dealer-note">Escolha a divisão abaixo.</span></div>
            <Cards cards={round.originalCards} label="Quatro cartas iniciais" />
          </section>}

          {round.hands && <div className="hands-grid" aria-label="Mãos da rodada">
            {handNames.map(name => {
              const hand = round.hands![name];
              const settlement = round.settlement?.[name];
              const value = handValue(hand.cards);
              const title = name === "luz" ? "Luz" : "Sombra";
              return <section className={`hand-panel table-zone ${round.currentHand === name ? "active-hand" : ""}`} key={name} aria-labelledby={`cf-${name}-title`}>
                <h3 id={`cf-${name}-title`}>{title}{round.currentHand === name && round.phase === "player" ? " · sua vez" : ""}</h3>
                <Cards cards={hand.cards} label={`Cartas da mão ${title}`} />
                <p className="hand-meta">Total {value.total}{value.soft ? " suave" : ""}{hand.openingNatural ? " · natural" : hand.maneuverTwentyOne ? " · 21 comum por Manobra" : value.bust ? " · estourou" : ""}</p>
                <p className="hand-meta">{bankroll && "version" in bankroll
                  ? `Aposta ${bankroll.currentStake ?? 0} · exposição aberta ${((bankroll.currentStake ?? 0) * hand.exposure) / 10} fichas · ${statuses[hand.status]}`
                  : `Exposição ${hand.exposure} · ${statuses[hand.status]}`}</p>
                {settlement && <p className="hand-result hand-meta">{outcomes[settlement.outcome]} · {scoreText(settlement.score)} pontos</p>}
              </section>;
            })}
          </div>}
        </div>
      </section>

      <section className="table-action-dock" aria-label="Ações da rodada">
        {night.status === "active" && round.phase === "compose" && <>
          <h3>Composição</h3>
          {pact?.canUseFarol && <button type="button" className="secondary-action" onClick={() => update(() => pact.revealFarol!())}>Usar Privilégio do Farol · revelar categoria</button>}
          {pact?.farolCategory && <p className="ability-status" role="status">Farol · carta fechada: {pact.farolCategory} (informação desta rodada)</p>}
          <fieldset className="composition-options">
            <legend className="visually-hidden">Composições disponíveis</legend>
            {partitionsForRound.map((partition: Partition, index) => {
              const luz = partition.luz.map(cardIndex => faceLabel(round.originalCards[cardIndex]!)).join("+");
              const sombra = partition.sombra.map(cardIndex => faceLabel(round.originalCards[cardIndex]!)).join("+");
              return <label className="composition-choice" key={index}>
                <input type="radio" name="cofre-composition" value={index} checked={selectedPartition === index} onChange={() => setSelectedPartition(index)} />
                <span>Luz {luz} <span aria-hidden="true">·</span> Sombra {sombra}</span>
              </label>;
            })}
          </fieldset>
          <button type="button" onClick={() => update(() => session.compose(partitionsForRound[selectedPartition]!))}>Confirmar composição</button>
        </>}

        {night.status === "active" && round.phase === "focusWindow" && <>
          <h3>Janela de Foco · {night.focusRemaining} restante{night.focusRemaining === 1 ? "" : "s"}</h3>
          <div className="focus-dock">
            {pact?.focusAbilityRenunciation && <p className="ability-status" role="status">{pact.focusAbilityRenunciation}</p>}
            <section className="ability-panel" aria-labelledby="read-choice-title">
              <h4 id="read-choice-title">Leitura · {rules.readCost} Focos</h4>
              {round.readUsed ? <p className="ability-status" role="status">Usada nesta rodada</p>
                : !round.readDecisionMade ? <>
                  {focusOptions.canRead && <button type="button" onClick={(event) => requestConfirmation("read", event.currentTarget)}>Escolher Leitura · {rules.readCost} Focos</button>}
                  {pact?.canUseReadPrivilege && <button type="button" className="secondary-action" onClick={(event) => requestConfirmation("read-privilege", event.currentTarget)}>Usar Privilégio de Leitura · gratuito</button>}
                  {!focusOptions.canRead && !pact?.canUseReadPrivilege && <p className="ability-status" role="status">Indisponível</p>}
                </>
                  : <p className="ability-status" role="status">Decisão de Leitura encerrada</p>}
            </section>
            <section className="ability-panel" aria-labelledby="maneuver-choice-title">
              <h4 id="maneuver-choice-title">Manobra · {rules.maneuverCost} Foco</h4>
              {round.maneuverUsed || round.maneuverDecisionMade ? <p className="ability-status" role="status">Decidida nesta rodada</p>
                : <>
                    <button type="button" disabled={focusOptions.maneuverTargets.length === 0} onClick={() => { setManeuverPayment("focus"); setSelectedSwap(null); setManeuverChooserOpen(true); }}>Escolher Manobra · {rules.maneuverCost} Foco</button>
                    {pact?.canUseManeuverPrivilege && <button type="button" className="secondary-action" disabled={session.focusOptionsWithPactPrivilege.maneuverTargets.length === 0} onClick={() => { setManeuverPayment("privilege"); setSelectedSwap(null); setManeuverChooserOpen(true); }}>Usar Privilégio de Manobra · gratuito</button>}
                    {focusOptions.maneuverTargets.length === 0 && !(pact?.canUseManeuverPrivilege && session.focusOptionsWithPactPrivilege.maneuverTargets.length > 0) && <p className="ability-status" role="status">Indisponível nesta mão</p>}
                  </>}
            </section>
            <button type="button" className="secondary-action conserve-action" onClick={continueWithoutMoreAbilities}>
              {round.readDecisionMade && round.maneuverDecisionMade ? "Continuar" : "Conservar Foco"}
            </button>
            {maneuverChooserOpen && (maneuverPayment === "privilege" ? session.focusOptionsWithPactPrivilege.maneuverTargets : focusOptions.maneuverTargets).length > 0 && <div className="maneuver-picker">
              <div className="maneuver-targets" role="group" aria-label="Cartas elegíveis para Manobra">
                {(maneuverPayment === "privilege" ? session.focusOptionsWithPactPrivilege.maneuverTargets : focusOptions.maneuverTargets).map(target => {
                  const hand = round.hands![target.hand];
                  const handLabel = target.hand === "luz" ? "Luz" : "Sombra";
                  const rank = faceLabel(hand.cards[target.cardIndex]!);
                  return <button type="button" className={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex ? "target-selected" : "secondary-action"}
                    key={`${target.hand}-${target.cardIndex}`} aria-pressed={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex}
                    onClick={() => setSelectedSwap(target)}>{handLabel} · carta {target.cardIndex + 1} ({rank})</button>;
                })}
              </div>
              {selectedSwap && (maneuverPayment === "privilege" ? session.focusOptionsWithPactPrivilege.maneuverTargets : focusOptions.maneuverTargets).some(target => target.hand === selectedSwap.hand && target.cardIndex === selectedSwap.cardIndex) && <div className="swap-preview" aria-live="polite">
                <p>Troca: {selectedSwap.hand === "luz" ? "Luz" : "Sombra"} recebe {faceLabel(round.cofre!)}; Cofre recebe {faceLabel(round.hands![selectedSwap.hand].cards[selectedSwap.cardIndex]!)}.</p>
                <p>{maneuverPayment === "privilege" ? "Privilégio de Ferro · sem Foco · será consumido" : `Manobra normal · gasta ${rules.maneuverCost} Foco · preserva o Privilégio`}</p>
                <button type="button" onClick={(event) => requestConfirmation(maneuverPayment === "privilege" ? "maneuver-privilege" : "maneuver", event.currentTarget)}>Confirmar alvo</button>
              </div>}
              <button type="button" className="secondary-action" onClick={() => { setSelectedSwap(null); setManeuverChooserOpen(false); }}>Cancelar escolha</button>
            </div>}
          </div>
        </>}

        {night.status === "active" && round.phase === "player" && <div className="action-row" role="group" aria-label={`Ações para ${round.currentHand === "luz" ? "Luz" : "Sombra"}`}>
          {session.legalActions.map(action => <button type="button" key={action} onClick={() => update(() => session.act(action))}>{actionLabels[action]}</button>)}
          {pact?.canUseImpetusDouble && <button type="button" className="secondary-action" onClick={() => update(() => pact.impetusDouble!())}>Privilégio de Ímpeto · Dobrar após Compra</button>}
        </div>}
        {night.status === "active" && round.phase === "dealer" && <button type="button" onClick={() => update(() => session.resolveDealer())}>Resolver dealer</button>}

        {round.phase === "complete" && <section className="round-summary" aria-label="Resultado da rodada">
          <h3>{night.status === "complete" ? "Noite concluída" : night.status === "abandoned" ? "Noite encerrada" : "Rodada concluída"}</h3>
          <p>Pontuação desta rodada: {round.score === undefined ? "—" : scoreText(round.score)} pontos.</p>
          <p>Pontuação acumulada: {scoreText(night.totalScore)} · Foco {night.focusRemaining}.</p>
          {bankroll && <p>Variação da banca nesta rodada: {"version" in bankroll
            ? bankroll.lastSettlement ? `${formatHalfChips(bankroll.lastSettlement.deltaTicks)} fichas${bankroll.lastSettlement.kind === "practice" ? " (banca congelada em prática)" : ""}` : "aguardando settlement"
            : bankroll.lastBankDelta === null ? "aguardando settlement" : `${scoreText(bankroll.lastBankDelta)} fichas${bankroll.lastRoundKind === "practice" ? " (banca congelada em prática)" : ""}`}.</p>}
          {bankroll && night.status === "abandoned" && <p>Banca {"version" in bankroll ? "A1a" : "A0.1"} expirada: {"version" in bankroll ? bankroll.balance : bankroll.bankroll} fichas fictícias.</p>}
          <div className="landing-actions">
            {night.status === "active" && <button type="button" onClick={onNextRound}>Próxima rodada</button>}
            {(night.status === "complete" || night.status === "abandoned") && <button type="button" onClick={onReturnToSetup}>Voltar à configuração</button>}
          </div>
        </section>}
        {night.status === "abandoned" && round.phase !== "complete" && <div className="round-summary" aria-label="Noite encerrada"><strong>Noite encerrada · recursos expirados</strong>{bankroll && <p>Banca {"version" in bankroll ? "A1a" : "A0.1"} expirada: {"version" in bankroll ? bankroll.balance : bankroll.bankroll} fichas fictícias.</p>}<button type="button" onClick={onReturnToSetup}>Voltar à configuração</button></div>}
      </section>

      {showInfo && <div className="info-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) closeInfo(); }}>
        <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="table-info-title" onKeyDown={trapDialogFocus}>
          <h2 id="table-info-title">Guia e dados da Noite</h2>
          <p>Este é um laboratório local. As regras indicadas são experimentais; este guia descreve o funcionamento, sem recomendar jogadas.</p>
          <ul>
            <li>Divida as quatro cartas iniciais entre Luz e Sombra; a quinta carta permanece no Cofre.</li>
            <li>Há {rules.focusPerNight} Focos compartilhados pela Noite. Depois do peek sem natural, você pode conservar, usar Leitura ({rules.readCost}) ou Manobra ({rules.maneuverCost}); cada habilidade pode ser usada uma vez por rodada.</li>
            <li>Leitura revela em privado somente a carta fechada atual do dealer. Não expõe compras futuras, semente ou resultado.</li>
            <li>Manobra troca uma carta de uma mão elegível pelo Cofre. Ás + 10 criado assim é 21 comum e para automaticamente.</li>
            <li>Comprar, Parar e Dobrar seguem o perfil experimental. O dealer para em qualquer 17; natural usa o pagamento selecionado.</li>
            <li>Naipes e J/Q/K são somente identidades visuais; J/Q/K têm valor 10. Não existe baralho físico finito nesta simulação.</li>
          </ul>
          <dl>
            <div><dt>Perfil</dt><dd>{night.rulesId} · natural {rules.naturalPayout}</dd></div>
            <div><dt>Rodada</dt><dd>{round.roundNumber}/{night.horizon} · concluídas {night.completedRounds}</dd></div>
            <div><dt>Foco usado</dt><dd>Leitura {night.focusSpent.read} · Manobra {night.focusSpent.maneuver}</dd></div>
            <div><dt>Pontuação</dt><dd>{scoreText(night.totalScore)}</dd></div>
            {bankroll && <>
              <div><dt>Banca {"version" in bankroll ? "A1a" : "A0.1"}</dt><dd>{"version" in bankroll ? bankroll.balance : bankroll.bankroll} · {bankroll.status === "practice" || ("pendingKind" in bankroll && bankroll.pendingKind === "practice") ? "prática" : "financiada"}</dd></div>
              <div><dt>{"version" in bankroll ? "Aposta / cobertura" : "Cobertura / disponível"}</dt><dd>{"version" in bankroll ? `${bankroll.currentStake ?? "—"} / ${bankroll.coverage}` : `${bankroll.escrow} / ${bankroll.available}`}</dd></div>
              <div><dt>Financiadas / prática</dt><dd>{bankroll.fundedRounds} / {bankroll.practiceRounds}</dd></div>
            </>}
          </dl>
          <button ref={infoCloseButton} className="dialog-close" type="button" onClick={closeInfo}>Fechar</button>
        </section>
      </div>}

      {confirmation && <div className="confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmation(null); }}>
        <section className="ability-confirmation" role="dialog" aria-modal="true" aria-labelledby="ability-confirmation-title" onKeyDown={trapDialogFocus}>
          <h3 id="ability-confirmation-title">Confirmar {confirmation.startsWith("read") ? "Leitura" : "Manobra"}</h3>
          {confirmation === "read" ? <p>Revelar somente a carta fechada atual do dealer por {rules.readCost} Focos?</p>
            : confirmation === "read-privilege" ? <p>Revelar somente a carta fechada atual do dealer sem gastar Foco e consumir o Privilégio do Véu?</p> : <>
            <p>{confirmation === "maneuver-privilege" ? "Confirmar a troca sem gastar Foco e consumir o Privilégio de Ferro?" : `Confirmar a troca e gastar ${rules.maneuverCost} Foco?`}{!round.readDecisionMade && " A Leitura pendente será pulada na mesma transição."}</p>
            {selectedSwap && round.hands && <p>{selectedSwap.hand === "luz" ? "Luz" : "Sombra"}: {faceLabel(round.hands[selectedSwap.hand].cards[selectedSwap.cardIndex]!)} ↔ Cofre {faceLabel(round.cofre!)}.</p>}
          </>}
          <div className="landing-actions">
            <button ref={confirmButton} type="button" onClick={confirmation === "read" ? confirmRead : confirmation === "read-privilege" ? confirmReadPrivilege : confirmManeuver}>{confirmation.includes("privilege") ? "Confirmar Privilégio" : "Confirmar gasto"}</button>
            <button type="button" className="secondary-action" onClick={() => setConfirmation(null)}>{confirmation.startsWith("maneuver") ? pact ? "Cancelar · manter recursos" : "Cancelar · manter Foco" : "Cancelar"}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
