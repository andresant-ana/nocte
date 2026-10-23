import { useRef, useState } from "react";
import {
  DF_SYM_01_1_TO_1,
  DF_SYM_01_3_TO_2,
  type PublicRound,
  type RuleProfile,
} from "@nocte/engine";
import { CF_LAB_01_1_TO_1, CF_LAB_01_3_TO_2, type CofreFocoRules, type PublicCofreFocoNight } from "@nocte/engine/cofre-foco";
import { CofreFocoTable } from "./game/CofreFocoTable";
import { CofreFocoSessionAdapter } from "./game/cofre-foco-session";
import { BankrollA0SessionAdapter } from "./game/bankroll-a0-session";
import { GameTable } from "./game/GameTable";
import { SoloRoundController } from "./game/controller";
import { prepareCofreFocoRound, prepareP5CofreFocoRound, prepareRound } from "./game/random";
import { StudyFlow } from "./study/StudyFlow";

type ProfileId = RuleProfile["id"];
type GameMode = "basic" | "cofre-foco" | "bankroll-a0" | "p5-audiovisual";
type ActiveBasic = { mode: "basic"; controller: SoloRoundController; view: PublicRound; profile: RuleProfile; roundNumber: number };
type ActiveCofreFoco = { mode: "cofre-foco" | "p5-audiovisual"; audiovisual: boolean; controller: CofreFocoSessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; horizon: number; seed: string };
type ActiveBankrollA0 = { mode: "bankroll-a0"; controller: BankrollA0SessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; seed: string };
type ActiveGame = ActiveBasic | ActiveCofreFoco | ActiveBankrollA0;
const getProfile = (id: ProfileId): RuleProfile => id === DF_SYM_01_1_TO_1.id ? DF_SYM_01_1_TO_1 : DF_SYM_01_3_TO_2;
const getCofreFocoRules = (profile: ProfileId): CofreFocoRules => profile === DF_SYM_01_1_TO_1.id ? CF_LAB_01_1_TO_1 : CF_LAB_01_3_TO_2;

