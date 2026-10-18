import { useRef, useState } from "react";
import { type RuleProfile } from "@nocte/engine";
import type { PublicRound } from "@nocte/engine";
import { GameTable } from "../game/GameTable";
import { SoloRoundController } from "../game/controller";
import { prepareRound } from "../game/random";
import { downloadRecords } from "./export";
import { poolsForRules, type PlaytestScenario } from "./pools";
import type { CompletedRoundRecord, PoolStage, QuestionnaireAnswers, QuestionnaireKey } from "./protocol";
import { buildCompletedRoundRecord } from "./recorder";

type StudyFlowProps = {
  profile: RuleProfile;
  onDecline: () => void;
  onExit: () => void;
};
type FlowStage = "briefing" | PoolStage | "teaching-card" | "questionnaire" | "summary" | "withdrawn";
type ActiveStudyRound = {
  controller: SoloRoundController;
  view: PublicRound;
  entry: PlaytestScenario;
  stage: PoolStage;
  ordinal: number;
};

const stageLabels: Record<PoolStage, string> = {
  familiarization: "Familiarização",
  teaching: "Exercício de ensino",
  assessment: "Avaliação sem dicas",
};
const questionOptions: Readonly<Record<QuestionnaireKey, readonly string[]>> = {
  understanding: ["Compreendi as regras", "Compreendi a maior parte", "Ainda tenho dúvidas"],
  meaningfulChoice: ["1 — nada significativa", "2", "3", "4", "5 — muito significativa"],
  repetition: ["Não pareceu repetitivo", "Um pouco repetitivo", "Muito repetitivo"],
  confidence: ["1 — nada confiante", "2", "3", "4", "5 — muito confiante"],
  timeBurden: ["Tranquilo", "Um pouco longo", "Longo demais"],
  replayInterest: ["Sim", "Talvez", "Não"],
};
const questionLabels: Readonly<Record<QuestionnaireKey, string>> = {
  understanding: "Como você avalia sua compreensão das regras?",
  meaningfulChoice: "Quão significativa pareceu a escolha de composição?",
  repetition: "Como percebeu repetição ou rotina?",
  confidence: "Quão confiante se sentiu nas escolhas?",
  timeBurden: "Como percebeu o tempo exigido pelas decisões?",
  replayInterest: "Você jogaria outra sessão voluntariamente?",
};
const questionKeys = Object.keys(questionLabels) as QuestionnaireKey[];

