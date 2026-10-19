import { useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { handValue, partitions, type Action, type Card, type HandName, type Partition } from "@nocte/engine";
import type { CofreFocoRules, PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import type { CofreFocoSessionAdapter } from "./cofre-foco-session";
import type { PublicBankrollA0 } from "./bankroll-a0-session";

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
};

const actionLabels: Record<Action, string> = { hit: "Comprar", stand: "Parar", double: "Dobrar" };
const outcomes = { win: "Vitória", loss: "Derrota", push: "Empate" } as const;
const statuses = { playing: "em jogo", stood: "parou", busted: "estourou", doubled: "dobrou" } as const;
const scoreText = (score: number) => score < 0 ? `−${Math.abs(score)}` : `${score}`;

function Cards({ cards, label }: { cards: readonly Card[]; label: string }) {
  return <div className="card-row" role="list" aria-label={label}>
    {cards.map((card, index) => <span className="playing-card" role="listitem" key={`${card.rank}-${index}`} aria-label={`Carta ${card.rank}`}>{card.rank}</span>)}
  </div>;
}

function ClosedCard() {
  return <span className="playing-card card-closed" role="img" aria-label="Carta do dealer fechada">?</span>;
}

function phaseLabel(night: PublicCofreFocoNight): string {
  const round = night.round;
  if (!round) return "A Noite ainda não tem rodada ativa.";
  if (round.phase === "compose") return "Composição · distribua as quatro cartas iniciais entre Luz e Sombra.";
  if (round.phase === "focusWindow") return "Janela de Foco · o dealer não tem natural. Você pode conservar ou usar habilidades.";
  if (round.phase === "player") return `Ações · vez de ${round.currentHand === "luz" ? "Luz" : "Sombra"}.`;
  if (round.phase === "dealer") return "Dealer · resolva as cartas restantes.";
  return "Rodada concluída.";
}

export function CofreFocoTable({ session, night, rules, bankroll, error, onNightChange, onNextRound, onReturnToSetup }: Props) {
  const round = night.round;
  const [selectedPartition, setSelectedPartition] = useState(0);
  const [selectedSwap, setSelectedSwap] = useState<Readonly<{ hand: HandName; cardIndex: number }> | null>(null);
  const [maneuverChooserOpen, setManeuverChooserOpen] = useState(false);
  const [confirmation, setConfirmation] = useState<"read" | "maneuver" | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const busy = useRef(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  const focusWindowTitle = useRef<HTMLHeadingElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  useEffect(() => {
    if (confirmation) confirmButton.current?.focus();
    else if (returnFocus.current?.isConnected) returnFocus.current.focus();
    else focusWindowTitle.current?.focus();
  }, [confirmation]);
  useEffect(() => {
    if (!confirmation) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setConfirmation(null);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [confirmation]);

  const requestConfirmation = (kind: "read" | "maneuver", trigger: HTMLElement) => {
    returnFocus.current = trigger;
    setConfirmation(kind);
  };
  const trapConfirmationFocus = (event: ReactKeyboardEvent<HTMLElement>) => {
    if (event.key !== "Tab") return;
    const buttons = event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)");
    const first = buttons.item(0);
    const last = buttons.item(buttons.length - 1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
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
    } finally {
      busy.current = false;
    }
    return succeeded;
  };

  const confirmRead = () => { if (update(() => session.readDealerHole())) setConfirmation(null); };
  const confirmManeuver = () => { if (update(() => {
    if (!selectedSwap) throw new Error("Selecione uma carta elegível para Manobra.");
    return session.maneuverDirect(selectedSwap.hand, selectedSwap.cardIndex);
  })) setConfirmation(null); };
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
    if (!window.confirm(prompt)) return;
    update(() => session.abandonNight());
  };

  const partitionsForRound = round?.phase === "compose" ? partitions(round.originalCards) : [];
  const focusOptions = session.focusOptions;
  const handNames: readonly HandName[] = ["luz", "sombra"];
  const dealerCards = round?.phase === "complete" && round.dealerHole
    ? [round.dealerUp, round.dealerHole, ...(round.dealerDraws ?? [])]
    : [round?.dealerUp, ...(round?.dealerHole ? [round.dealerHole] : [])].filter((card): card is Card => Boolean(card));
  const dealerValue = dealerCards.length > 1 ? handValue(dealerCards) : null;
  const ended = night.status === "complete" || night.status === "abandoned";

  if (!round) return <section className="game-table"><p role="alert">A Noite não possui uma rodada visível.</p></section>;

  return (
    <section className="game-table cofre-foco-table" aria-labelledby="cofre-table-title">
      <header className="table-heading">
        <div>
          <p className="eyebrow">NOITE · RODADA {round.roundNumber} DE {night.horizon}</p>
          <h2 id="cofre-table-title">Duas Faces · Cofre + Foco</h2>
          <p className="table-profile">{night.rulesId} · EXPERIMENTAL · natural {rules.naturalPayout}</p>
        </div>
        <div className="scoreboard" aria-label="Placar da Noite">
          <span>Pontuação acumulada</span>
          <strong aria-live="polite">{scoreText(night.totalScore)}</strong>
        </div>
      </header>

      <section className="focus-resource" aria-label="Recursos da Noite">
        <div>
          <p className="eyebrow">RECURSO COMPARTILHADO</p>
          <h3>Foco</h3>
          <p className="focus-count" aria-live="polite">{night.focusRemaining} de {rules.focusPerNight} restantes</p>
        </div>
        <dl className="focus-breakdown">
          <div><dt>Leitura usada</dt><dd>{night.focusSpent.read}</dd></div>
          <div><dt>Manobra usada</dt><dd>{night.focusSpent.maneuver}</dd></div>
          <div><dt>Rodadas</dt><dd>{night.completedRounds}/{night.horizon}</dd></div>
        </dl>
      </section>

      {bankroll && <section className="bankroll-resource" aria-label="Banca fictícia A0.1">
        <div className="bankroll-heading">
          <div>
            <p className="eyebrow">LABORATÓRIO LOCAL · EXPERIMENTAL</p>
            <h3>Banca desta Noite</h3>
          </div>
          <strong aria-live="polite">{bankroll.bankroll} fichas</strong>
        </div>
        {bankroll.pendingKind === "funded" && <>
          <p role="status">Rodada financiada · exposição fixa 10 + 10 · cobertura reservada {bankroll.escrow} · disponível {bankroll.available}.</p>
          <p className="muted">A reserva cobre os dois doubles possíveis; não é debitada. O saldo só muda pelo score final do motor.</p>
        </>}
        {bankroll.pendingKind === "practice" && <p className="practice-notice" role="status">Prática gratuita — banca congelada até o fim da Noite. O jogo e a pontuação continuam normalmente.</p>}
        {!bankroll.pendingKind && bankroll.status === "active" && <p className="muted">Rodada concluída · saldo atualizado pelo motor. A elegibilidade da próxima rodada será verificada ao iniciá-la.</p>}
        {!bankroll.pendingKind && bankroll.status === "practice" && <p className="practice-notice" role="status">Prática gratuita — banca congelada em {bankroll.bankroll} até o fim da Noite.</p>}
        {(bankroll.status === "complete" || bankroll.status === "abandoned") && <p className="muted">Banca expirada ao {bankroll.status === "complete" ? "concluir" : "abandonar"} a Noite: {bankroll.expiredBalance ?? bankroll.bankroll} fichas fictícias. Nada é transferido ou salvo.</p>}
        <dl className="bankroll-breakdown">
          <div><dt>Rodadas financiadas</dt><dd>{bankroll.fundedRounds}</dd></div>
          <div><dt>Rodadas de prática</dt><dd>{bankroll.practiceRounds}</dd></div>
          <div><dt>Reserva atual</dt><dd>{bankroll.escrow}</dd></div>
        </dl>
      </section>}

      <p className="phase-status" role="status" aria-live="polite">{phaseLabel(night)}</p>
      {(error || localError) && <p className="recoverable-error" role="alert">{localError ?? error}</p>}

      <details className="quick-rules">
        <summary>Guia rápido · regras Cofre + Foco (experimentais)</summary>
        <section aria-label="Guia rápido Cofre + Foco">
          <ul>
            <li>Componha Luz e Sombra com as quatro cartas iniciais; a quinta carta fica aberta e separada no Cofre.</li>
            <li>A Noite tem {rules.focusPerNight} Focos compartilhados, sem renovação. O saldo não é pontuação e expira ao fim ou abandono da Noite.</li>
            <li>Após o peek confirmar que o dealer não tem natural, você pode conservar Foco, fazer uma Leitura por 2 Focos ou uma Manobra por 1 Foco; cada habilidade pode ser usada uma vez na rodada.</li>
            <li>Leitura revela somente a carta fechada existente do dealer. Não revela compras futuras, sementes ou resultados.</li>
            <li>Manobra troca uma carta de uma mão ativa de duas cartas pelo Cofre; a carta retirada passa ao Cofre. Naturais iniciais e mãos encerradas não podem ser alterados.</li>
            <li>Ás + 10 criado por Manobra vale 21 comum, para automaticamente e não recebe bônus de natural.</li>
            <li>Comprar, Parar e Dobrar seguem Duas Faces básico. O dealer para em qualquer 17, incluindo 17 suave; o pagamento de natural segue o perfil experimental indicado.</li>
          </ul>
          <p>Este guia explica regras e custos, sem recomendar ações. Os valores e a variante permanecem EXPERIMENTAIS.</p>
        </section>
      </details>

      <section className="dealer-area" aria-labelledby="cf-dealer-title">
        <h3 id="cf-dealer-title">Dealer</h3>
        <div className="card-row" role="list" aria-label="Cartas visíveis do dealer">
          <span className="playing-card" role="listitem" aria-label={`Carta ${round.dealerUp.rank}`}>{round.dealerUp.rank}</span>
          {round.dealerHole ? <span className="playing-card" role="listitem" aria-label={`Carta lida ${round.dealerHole.rank}`}>{round.dealerHole.rank}</span> : round.phase !== "complete" ? <ClosedCard /> : null}
          {round.phase === "complete" && (round.dealerDraws ?? []).map((card, index) => <span className="playing-card" role="listitem" aria-label={`Compra do dealer ${card.rank}`} key={`${card.rank}-${index}`}>{card.rank}</span>)}
        </div>
        {round.phase === "complete" && dealerValue && <p>Cartas do dealer: {dealerCards.map(card => card.rank).join(" + ")}. Total final: {dealerValue.total}.</p>}
        {round.dealerHole && round.phase !== "complete" && <p role="status">Leitura privada usada: a hole é {round.dealerHole.rank}. Compras futuras continuam ocultas.</p>}
        {!round.dealerHole && round.phase !== "complete" && <p className="muted">Uma carta permanece fechada até Leitura legal ou fim da rodada.</p>}
        {round.naturalPeek === true && <p>Natural do dealer: a rodada terminou pelo peek; nenhuma habilidade foi oferecida.</p>}
      </section>

      {round.cofre && <section className="cofre-card cofre-card-persistent" aria-labelledby="cf-cofre-title">
        <h3 id="cf-cofre-title">Cofre · carta aberta</h3>
        <Cards cards={[round.cofre]} label="Carta do Cofre" />
      </section>}

      {night.status === "active" && round.phase === "compose" && (
        <section aria-labelledby="cf-compose-title">
          <h3 id="cf-compose-title">Composição inicial</h3>
          <p>Escolha como dividir as quatro cartas. O Cofre é uma quinta carta separada nesta variante.</p>
          <div className="initial-and-cofre">
            <div><h4>Quatro cartas iniciais</h4><Cards cards={round.originalCards} label="Quatro cartas iniciais" /></div>
          </div>
          <fieldset className="composition-options">
            <legend>Composições disponíveis</legend>
            {partitionsForRound.map((partition, index) => {
              const luz = partition.luz.map(cardIndex => round.originalCards[cardIndex]!.rank).join(" + ");
              const sombra = partition.sombra.map(cardIndex => round.originalCards[cardIndex]!.rank).join(" + ");
              return <label className="composition-choice" key={index}>
                <input type="radio" name="cofre-composition" value={index} checked={selectedPartition === index} onChange={() => setSelectedPartition(index)} />
                <span><strong>Composição {index + 1}</strong><br />Luz: {luz} · Sombra: {sombra}</span>
              </label>;
            })}
          </fieldset>
          <button type="button" onClick={() => update(() => session.compose(partitionsForRound[selectedPartition]!))}>Confirmar composição</button>
        </section>
      )}

      {round.hands && (
        <div className="hands-grid">
          {handNames.map(name => {
            const hand = round.hands![name];
            const settlement = round.settlement?.[name];
            const value = handValue(hand.cards);
            const title = name === "luz" ? "Luz" : "Sombra";
            return <section className={`hand-panel ${round.currentHand === name ? "active-hand" : ""}`} key={name} aria-labelledby={`cf-${name}-title`}>
              <h3 id={`cf-${name}-title`}>{title}</h3>
              <Cards cards={hand.cards} label={`Cartas da mão ${title}`} />
              <p>Total: {value.total}{value.soft ? " suave" : ""}{hand.openingNatural ? " · natural de abertura" : hand.maneuverTwentyOne ? " · 21 comum por Manobra" : value.bust ? " · estouro" : ""}</p>
              <p>Exposição: {hand.exposure} · Estado: {statuses[hand.status]}</p>
              {settlement && <p className="hand-result">{outcomes[settlement.outcome]} · {scoreText(settlement.score)} pontos</p>}
            </section>;
          })}
        </div>
      )}

      {night.status === "active" && round.phase === "focusWindow" && (
        <section className="focus-window" aria-labelledby="focus-window-title">
          <h3 ref={focusWindowTitle} id="focus-window-title" tabIndex={-1}>Janela de Foco</h3>
          <p>Leitura e Manobra estão disponíveis nesta janela. Você pode escolher uma, usar ambas na ordem permitida ou conservar o Foco.</p>
          <div className="focus-choices">
            <section className="ability-panel" aria-labelledby="read-choice-title">
              <h4 id="read-choice-title">Leitura · custo {rules.readCost} Focos</h4>
              <p>Revela somente a carta fechada atual do dealer, em privado.</p>
              {round.readUsed
                ? <p className="ability-status" role="status">Leitura já usada nesta rodada · {rules.readCost} Focos gastos.</p>
                : !round.readDecisionMade && focusOptions.canRead
                  ? <button type="button" onClick={(event) => requestConfirmation("read", event.currentTarget)}>Escolher Leitura · {rules.readCost} Focos</button>
                  : round.readDecisionMade
                    ? <p className="ability-status" role="status">Leitura não foi usada e não pode ser iniciada depois de decidir pela Manobra ou pela conservação.</p>
                    : <p className="ability-status" role="status">Leitura indisponível: saldo insuficiente ou nenhuma decisão de mão pendente.</p>}
            </section>

            <section className="ability-panel" aria-labelledby="maneuver-choice-title">
              <h4 id="maneuver-choice-title">Manobra · custo {rules.maneuverCost} Foco</h4>
              <p>Troca uma carta de mão elegível pelo Cofre. A carta retirada passa ao Cofre.</p>
              {round.maneuverUsed || round.maneuverDecisionMade
                ? <p className="ability-status" role="status">Manobra já decidida nesta rodada.</p>
                : <>
                    <button type="button" disabled={focusOptions.maneuverTargets.length === 0}
                      onClick={() => { setSelectedSwap(null); setManeuverChooserOpen(true); }}>
                      Escolher Manobra · {rules.maneuverCost} Foco
                    </button>
                    {focusOptions.maneuverTargets.length === 0 && <p className="ability-status" role="status">
                      {focusOptions.canDecideManeuver && night.focusRemaining < rules.maneuverCost
                        ? "Foco insuficiente para Manobra. Você pode continuar sem gastar."
                        : "Manobra indisponível: nenhuma mão ativa elegível nesta janela."}
                    </p>}
                    {maneuverChooserOpen && focusOptions.maneuverTargets.length > 0 && <div className="maneuver-picker">
                      <div className="maneuver-targets" role="group" aria-label="Cartas elegíveis para Manobra">
                        {focusOptions.maneuverTargets.map(target => {
                          const hand = round.hands![target.hand];
                          const handLabel = target.hand === "luz" ? "Luz" : "Sombra";
                          const rank = hand.cards[target.cardIndex]!.rank;
                          return <button type="button" className={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex ? "target-selected" : "secondary-action"}
                            key={`${target.hand}-${target.cardIndex}`} aria-pressed={selectedSwap?.hand === target.hand && selectedSwap.cardIndex === target.cardIndex}
                            onClick={() => setSelectedSwap(target)}>
                            {handLabel} · carta {target.cardIndex + 1} ({rank})
                          </button>;
                        })}
                      </div>
                      {selectedSwap && focusOptions.maneuverTargets.some(target => target.hand === selectedSwap.hand && target.cardIndex === selectedSwap.cardIndex) && (
                        <div className="swap-preview" aria-live="polite">
                          <p>Prévia · {selectedSwap.hand === "luz" ? "Luz" : "Sombra"}: {round.hands![selectedSwap.hand].cards[selectedSwap.cardIndex]!.rank} → {round.cofre?.rank}; Cofre receberá {round.hands![selectedSwap.hand].cards[selectedSwap.cardIndex]!.rank}.</p>
                          {round.cofre?.rank === "10" && round.hands![selectedSwap.hand].cards[1 - selectedSwap.cardIndex]?.rank === "A" && <p>Esta troca forma Ás + 10: 21 comum, sem bônus de natural e com parada automática.</p>}
                          <button type="button" onClick={(event) => requestConfirmation("maneuver", event.currentTarget)}>Pré-visualizar Manobra · gastar {rules.maneuverCost} Foco</button>
                        </div>
                      )}
                      <button type="button" className="secondary-action" onClick={() => { setSelectedSwap(null); setManeuverChooserOpen(false); }}>Cancelar escolha</button>
                    </div>}
                  </>}
            </section>
          </div>
          <button type="button" className="secondary-action conserve-action" onClick={continueWithoutMoreAbilities}>
            {round.readDecisionMade && round.maneuverDecisionMade ? "Continuar às mãos" : "Conservar Foco e continuar"}
          </button>
        </section>
      )}

      {night.status === "active" && round.phase === "player" && <div className="action-row" role="group" aria-label={`Ações para ${round.currentHand === "luz" ? "Luz" : "Sombra"}`}>
        {session.legalActions.map(action => <button type="button" key={action} onClick={() => update(() => session.act(action))}>{actionLabels[action]}</button>)}
      </div>}
      {night.status === "active" && round.phase === "dealer" && <button type="button" onClick={() => update(() => session.resolveDealer())}>Resolver dealer</button>}

      {round.phase === "complete" && (
        <section className="round-summary" aria-label="Resultado da rodada">
          <h3>{night.status === "complete" ? "Noite concluída" : night.status === "abandoned" ? "Noite encerrada" : "Rodada concluída"}</h3>
          <p>Pontuação desta rodada: {round.score === undefined ? "—" : scoreText(round.score)} pontos.</p>
          <p>Pontuação acumulada: {scoreText(night.totalScore)} pontos. Foco restante: {night.focusRemaining}.</p>
          {bankroll && <p>Score do motor: {scoreText(round.score ?? 0)} · variação da banca nesta rodada: {bankroll.lastBankDelta === null ? "aguardando settlement" : scoreText(bankroll.lastBankDelta)} fichas{bankroll.lastRoundKind === "practice" ? " (banca congelada em prática)" : ""}.</p>}
          {bankroll && night.status === "complete" && <p>Resumo A0.1 · banca inicial 150 · banca final/expirada {bankroll.expiredBalance ?? bankroll.bankroll} · saldo líquido {scoreText((bankroll.expiredBalance ?? bankroll.bankroll) - 150)} · financiadas {bankroll.fundedRounds} · prática {bankroll.practiceRounds}. Esta banca não mede habilidade.</p>}
          {night.status === "complete" && <p>Foco não usado expirou ao fim da Noite.</p>}
          <div className="landing-actions">
            {night.status === "active" && <button type="button" onClick={onNextRound}>Próxima rodada</button>}
            {(night.status === "complete" || night.status === "abandoned") && <button type="button" onClick={onReturnToSetup}>Voltar à configuração</button>}
          </div>
        </section>
      )}

      {night.status === "active" && (round.phase !== "complete" || round.roundNumber < night.horizon) && (
        <button type="button" className="text-button" onClick={abandon}>Encerrar Noite</button>
      )}
      {ended && night.status === "abandoned" && round.phase !== "complete" && (
        <section className="round-summary" aria-label="Noite encerrada">
          <h3>Noite encerrada</h3>
          <p>O Foco restante ({night.expiredFocus}) expirou. Pontuação acumulada até aqui: {scoreText(night.totalScore)}.</p>
          {bankroll && <p>Banca A0.1 expirada: {bankroll.expiredBalance ?? bankroll.bankroll} fichas fictícias. Não houve settlement da rodada inacabada.</p>}
          <button type="button" onClick={onReturnToSetup}>Voltar à configuração</button>
        </section>
      )}

      {confirmation && (
        <div className="confirmation-backdrop">
          <section className="ability-confirmation" role="dialog" aria-modal="true" aria-labelledby="ability-confirmation-title" onKeyDown={trapConfirmationFocus}>
            <h3 id="ability-confirmation-title">Confirmar {confirmation === "read" ? "Leitura" : "Manobra"}</h3>
            {confirmation === "read" ? <p>Revelar a carta fechada atual do dealer por {rules.readCost} Focos? A informação não inclui compras futuras.</p> : <>
              <p>Confirmar a troca abaixo e gastar {rules.maneuverCost} Foco?{!round.readDecisionMade && " A Leitura pendente será pulada na mesma transição."}</p>
              {selectedSwap && round.hands && <p>Antes: {selectedSwap.hand === "luz" ? "Luz" : "Sombra"} · carta {selectedSwap.cardIndex + 1} {round.hands[selectedSwap.hand].cards[selectedSwap.cardIndex]!.rank}; Cofre {round.cofre?.rank}. Depois: mão {round.cofre?.rank}; Cofre {round.hands[selectedSwap.hand].cards[selectedSwap.cardIndex]!.rank}.</p>}
            </>}
            <div className="landing-actions">
              <button ref={confirmButton} type="button" onClick={confirmation === "read" ? confirmRead : confirmManeuver}>Confirmar gasto</button>
              <button type="button" className="secondary-action" onClick={() => setConfirmation(null)}>{confirmation === "maneuver" ? "Cancelar · manter Foco" : "Cancelar"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
