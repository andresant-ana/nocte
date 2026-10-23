import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handValue, partitions, type Action, type Card, type HandName, type Partition } from "@nocte/engine";
import type { CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import type { CofreFocoSessionAdapter } from "./cofre-foco-session";
import type { PublicBankrollA0 } from "./bankroll-a0-session";
import { PlayingCard } from "./PlayingCard";

type CofreSession = Pick<CofreFocoSessionAdapter,
  "current" | "focusOptions" | "legalActions" | "compose" | "skipRead" | "readDealerHole" |
  "skipManeuver" | "maneuverDirect" | "continueAfterAbilities" | "act" | "resolveDealer" | "abandonNight">;

type Props = {
  session: CofreSession;
  night: PublicCofreFocoNight;
  rules: CofreFocoRules;
  bankroll?: PublicBankrollA0;
  error?: string | null;
  onNightChange: (night: PublicCofreFocoNight) => void;
  onNextRound: () => void;
  onReturnToSetup: () => void;
  cardIdentityMode?: boolean;
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

function ClosedCard() {
  return <span className="playing-card card-closed" role="img" aria-label="Carta do dealer fechada">?</span>;
}

function phaseLabel(night: PublicCofreFocoNight): string {
  const round = night.round;
  if (!round) return "A Noite ainda não tem rodada ativa.";
  if (round.phase === "compose") return "Componha Luz e Sombra.";
  if (round.phase === "focusWindow") return "Janela de Foco: escolha uma habilidade ou conserve.";
  if (round.phase === "player") return `Vez de ${round.currentHand === "luz" ? "Luz" : "Sombra"}.`;
  if (round.phase === "dealer") return "Ações encerradas. Resolva o dealer.";
  return "Rodada concluída.";
}

export function CofreFocoTable({ session, night, rules, bankroll, error, onNightChange, onNextRound, onReturnToSetup, cardIdentityMode = false }: Props) {
  const round = night.round;
  const [selectedPartition, setSelectedPartition] = useState(0);
  const [selectedSwap, setSelectedSwap] = useState<Readonly<{ hand: HandName; cardIndex: number }> | null>(null);
  const [maneuverChooserOpen, setManeuverChooserOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"read" | "maneuver" | null>(null);
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

  const update = (operation: () => PublicCofreFocoNight): boolean => {
    if (busy.current) return false;
    busy.current = true;
    let succeeded = false;
    try {
      setLocalError(null);
      const next = operation();
      onNightChange(next);
      if (next.round?.roundNumber !== round?.roundNumber) setSelectedPartition(0);
      succeeded = true;
    } catch (cause) {
      setLocalError(cause instanceof Error ? cause.message : "Ação indisponível. Confira o estado da rodada.");
    } finally { busy.current = false; }
    return succeeded;
  };

  const requestConfirmation = (kind: "read" | "maneuver", trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setConfirmation(kind);
  };
  const confirmRead = () => { if (update(() => session.readDealerHole())) setConfirmation(null); };
  const confirmManeuver = () => { if (update(() => {
    if (!selectedSwap) throw new Error("Selecione uma carta elegível para Manobra.");
    return session.maneuverDirect(selectedSwap.hand, selectedSwap.cardIndex);
  })) { setConfirmation(null); setManeuverChooserOpen(false); setSelectedSwap(null); } };
  const continueWithoutMoreAbilities = () => update(() => {
    let next = session.current;
    if (next.round && !next.round.readDecisionMade) next = session.skipRead();
    if (next.round && !next.round.maneuverDecisionMade) next = session.skipManeuver();
    return session.continueAfterAbilities();
  });
  const abandon = () => {
    const prompt = bankroll
      ? `Encerrar esta Noite? O saldo remanescente de ${bankroll.bankroll} fichas fictícias e a reserva expirarão. Não há reembolso nem persistência.`
      : "Encerrar esta Noite? O Foco restante expirará.";
    if (window.confirm(prompt)) update(() => session.abandonNight());
  };
  const openInfo = (trigger: HTMLElement) => { infoTrigger.current = trigger; setShowInfo(true); };
  const closeInfo = () => { setShowInfo(false); window.setTimeout(() => infoTrigger.current?.focus(), 0); };

  const partitionsForRound = round?.phase === "compose" ? partitions(round.originalCards) : [];
  const focusOptions = session.focusOptions;
  const handNames: readonly HandName[] = ["luz", "sombra"];
  const dealerCards = round?.phase === "complete" && round.dealerHole
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
        </div>
        <div className="table-hud">
          <div className="hud-stat" aria-label="Placar da Noite"><span>Pontos</span><strong aria-live="polite">{scoreText(night.totalScore)}</strong></div>
          <div className="hud-stat" aria-label="Foco restante"><span>Foco</span><strong aria-live="polite">{night.focusRemaining} de {rules.focusPerNight} restantes</strong></div>
          {bankroll && <div className="hud-stat bank-stat" role="region" aria-label="Banca fictícia A0.1">
            <span>Banca · {bankroll.pendingKind === "practice" || bankroll.status === "practice" ? "prática" : "financiada"}</span>
            <strong aria-live="polite">{bankroll.bankroll} fichas</strong>
            {bankroll.pendingKind === "funded" && <small>10+10 · reserva {bankroll.escrow} · disponível {bankroll.available}</small>}
            {(bankroll.pendingKind === "practice" || bankroll.status === "practice") && <small>Saldo congelado até o fim da Noite</small>}
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
            {round.dealerUp.art
              ? <div role="listitem"><PlayingCard card={round.dealerUp} label="Carta aberta do dealer" /></div>
              : <span className="playing-card" role="listitem" aria-label={`Carta ${round.dealerUp.rank}`}>{round.dealerUp.rank}</span>}
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
          {!round.dealerHole && round.phase !== "complete" && <span className="dealer-note">Carta fechada</span>}
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
                <p className="hand-meta">Exposição {hand.exposure} · {statuses[hand.status]}</p>
                {settlement && <p className="hand-result hand-meta">{outcomes[settlement.outcome]} · {scoreText(settlement.score)} pontos</p>}
              </section>;
            })}
          </div>}
        </div>
      </section>

      <section className="table-action-dock" aria-label="Ações da rodada">
        {night.status === "active" && round.phase === "compose" && <>
          <h3>Composição</h3>
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
            <section className="ability-panel" aria-labelledby="read-choice-title">
              <h4 id="read-choice-title">Leitura · {rules.readCost} Focos</h4>
              {round.readUsed ? <p className="ability-status" role="status">Usada nesta rodada</p>
                : !round.readDecisionMade && focusOptions.canRead
                  ? <button type="button" onClick={(event) => requestConfirmation("read", event.currentTarget)}>Escolher Leitura · {rules.readCost} Focos</button>
                  : <p className="ability-status" role="status">{round.readDecisionMade ? "Decisão de Leitura encerrada" : "Indisponível"}</p>}
            </section>
            <section className="ability-panel" aria-labelledby="maneuver-choice-title">
              <h4 id="maneuver-choice-title">Manobra · {rules.maneuverCost} Foco</h4>
              {round.maneuverUsed || round.maneuverDecisionMade ? <p className="ability-status" role="status">Decidida nesta rodada</p>
                : <>
                    <button type="button" disabled={focusOptions.maneuverTargets.length === 0} onClick={() => { setSelectedSwap(null); setManeuverChooserOpen(true); }}>Escolher Manobra · {rules.maneuverCost} Foco</button>
                    {focusOptions.maneuverTargets.length === 0 && <p className="ability-status" role="status">Indisponível nesta mão</p>}
                  </>}
            </section>
            <button type="button" className="secondary-action conserve-action" onClick={continueWithoutMoreAbilities}>
              {round.readDecisionMade && round.maneuverDecisionMade ? "Continuar" : "Conservar Foco"}
            </button>
            {maneuverChooserOpen && focusOptions.maneuverTargets.length > 0 && <div className="maneuver-picker">
              <div className="maneuver-targets" role="group" aria-label="Cartas elegíveis para Manobra">
                {focusOptions.maneuverTargets.map(target => {
                  const hand = round.hands![target.hand];
                  const handLabel = target.hand === "luz" ? "Luz" : "Sombra";
                  const rank = faceLabel(hand.cards[target.cardIndex]!);
                  return <button type="button" className={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex ? "target-selected" : "secondary-action"}
                    key={`${target.hand}-${target.cardIndex}`} aria-pressed={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex}
                    onClick={() => setSelectedSwap(target)}>{handLabel} · carta {target.cardIndex + 1} ({rank})</button>;
                })}
              </div>
              {selectedSwap && focusOptions.maneuverTargets.some(target => target.hand === selectedSwap.hand && target.cardIndex === selectedSwap.cardIndex) && <div className="swap-preview" aria-live="polite">
                <p>Troca: {selectedSwap.hand === "luz" ? "Luz" : "Sombra"} recebe {faceLabel(round.cofre!)}; Cofre recebe {faceLabel(round.hands![selectedSwap.hand].cards[selectedSwap.cardIndex]!)}.</p>
                <button type="button" onClick={(event) => requestConfirmation("maneuver", event.currentTarget)}>Confirmar alvo</button>
              </div>}
              <button type="button" className="secondary-action" onClick={() => { setSelectedSwap(null); setManeuverChooserOpen(false); }}>Cancelar escolha</button>
            </div>}
          </div>
        </>}

        {night.status === "active" && round.phase === "player" && <div className="action-row" role="group" aria-label={`Ações para ${round.currentHand === "luz" ? "Luz" : "Sombra"}`}>
          {session.legalActions.map(action => <button type="button" key={action} onClick={() => update(() => session.act(action))}>{actionLabels[action]}</button>)}
        </div>}
        {night.status === "active" && round.phase === "dealer" && <button type="button" onClick={() => update(() => session.resolveDealer())}>Resolver dealer</button>}

        {round.phase === "complete" && <section className="round-summary" aria-label="Resultado da rodada">
          <h3>{night.status === "complete" ? "Noite concluída" : night.status === "abandoned" ? "Noite encerrada" : "Rodada concluída"}</h3>
          <p>Pontuação desta rodada: {round.score === undefined ? "—" : scoreText(round.score)} pontos.</p>
          <p>Pontuação acumulada: {scoreText(night.totalScore)} · Foco {night.focusRemaining}.</p>
          {bankroll && <p>Variação da banca nesta rodada: {bankroll.lastBankDelta === null ? "aguardando settlement" : `${scoreText(bankroll.lastBankDelta)} fichas`}{bankroll.lastRoundKind === "practice" ? " (banca congelada em prática)" : ""}.</p>}
          {bankroll && night.status === "abandoned" && <p>Banca A0.1 expirada: {bankroll.bankroll} fichas fictícias.</p>}
          <div className="landing-actions">
            {night.status === "active" && <button type="button" onClick={onNextRound}>Próxima rodada</button>}
            {(night.status === "complete" || night.status === "abandoned") && <button type="button" onClick={onReturnToSetup}>Voltar à configuração</button>}
          </div>
        </section>}
        {night.status === "abandoned" && round.phase !== "complete" && <div className="round-summary" aria-label="Noite encerrada"><strong>Noite encerrada · recursos expirados</strong>{bankroll && <p>Banca A0.1 expirada: {bankroll.bankroll} fichas fictícias.</p>}<button type="button" onClick={onReturnToSetup}>Voltar à configuração</button></div>}
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
              <div><dt>Banca A0.1</dt><dd>{bankroll.bankroll} · {bankroll.pendingKind === "practice" || bankroll.status === "practice" ? "prática" : "financiada"}</dd></div>
              <div><dt>Cobertura / disponível</dt><dd>{bankroll.escrow} / {bankroll.available}</dd></div>
              <div><dt>Financiadas / prática</dt><dd>{bankroll.fundedRounds} / {bankroll.practiceRounds}</dd></div>
            </>}
          </dl>
          <button ref={infoCloseButton} className="dialog-close" type="button" onClick={closeInfo}>Fechar</button>
        </section>
      </div>}

      {confirmation && <div className="confirmation-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setConfirmation(null); }}>
        <section className="ability-confirmation" role="dialog" aria-modal="true" aria-labelledby="ability-confirmation-title" onKeyDown={trapDialogFocus}>
          <h3 id="ability-confirmation-title">Confirmar {confirmation === "read" ? "Leitura" : "Manobra"}</h3>
          {confirmation === "read" ? <p>Revelar somente a carta fechada atual do dealer por {rules.readCost} Focos?</p> : <>
            <p>Confirmar a troca e gastar {rules.maneuverCost} Foco?{!round.readDecisionMade && " A Leitura pendente será pulada na mesma transição."}</p>
            {selectedSwap && round.hands && <p>{selectedSwap.hand === "luz" ? "Luz" : "Sombra"}: {faceLabel(round.hands[selectedSwap.hand].cards[selectedSwap.cardIndex]!)} ↔ Cofre {faceLabel(round.cofre!)}.</p>}
          </>}
          <div className="landing-actions">
            <button ref={confirmButton} type="button" onClick={confirmation === "read" ? confirmRead : confirmManeuver}>Confirmar gasto</button>
            <button type="button" className="secondary-action" onClick={() => setConfirmation(null)}>{confirmation === "maneuver" ? "Cancelar · manter Foco" : "Cancelar"}</button>
          </div>
        </section>
      </div>}
    </section>
  );
}