export function StudyFlow({ profile, onDecline, onExit }: StudyFlowProps) {
  const pools = poolsForRules(profile.id);
  const [stage, setStage] = useState<FlowStage>("briefing");
  const [active, setActive] = useState<ActiveStudyRound | null>(null);
  const [records, setRecords] = useState<CompletedRoundRecord[]>([]);
  const [totalScore, setTotalScore] = useState(0);
  const [answers, setAnswers] = useState<QuestionnaireAnswers>({});
  const [consented, setConsented] = useState(false);
  const consentRef = useRef(false);
  const dataGeneration = useRef(0);
  const [suggestions, setSuggestions] = useState(false);
  const [recordPending, setRecordPending] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const completedRoundKey = useRef<string | null>(null);
  const scoredRounds = useRef(new Set<string>());

  const startScenario = async (scenarioStage: PoolStage, index: number) => {
    setLoading(true);
    setMessage(null);
    try {
      const entry = pools[scenarioStage][index];
      if (!entry) throw new Error("O cenário solicitado não existe neste catálogo.");
      const prepared = await prepareRound(entry.seed, entry.index, profile);
      const controller = SoloRoundController.start(prepared);
      completedRoundKey.current = null;
      setActive({ controller, view: controller.current, entry, stage: scenarioStage, ordinal: index });
      setStage(scenarioStage);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível preparar o cenário.");
    } finally {
      setLoading(false);
    }
  };

  const acceptConsent = () => {
    consentRef.current = true;
    setConsented(true);
    void startScenario("familiarization", 0);
  };

  const withdrawConsent = () => {
    dataGeneration.current += 1;
    consentRef.current = false;
    setConsented(false);
    setAnswers({});
    setActive(null);
    setStage("withdrawn");
    setRecordPending(false);
    setMessage("Consentimento retirado. Nenhuma rodada posterior será adicionada ao registro.");
  };

  const onRoundChange = (view: PublicRound) => {
    setActive((current) => current ? { ...current, view } : current);
    if (view.phase === "complete" && active) {
      const scoreKey = `${active.entry.seed}:${active.entry.index}`;
      if (!scoredRounds.current.has(scoreKey)) {
        scoredRounds.current.add(scoreKey);
        setTotalScore((current) => current + active.controller.score());
      }
    }
    if (view.phase !== "complete" || !active || !consentRef.current) return;
    const key = `${active.entry.seed}:${active.entry.index}`;
    if (completedRoundKey.current === key) return;
    const details = active.controller.completedDetails();
    if (!details) return;
    completedRoundKey.current = key;
    const generationAtSettlement = dataGeneration.current;
    setRecordPending(true);
    void buildCompletedRoundRecord(details, active.entry, active.stage, profile).then((record) => {
      if (consentRef.current && generationAtSettlement === dataGeneration.current) {
        setRecords((current) => [...current, record]);
      }
    }).catch((cause: unknown) => {
      setMessage(cause instanceof Error ? cause.message : "Não foi possível calcular os dados pós-rodada.");
    }).finally(() => setRecordPending(false));
  };

  const advance = () => {
    if (!active || recordPending || loading) return;
    if (active.stage === "familiarization") {
      if (active.ordinal < 2) void startScenario("familiarization", active.ordinal + 1);
      else { setActive(null); setStage("teaching-card"); }
      return;
    }
    if (active.stage === "teaching") {
      void startScenario("assessment", 0);
      return;
    }
    if (active.ordinal < 8) void startScenario("assessment", active.ordinal + 1);
    else { setActive(null); setStage("questionnaire"); }
  };

  const updateAnswer = (key: QuestionnaireKey, value: string) => setAnswers((current) => ({ ...current, [key]: value }));
  const clearData = () => {
    if (!window.confirm("Apagar todos os registros e respostas desta sessão? Esta ação não pode ser desfeita.")) return;
    dataGeneration.current += 1;
    setRecords([]);
    setAnswers({});
    setMessage("Registros e respostas apagados desta sessão.");
  };
  const exit = () => {
    dataGeneration.current += 1;
    consentRef.current = false;
    onExit();
  };

  if (stage === "briefing") {
    return (
      <main className="landing-shell study-briefing">
        <p className="eyebrow">PROTOCOLO P2A-STUDY-V1 · LOCAL</p>
        <h1>Estudo local</h1>
        <p className="local-notice">Participação opcional. Não pedimos nome, contato ou texto livre. Dados só ficam nesta página e só são registrados após uma rodada concluída, se você concordar.</p>
        <section className="briefing-copy" aria-label="Regras experimentais">
          <h2>Como jogar</h2>
          <ul>
            <li>Distribua as quatro cartas visíveis entre duas mãos de duas cartas: Luz e Sombra.</li>
            <li>As duas mãos enfrentam o mesmo dealer. A carta aberta do dealer fica visível durante a composição.</li>
            <li>Ás vale 1 ou 11; compre para receber uma carta, pare para manter o total ou dobre a exposição e receba exatamente uma carta.</li>
            <li>O dealer para em 17, incluindo 17 suave. Empate devolve a exposição daquela mão.</li>
            <li>Natural é 21 com duas cartas (Ás + 10). Depois da composição, o motor verifica natural do dealer; se ocorrer, a rodada termina imediatamente: uma mão natural empata e as demais perdem a exposição inicial. Quando não há natural do dealer, o natural do jogador recebe o pagamento experimental escolhido e vence um 21 não-natural do dealer.</li>
          </ul>
          <p>Perfil escolhido: <strong>{profile.naturalPayout}</strong>. As regras DF-SYM-0.1 e o pagamento de natural são experimentais e não ratificados.</p>
        </section>
        <p>Primeiro haverá três rodadas sem dicas. Depois você poderá ver um cartão didático experimental e praticar um exemplo, ou pular essa etapa. A avaliação final usa nove cenários separados, sem sugestões.</p>
        <p>Registros podem incluir sementes e decisões, mas só ficam no estado desta página depois da conclusão. Você controla a exportação e a exclusão. Fechar ou recarregar a página descarta os dados não exportados.</p>
        {message && <p role="alert" className="recoverable-error">{message}</p>}
        <div className="landing-actions">
          <button type="button" onClick={acceptConsent} disabled={loading}>Concordo e iniciar estudo</button>
          <button type="button" className="secondary-action" onClick={onDecline}>Declinar e jogar livre</button>
        </div>
        <button className="text-button" type="button" onClick={onExit}>Voltar ao início</button>
      </main>
    );
  }

  if (stage === "teaching-card") {
    return (
      <main className="landing-shell study-stage">
        <p className="eyebrow">3 DE 3 · FAMILIARIZAÇÃO CONCLUÍDA</p>
        <h1>Cartão didático opcional</h1>
        <p>Esta etapa testa uma hipótese de ensino; não apresenta uma regra oficial nem promete a melhor composição.</p>
        <label className="suggestion-toggle">
          <input type="checkbox" checked={suggestions} onChange={(event) => setSuggestions(event.target.checked)} />
          Mostrar o cartão experimental
        </label>
        {suggestions && (
          <aside className="teaching-card" aria-label="Dica experimental opcional">
            <strong>Atalho candidato, não regra canônica</strong>
            <p>Estudos de simulação testaram favorecer mãos que formam 11 ou 20 e ajustar a preferência conforme a carta aberta do dealer. São aproximações com exceções e podem escolher uma composição inferior.</p>
            <button type="button" className="secondary-action" onClick={() => setSuggestions(false)}>Desativar dicas</button>
          </aside>
        )}
        <div className="landing-actions">
          <button type="button" onClick={() => void startScenario("teaching", 0)}>Praticar exemplo de ensino</button>
          <button type="button" className="secondary-action" onClick={() => void startScenario("assessment", 0)}>Pular para a avaliação</button>
        </div>
        <button className="text-button" type="button" onClick={withdrawConsent}>Retirar consentimento</button>
      </main>
    );
  }

  if (stage === "questionnaire") {
    return (
      <main className="landing-shell study-stage">
        <p className="eyebrow">AVALIAÇÃO CONCLUÍDA</p>
        <h1>Uma última impressão</h1>
        <p>Respostas opcionais, anônimas e limitadas às alternativas abaixo. Não há campo de texto livre.</p>
        <form className="questionnaire" onSubmit={(event) => { event.preventDefault(); setStage("summary"); }}>
          {questionKeys.map((key) => (
            <label key={key}>
              {questionLabels[key]}
              <select aria-label={questionLabels[key]} value={answers[key] ?? ""} onChange={(event) => updateAnswer(key, event.target.value)}>
                <option value="">Pular esta pergunta</option>
                {questionOptions[key].map((option) => <option key={option} value={option}>{option}</option>)}
              </select>
            </label>
          ))}
          <div className="landing-actions">
            <button type="submit">Salvar e continuar</button>
            <button type="button" className="secondary-action" onClick={() => setStage("summary")}>Pular questionário</button>
          </div>
        </form>
        <button className="text-button" type="button" onClick={withdrawConsent}>Retirar consentimento</button>
      </main>
    );
  }

  const finished = stage === "summary" || stage === "withdrawn";
  return (
    <main className="app-shell study-app" data-study-stage={stage}>
      <header className="study-toolbar">
        <div>
          <p className="eyebrow">P2A-STUDY-V1 · {profile.status}</p>
          <p aria-label="Registros consentidos">Registros consentidos: <strong aria-live="polite">{records.length}</strong></p>
          <p>Dados locais temporários. Semente, valor esperado e arrependimento não aparecem antes do resultado.</p>
        </div>
        {!finished && <div className="study-toolbar-actions">
          <button type="button" disabled={!records.length} onClick={() => downloadRecords("json", records, answers)}>Exportar JSON</button>
          <button type="button" className="secondary-action" disabled={!records.length} onClick={() => downloadRecords("csv", records, answers)}>Exportar CSV</button>
          <button type="button" className="secondary-action" onClick={clearData}>Apagar todos os dados</button>
          {consented && !finished && <button type="button" className="secondary-action" onClick={withdrawConsent}>Retirar consentimento</button>}
        </div>}
      </header>

      {stage === "teaching" && suggestions && (
        <aside className="teaching-card" aria-label="Dica experimental opcional">
          <strong>Atalho candidato, não regra canônica</strong>
          <p>Simulações testaram favorecer totais 11 ou 20 e ajustar escolhas conforme a carta aberta do dealer. Este atalho tem exceções.</p>
          <button type="button" className="secondary-action" onClick={() => setSuggestions(false)}>Desativar dicas</button>
        </aside>
      )}
      {stage === "assessment" && <p className="assessment-notice">Avaliação sem dicas · cenários distintos e estratificados por carta do dealer e diferença de valor esperado.</p>}
      {message && <p role="status" className="recoverable-error">{message}</p>}

      {active && (
        <>
          <p className="study-progress">{stageLabels[active.stage]} · {active.stage === "familiarization" ? active.ordinal + 1 + " de 3" : active.stage === "assessment" ? active.ordinal + 1 + " de 9" : "1 de 1"}</p>
          <GameTable
            key={`${active.entry.seed}:${active.entry.index}`}
            session={active.controller}
            round={active.view}
            onRoundChange={onRoundChange}
            showRulesGuide={false}
            roundNumber={active.ordinal + 1}
            profileLabel={profile.naturalPayout}
            nightScore={totalScore}
            {...(active.view.phase === "complete" ? { roundScore: active.controller.score() } : {})}
            showNewNightButton={false}
            nextDisabled={recordPending || loading}
            onNextRound={advance}
            onNewNight={withdrawConsent}
          />
        </>
      )}

      {stage === "summary" && (
        <section className="landing-shell study-stage" aria-label="Encerramento do estudo">
          <h1>Sessão encerrada</h1>
          <p>{records.length} rodadas concluídas foram registradas nesta página.</p>
          <p>Os registros são descritivos. Este protocolo pequeno não mede retenção, diversão nem equilíbrio competitivo.</p>
          <div className="landing-actions">
            <button type="button" disabled={!records.length} onClick={() => downloadRecords("json", records, answers)}>Exportar JSON</button>
            <button type="button" className="secondary-action" disabled={!records.length} onClick={() => downloadRecords("csv", records, answers)}>Exportar CSV</button>
          </div>
          <button className="text-button" type="button" onClick={withdrawConsent}>Retirar consentimento</button>
          <button className="text-button" type="button" onClick={clearData}>Apagar todos os dados</button>
          {message && <p role="status">{message}</p>}
          <button className="text-button" type="button" onClick={exit}>Encerrar e voltar ao início</button>
        </section>
      )}

      {stage === "withdrawn" && (
        <section className="landing-shell study-stage" aria-label="Consentimento retirado">
          <h1>Consentimento retirado</h1>
          <p>{message} {records.length} registro(s) anterior(es) seguem apenas nesta página para você exportar ou apagar.</p>
          <div className="landing-actions">
            <button type="button" disabled={!records.length} onClick={() => downloadRecords("json", records, answers)}>Exportar JSON</button>
            <button type="button" className="secondary-action" disabled={!records.length} onClick={() => downloadRecords("csv", records, answers)}>Exportar CSV</button>
          </div>
          <button className="text-button" type="button" onClick={clearData}>Apagar todos os dados</button>
          <button className="text-button" type="button" onClick={exit}>Encerrar e voltar ao início</button>
        </section>
      )}

      {loading && <p role="status">Preparando o próximo cenário local…</p>}
      <p className="study-exit-note">Ao sair sem exportar, os dados desta página serão descartados.</p>
    </main>
  );
}
