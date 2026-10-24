import type { Action, Card, HandName } from "./index.js";
import type { CofreFocoActionRestrictions } from "./cofre-foco.js";

export const PACT_BOOK_VERSION = "PACT-BOOK-0.1" as const;
export type PactFamily = "revelation" | "dominion" | "focus" | "sacrifice" | "time" | "destiny" | "bonding" | "fortune" | "choice";
export type PactId = "veil" | "lighthouse" | "iron" | "impetus" | "vigil" | "flare"
  | "bastion" | "reflection" | "bond" | "finale" | "order" | "chaos"
  | "cisao" | "balanca" | "lastro" | "audacity" | "secondChance" | "oath";
export type PactUse = "none" | "available" | "consumed" | "expired";
export type PactChoice = PactId | "refused";

export const PACT_BOOK_PACTS = Object.freeze({
  veil: { id: "veil", name: "Véu", family: "revelation", pairId: "revelation", eligibility: "p7-a", activationWindow: "focus-window", uses: 1, privilege: "Uma Leitura gratuita em uma janela legal do Ato.", renunciation: "A carta aberta do dealer fica oculta até confirmar a composição." },
  lighthouse: { id: "lighthouse", name: "Farol", family: "revelation", pairId: "revelation", eligibility: "p7-a", activationWindow: "before-composition", uses: 1, privilege: "Revela uma categoria da carta fechada antes da composição: Ás, baixa (2–6) ou alta (7–K).", renunciation: "Leitura fica indisponível durante o Ato." },
  bastion: { id: "bastion", name: "Bastião", family: "sacrifice", pairId: "sacrifice", eligibility: "p7-b", activationWindow: "after-busting-hit", uses: 1, privilege: "Após uma Compra normal que estouraria a mão, descarta somente a carta recém-comprada e Para no total anterior.", renunciation: "A Face escolhida precisa realizar uma Compra normal antes de Parar em cada rodada ativa." },
  reflection: { id: "reflection", name: "Reflexo", family: "sacrifice", pairId: "sacrifice", eligibility: "p7-b", activationWindow: "after-normal-hit", uses: 1, privilege: "Após uma Compra normal, pode transferir a carta para a outra Face ainda ativa; a Face original encerra no total anterior.", renunciation: "Dobrar fica indisponível para ambas as Faces durante o Ato." },
  bond: { id: "bond", name: "Penhor", family: "time", pairId: "time", eligibility: "p7-b", activationWindow: "compose-before-focus", uses: 1, privilege: "Sela o Cofre atual para substituir o Cofre da próxima rodada do mesmo Ato.", renunciation: "Manobra indisponível na rodada em que o Cofre é Selado." },
  finale: { id: "finale", name: "Arremate", family: "time", pairId: "time", eligibility: "p7-b", activationWindow: "before-composition", uses: 1, privilege: "Gera duas opções para o Cofre atual e escolhe uma antes da composição.", renunciation: "Manobra indisponível na rodada imediatamente seguinte dentro do Ato." },
  order: { id: "order", name: "Ordem", family: "destiny", pairId: "destiny", eligibility: "p7-b", activationWindow: "before-player-action", uses: 1, privilege: "Revela exatamente a próxima carta que uma Face ativa receberia; o Privilégio é consumido ao revelar.", renunciation: "Manobra indisponível durante o Ato." },
  chaos: { id: "chaos", name: "Caos", family: "destiny", pairId: "destiny", eligibility: "p7-b", activationWindow: "after-normal-hit", uses: 1, privilege: "Após uma Compra normal, pode rejeitá-la e receber obrigatoriamente a próxima carta da mesma Face.", renunciation: "Leitura indisponível durante o Ato." },
  iron: { id: "iron", name: "Ferro", family: "dominion", pairId: "dominion", eligibility: "p7-a", activationWindow: "focus-window", uses: 1, privilege: "Uma Manobra gratuita em janela legal; a Manobra paga pode preservar este Privilégio.", renunciation: "A Face escolhida não pode Dobrar durante o Ato." },
  impetus: { id: "impetus", name: "Ímpeto", family: "dominion", pairId: "dominion", eligibility: "p7-a", activationWindow: "after-first-hit", uses: 1, privilege: "Uma vez, depois de exatamente uma Compra, Dobrar, receber uma carta e encerrar a mão.", renunciation: "Manobra fica indisponível durante o Ato." },
  vigil: { id: "vigil", name: "Vigília", family: "focus", pairId: "focus", eligibility: "p7-a", activationWindow: "late-period", uses: 1, privilege: "Uma Leitura ou Manobra gratuita e legal na parte final do Ato.", renunciation: "Leitura e Manobra normais ficam indisponíveis na parte inicial." },
  flare: { id: "flare", name: "Fulgor", family: "focus", pairId: "focus", eligibility: "p7-a", activationWindow: "early-period", uses: 1, privilege: "Uma Leitura ou Manobra gratuita e legal na parte inicial do Ato.", renunciation: "Leitura e Manobra normais ficam indisponíveis na parte final." },
  cisao: { id: "cisao", name: "Cisão", family: "bonding", pairId: "bonding", eligibility: "p7-c", activationWindow: "composition", uses: 1, privilege: "Uma vez no Ato, distribuir as quatro cartas iniciais em 3+1, escolhendo a Face com três cartas.", renunciation: "Dobrar fica indisponível para ambas as Faces durante o Ato." },
  balanca: { id: "balanca", name: "Balança", family: "bonding", pairId: "bonding", eligibility: "p7-c", activationWindow: "after-composition-proposal", uses: 1, privilege: "Após propor uma composição, revela a categoria da carta fechada e permite recompor as quatro cartas uma vez antes da confirmação final.", renunciation: "Manobra fica indisponível durante o Ato." },
  lastro: { id: "lastro", name: "Lastro", family: "fortune", pairId: "fortune", eligibility: "p7-c", activationWindow: "before-deal", uses: 1, privilege: "Antes da distribuição, protege uma Face; se ela perder, devolve metade da perda financeira, inclusive após Dobrar.", renunciation: "A aposta máxima por mão é max(1, floor(B/8)), sem forçar prática se a entrada mínima couber." },
  audacity: { id: "audacity", name: "Audácia", family: "fortune", pairId: "fortune", eligibility: "p7-c", activationWindow: "before-deal", uses: 1, privilege: "Antes da distribuição, permite apostar até floor(B/2) por mão nesta rodada; Dobrar fica proibido para ambas as Faces nesta rodada.", renunciation: "Manobra fica indisponível durante o Ato." },
  secondChance: { id: "secondChance", name: "Segunda Chance", family: "choice", pairId: "choice", eligibility: "p7-c", activationWindow: "after-stand", uses: 1, privilege: "Após Parar e antes de avançar, reabre essa Face para exatamente uma Compra adicional, seguida obrigatoriamente de encerramento.", renunciation: "Leitura fica indisponível durante o Ato." },
  oath: { id: "oath", name: "Juramento", family: "choice", pairId: "choice", eligibility: "p7-c", activationWindow: "before-player-action", uses: 1, privilege: "Revela a categoria da próxima Compra de uma Face e permite assumir compromisso irrevogável de Comprar uma vez e então Parar.", renunciation: "A Face escolhida não pode Dobrar nem ser alvo de Manobra durante o Ato." },
} as const);

