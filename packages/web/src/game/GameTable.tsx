import { useEffect, useRef, useState } from "react";
import { handValue, partitions, type Action, type Card, type Partition, type PublicRound } from "@nocte/engine";
import type { SoloRoundController } from "./controller";

type GameTableProps = {
  session: Pick<SoloRoundController, "compose" | "act" | "resolveDealer">;
  round: PublicRound;
  onRoundChange: (round: PublicRound) => void;
  roundNumber: number;
  profileLabel: string;
  nightScore: number;
  roundScore?: number;
  showRulesGuide?: boolean;
  showNewNightButton?: boolean;
  nextDisabled?: boolean;
  viewportFit?: boolean;
  onNextRound: () => void;
  onNewNight: () => void;
};

const actionLabels: Record<Action, string> = { hit: "Comprar", stand: "Parar", double: "Dobrar" };
const outcomeLabels = { win: "Vitória", loss: "Derrota", push: "Empate" } as const;
const statusLabels = { playing: "em jogo", stood: "parou", busted: "estourou", doubled: "dobrou" } as const;
const scoreText = (score: number) => score < 0 ? `−${Math.abs(score)}` : `${score}`;

function Cards({ cards, label }: { cards: readonly Card[]; label: string }) {
  return <div className="card-row" role="list" aria-label={label}>
    {cards.map((card, index) => <span className="playing-card" role="listitem" key={`${card.rank}-${index}`} aria-label={`Carta ${card.rank}`}>{card.rank}</span>)}
  </div>;
}

function phaseLabel(round: PublicRound): string {
  if (round.phase === "compose") return "Componha Luz e Sombra.";
  if (round.phase === "player") return `Vez de ${round.currentHand === "luz" ? "Luz" : "Sombra"}.`;
  if (round.phase === "dealer") return "Ações encerradas. Resolva o dealer.";
  return "Rodada concluída.";
}

