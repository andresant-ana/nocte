import { useState } from "react";
import type { HandName } from "@nocte/engine";
import type { PublicBankrollA1a } from "./bankroll-a1a-session";

type Props = {
  bankroll: PublicBankrollA1a;
  onSign: (pact: "veil" | "iron", face?: HandName) => void;
  onRefuse: () => void;
  onAbandon: () => void;
};

export function PactOfferTable({ bankroll, onSign, onRefuse, onAbandon }: Props) {
  const [face, setFace] = useState<HandName | "">("");
  return <section className="game-table viewport-table pact-offer-table" data-game-phase="pact-offer" aria-labelledby="pact-offer-title">
    <header className="table-heading">
      <div className="table-title-block">
        <p className="eyebrow">ATO II · RODADAS 4–7</p>
        <h2 id="pact-offer-title">Escolha um Pacto ou recuse</h2>
        <p className="table-profile">PACT-LAB-0.1 · EXPERIMENTAL · escolha antes da aposta e do sorteio</p>
      </div>
      <div className="table-hud">
        <div className="hud-stat" aria-label="Banca A1a"><span>Banca</span><strong>{bankroll.balance} fichas</strong></div>
        <div className="hud-stat" aria-label="Foco restante"><span>Foco</span><strong>{bankroll.focusRemaining} de {bankroll.focusTotal}</strong></div>
        <button type="button" className="hud-button secondary-action" onClick={() => { if (window.confirm(`Encerrar esta Noite? As ${bankroll.balance} fichas fictícias expirarão, sem reembolso ou persistência.`)) onAbandon(); }}>Encerrar Noite</button>
      </div>
    </header>
    <p className="phase-status" role="status">A escolha não vê cartas futuras e não altera banca, aposta, Foco ou pontuação.</p>
    <section className="pact-offer-options" aria-label="Opções de Pacto">
      <article className="table-zone pact-option">
        <h3>Véu</h3>
        <p><strong>Renúncia:</strong> nas rodadas 4–7, a carta aberta do dealer fica oculta até confirmar Luz e Sombra.</p>
        <p><strong>Privilégio:</strong> uma Leitura gratuita em janela legal à sua escolha durante o Ato. Não consome Foco.</p>
        <button type="button" onClick={() => onSign("veil")}>Assinar Véu</button>
      </article>
      <article className="table-zone pact-option">
        <h3>Ferro</h3>
        <p><strong>Renúncia:</strong> Dobrar fica indisponível para a Face escolhida nas rodadas 4–7.</p>
        <p><strong>Privilégio:</strong> uma Manobra gratuita em janela e mão elegíveis. Uma Manobra normal paga continua disponível para guardar este Privilégio.</p>
        <fieldset>
          <legend>Face da Renúncia</legend>
          <label><input type="radio" name="iron-face" value="luz" checked={face === "luz"} onChange={() => setFace("luz")} /> Luz</label>
          <label><input type="radio" name="iron-face" value="sombra" checked={face === "sombra"} onChange={() => setFace("sombra")} /> Sombra</label>
        </fieldset>
        <button type="button" disabled={!face} onClick={() => { if (face) onSign("iron", face); }}>Assinar Ferro</button>
      </article>
      <article className="table-zone pact-option pact-refuse">
        <h3>Recusar ambos</h3>
        <p>Sem Renúncia nem Privilégio; a Noite segue com regras e Foco A1a usuais.</p>
        <button type="button" className="secondary-action" onClick={onRefuse}>Recusar Pactos</button>
      </article>
    </section>
  </section>;
}
