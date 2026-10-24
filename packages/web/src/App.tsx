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
import { PactOfferTable } from "./game/PactOfferTable";
import { PactA1aSessionAdapter } from "./game/pact-a1a-session";
import { PactBookA1aSessionAdapter } from "./game/pact-book-a1a-session";
import { PACT_BOOK_PACTS, type PactId } from "@nocte/engine/pact-book";
import { GameTable } from "./game/GameTable";
import { SoloRoundController } from "./game/controller";
import { prepareCofreFocoRound, prepareP5CofreFocoRound, prepareRound } from "./game/random";
import { StudyFlow } from "./study/StudyFlow";

type ProfileId = RuleProfile["id"];
type GameMode = "basic" | "cofre-foco" | "bankroll-a0" | "p5-cards" | "bankroll-a1a" | "pact-a1a" | "pact-book-a1a";
type ActiveBasic = { mode: "basic"; controller: SoloRoundController; view: PublicRound; profile: RuleProfile; roundNumber: number };
type ActiveCofreFoco = { mode: "cofre-foco" | "p5-cards"; cardIdentityMode: boolean; controller: CofreFocoSessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; horizon: number; seed: string };
type ActiveBankrollA0 = { mode: "bankroll-a0"; controller: BankrollA0SessionAdapter; view: PublicCofreFocoNight; rules: CofreFocoRules; seed: string };
type ActiveBankrollA1a = { mode: "bankroll-a1a"; controller: BankrollA1aSessionAdapter; rules: CofreFocoRules; seed: string | null; revision: number };
type ActivePactA1a = { mode: "pact-a1a"; controller: PactA1aSessionAdapter; rules: CofreFocoRules; seed: string | null; revision: number };
type ActivePactBook = { mode: "pact-book-a1a"; controller: PactBookA1aSessionAdapter; rules: CofreFocoRules; seed: string | null; revision: number };
type ActiveGame = ActiveBasic | ActiveCofreFoco | ActiveBankrollA0 | ActiveBankrollA1a | ActivePactA1a | ActivePactBook;
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
  const a1aStartPending = useRef(false);
  const a1aSessionGeneration = useRef(0);
  const [a1aPreparing, setA1aPreparing] = useState(false);

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
    a1aSessionGeneration.current += 1;
    a1aStartPending.current = false;
    setA1aPreparing(false);
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

  const startPactNight = () => {
    a1aSessionGeneration.current += 1;
    a1aStartPending.current = false;
    setA1aPreparing(false);
    setError(null);
    try {
      const rules = getCofreFocoRules(profile);
      const controller = PactA1aSessionAdapter.start(rules);
      setNightScore(0);
      setRoundNumber(0);
      scoreApplied.current = false;
      setActive({ mode: "pact-a1a", controller, rules, seed: null, revision: 0 });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o laboratório PACT-LAB.");
    }
  };

  const startPactBookNight = () => {
    a1aSessionGeneration.current += 1; a1aStartPending.current = false; setA1aPreparing(false); setError(null);
    try {
      const rules = getCofreFocoRules(profile);
      const controller = PactBookA1aSessionAdapter.start(rules);
      setNightScore(0); setRoundNumber(0); scoreApplied.current = false;
      setActive({ mode: "pact-book-a1a", controller, rules, seed: null, revision: 0 });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Não foi possível iniciar o Livro dos Pactos."); }
  };

  const startSelectedNight = () => {
    if (mode === "basic") void startBasicNight();
    else if (mode === "cofre-foco") void startCofreFocoNight();
    else if (mode === "bankroll-a0") void startBankrollA0Night();
    else if (mode === "bankroll-a1a") startBankrollA1aNight();
    else if (mode === "pact-a1a") startPactNight();
    else if (mode === "pact-book-a1a") startPactBookNight();
    else void startP5CardNight();
  };

  const startA1aRound = async (stake: number) => {
    if (!active || (active.mode !== "bankroll-a1a" && active.mode !== "pact-a1a" && active.mode !== "pact-book-a1a") || !active.controller.isBetting || a1aStartPending.current) return;
    // Validate the wager before touching the RNG, including the practice-only case.
    const bank = active.controller.bankroll;
    const validStake = bank.status === "practice" ? stake === 0
      : bank.status === "active" && Number.isSafeInteger(stake) && stake >= 1 && stake <= bank.maxStake;
    if (!validStake) {
      setError("Aposta inválida para o saldo atual; ajuste as fichas antes de distribuir.");
      return;
    }
    a1aStartPending.current = true; // synchronous guard against rapid double clicks
    const generation = a1aSessionGeneration.current;
    setA1aPreparing(true);
    setError(null);
    try {
      // The seed and every card stream are created only after a valid wager is confirmed.
      const seed = active.seed ?? localSeed();
      const roundIndex = active.controller.bankroll.completedRounds;
      const prepared = await prepareP5CofreFocoRound(seed, roundIndex);
      // Abandoning during asynchronous preparation must never resurrect the Night.
      if (generation !== a1aSessionGeneration.current) return;
      active.controller.startRound(prepared, stake);
      setActive((current) => (current?.mode === "bankroll-a1a" || current?.mode === "pact-a1a" || current?.mode === "pact-book-a1a") && current.controller === active.controller
        ? { ...current, seed, revision: current.revision + 1 } : current);
    } catch (cause) {
      if (generation === a1aSessionGeneration.current)
        setError(cause instanceof Error ? cause.message : "Não foi possível iniciar a rodada A1a.");
    } finally {
      if (generation === a1aSessionGeneration.current) {
        a1aStartPending.current = false;
        setA1aPreparing(false);
      }
    }
  };

  const nextA1aBetting = () => {
    if (!active || (active.mode !== "bankroll-a1a" && active.mode !== "pact-a1a" && active.mode !== "pact-book-a1a")) return;
    try {
      active.controller.enterBetting();
      setActive({ ...active, revision: active.revision + 1 });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível abrir a próxima aposta A1a.");
    }
  };

  const onA1aNightChange = (_view: PublicCofreFocoNight) => {
    setActive((current) => current && (current.mode === "bankroll-a1a" || current.mode === "pact-a1a" || current.mode === "pact-book-a1a") ? { ...current, revision: current.revision + 1 } : current);
  };

  const resolvePactOffer = (pact?: "veil" | "iron" | PactId, ironFace?: "luz" | "sombra") => {
    if (!active || (active.mode !== "pact-a1a" && active.mode !== "pact-book-a1a") || !active.controller.isPactOfferPending) return;
    try {
      if (pact) {
        if (active.mode === "pact-a1a") {
          if (pact !== "veil" && pact !== "iron") throw new Error("Este Pacto não pertence ao modo PACT-LAB-0.1.");
          active.controller.sign(pact, ironFace);
        } else active.controller.sign(pact, ironFace);
      } else active.controller.refuse();
      setActive({ ...active, revision: active.revision + 1 });
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível registrar a escolha de Pacto.");
    }
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

  const onLegacyVisibleNightChange = (view: PublicCofreFocoNight) => {
    if (view.round && !view.round.dealerUp) return;
    onCofreFocoNightChange(view as PublicCofreFocoNight);
  };

  const onBankrollA0NightChange = (view: PublicCofreFocoNight) => {
    if (view.round && !view.round.dealerUp) return;
    setActive((current) => current?.mode === "bankroll-a0"
      ? { ...current, view: view as PublicCofreFocoNight }
      : current);
  };

  const returnToSetup = () => {
    a1aSessionGeneration.current += 1;
    a1aStartPending.current = false;
    setA1aPreparing(false);
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
          onNightChange={onLegacyVisibleNightChange}
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

  if (active?.mode === "pact-a1a" && active.controller.isPactOfferPending) {
    return <main className="game-session-shell">
      <PactOfferTable bankroll={active.controller.bankroll}
        onSign={(pact, face) => resolvePactOffer(pact, face)} onRefuse={() => resolvePactOffer()}
        onAbandon={() => { active.controller.abandonBeforeDeal(); returnToSetup(); }} />
      {error && <p role="alert" className="recoverable-error error-overlay">{error}</p>}
    </main>;
  }

  if (active?.mode === "pact-book-a1a" && active.controller.isPactOfferPending) {
    return <main className="game-session-shell">
      <PactOfferTable bankroll={active.controller.bankroll} options={active.controller.offerOptions} version={active.controller.version}
        family={active.controller.offerFamily}
        actLabel={active.controller.contract.actStartRound === 8 ? "ATO III · RODADAS 8–10" : "ATO II · RODADAS 4–7"}
        onSign={(pact, face) => resolvePactOffer(pact, face)} onRefuse={() => resolvePactOffer()}
        onAbandon={() => { active.controller.abandonBeforeDeal(); returnToSetup(); }} />
      {error && <p role="alert" className="recoverable-error error-overlay">{error}</p>}
    </main>;
  }

  if ((active?.mode === "bankroll-a1a" || active?.mode === "pact-a1a" || active?.mode === "pact-book-a1a") && active.controller.isBetting) {
    return <main className="game-session-shell">
      <BankrollA1aBettingTable
        key={`a1a-bet-${active.controller.bankroll.completedRounds}`}
        bankroll={active.controller.bankroll}
        {...(active.mode === "pact-a1a" ? { pact: { contract: active.controller.contract, roundsRemaining: active.controller.roundsRemaining } }
          : active.mode === "pact-book-a1a" ? { pact: { contract: active.controller.contract, roundsRemaining: active.controller.roundsRemaining,
            pactName: active.controller.contract.pact ? PACT_BOOK_PACTS[active.controller.contract.pact].name : "",
            renunciation: active.controller.contract.pact ? PACT_BOOK_PACTS[active.controller.contract.pact].renunciation : "",
            privilegeText: active.controller.contract.pact ? PACT_BOOK_PACTS[active.controller.contract.pact].privilege : "",
            canUseLastro: active.controller.canUseLastro, setLastroProtectionFace: (face) => { active.controller.setLastroProtectionFace(face); setActive(current => current?.mode === "pact-book-a1a" && current.controller === active.controller ? { ...current, revision: current.revision + 1 } : current); },
            canUseAudacity: active.controller.canUseAudacity, audacityIntent: active.controller.audacityIntent,
            setAudacityIntent: (enabled) => { active.controller.setAudacityIntent(enabled); setActive(current => current?.mode === "pact-book-a1a" && current.controller === active.controller ? { ...current, revision: current.revision + 1 } : current); } } } : {})}
        error={error}
        preparing={a1aPreparing}
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

  if (active?.mode === "pact-a1a" && !active.controller.isBetting) {
    return <main className="game-session-shell">
      <CofreFocoTable
        key={`pact-a1a-round-${active.controller.bankroll.completedRounds}`}
        session={active.controller}
        night={active.controller.current}
        rules={active.rules}
        error={error}
        bankroll={active.controller.bankroll}
        onNightChange={onA1aNightChange}
        onNextRound={nextA1aBetting}
        onReturnToSetup={returnToSetup}
        cardIdentityMode
        pact={{ contract: active.controller.contract, roundsRemaining: active.controller.roundsRemaining,
          canUseReadPrivilege: active.controller.canUseReadPrivilege, canUseManeuverPrivilege: active.controller.canUseManeuverPrivilege,
          readPrivilege: () => active.controller.readDealerHoleWithPactPrivilege(),
          maneuverPrivilege: (hand, cardIndex) => active.controller.maneuverDirectWithPactPrivilege(hand, cardIndex) }}
      />
    </main>;
  }

  if (active?.mode === "pact-book-a1a" && !active.controller.isBetting) {
    const pactId = active.controller.contract.pact;
    const definition = pactId ? PACT_BOOK_PACTS[pactId] : null;
    return <main className="game-session-shell">
      <CofreFocoTable key={`pact-book-round-${active.controller.bankroll.completedRounds}`} session={active.controller}
        night={active.controller.current} rules={active.rules} error={error} bankroll={active.controller.bankroll}
        onNightChange={onA1aNightChange} onNextRound={nextA1aBetting} onReturnToSetup={returnToSetup} cardIdentityMode
        pact={{ contract: active.controller.contract, roundsRemaining: active.controller.roundsRemaining,
          canUseReadPrivilege: active.controller.canUseReadPrivilege, canUseManeuverPrivilege: active.controller.canUseManeuverPrivilege,
          readPrivilege: () => active.controller.readPrivilege(), maneuverPrivilege: (hand, cardIndex) => active.controller.maneuverPrivilege(hand, cardIndex),
          canUseFarol: active.controller.canUseFarol, farolCategory: active.controller.farolCategory,
          revealFarol: () => active.controller.farol(), canUseImpetusDouble: active.controller.canUseImpetusDouble,
          impetusDouble: () => active.controller.impetusDouble(), canUseBastion: active.controller.canUseBastion,
          canUseReflection: active.controller.canUseReflection, reflectionTarget: active.controller.reflectionTarget,
          canUseChaos: active.controller.canUseChaos, canUsePenhor: active.controller.canUsePenhor,
          canUseArremate: active.controller.canUseArremate, arremateOptions: active.controller.arremateOptions,
          canUseOrder: active.controller.canUseOrder, orderPreview: active.controller.orderPreview,
          canUseCisao: active.controller.canUseCisao, composeCisao: (face) => active.controller.composeCisao(face),
          canUseBalanca: active.controller.canUseBalanca, balancaProposalMade: active.controller.balancaProposalMade,
          balancaRecomposePending: active.controller.balancaRecomposePending, balancaCategory: active.controller.balancaCategory,
          proposeBalanca: (partition) => active.controller.proposeBalanca(partition), revealBalancaCategory: () => active.controller.revealBalancaCategory(),
          canUseSecondChance: active.controller.canUseSecondChance, secondChancePending: active.controller.secondChancePending,
          resolveSecondChance: (accept) => active.controller.resolveSecondChance(accept),
          canUseJuramento: active.controller.canUseJuramento, juramentoPreview: active.controller.juramentoPreview,
          revealJuramento: () => active.controller.revealJuramento(), resolveJuramento: (accept) => active.controller.resolveJuramento(accept),
          resolvePendingHit: (choice) => active.controller.resolvePendingHit(choice),
          sealCofre: () => active.controller.sealCofre(), activateArremate: () => active.controller.activateArremate(),
          chooseArremate: (index) => active.controller.chooseArremate(index),
          revealOrderPreview: () => active.controller.revealOrderPreview(), focusAbilityRenunciation: active.controller.focusAbilityRenunciation,
          renunciationText: definition?.renunciation ?? "", privilegeText: definition?.privilege ?? "", pactName: definition?.name ?? "" }} />
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
          <option value="pact-a1a">Pactos por Ato · Véu/Ferro · EXPERIMENTAL</option>
          <option value="pact-book-a1a">Livro dos Pactos · 18 Pactos · P7-C · EXPERIMENTAL</option>
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
                : mode === "bankroll-a1a"
                  ? "Aposta inteira escolhida antes de cada distribuição, igual para Luz e Sombra, com cobertura 4s. Laboratório local separado da banca fixa A0.1; Foco e pontuação estratégica não escalam com a aposta."
                  : mode === "pact-a1a"
                    ? "PACT-LAB-0.1 mantém a oferta de Véu, Ferro ou recusa antes da rodada 4. Laboratório experimental separado dos modos anteriores."
                    : "PACT-BOOK-0.1 oferece dois Pactos opostos antes das rodadas 4 e 8. P7-C completa dezoito Pactos em nove famílias sem repetição. Laboratório experimental local."
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
        {mode === "pact-book-a1a" && <p className="mode-explanation">Ato I: rodadas 1–3 sem Pacto. Ofertas pareadas antes das rodadas 4 e 8, sem repetir família; o Pacto do Ato expira antes da oferta seguinte. Privilégio aparece primeiro, Renúncia logo abaixo. Recusar ambos não altera regras nem recursos.</p>}

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
