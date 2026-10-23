import { useState } from "react";
import type { PublicBankrollA1a } from "./bankroll-a1a-session";

type Props = {
  bankroll: PublicBankrollA1a;
  error: string | null;
  onConfirm: (stake: number) => void;
  onPractice: () => void;
  onAbandon: () => void;
};

const denominations = [1, 5, 10, 25] as const;

export function BankrollA1aBettingTable({ bankroll, error, onConfirm, onPractice, onAbandon }: Props) {
  const initial = String(Math.min(bankroll.lastSettlement?.stake ?? bankroll.lastStake ?? 1, Math.max(1, bankroll.maxStake)));
  const [value, setValue] = useState(initial);
  const [history, setHistory] = useState<number[]>([]);
  const stake = /^\d+$/.test(value) ? Number(value) : NaN;
  const canConfirm = bankroll.status === "active" && Number.isSafeInteger(stake) && stake >= 1 && stake <= bankroll.maxStake;

  const add = (amount: number) => {
    setHistory((previous) => [...previous, amount]);
    setValue((previous) => String((/^\d+$/.test(previous) ? Number(previous) : 0) + amount));
  };
  const undo = () => {
    const last = history.at(-1);
    if (last === undefined) return;
    setHistory((previous) => previous.slice(0, -1));
    setValue((previous) => String(Math.max(0, Number(previous) - last)));
  };
  const clear = () => { setValue("0"); setHistory([]); };
  const repeat = () => {
    const last = bankroll.lastSettlement?.stake ?? bankroll.lastStake;
    if (last !== null && last !== undefined) { setValue(String(last)); setHistory([]); }
  };

  return <section className="game-table viewport-table a1a-bet-table" data-game-phase="betting" aria-labelledby="a1a-bet-title">
    <header className="table-heading">
      <div className="table-title-block">
        <p className="eyebrow">NOITE · RODADA {bankroll.completedRounds + 1} DE 10</p>
        <h2 id="a1a-bet-title">Aposta da rodada</h2>
        <p className="table-profile">BANKROLL-LAB-A1a-0.1 · EXPERIMENTAL · Cofre + Foco</p>
      </div>
      <div className="table-hud">
        <div className="hud-stat" aria-label="Banca A1a"><span>Banca</span><strong>{bankroll.balance} fichas</strong></div>
        <div className="hud-stat" aria-label="Placar da Noite"><span>Pontos</span><strong>{bankroll.totalScore < 0 ? `−${Math.abs(bankroll.totalScore)}` : bankroll.totalScore}</strong></div>
        <div className="hud-stat" aria-label="Foco restante"><span>Foco</span><strong>{bankroll.focusRemaining} de {bankroll.focusTotal}</strong></div>
        <div className="hud-stat" aria-label="Rodadas financiadas e prática"><span>Rodadas</span><strong>{bankroll.fundedRounds} + {bankroll.practiceRounds} prática</strong></div>
        <button type="button" className="hud-button secondary-action" onClick={() => { if (window.confirm(`Encerrar esta Noite A1a? As ${bankroll.balance} fichas fictícias expirarão, sem reembolso ou persistência.`)) onAbandon(); }}>Encerrar Noite</button>
      </div>
    </header>
    <div className="table-status-row"><p className="phase-status" role="status" aria-live="polite">
      {bankroll.status === "practice" ? "Prática gratuita: a banca está congelada para o restante desta Noite." : `Escolha entre 1 e ${bankroll.maxStake} fichas por mão antes da distribuição.`}
    </p>{error && <p className="recoverable-error" role="alert">{error}</p>}</div>
    <section className="a1a-bet-board" aria-label="Seleção da aposta">
      {bankroll.status === "practice" ? <div className="table-zone a1a-practice-copy">
        <h3>Prática gratuita</h3>
        <p>O Cofre + Foco continua normalmente. Foco e pontuação estratégica seguem independentes; a banca não muda.</p>
      </div> : <>
        <div className="table-zone a1a-stake-summary">
          <span>Aposta igual por mão</span><strong>{Number.isSafeInteger(stake) ? `${stake} fichas` : "—"}</strong>
          <span>Exposição inicial total</span><strong>{Number.isSafeInteger(stake) ? `${2 * stake} fichas` : "—"}</strong>
          <span>Reserva máxima `R = 4s`</span><strong>{Number.isSafeInteger(stake) ? `${4 * stake} fichas` : "—"}</strong>
          <span>Disponível após reserva</span><strong>{Number.isSafeInteger(stake) ? `${(bankroll.balanceTicks - (8 * stake)) / 2} fichas` : "—"}</strong>
        </div>
        <div className="table-zone a1a-chip-controls">
          <h3>Escolha a exposição</h3>
          <label htmlFor="a1a-stake">Fichas por mão (Luz e Sombra)</label>
          <input id="a1a-stake" inputMode="numeric" type="number" min="1" max={bankroll.maxStake} step="1" value={value} onChange={(event) => { setValue(event.target.value); setHistory([]); }} />
          <div className="a1a-denominations" role="group" aria-label="Adicionar fichas">
            {denominations.map(amount => <button type="button" key={amount} aria-label={`Adicionar ${amount} ficha${amount === 1 ? "" : "s"}`} onClick={() => add(amount)}>+{amount}</button>)}
          </div>
          <div className="a1a-edit-controls">
            <button type="button" className="secondary-action" disabled={!history.length} onClick={undo}>Desfazer</button>
            <button type="button" className="secondary-action" onClick={clear}>Limpar</button>
            <button type="button" className="secondary-action" disabled={bankroll.lastStake === null || (bankroll.lastStake ?? 0) > bankroll.maxStake} onClick={repeat}>Repetir aposta</button>
          </div>
        </div>
      </>}
    </section>
    <section className="table-action-dock a1a-bet-dock" aria-label="Confirmar aposta">
      <p>Depois da confirmação, a aposta fica travada para as duas mãos. O motor continua na exposição-base 10; a banca aplica o score final por `s/10`. Isso não multiplica pontos nem Foco.</p>
      {bankroll.status === "practice"
        ? <button type="button" onClick={onPractice}>Iniciar rodada gratuita</button>
        : <button type="button" disabled={!canConfirm} onClick={() => onConfirm(stake)}>Confirmar aposta e distribuir</button>}
    </section>
  </section>;
}
