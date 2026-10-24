import { useState } from "react";
import type { HandName } from "@nocte/engine";
import type { PublicBankrollA1a } from "./bankroll-a1a-session";
import { PACT_BOOK_PACTS, type PactId } from "@nocte/engine/pact-book";

type Props = {
  bankroll: PublicBankrollA1a;
  onSign: (pact: "veil" | "iron" | PactId, face?: HandName) => void;
  onRefuse: () => void;
  onAbandon: () => void;
  options?: readonly PactId[];
  version?: string;
  actLabel?: string;
  family?: string | null;
};

export function PactOfferTable({ bankroll, onSign, onRefuse, onAbandon, options = ["veil", "iron"], version = "PACT-LAB-0.1", actLabel = "ATO II · RODADAS 4–7", family }: Props) {
  const [face, setFace] = useState<HandName | "">("");
  const names: Record<string, string> = { veil: "Véu", iron: "Ferro", lighthouse: "Farol", impetus: "Ímpeto", vigil: "Vigília", flare: "Fulgor" };
  const legacy: Record<string, { privilege: string; renunciation: string }> = {
    veil: { privilege: "Uma Leitura gratuita em uma janela legal do Ato. Não consome Foco.", renunciation: "A carta aberta do dealer fica oculta até confirmar Luz e Sombra." },
    iron: { privilege: "Uma Manobra gratuita; a Manobra paga continua disponível para preservar este Privilégio.", renunciation: "A Face escolhida não pode Dobrar durante o Ato." },
  };
  return <section className="game-table viewport-table pact-offer-table" data-game-phase="pact-offer" data-pact-family={family ?? undefined} aria-labelledby="pact-offer-title">
    <header className="table-heading">
      <div className="table-title-block">
        <p className="eyebrow">{actLabel}</p>
        <h2 id="pact-offer-title">Escolha um Pacto ou recuse</h2>
        <p className="table-profile">{version} · EXPERIMENTAL · escolha antes da aposta e do sorteio</p>
      </div>
      <div className="table-hud">
        <div className="hud-stat" aria-label="Banca A1a"><span>Banca</span><strong>{bankroll.balance} fichas</strong></div>
        <div className="hud-stat" aria-label="Foco restante"><span>Foco</span><strong>{bankroll.focusRemaining} de {bankroll.focusTotal}</strong></div>
        <button type="button" className="hud-button secondary-action" onClick={() => { if (window.confirm(`Encerrar esta Noite? As ${bankroll.balance} fichas fictícias expirarão, sem reembolso ou persistência.`)) onAbandon(); }}>Encerrar Noite</button>
      </div>
    </header>
    <p className="phase-status" role="status">A escolha não vê cartas futuras e não altera banca, aposta, Foco ou pontuação.</p>
    <section className="pact-offer-options" aria-label="Opções de Pacto">
      {options.map(id => {
        const pact = PACT_BOOK_PACTS[id as PactId];
        const details = pact ?? legacy[id]!;
        const needsFace = id === "iron";
        return <article className="table-zone pact-option" key={id}>
          <h3>{names[id] ?? id}</h3>
          <p><strong>Privilégio:</strong> {details.privilege}</p>
          <p><strong>Renúncia:</strong> {details.renunciation}</p>
          <p>Vigência: quatro rodadas deste Ato · um Privilégio.</p>
          {needsFace && <fieldset>
            <legend>Face afetada pela Renúncia</legend>
            <label><input type="radio" name="iron-face" value="luz" checked={face === "luz"} onChange={() => setFace("luz")} /> Luz</label>
            <label><input type="radio" name="iron-face" value="sombra" checked={face === "sombra"} onChange={() => setFace("sombra")} /> Sombra</label>
          </fieldset>}
          <button type="button" disabled={needsFace && !face} onClick={() => onSign(id as PactId, needsFace ? face as HandName : undefined)}>Assinar {names[id] ?? id}</button>
        </article>;
      })}
      <article className="table-zone pact-option pact-refuse">
        <h3>Recusar ambos</h3>
        <p>Sem Renúncia nem Privilégio; a Noite segue com regras e Foco A1a usuais.</p>
        <button type="button" className="secondary-action" onClick={onRefuse}>Recusar Pactos</button>
      </article>
    </section>
  </section>;
}
