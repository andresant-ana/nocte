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
import { BankrollA1aSessionAdapter } from "./game/bankroll-a1a-session";
import { BankrollA1aBettingTable } from "./game/BankrollA1aBettingTable";
import { GameTable } from "./game/GameTable";
import { SoloRoundController } from "./game/controller";
import { prepareCofreFocoRound, prepareP5CofreFocoRound, prepareRound } from "./game/random";
import { StudyFlow } from "./study/StudyFlow";

type ProfileId = RuleProfile["id"];
type GameMode = "basic" | "cofre-foco" | "bankroll-a0" | "p5-cards" | "bankroll-a1a";
type ActiveBasic = { mode: "basic"; controller: SoloRoundController; view: PublicRound; profile: RuleProfile; roundNumber: number };
type ActiveCofreFoco = { mode: "cofre-foco" | "p5-cards"; cardIdentityMode: boolean; controller: CofreFocoSessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; horizon: number; seed: string };
type ActiveBankrollA0 = { mode: "bankroll-a0"; controller: BankrollA0SessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; seed: string };
type ActiveBankrollA1a = { mode: "bankroll-a1a"; controller: BankrollA1aSessionAdapter; rules: CofreFocoRules; seed: string | null; revision: number };
type ActiveGame = ActiveBasic | ActiveCofreFoco | ActiveBankrollA0 | ActiveBankrollA1a;
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
      setActive({ mode: "cofre-foco", cardIdentityMode: false, controller, view: controller.current, rules, horizon, seed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a Noite experimental.");
    }
  };

  const startP5CardNight = async () => {
    setError(null);
    try {
      const seed = localSeed();
      const rules = getCofreFocoRules(profile);
      const prepared = await prepareP5CofreFocoRound(seed, 0);
      const controller = CofreFocoSessionAdapter.start(prepared, rules, 10);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "p5-cards", cardIdentityMode: true, controller, view: controller.current, rules, horizon: 10, seed });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o laboratório de cartas.");
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

  const startBankrollA1aNight = () => {
    setError(null);
    try {
      const rules = getCofreFocoRules(profile);
      const controller = BankrollA1aSessionAdapter.start(rules);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "bankroll-a1a", controller, rules, seed: null, revision: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o laboratório A1a.");
    }
  };

  const startSelectedNight = () => {
    if (mode === "basic") void startBasicNight();
    else if (mode === "cofre-foco") void startCofreFocoNight();
    else if (mode === "bankroll-a0") void startBankrollA0Night();
    else if (mode === "bankroll-a1a") startBankrollA1aNight();
    else void startP5CardNight();
  };

  const startA1aRound = async (stake: number) => {
    if (!active || active.mode !== "bankroll-a1a" || !active.controller.isBetting) return;
    setError(null);
    try {
      // The seed and every card stream are created only after the wager is confirmed.
      const seed = active.seed ?? localSeed();
      const roundIndex = active.controller.bankroll.completedRounds;
      const prepared = await prepareP5CofreFocoRound(seed, roundIndex);
      active.controller.startRound(prepared, stake);
      setActive({ ...active, seed, revision: active.revision + 1 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a rodada A1a.");
    }
  };

  const nextA1aBetting = () => {
    if (!active || active.mode !== "bankroll-a1a") return;
    try {
      active.controller.enterBetting();
      setActive({ ...active, revision: active.revision + 1 });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a próxima aposta A1a.");
    }
  };

  const onA1aNightChange = (_view: PublicCofreFocoNight) => {
    setActive((current) => current?.mode === "bankroll-a1a" ? { ...current, revision: current.revision + 1 } : current);
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
    if (!active || (active.mode !== "cofre-foco" && active.mode !== "p5-cards")) return;
    setError(null);
    try {
      const nextIndex = active.view.completedRounds;
      const prepared = active.cardIdentityMode
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
    setActive((current) => current && (current.mode === "cofre-foco" || current.mode === "p5-cards") ? { ...current, view } : current);
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
      <main className="game-session-shell">
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
          viewportFit
        />
        {error && <p role="alert" className="recoverable-error error-overlay">{error}</p>}
      </main>
    );
  }

  if (active?.mode === "cofre-foco" || active?.mode === "p5-cards") {
    return (
      <main className="game-session-shell">
        <CofreFocoTable
          key={`cofre-foco-round-${active.view.roundNumber}`}
          session={active.controller}
          night={active.view}
          rules={active.rules}
          error={error}
          onNightChange={onCofreFocoNightChange}
          onNextRound={() => void nextCofreFocoRound()}
          onReturnToSetup={returnToSetup}
          cardIdentityMode={active.cardIdentityMode}
        />
      </main>
    );
  }

  if (active?.mode === "bankroll-a0") {
    return (
      <main className="game-session-shell">
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

  if (active?.mode === "bankroll-a1a" && active.controller.isBetting) {
    return <main className="game-session-shell">
      <BankrollA1aBettingTable
        key={`a1a-bet-${active.controller.bankroll.completedRounds}-${active.revision}`}
        bankroll={active.controller.bankroll}
        error={error}
        onConfirm={(stake) => void startA1aRound(stake)}
        onPractice={() => void startA1aRound(0)}
        onAbandon={() => { active.controller.abandonBeforeDeal(); returnToSetup(); }}
      />
    </main>;
  }

  if (active?.mode === "bankroll-a1a" && !active.controller.isBetting) {
    return <main className="game-session-shell">
      <CofreFocoTable
        key={`bankroll-a1a-round-${active.controller.bankroll.completedRounds}`}
        session={active.controller}
        night={active.controller.current}
        rules={active.rules}
        error={error}
        bankroll={active.controller.bankroll}
        onNightChange={onA1aNightChange}
        onNextRound={nextA1aBetting}
        onReturnToSetup={returnToSetup}
        cardIdentityMode
      />
    </main>;
  }

  return (
    <main className="landing-shell">
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
          <option value="p5-cards">Laboratório P5 · cartas com naipes · EXPERIMENTAL</option>
          <option value="bankroll-a1a">Apostas livres · fichas A1a · EXPERIMENTAL</option>
        </select>
        <p className="mode-explanation">
          {mode === "basic"
            ? "Quatro cartas para compor Luz e Sombra. Este é o baseline do protótipo e o único modo do protocolo P2A."
              : mode === "cofre-foco"
              ? "Quinta carta aberta no Cofre e 3 Focos compartilhados por Noite. Leitura e Manobra são opcionais; esta configuração continua experimental."
              : mode === "bankroll-a0"
                ? "Variação local e temporária sobre Cofre + Foco, com banca fictícia isolada e sem persistência. As regras experimentais do motor permanecem as mesmas."
                : mode === "p5-cards"
                ? "Laboratório de cartas sem apostas ou banca. J/Q/K mantêm valor 10; naipes e identidades são apenas visuais e usam o motor Cofre + Foco sem alterar regras ou resultados."
                : "Aposta inteira escolhida antes de cada distribuição, igual para Luz e Sombra, com cobertura 4s. Laboratório local separado da banca fixa A0.1; Foco e pontos não escalam com a aposta."
          }
        </p>

        <label className="profile-label" htmlFor="rule-profile">Perfil experimental de natural</label>
        <select id="rule-profile" aria-label="Perfil experimental de regras" value={profile} onChange={(event) => setProfile(event.target.value as ProfileId)}>
          <option value={DF_SYM_01_3_TO_2.id}>Natural paga 3:2</option>
          <option value={DF_SYM_01_1_TO_1.id}>Natural paga 1:1</option>
        </select>
        <p className="experimental-note">Os dois modos e os perfis de pagamento são EXPERIMENTAIS.</p>

        {mode === "bankroll-a0" && <p className="mode-explanation">Banca fictícia reiniciada em 150 fichas por Noite, 10 rodadas e cobertura reservada de 40 por rodada financiada. Se o saldo ficar abaixo de 40 entre rodadas, a Noite continua em prática gratuita. Nada persiste após sair.</p>}
        {mode === "bankroll-a1a" && <p className="mode-explanation">Banca reiniciada em 150 fichas, 10 rodadas. Escolha s fichas por mão antes de cada distribuição; R=4s cobre ambos os doubles. O ledger aceita meios de ficha exatos. A prática gratuita começa quando nenhuma aposta mínima cabe. Perfil EXPERIMENTAL, sem persistência.</p>}

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
