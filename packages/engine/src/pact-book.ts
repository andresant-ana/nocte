import type { Action, HandName } from "./index.js";
import type { CofreFocoActionRestrictions } from "./cofre-foco.js";

export const PACT_BOOK_VERSION = "PACT-BOOK-0.1" as const;
export type PactFamily = "revelation" | "dominion" | "focus";
export type PactId = "veil" | "lighthouse" | "iron" | "impetus" | "vigil" | "flare";
export type PactUse = "none" | "available" | "consumed" | "expired";
export type PactChoice = PactId | "refused";

export const PACT_BOOK_PACTS = Object.freeze({
  veil: { id: "veil", name: "Véu", family: "revelation", pairId: "revelation", eligibility: "p7-a", activationWindow: "focus-window", uses: 1, privilege: "Uma Leitura gratuita em uma janela legal do Ato.", renunciation: "A carta aberta do dealer fica oculta até confirmar a composição." },
  lighthouse: { id: "lighthouse", name: "Farol", family: "revelation", pairId: "revelation", eligibility: "p7-a", activationWindow: "before-composition", uses: 1, privilege: "Revela uma categoria da carta fechada antes da composição: Ás, baixa (2–6) ou alta (7–K).", renunciation: "Leitura fica indisponível durante o Ato." },
  iron: { id: "iron", name: "Ferro", family: "dominion", pairId: "dominion", eligibility: "p7-a", activationWindow: "focus-window", uses: 1, privilege: "Uma Manobra gratuita em janela legal; a Manobra paga pode preservar este Privilégio.", renunciation: "A Face escolhida não pode Dobrar durante o Ato." },
  impetus: { id: "impetus", name: "Ímpeto", family: "dominion", pairId: "dominion", eligibility: "p7-a", activationWindow: "after-first-hit", uses: 1, privilege: "Uma vez, depois de exatamente uma Compra, Dobrar, receber uma carta e encerrar a mão.", renunciation: "Manobra fica indisponível durante o Ato." },
  vigil: { id: "vigil", name: "Vigília", family: "focus", pairId: "focus", eligibility: "p7-a", activationWindow: "late-period", uses: 1, privilege: "Uma Leitura ou Manobra gratuita e legal na parte final do Ato.", renunciation: "Leitura e Manobra normais ficam indisponíveis na parte inicial." },
  flare: { id: "flare", name: "Fulgor", family: "focus", pairId: "focus", eligibility: "p7-a", activationWindow: "early-period", uses: 1, privilege: "Uma Leitura ou Manobra gratuita e legal na parte inicial do Ato.", renunciation: "Leitura e Manobra normais ficam indisponíveis na parte final." },
} as const);

export const PACT_BOOK_FAMILIES = Object.freeze(["revelation", "dominion", "focus"] as const);
const pairByFamily: Readonly<Record<PactFamily, readonly [PactId, PactId]>> = {
  revelation: ["veil", "lighthouse"], dominion: ["iron", "impetus"], focus: ["vigil", "flare"],
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
    affectedFace: null, privilege: "none", usedRound: null });
  return Object.freeze({ ...state, firstFamily: round === 4 ? family : state.firstFamily, offers: Object.freeze([...state.offers, current]), current, fallbackReason: null });
}

export function signPactBook(state: PactBookState, pact: PactId, face?: HandName): PactBookState {
  const offer = state.current;
  if (!offer || offer.status !== "offered" || !offer.options.includes(pact)) throw new Error("Pacto não pertence à oferta ativa.");
  if (pact === "iron" && face !== "luz" && face !== "sombra") throw new Error("Ferro exige escolher a Face da Renúncia.");
  if (pact !== "iron" && face !== undefined) throw new Error("Este Pacto não exige escolher uma Face.");
  const current = Object.freeze({ ...offer, status: "active" as const, choice: pact, affectedFace: pact === "iron" ? face! : null, privilege: "available" as const });
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
  const next = Object.freeze({ ...current, privilege: "consumed" as const, usedRound: round });
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
  if (pact.choice === "impetus") return Object.freeze({ forbidManeuver: true });
  return undefined;
}
export function assertPactBookActionAllowed(state: PactBookState, round: number, hand: HandName, action: Action): void {
  const pact = state.current;
  const restrictions = pactBookRestrictions(state, round);
  if (action === "double" && restrictions?.forbiddenDoubleHand === hand) throw new Error("Dobrar esta Face é proibido pela Renúncia de Ferro.");
}
export function canUsePactBookPrivilege(state: PactBookState, round: number, pactId?: PactId): boolean {
  const current = state.current;
  return Boolean(current?.status === "active" && current.privilege === "available" && current.choice && (!pactId || current.choice === pactId) && round >= current.startRound && round <= current.endRound);
}
export function pactActRoundsRemaining(state: PactBookState, round: number): number {
  const current = state.current;
  return current?.status === "active" ? Math.max(0, current.endRound - round + 1) : 0;
}