function localSeed(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function App() {
  const [profile, setProfile] = useState<ProfileId>(DF_SYM_01_3_TO_2.id);
  const [mode, setMode] = useState<GameMode>("basic");
  const [horizon, setHorizon] = useState<5 | 10 | 20>(10);
  const [active, setActive] = useState<ActiveGame | null>(null);
  const [nightScore, setNightScore] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showStudy, setShowStudy] = useState(false);
  const scoreApplied = useRef(false);

  const startBasicNight = async (selectedProfile = profile) => {
    setError(null);
    try {
      const nextNumber = 1;
      const rules = getProfile(selectedProfile);
      const prepared = await prepareRound(localSeed(), nextNumber - 1, rules);
      const controller = SoloRoundController.start(prepared);
      setNightScore(0);
      setRoundNumber(nextNumber);
      scoreApplied.current = false;
      setActive({ mode: "basic", controller, view: controller.current, profile: rules, roundNumber: nextNumber });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a rodada.");
    }
  };

  const startCofreFocoNight = async () => {
    setError(null);
    try {
      const seed = localSeed();
      const rules = getCofreFocoRules(profile);
      const prepared = await prepareCofreFocoRound(seed, 0);
      const controller = CofreFocoSessionAdapter.start(prepared, rules, horizon);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "cofre-foco", audiovisual: false, controller, view: controller.current, rules, horizon, seed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a Noite experimental.");
    }
  };

  const startP5Night = async () => {
    setError(null);
    try {
      const seed = localSeed();
      const rules = getCofreFocoRules(profile);
      const prepared = await prepareP5CofreFocoRound(seed, 0);
      const controller = CofreFocoSessionAdapter.start(prepared, rules, 10);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "p5-audiovisual", audiovisual: true, controller, view: controller.current, rules, horizon: 10, seed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a Noite audiovisual experimental.");
    }
  };

  const startBankrollA0Night = async () => {
    setError(null);
    try {
      const seed = localSeed();
      const rules = getCofreFocoRules(profile);
      const prepared = await prepareCofreFocoRound(seed, 0);
      const controller = BankrollA0SessionAdapter.start(prepared, rules, seed);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "bankroll-a0", controller, view: controller.current, rules, seed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a Noite A0.1.");
    }
  };

  const startSelectedNight = () => {
    if (mode === "basic") void startBasicNight();
    else if (mode === "cofre-foco") void startCofreFocoNight();
    else if (mode === "bankroll-a0") void startBankrollA0Night();
    else void startP5Night();
  };

  const nextBasicRound = async () => {
    if (!active || active.mode !== "basic") return;
    setError(null);
    try {
      const nextNumber = active.roundNumber + 1;
      const prepared = await prepareRound(localSeed(), nextNumber - 1, active.profile);
      const controller = SoloRoundController.start(prepared);
      setRoundNumber(nextNumber);
      scoreApplied.current = false;
      setActive({ ...active, controller, view: controller.current, roundNumber: nextNumber });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a próxima rodada.");
    }
  };

  const nextCofreFocoRound = async () => {
    if (!active || (active.mode !== "cofre-foco" && active.mode !== "p5-audiovisual")) return;
    setError(null);
    try {
      const nextIndex = active.view.completedRounds;
      const prepared = active.audiovisual
        ? await prepareP5CofreFocoRound(active.seed, nextIndex)
        : await prepareCofreFocoRound(active.seed, nextIndex);
      const view = active.controller.nextRound(prepared);
      setActive({ ...active, view });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a próxima rodada.");
    }
  };

  const nextBankrollA0Round = async () => {
    if (!active || active.mode !== "bankroll-a0") return;
    setError(null);
    try {
      const nextIndex = active.view.completedRounds;
      const prepared = await prepareCofreFocoRound(active.seed, nextIndex);
      const view = active.controller.nextRound(prepared);
      setActive({ ...active, view });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a próxima rodada A0.1.");
    }
  };

  const onBasicRoundChange = (view: PublicRound) => {
    setActive((current) => current?.mode === "basic" ? { ...current, view } : current);
    if (view.phase === "complete" && active?.mode === "basic" && !scoreApplied.current) {
      scoreApplied.current = true;
      setNightScore((score) => score + active.controller.score());
    }
  };

  const onCofreFocoNightChange = (view: PublicCofreFocoNight) => {
    setActive((current) => current && (current.mode === "cofre-foco" || current.mode === "p5-audiovisual") ? { ...current, view } : current);
  };

  const onBankrollA0NightChange = (view: PublicCofreFocoNight) => {
    setActive((current) => current?.mode === "bankroll-a0"
      ? { ...current, view }
      : current);
  };

  const returnToSetup = () => {
    setActive(null);
    setNightScore(0);
    setRoundNumber(0);
    scoreApplied.current = false;
    setError(null);
  };

  if (showStudy) {
    return <StudyFlow profile={getProfile(profile)} onDecline={() => { setShowStudy(false); void startBasicNight(profile); }} onExit={() => setShowStudy(false)} />;
  }

  if (active?.mode === "basic") {
    return (
      <main className="app-shell">
        <GameTable
          key={`free-round-${active.roundNumber}`}
          session={active.controller}
          round={active.view}
          onRoundChange={onBasicRoundChange}
          roundNumber={active.roundNumber}
          profileLabel={active.profile.naturalPayout}
          nightScore={nightScore}
          {...(active.view.phase === "complete" ? { roundScore: active.controller.score() } : {})}
          onNextRound={() => void nextBasicRound()}
          onNewNight={returnToSetup}
        />
        {error && <p role="alert" className="recoverable-error">{error}</p>}
        <button className="text-button" type="button" onClick={returnToSetup}>Encerrar Noite</button>
      </main>
    );
  }

  if (active?.mode === "cofre-foco" || active?.mode === "p5-audiovisual") {
    return (
      <main className={`app-shell${active.audiovisual ? " p5-experience" : ""}`}>
        <CofreFocoTable
          key={`cofre-foco-round-${active.view.roundNumber}`}
          session={active.controller}
          night={active.view}
          rules={active.rules}
          error={error}
          onNightChange={onCofreFocoNightChange}
          onNextRound={() => void nextCofreFocoRound()}
          onReturnToSetup={returnToSetup}
          audiovisual={active.audiovisual}
        />
      </main>
    );
  }

  if (active?.mode === "bankroll-a0") {
    return (
      <main className="app-shell">
        <CofreFocoTable
          key={`bankroll-a0-round-${active.view.roundNumber}`}
          session={active.controller}
          night={active.view}
          rules={active.rules}
          error={error}
          bankroll={active.controller.bankroll}
          onNightChange={onBankrollA0NightChange}
          onNextRound={() => void nextBankrollA0Round()}
          onReturnToSetup={returnToSetup}
        />
      </main>
    );
  }

  return (
    <main className={`landing-shell${mode === "p5-audiovisual" ? " p5-landing" : ""}`}>
      <p className="eyebrow">PROTÓTIPO SOLO · LABORATÓRIO LOCAL</p>
      <h1>NOCTE</h1>
      <p className="subtitle">Duas Faces</p>
      <p className="local-notice">Jogo solo, executado localmente neste navegador. Escolha o modo antes de cada Noite.</p>

      <div className="setup-fields">
        <label className="profile-label" htmlFor="game-mode">Modo de jogo</label>
        <select id="game-mode" aria-label="Modo de jogo" value={mode} onChange={(event) => setMode(event.target.value as GameMode)}>
          <option value="basic">Duas Faces básico · DF-SYM-0.1 · EXPERIMENTAL</option>
          <option value="cofre-foco">Cofre + Foco solo · DF-CF-0.1-lab · EXPERIMENTAL</option>
          <option value="bankroll-a0">Cofre + Foco · banca fictícia A0.1 · EXPERIMENTAL</option>
          <option value="p5-audiovisual">NOCTE P5 · experiência audiovisual · EXPERIMENTAL</option>
        </select>
        <p className="mode-explanation">
          {mode === "basic"
            ? "Quatro cartas para compor Luz e Sombra. Este é o baseline do protótipo e o único modo do protocolo P2A."
              : mode === "cofre-foco"
              ? "Quinta carta aberta no Cofre e 3 Focos compartilhados por Noite. Leitura e Manobra são opcionais; esta configuração continua experimental."
              : mode === "bankroll-a0"
                ? "Variação local e temporária sobre Cofre + Foco, com banca fictícia isolada e sem persistência. As regras experimentais do motor permanecem as mesmas."
                : "Primeiro laboratório audiovisual, sem apostas ou banca. Cartas ilustradas e naipes usam o motor Cofre + Foco existente sem alterar valores, probabilidades, score ou resultados; A1a virá no Marco 2 e o áudio começa desligado."
          }
        </p>

        <label className="profile-label" htmlFor="rule-profile">Perfil experimental de natural</label>
        <select id="rule-profile" aria-label="Perfil experimental de regras" value={profile} onChange={(event) => setProfile(event.target.value as ProfileId)}>
          <option value={DF_SYM_01_3_TO_2.id}>Natural paga 3:2</option>
          <option value={DF_SYM_01_1_TO_1.id}>Natural paga 1:1</option>
        </select>
        <p className="experimental-note">Os dois modos e os perfis de pagamento são EXPERIMENTAIS.</p>

        {mode === "bankroll-a0" && <p className="mode-explanation">Banca fictícia reiniciada em 150 fichas por Noite, 10 rodadas e cobertura reservada de 40 por rodada financiada. Se o saldo ficar abaixo de 40 entre rodadas, a Noite continua em prática gratuita. Nada persiste após sair.</p>}

        {(mode === "cofre-foco") && <>
          <label className="profile-label" htmlFor="night-horizon">Duração da Noite experimental</label>
          <select id="night-horizon" aria-label="Duração da Noite experimental" value={horizon} onChange={(event) => setHorizon(Number(event.target.value) as 5 | 10 | 20)}>
            <option value={10}>10 rodadas · principal</option>
            <option value={5}>5 rodadas · diagnóstico</option>
            <option value={20}>20 rodadas · diagnóstico</option>
          </select>
          <p className="mode-explanation">A seleção de modo, pagamento e duração fica bloqueada durante a Noite.</p>
        </>}
      </div>

      {error && <p role="alert" className="recoverable-error">{error}</p>}
      <div className="landing-actions">
        <button type="button" onClick={startSelectedNight}>Jogar livre</button>
        {mode === "basic"
          ? <button type="button" className="secondary-action" onClick={() => setShowStudy(true)}>Iniciar estudo P2A</button>
          : <p className="study-mode-note">O protocolo P2A só está disponível no modo Duas Faces básico e não avalia Cofre + Foco nem a banca A0.1.</p>
        }
      </div>
    </main>
  );
}
