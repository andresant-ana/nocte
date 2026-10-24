import { useState } from "react";
import {
  serializePactPlaytest,
  type PactPlaytestAnswer, type PactPlaytestAnswers, type PactPlaytestClarity, type PactPlaytestExport,
} from "./pact-playtest";

type Props = Readonly<{
  data: PactPlaytestExport;
  onAnswers: (answers: PactPlaytestAnswers) => void;
  onClear: () => void;
  onExit: () => void;
}>;

const questions: readonly Readonly<{ key: Exclude<keyof PactPlaytestAnswers, "leastClearOffer">; label: string }>[] = [
  { key: "understoodBeforeSigning", label: "Compreendi o Privilégio e a Renúncia antes de assinar." },
  { key: "renunciationAffectedPlay", label: "A Renúncia influenciou alguma jogada minha." },
  { key: "privilegeTimingInteresting", label: "Decidir quando usar o Privilégio tornou a Noite mais interessante." },
  { key: "wantsAnotherNight", label: "Quero jogar outra Noite." },
];
const answers: readonly Readonly<{ value: PactPlaytestAnswer; label: string }>[] = [
  { value: "1", label: "1" }, { value: "2", label: "2" }, { value: "3", label: "3" },
  { value: "4", label: "4" }, { value: "5", label: "5" }, { value: "unknown", label: "Não sei" },
];

function download(data: PactPlaytestExport): void {
  const blob = new Blob([serializePactPlaytest(data)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "nocte-pact-playtest.json";
  anchor.click();
  URL.revokeObjectURL(url);
}

export function PactPlaytestSurvey({ data, onAnswers, onClear, onExit }: Props) {
  const [draft, setDraft] = useState<PactPlaytestAnswers>(data.answers);
  const choose = (key: keyof PactPlaytestAnswers, value: PactPlaytestAnswer | PactPlaytestClarity) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    onAnswers(next);
  };
  return <main className="landing-shell playtest-survey" data-testid="pact-playtest-survey">
    <p className="eyebrow">PLAYTEST LOCAL · PACT-BOOK-0.1</p>
    <h1>Como foi a Noite?</h1>
    <p className="local-notice">Questionário opcional. Respostas e eventos ficam nesta página, em memória, sem envio pelo jogo. O provedor pode registrar dados técnicos do acesso. Fechar ou recarregar apaga os dados não exportados.</p>
    <p role="status">Noite {data.status === "complete" ? "concluída" : "abandonada"} · {data.events.length} eventos públicos registrados.</p>
    <form onSubmit={(event) => event.preventDefault()}>
      {questions.map(question => <fieldset className="playtest-question" key={question.key}>
        <legend>{question.label}</legend>
        <div className="playtest-scale">
          {answers.map(option => <label key={option.value}>
            <input type="radio" name={question.key} value={option.value} checked={draft[question.key] === option.value}
              onChange={() => choose(question.key, option.value)} /> {option.label}
          </label>)}
        </div>
      </fieldset>)}
      <fieldset className="playtest-question">
        <legend>Qual oferta pareceu menos clara?</legend>
        <div className="playtest-scale">
          {([
            ["act-ii", "Ato II"], ["act-iii", "Ato III"], ["neither", "Nenhuma"], ["unknown", "Não sei"],
          ] as const).map(([value, label]) => <label key={value}>
            <input type="radio" name="leastClearOffer" value={value} checked={draft.leastClearOffer === value}
              onChange={() => choose("leastClearOffer", value)} /> {label}
          </label>)}
        </div>
      </fieldset>
    </form>
    <div className="landing-actions playtest-actions">
      <button type="button" onClick={() => download({ ...data, answers: draft })}>Exportar JSON</button>
      <button type="button" className="secondary-action" onClick={onClear}>Limpar dados</button>
      <button type="button" className="secondary-action" onClick={onExit}>Voltar à configuração</button>
    </div>
  </main>;
}