export const PACT_BOOK_FAMILIES = Object.freeze(["revelation", "dominion", "focus", "sacrifice", "time", "destiny", "bonding", "fortune", "choice"] as const);
const pairByFamily: Readonly<Record<PactFamily, readonly [PactId, PactId]>> = {
  revelation: ["veil", "lighthouse"], dominion: ["iron", "impetus"], focus: ["vigil", "flare"],
  sacrifice: ["bastion", "reflection"], time: ["bond", "finale"], destiny: ["order", "chaos"],
  bonding: ["cisao", "balanca"], fortune: ["lastro", "audacity"], choice: ["secondChance", "oath"],
};
export type PactActState = Readonly<{
  status: "offered" | "active" | "refused" | "expired";
  offerRound: 4 | 8;
  startRound: 4 | 8;
  endRound: 7 | 10;
  family: PactFamily;
  options: readonly [PactId, PactId];
  choice: PactChoice | null;
  affectedFace: HandName | null;
  privilege: PactUse;
  usedRound: number | null;
  sealedRound: number | null;
  blockedManeuverRound: number | null;
  audacityRound: number | null;
}>;
export type PactBookState = Readonly<{
  version: typeof PACT_BOOK_VERSION;
  status: "active" | "complete" | "abandoned";
  firstFamily: PactFamily | null;
  offers: readonly PactActState[];
  current: PactActState | null;
  fallbackReason: "no-complete-pair-eligible" | null;
}>;

