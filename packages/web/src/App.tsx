import { useRef, useState } from "react";
import {
  DF_SYM_01_1_TO_1,
  DF_SYM_01_3_TO_2,
  type PublicRound,
  type RuleProfile,
} from "@nocte/engine";
import { GameTable } from "./game/GameTable";
import { SoloRoundController } from "./game/controller";
import { prepareRound } from "./game/random";
import { StudyFlow } from "./study/StudyFlow";

type ProfileId = RuleProfile["id"];
type ActiveGame = { controller: SoloRoundController; view: PublicRound };
const getProfile = (id: ProfileId): RuleProfile => id === DF_SYM_01_1_TO_1.id ? DF_SYM_01_1_TO_1 : DF_SYM_01_3_TO_2;

function localSeed(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function App() {
  const [profile, setProfile] = useState<ProfileId>(DF_SYM_01_3_TO_2.id);
  const [active, setActive] = useState<ActiveGame | null>(null);
  const [nightScore, setNightScore] = useState(0);
  const [roundNumber, setRoundNumber] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [showStudy, setShowStudy] = useState(false);
  const scoreApplied = useRef(false);

  const startRound = async (selectedProfile = profile, resetNight = false) => {
    setError(null);
    try {
      const nextNumber = resetNight ? 1 : roundNumber + 1;
      const prepared = await prepareRound(localSeed(), nextNumber, getProfile(selectedProfile));
      const controller = SoloRoundController.start(prepared);
      if (resetNight) setNightScore(0);
      setRoundNumber(nextNumber);
      scoreApplied.current = false;
      setActive({ controller, view: controller.current });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível preparar a rodada.");
    }
  };

  const onRoundChange = (view: PublicRound) => {
    setActive((current) => current ? { ...current, view } : current);
    if (view.phase === "complete" && active && !scoreApplied.current) {
      scoreApplied.current = true;
      setNightScore((score) => score + active.controller.score());
    }
  };

  if (showStudy) {
    return (
      <StudyFlow
        profile={getProfile(profile)}
        onDecline={() => { setShowStudy(false); void startRound(); }}
        onExit={() => setShowStudy(false)}
      />
    );
  }

  if (active) {
    return (
      <main className="app-shell">
        <GameTable
          key={`free-round-${roundNumber}`}
          session={active.controller}
          round={active.view}
          onRoundChange={onRoundChange}
          roundNumber={roundNumber}
          profileLabel={getProfile(profile).naturalPayout}
          nightScore={nightScore}
          {...(active.view.phase === "complete" ? { roundScore: active.controller.score() } : {})}
          onNextRound={() => void startRound()}
          onNewNight={() => void startRound(profile, true)}
        />
        {error && <p role="alert" className="recoverable-error">{error}</p>}
        <button className="text-button" type="button" onClick={() => {
          setActive(null);
          setNightScore(0);
          setRoundNumber(0);
          scoreApplied.current = false;
        }}>Encerrar Noite</button>
      </main>
    );
  }

  return (
    <main className="landing-shell">
      <p className="eyebrow">PROTÓTIPO SOLO · LABORATÓRIO LOCAL</p>
      <h1>NOCTE</h1>
      <p className="subtitle">Duas Faces</p>
      <p className="local-notice">Jogo solo, executado localmente neste navegador.</p>

      <label className="profile-label" htmlFor="rule-profile">Perfil experimental</label>
      <select
        id="rule-profile"
        aria-label="Perfil experimental de regras"
        value={profile}
        onChange={(event) => setProfile(event.target.value as ProfileId)}
      >
        <option value={DF_SYM_01_3_TO_2.id}>DF-SYM-0.1 · Natural paga 3:2</option>
        <option value={DF_SYM_01_1_TO_1.id}>DF-SYM-0.1 · Natural paga 1:1</option>
      </select>
      <p className="experimental-note">As regras e os dois perfis são experimentais.</p>

      {error && <p role="alert" className="recoverable-error">{error}</p>}
      <div className="landing-actions">
        <button type="button" onClick={() => void startRound()}>Jogar livre</button>
        <button type="button" className="secondary-action" onClick={() => setShowStudy(true)}>Iniciar estudo</button>
      </div>
    </main>
  );
}