export function GameTable({
  session, round, onRoundChange, roundNumber, profileLabel, nightScore, roundScore,
  showRulesGuide = true, showNewNightButton = true, nextDisabled = false, viewportFit = false,
  onNextRound, onNewNight,
}: GameTableProps) {
  const [view, setView] = useState(round);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const guideClose = useRef<HTMLButtonElement>(null);
  const guideTrigger = useRef<HTMLElement | null>(null);
  const decisionStarted = useRef(performance.now());
  useEffect(() => setView(round), [round]);
  useEffect(() => {
    if (!showGuide) return;
    guideClose.current?.focus();
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setShowGuide(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [showGuide]);
  useEffect(() => { if (!showGuide) guideTrigger.current?.focus(); }, [showGuide]);

  const update = (next: PublicRound) => { setError(null); setView(next); onRoundChange(next); };
  const elapsed = () => Math.max(0, performance.now() - decisionStarted.current);
  const choose = (partition: Partition) => {
    try { update(session.compose(partition, elapsed())); decisionStarted.current = performance.now(); }
    catch { setError("A composição não está mais disponível. Confira a rodada e tente novamente."); }
  };
  const act = (action: Action) => {
    try { update(session.act(action, elapsed())); decisionStarted.current = performance.now(); }
    catch { setError("Essa ação não está mais disponível. Confira a mão atual."); }
  };
  const resolveDealer = () => {
    try { update(session.resolveDealer()); }
    catch { setError("O dealer ainda não pode ser resolvido. Confira a fase da rodada."); }
  };

  const options = view.phase === "compose" ? partitions(view.originalCards) : [];
  const completeScore = roundScore ?? (view.settlement ? view.settlement.luz.score + view.settlement.sombra.score : null);
  const dealerCards = view.phase === "complete" && view.dealerHole
    ? [view.dealerUp, view.dealerHole, ...(view.dealerDraws ?? [])]
    : [view.dealerUp];

  return <section className={`game-table${viewportFit ? " viewport-table basic-table" : ""}`} aria-labelledby="table-title" data-game-phase={view.phase}>
    <header className="table-heading">
      <div className="table-title-block">
        <p className="eyebrow">NOITE · RODADA {roundNumber}</p>
        <h2 id="table-title">Mesa Duas Faces</h2>
        <p className="table-profile">Perfil experimental · natural {profileLabel}</p>
      </div>
      <div className="table-hud">
        <div className="hud-stat" aria-label="Placar da Noite"><span>Pontos</span><strong>{scoreText(nightScore)}</strong></div>
        {viewportFit && showRulesGuide && <button type="button" className="hud-button secondary-action" onClick={(event) => { guideTrigger.current = event.currentTarget; setShowGuide(true); }}>Guia de regras</button>}
        {viewportFit && <button type="button" className="hud-button secondary-action" onClick={onNewNight}>Encerrar</button>}
      </div>
    </header>
    <div className="table-status-row"><p className="phase-status" role="status" aria-live="polite">{phaseLabel(view)}</p>{error && <p className="recoverable-error" role="alert">{error}</p>}</div>

    {!viewportFit && showRulesGuide && <details className="quick-rules">
      <summary>Guia rápido · regras experimentais</summary>
      <section aria-label="Guia rápido">
        <ul>
          <li>Distribua quatro cartas iniciais em duas mãos de duas: Luz e Sombra. Cada mão enfrenta o mesmo dealer.</li>
          <li>Em cada mão, tente chegar perto de 21 sem passar. Ás vale 1 ou 11, conforme o total.</li>
          <li>Comprar recebe uma carta; Parar mantém a mão; Dobrar aumenta a exposição e recebe exatamente uma carta antes de encerrar a mão.</li>
          <li>O dealer compra até 17 e para em qualquer 17, inclusive 17 suave. Naturais e pagamentos seguem o perfil experimental indicado.</li>
        </ul>
      </section>
    </details>}

    <section className="table-board" aria-label="Mesa de jogo">
      <section className="dealer-area table-zone" aria-labelledby="dealer-title">
        <h3 id="dealer-title">Dealer</h3>
        <Cards cards={dealerCards} label="Cartas visíveis do dealer" />
        {view.phase !== "complete" && <span className="dealer-note">Carta fechada</span>}
        {view.phase === "complete" && view.dealerHole && <span className="dealer-note">Total {handValue(dealerCards).total} · {dealerCards.map(card => card.rank).join(" + ")}</span>}
      </section>

      {view.phase === "compose" && <section className="compose-area table-zone" aria-labelledby="compose-title">
        <div className="compose-copy"><h3 id="compose-title">Quatro cartas · componha as mãos</h3><span className="dealer-note">Escolha a divisão abaixo.</span></div>
        <Cards cards={view.originalCards} label="Quatro cartas para compor" />
      </section>}

      {view.hands && <div className="hands-grid" aria-label="Mãos da rodada">
        {(["luz", "sombra"] as const).map(name => {
          const hand = view.hands![name]; const result = view.settlement?.[name]; const value = handValue(hand.cards);
          return <section className={`hand-panel table-zone ${view.currentHand === name ? "active-hand" : ""}`} key={name} aria-labelledby={`${name}-title`}>
            <h3 id={`${name}-title`}>{name === "luz" ? "Luz" : "Sombra"}{view.currentHand === name && view.phase === "player" ? " · sua vez" : ""}</h3>
            <Cards cards={hand.cards} label={`Cartas da mão ${name === "luz" ? "Luz" : "Sombra"}`} />
            <p className="hand-meta">Total {value.total}{value.soft ? " suave" : ""}{value.natural ? " · natural" : value.bust ? " · estourou" : ""}</p>
            <p className="hand-meta">Exposição {hand.exposure} · {statusLabels[hand.status]}</p>
            {result && <p className="hand-result hand-meta">{outcomeLabels[result.outcome]} · {scoreText(result.score)} pontos</p>}
          </section>;
        })}
      </div>}
    </section>

    <section className={viewportFit ? "table-action-dock" : "action-row basic-action-area"} aria-label="Ações da rodada">
      {view.phase === "compose" && <>
        {viewportFit && <h3>Composição</h3>}
        <fieldset className="composition-options">
          <legend className={viewportFit ? "visually-hidden" : undefined}>Composições disponíveis</legend>
          {options.map((partition, index) => {
            const luz = partition.luz.map(cardIndex => view.originalCards[cardIndex]!.rank).join("+");
            const sombra = partition.sombra.map(cardIndex => view.originalCards[cardIndex]!.rank).join("+");
            return <label className="composition-choice" key={index}>
              <input type="radio" name="composition" value={index} checked={selected === index} onChange={() => setSelected(index)} />
              <span>Luz {luz} · Sombra {sombra}</span>
            </label>;
          })}
        </fieldset>
        <button type="button" onClick={() => choose(options[selected]!)}>Confirmar composição</button>
      </>}
      {view.phase === "player" && <div className="action-row" role="group" aria-label={`Ações para ${view.currentHand === "luz" ? "Luz" : "Sombra"}`}>
        {view.legalActions.map(action => <button type="button" key={action} onClick={() => act(action)}>{actionLabels[action]}</button>)}
      </div>}
      {view.phase === "dealer" && <button type="button" onClick={resolveDealer}>Resolver dealer</button>}
      {view.phase === "complete" && <section className="round-summary" aria-label="Resultado da rodada">
        {view.naturalPeek && <p>Natural do dealer: liquidação pelo peek.</p>}
        <p>Rodada {completeScore === null ? "" : `· ${scoreText(completeScore)} pontos`}</p>
        <div className="landing-actions">
          <button type="button" disabled={nextDisabled} onClick={onNextRound}>{nextDisabled ? "Salvando rodada…" : "Próxima rodada"}</button>
          {showNewNightButton && !viewportFit && <button type="button" className="secondary-action" onClick={onNewNight}>Nova Noite</button>}
          {showNewNightButton && viewportFit && <button type="button" className="secondary-action" onClick={onNewNight}>Nova Noite</button>}
        </div>
      </section>}
    </section>

    {showGuide && viewportFit && <div className="info-backdrop" onMouseDown={event => { if (event.target === event.currentTarget) setShowGuide(false); }}>
      <section className="info-dialog" role="dialog" aria-modal="true" aria-labelledby="basic-guide-title">
        <h2 id="basic-guide-title">Guia de regras · Duas Faces</h2>
        <ul>
          <li>Distribua quatro cartas iniciais em duas mãos de duas. Cada mão enfrenta o mesmo dealer.</li>
          <li>Ás vale 1 ou 11. Tente chegar a 21 sem passar.</li>
          <li>Comprar recebe uma carta; Parar encerra a mão; Dobrar duplica a exposição e recebe uma carta antes de encerrar.</li>
          <li>O dealer compra até 17 e para em qualquer 17, inclusive 17 suave. Naturais e pagamentos seguem o perfil experimental.</li>
          <li>Empate com o dealer devolve a exposição daquela mão.</li>
          <li>As regras atuais são experimentais. O modo P2A tem consentimento e protocolo próprios.</li>
        </ul>
        <button ref={guideClose} className="dialog-close" type="button" onClick={() => setShowGuide(false)}>Fechar guia</button>
      </section>
    </div>}
  </section>;
}
