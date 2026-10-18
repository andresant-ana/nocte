import { useEffect, useRef, useState } from "react";
import { partitions, type Action, type Card, type Partition, type PublicRound } from "@nocte/engine";
import type { SoloRoundController } from "./controller";

type GameTableProps = {
  session: Pick<SoloRoundController, "compose" | "act" | "resolveDealer">;
  round: PublicRound;
  onRoundChange: (round: PublicRound) => void;
  roundNumber: number;
  nightScore: number;
  roundScore?: number;
  onNextRound: () => void;
  onNewNight: () => void;
};

const actionLabels: Record<Action, string> = { hit: "Comprar", stand: "Parar", double: "Dobrar" };
const outcomeLabels = { win: "Vitória", loss: "Derrota", push: "Empate" } as const;
const statusLabels = { playing: "em jogo", stood: "parou", busted: "estourou", doubled: "dobrou" } as const;
const scoreText = (score: number) => score < 0 ? `−${Math.abs(score)}` : `${score}`;

function Cards({ cards, label }: { cards: readonly Card[]; label: string }) {
  return (
    <div className="card-row" aria-label={label}>
      {cards.map((card, index) => (
        <span className="playing-card" key={`${card.rank}-${index}`} aria-label={`Carta ${card.rank}`}>
          {card.rank}
        </span>
      ))}
    </div>
  );
}

function phaseLabel(round: PublicRound): string {
  if (round.phase === "compose") return "Escolha quais cartas formam Luz e Sombra.";
  if (round.phase === "player") return `Vez de ${round.currentHand === "luz" ? "Luz" : "Sombra"}.`;
  if (round.phase === "dealer") return "Vez do dealer.";
  return "Rodada concluída.";
}

export function GameTable({
  session,
  round,
  onRoundChange,
  roundNumber,
  nightScore,
  roundScore,
  onNextRound,
  onNewNight,
}: GameTableProps) {
  const [view, setView] = useState(round);
  const [selected, setSelected] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const decisionStarted = useRef(performance.now());
  useEffect(() => setView(round), [round]);

  const update = (next: PublicRound) => {
    setError(null);
    setView(next);
    onRoundChange(next);
  };
  const elapsed = () => Math.max(0, performance.now() - decisionStarted.current);
  const choose = (partition: Partition) => {
    try {
      update(session.compose(partition, elapsed()));
      decisionStarted.current = performance.now();
    } catch {
      setError("A composição não está mais disponível. Confira a rodada e tente novamente.");
    }
  };
  const act = (action: Action) => {
    try {
      update(session.act(action, elapsed()));
      decisionStarted.current = performance.now();
    } catch {
      setError("Essa ação não está mais disponível. Confira a mão atual.");
    }
  };
  const resolveDealer = () => {
    try {
      update(session.resolveDealer());
    } catch {
      setError("O dealer ainda não pode ser resolvido. Confira a fase da rodada.");
    }
  };

  const options = view.phase === "compose" ? partitions(view.originalCards) : [];
  const completeScore = roundScore ?? (view.settlement ? view.settlement.luz.score + view.settlement.sombra.score : null);

  return (
    <section className="game-table" aria-labelledby="table-title">
      <div className="table-heading">
        <div>
          <p className="eyebrow">NOITE · RODADA {roundNumber}</p>
          <h2 id="table-title">Mesa Duas Faces</h2>
        </div>
        <div className="scoreboard" aria-label="Placar da Noite">
          <span>Pontuação da Noite</span>
          <strong>{scoreText(nightScore)}</strong>
        </div>
      </div>

      <p className="phase-status" role="status" aria-live="polite">{phaseLabel(view)}</p>
      {error && <p className="recoverable-error" role="alert">{error}</p>}

      <section className="dealer-area" aria-labelledby="dealer-title">
        <h3 id="dealer-title">Dealer</h3>
        <Cards cards={[view.dealerUp, ...(view.phase === "complete" && view.dealerHole ? [view.dealerHole] : [])]} label="Cartas visíveis do dealer" />
        {view.phase !== "complete" && <p className="muted">Uma carta permanece fechada até o fim da rodada.</p>}
        {view.phase === "complete" && view.dealerHole && (
          <p>Dealer revelou {view.dealerHole.rank}. Total final: {view.settlement?.luz.dealerTotal}.</p>
        )}
      </section>

      {view.phase === "compose" && (
        <section aria-labelledby="compose-title">
          <h3 id="compose-title">Composição</h3>
          <p>Distribua as quatro cartas entre as duas mãos. A ordem Luz/Sombra segue a mesa.</p>
          <Cards cards={view.originalCards} label="Quatro cartas para compor" />
          <fieldset className="composition-options">
            <legend>Composições disponíveis</legend>
            {options.map((partition, index) => {
              const luz = partition.luz.map((cardIndex) => view.originalCards[cardIndex]!.rank).join(" + ");
              const sombra = partition.sombra.map((cardIndex) => view.originalCards[cardIndex]!.rank).join(" + ");
              return (
                <label className="composition-choice" key={index}>
                  <input
                    type="radio"
                    name="composition"
                    value={index}
                    checked={selected === index}
                    onChange={() => setSelected(index)}
                  />
                  <span><strong>Composição {index + 1}</strong><br />Luz: {luz} · Sombra: {sombra}</span>
                </label>
              );
            })}
          </fieldset>
          <button type="button" onClick={() => choose(options[selected]!)}>
            Confirmar composição
          </button>
        </section>
      )}

      {view.hands && (
        <div className="hands-grid">
          {(["luz", "sombra"] as const).map((name) => {
            const hand = view.hands![name];
            const result = view.settlement?.[name];
            return (
              <section className={`hand-panel ${view.currentHand === name ? "active-hand" : ""}`} key={name} aria-labelledby={`${name}-title`}>
                <h3 id={`${name}-title`}>{name === "luz" ? "Luz" : "Sombra"}</h3>
                <Cards cards={hand.cards} label={`Cartas da mão ${name === "luz" ? "Luz" : "Sombra"}`} />
                <p>Exposição: {hand.exposure} · Estado: {statusLabels[hand.status]}</p>
                {result && <p className="hand-result">{outcomeLabels[result.outcome]} · {scoreText(result.score)} pontos</p>}
              </section>
            );
          })}
        </div>
      )}

      {view.phase === "player" && (
        <div className="action-row" aria-label={`Ações para ${view.currentHand === "luz" ? "Luz" : "Sombra"}`}>
          {view.legalActions.map((action) => (
            <button type="button" key={action} onClick={() => act(action)}>{actionLabels[action]}</button>
          ))}
        </div>
      )}
      {view.phase === "dealer" && <button type="button" onClick={resolveDealer}>Resolver dealer</button>}
      {view.phase === "complete" && (
        <section className="round-summary" aria-label="Resultado da rodada">
          {view.naturalPeek && <p>Natural do dealer: as mãos foram liquidadas pela regra experimental.</p>}
          <p>Pontuação da rodada: {completeScore === null ? "—" : scoreText(completeScore)}</p>
          <div className="landing-actions">
            <button type="button" onClick={onNextRound}>Próxima rodada</button>
            <button type="button" className="secondary-action" onClick={onNewNight}>Nova Noite</button>
          </div>
        </section>
      )}
    </section>
  );
}
