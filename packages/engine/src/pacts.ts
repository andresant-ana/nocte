import type { CofreFocoActionRestrictions } from "./cofre-foco.js";
import type { Action, HandName } from "./index.js";

export const PACT_LAB_VERSION = "PACT-LAB-0.1" as const;
export type PactKind = "veil" | "iron";
export type PactStatus = "unoffered" | "offered" | "refused" | "signed" | "active" | "expired";
export type PactPrivilegeStatus = "none" | "available" | "consumed" | "expired";
export type PactContractState = Readonly<{
  version: typeof PACT_LAB_VERSION;
  status: PactStatus;
  pact: PactKind | null;
  ironFace: HandName | null;
  offerRound: 4;
  actStartRound: 4;
  actEndRound: 7;
  privilege: PactPrivilegeStatus;
  privilegeUsedRound: number | null;
}>;

export function createPactContract(): PactContractState {
  return Object.freeze({ version: PACT_LAB_VERSION, status: "unoffered", pact: null, ironFace: null,
    offerRound: 4, actStartRound: 4, actEndRound: 7, privilege: "none", privilegeUsedRound: null });
}

/** Opens once, between rounds 3 and 4. Calling again is harmless; it never deals. */
export function offerPact(state: PactContractState, nextRound: number): PactContractState {
  if (nextRound !== state.offerRound) return state;
  if (state.status !== "unoffered") return state;
  return Object.freeze({ ...state, status: "offered" });
}

export function signPact(state: PactContractState, pact: PactKind, ironFace?: HandName): PactContractState {
  if (state.status !== "offered") throw new Error("Só é possível assinar um Pacto durante a oferta da rodada 4.");
  if (pact === "iron" && ironFace !== "luz" && ironFace !== "sombra") throw new Error("Ferro exige escolher Luz ou Sombra para a Renúncia.");
  if (pact === "veil" && ironFace !== undefined) throw new Error("Véu não aceita uma Face de Renúncia.");
  return Object.freeze({ ...state, status: "signed", pact, ironFace: pact === "iron" ? ironFace! : null, privilege: "available" });
}

export function refusePacts(state: PactContractState): PactContractState {
  if (state.status !== "offered") throw new Error("A recusa só está disponível durante a oferta da rodada 4.");
  return Object.freeze({ ...state, status: "refused", pact: null, ironFace: null, privilege: "none" });
}

/** Apply before the next deal; Pact expiry happens before round 8 is dealt. */
export function enterPactRound(state: PactContractState, roundNumber: number): PactContractState {
  if (!Number.isSafeInteger(roundNumber) || roundNumber < 1 || roundNumber > 10) throw new Error("Rodada PACT-LAB inválida.");
  if (state.status === "signed" && roundNumber === state.actStartRound) return Object.freeze({ ...state, status: "active" });
  if (state.status === "active" && roundNumber > state.actEndRound) {
    return Object.freeze({ ...state, status: "expired", privilege: state.privilege === "available" ? "expired" : state.privilege });
  }
  return state;
}

export function completePactNight(state: PactContractState): PactContractState {
  if (state.status === "offered") return Object.freeze({ ...state, status: "expired", pact: null, ironFace: null, privilege: "none" });
  if (state.status === "active" || state.status === "signed") {
    return Object.freeze({ ...state, status: "expired", privilege: state.privilege === "available" ? "expired" : state.privilege });
  }
  return state;
}

export function consumePactPrivilege(state: PactContractState, roundNumber: number, kind: PactKind): PactContractState {
  if (state.status !== "active" || state.pact !== kind || state.privilege !== "available"
    || roundNumber < state.actStartRound || roundNumber > state.actEndRound) {
    throw new Error("Privilégio indisponível ou já consumido neste Ato.");
  }
  return Object.freeze({ ...state, privilege: "consumed", privilegeUsedRound: roundNumber });
}

export function pactActionRestrictions(state: PactContractState, roundNumber: number): CofreFocoActionRestrictions | undefined {
  if (state.status === "active" && state.pact === "iron" && state.ironFace && roundNumber >= state.actStartRound && roundNumber <= state.actEndRound) {
    return Object.freeze({ forbiddenDoubleHand: state.ironFace });
  }
  return undefined;
}

export function assertPactActionAllowed(state: PactContractState, roundNumber: number, hand: HandName, action: Action): void {
  if (action === "double" && pactActionRestrictions(state, roundNumber)?.forbiddenDoubleHand === hand) {
    throw new Error(`Dobrar ${hand === "luz" ? "Luz" : "Sombra"} é proibido pela Renúncia do Pacto de Ferro neste Ato.`);
  }
}

export function pactHidesDealerUpcard(state: PactContractState, roundNumber: number, phase: string): boolean {
  return state.status === "active" && state.pact === "veil" && roundNumber >= state.actStartRound
    && roundNumber <= state.actEndRound && phase === "compose";
}

export function pactRoundsRemaining(state: PactContractState, roundNumber: number): number {
  return state.status === "active" ? Math.max(0, state.actEndRound - roundNumber + 1) : 0;
}

export function canUsePactPrivilege(state: PactContractState, roundNumber: number, kind: PactKind): boolean {
  return state.status === "active" && state.pact === kind && state.privilege === "available"
    && roundNumber >= state.actStartRound && roundNumber <= state.actEndRound;
}