export function createPactBook(): PactBookState {
  return Object.freeze({ version: PACT_BOOK_VERSION, status: "active", firstFamily: null, offers: Object.freeze([]), current: null, fallbackReason: null });
}

// Domain-separated deterministic PRNG. Rejection sampling avoids modulo bias and does not consume card streams.
function word(seed: string, label: string, counter: number): number {
  let h = 0x811c9dc5;
  for (const char of `${PACT_BOOK_VERSION}|${label}|${seed}|${counter}`) { h ^= char.charCodeAt(0); h = Math.imul(h, 0x01000193); }
  let x = h >>> 0;
  x ^= x << 13; x ^= x >>> 17; x ^= x << 5;
  return x >>> 0;
}
export function drawPactFamily(seed: string, offerRound: 4 | 8, excluded: readonly PactFamily[] = [], eligible: readonly PactFamily[] = PACT_BOOK_FAMILIES): PactFamily | null {
  if (!seed) throw new Error("Seed obrigatória para sortear a família de Pactos.");
  const pool = eligible.filter((family, index) => PACT_BOOK_FAMILIES.includes(family) && !excluded.includes(family) && eligible.indexOf(family) === index);
  if (pool.length === 0) return null;
  const ceiling = Math.floor(0x1_0000_0000 / pool.length) * pool.length;
  for (let counter = 0; counter < 100; counter += 1) {
    const value = word(seed, `offer-${offerRound}`, counter);
    if (value < ceiling) return pool[value % pool.length]!;
  }
  throw new Error("Não foi possível concluir sorteio determinístico de família.");
}

export function offerPactBook(state: PactBookState, round: number, seed: string, eligible?: readonly PactFamily[]): PactBookState {
  if (state.status !== "active" || (state.current && state.current.status !== "expired" && state.current.status !== "refused")) throw new Error("Oferta anterior precisa ser resolvida ou expirar.");
  if (round !== 4 && round !== 8) throw new Error("Oferta de Pactos só ocorre antes das rodadas 4 e 8.");
  if (state.offers.some(offer => offer.offerRound === round)) throw new Error("Esta oferta já foi sorteada nesta Noite.");
  if (round === 8 && state.offers.length !== 1) throw new Error("A oferta do Ato III exige uma oferta do Ato II.");
  const family = drawPactFamily(seed, round, state.offers.map(offer => offer.family), eligible);
  if (!family) return Object.freeze({ ...state, fallbackReason: "no-complete-pair-eligible" });
  const [startRound, endRound] = round === 4 ? [4, 7] as const : [8, 10] as const;
  const current: PactActState = Object.freeze({ status: "offered", offerRound: round, startRound, endRound, family,
    options: Object.freeze([...pairByFamily[family]]) as unknown as readonly [PactId, PactId], choice: null,
    affectedFace: null, privilege: "none", usedRound: null, sealedRound: null, blockedManeuverRound: null, audacityRound: null });
  return Object.freeze({ ...state, firstFamily: round === 4 ? family : state.firstFamily, offers: Object.freeze([...state.offers, current]), current, fallbackReason: null });
}

export function signPactBook(state: PactBookState, pact: PactId, face?: HandName): PactBookState {
  const offer = state.current;
  if (!offer || offer.status !== "offered" || !offer.options.includes(pact)) throw new Error("Pacto não pertence à oferta ativa.");
  if (["iron", "bastion", "oath"].includes(pact) && face !== "luz" && face !== "sombra") throw new Error(`${PACT_BOOK_PACTS[pact].name} exige escolher uma Face.`);
  if (!["iron", "bastion", "oath"].includes(pact) && face !== undefined) throw new Error("Este Pacto não exige escolher uma Face.");
  const current = Object.freeze({ ...offer, status: "active" as const, choice: pact,
    affectedFace: ["iron", "bastion", "oath"].includes(pact) ? face! : null, privilege: "available" as const });
  return Object.freeze({ ...state, offers: replaceCurrent(state.offers, offer.offerRound, current), current });
}
export function refusePactBook(state: PactBookState): PactBookState {
  const offer = state.current;
  if (!offer || offer.status !== "offered") throw new Error("Recusa só está disponível durante a oferta.");
  const current = Object.freeze({ ...offer, status: "refused" as const, choice: "refused" as const, privilege: "none" as const });
  return Object.freeze({ ...state, offers: replaceCurrent(state.offers, offer.offerRound, current), current });
}
export function enterPactBookRound(state: PactBookState, round: number): PactBookState {
  if (!Number.isInteger(round) || round < 1 || round > 10) throw new Error("Rodada inválida.");
  const prior = state.current;
  let current = prior;
  if (prior && round > prior.endRound && (prior.status === "active" || prior.status === "offered")) {
    current = Object.freeze({ ...prior, status: "expired", privilege: prior.privilege === "available" ? "expired" : prior.privilege });
  }
  return current === prior ? state : Object.freeze({ ...state, offers: replaceCurrent(state.offers, prior!.offerRound, current!), current });
}
export function consumePactBookPrivilege(state: PactBookState, round: number): PactBookState {
  const current = state.current;
  if (!current || current.status !== "active" || current.privilege !== "available" || round < current.startRound || round > current.endRound) throw new Error("Privilégio indisponível ou já consumido.");
  if ((current.choice === "bond" || current.choice === "finale") && round >= current.endRound) throw new Error("Este Privilégio exige uma rodada seguinte dentro do Ato.");
  const next = Object.freeze({ ...current, privilege: "consumed" as const, usedRound: round,
    ...(current.choice === "finale" ? { blockedManeuverRound: round + 1 } : {}) });
  return Object.freeze({ ...state, current: next, offers: replaceCurrent(state.offers, current.offerRound, next) });
}
export function markPactBookCofreSealed(state: PactBookState, round: number, targetRound: number): PactBookState {
  const current = state.current;
  if (!current || current.status !== "active" || current.choice !== "bond" || current.privilege !== "available"
    || round < current.startRound || round >= current.endRound || targetRound !== round + 1 || targetRound > current.endRound) {
    throw new Error("Penhor só pode Selar para a rodada seguinte dentro do Ato.");
  }
  const next = Object.freeze({ ...current, privilege: "consumed" as const, usedRound: round, sealedRound: round });
  return Object.freeze({ ...state, current: next, offers: replaceCurrent(state.offers, current.offerRound, next) });
}
/** Audácia is committed atomically with the selected pre-deal stake. */
export function activatePactBookAudacity(state: PactBookState, round: number): PactBookState {
  const current = state.current;
  if (!current || current.status !== "active" || current.choice !== "audacity" || current.privilege !== "available"
    || round < current.startRound || round > current.endRound) throw new Error("Privilégio da Audácia indisponível nesta rodada.");
  const next = Object.freeze({ ...current, privilege: "consumed" as const, usedRound: round, audacityRound: round });
  return Object.freeze({ ...state, current: next, offers: replaceCurrent(state.offers, current.offerRound, next) });
}
export function expirePactBook(state: PactBookState, status: "complete" | "abandoned" = "complete"): PactBookState {
  const current = state.current;
  if (!current) return Object.freeze({ ...state, status });
  const next = current.status === "active" || current.status === "offered"
    ? Object.freeze({ ...current, status: "expired" as const, privilege: current.privilege === "available" ? "expired" as const : current.privilege }) : current;
  return Object.freeze({ ...state, status, current: next, offers: replaceCurrent(state.offers, current.offerRound, next) });
}
function replaceCurrent(offers: readonly PactActState[], round: number, next: PactActState): readonly PactActState[] {
  return Object.freeze(offers.map(item => item.offerRound === round ? next : item));
}
export function pactBookRestrictions(state: PactBookState, round: number): CofreFocoActionRestrictions | undefined {
  const pact = state.current;
  if (!pact || pact.status !== "active" || round < pact.startRound || round > pact.endRound) return undefined;
  if (pact.choice === "iron" && pact.affectedFace) return Object.freeze({ forbiddenDoubleHand: pact.affectedFace });
  if (pact.choice === "impetus" || pact.choice === "audacity") return Object.freeze({ forbidManeuver: true,
    ...(pact.choice === "audacity" && pact.audacityRound === round ? { forbidDouble: true } : {}) });
  if (pact.choice === "bastion" && pact.affectedFace) return Object.freeze({ requiredHitBeforeStandHand: pact.affectedFace, autoStandAt21Hand: pact.affectedFace });
  if (pact.choice === "reflection") return Object.freeze({ forbidDouble: true });
  if (pact.choice === "bond" && pact.sealedRound === round) return Object.freeze({ forbidManeuver: true });
  if (pact.choice === "finale" && pact.blockedManeuverRound === round) return Object.freeze({ forbidManeuver: true });
  if (pact.choice === "order") return Object.freeze({ forbidManeuver: true });
  if (pact.choice === "chaos") return Object.freeze({ forbidRead: true });
  if (pact.choice === "cisao") return Object.freeze({ forbidDouble: true });
  if (pact.choice === "balanca") return Object.freeze({ forbidManeuver: true });
  if (pact.choice === "lastro" || pact.choice === "oath" && pact.affectedFace) {
    return Object.freeze({ ...(pact.choice === "lastro" ? {} : { forbiddenDoubleHand: pact.affectedFace! }),
      ...(pact.choice === "oath" ? { forbiddenManeuverHand: pact.affectedFace! } : {}) });
  }
  if (pact.choice === "secondChance") return Object.freeze({ forbidRead: true });
  return undefined;
}
export function assertPactBookActionAllowed(state: PactBookState, round: number, hand: HandName, action: Action, cards?: readonly Card[]): void {
  const pact = state.current;
  const restrictions = pactBookRestrictions(state, round);
  if (action === "double" && (restrictions?.forbidDouble || restrictions?.forbiddenDoubleHand === hand)) {
    throw new Error(`Dobrar está proibido pela Renúncia vigente${pact?.choice === "reflection" ? " do Reflexo" : ""}.`);
  }
  if (action === "stand" && restrictions?.requiredHitBeforeStandHand === hand && (cards?.length ?? 2) <= 2) {
    throw new Error("A Renúncia do Bastião exige uma Compra normal antes de Parar nesta Face.");
  }
}
export function assertPactBookManeuverAllowed(state: PactBookState, round: number, hand: HandName): void {
  const restrictions = pactBookRestrictions(state, round);
  if (restrictions?.forbidManeuver || restrictions?.forbiddenManeuverHand === hand) {
    throw new Error("Manobra está proibida pela Renúncia vigente.");
  }
}
export function canUsePactBookPrivilege(state: PactBookState, round: number, pactId?: PactId): boolean {
  const current = state.current;
  const temporalWindow = current?.choice === "bond" || current?.choice === "finale" ? round < (current?.endRound ?? 0) : true;
  return Boolean(current?.status === "active" && current.privilege === "available" && current.choice && (!pactId || current.choice === pactId) && round >= current.startRound && round <= current.endRound && temporalWindow);
}
export function pactActRoundsRemaining(state: PactBookState, round: number): number {
  const current = state.current;
  return current?.status === "active" ? Math.max(0, current.endRound - round + 1) : 0;
}
