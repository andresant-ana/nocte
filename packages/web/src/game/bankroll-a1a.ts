/** A1a is a client-only experimental ledger, isolated from the A0.1 contract. */
export const A1A_BANKROLL_VERSION = "BANKROLL-LAB-A1a-0.1";
export const A1A_INITIAL_TICKS = 300; // 150 fictional chips, in exact half-chip ticks
export const A1A_HORIZON = 10;

export type A1aRound = Readonly<{ id: string; stake: number; kind: "funded" | "practice"; coveragePerStake: number }>;
export type A1aBankroll = Readonly<{
  id: string;
  status: "active" | "practice" | "complete" | "abandoned";
  balanceTicks: number;
  round: A1aRound | null;
  completedRounds: number;
  fundedRounds: number;
  practiceRounds: number;
  lastStake: number | null;
  lastSettlement: Readonly<{ roundId: string; score: number; deltaTicks: number; stake: number; kind: "funded" | "practice"; refundTicks?: number }> | null;
  settlements: readonly Readonly<{ roundId: string; score: number; deltaTicks: number; stake: number; kind: "funded" | "practice"; refundTicks?: number }>[];
  settledRoundIds: readonly string[];
}>;

export const maxA1aStake = (balanceTicks: number, coveragePerStake = 4): number => {
  if (!Number.isSafeInteger(balanceTicks) || balanceTicks < 0) throw new Error("Saldo A1a inválido.");
  if (!Number.isSafeInteger(coveragePerStake) || coveragePerStake < 1) throw new Error("Cobertura A1a inválida.");
  return Math.floor(balanceTicks / (2 * coveragePerStake));
};

export function formatHalfChips(ticks: number): string {
  if (!Number.isSafeInteger(ticks)) throw new Error("Ticks de banca inválidos.");
  const sign = ticks < 0 ? "−" : "";
  const absolute = Math.abs(ticks);
  return `${sign}${Math.floor(absolute / 2)}${absolute % 2 ? ",5" : ""}`;
}

export function createA1aBankroll(id: string): A1aBankroll {
  if (!id.trim()) throw new Error("A Noite A1a precisa de identificador local.");
  return { id, status: "active", balanceTicks: A1A_INITIAL_TICKS, round: null, completedRounds: 0,
    fundedRounds: 0, practiceRounds: 0, lastStake: null, lastSettlement: null, settlements: [], settledRoundIds: [] };
}

export function enterA1aPracticeIfNeeded(state: A1aBankroll, eligibleStake = maxA1aStake(state.balanceTicks)): A1aBankroll {
  if (state.status !== "active") return state;
  if (eligibleStake > 0) return state;
  return { ...state, status: "practice" };
}

export function beginA1aRound(state: A1aBankroll, roundId: string, stake: number,
  options: Readonly<{ coveragePerStake?: number; stakeCap?: number }> = {}): A1aBankroll {
  if (state.status === "complete" || state.status === "abandoned") throw new Error("A Noite A1a já expirou.");
  if (state.round) throw new Error("A rodada A1a anterior ainda não foi concluída.");
  if (!roundId.trim() || state.settledRoundIds.includes(roundId)) throw new Error("Identificador de rodada A1a inválido ou repetido.");
  if (state.completedRounds >= A1A_HORIZON) throw new Error("A Noite A1a já chegou ao limite de 10 rodadas.");
  const coveragePerStake = options.coveragePerStake ?? 4;
  const eligible = Math.min(maxA1aStake(state.balanceTicks, coveragePerStake), options.stakeCap ?? Number.MAX_SAFE_INTEGER);
  const kind = state.status === "practice" ? "practice" : "funded";
  if (kind === "funded" && (!Number.isSafeInteger(stake) || stake < 1 || stake > eligible)) {
    throw new Error(`Aposta inelegível: escolha um valor inteiro de 1 a ${eligible}.`);
  }
  if (kind === "practice" && stake !== 0) throw new Error("A prática gratuita não aceita aposta.");
  return { ...state, round: { id: roundId, stake, kind, coveragePerStake },
    fundedRounds: state.fundedRounds + (kind === "funded" ? 1 : 0),
    practiceRounds: state.practiceRounds + (kind === "practice" ? 1 : 0),
    lastStake: kind === "funded" ? stake : state.lastStake };
}

export function settleA1aRound(state: A1aBankroll, roundId: string, result: Readonly<{ phase: string; score?: number; refundTicks?: number }>): A1aBankroll {
  const prior = state.settlements.find((entry) => entry.roundId === roundId) ?? null;
  if (prior) {
    if (result.phase === "complete" && result.score === prior.score && (result.refundTicks ?? 0) === (prior.refundTicks ?? 0)) return state;
    throw new Error("Replay A1a diverge da liquidação registrada.");
  }
  const round = state.round;
  if (!round || round.id !== roundId) throw new Error("Liquidação A1a não corresponde à rodada atual.");
  if (result.phase !== "complete" || !Number.isSafeInteger(result.score)) throw new Error("A banca A1a só aceita o score final inteiro do motor.");
  const score = result.score!;
  if (score < -40 || score > 40) throw new Error("Score fora da cobertura máxima do motor na exposição-base 10.");
  const numerator = round.stake * score;
  if (!Number.isSafeInteger(numerator) || numerator % 5 !== 0) throw new Error("A liquidação A1a não cabe em meios de ficha exatos.");
  const deltaTicks = round.kind === "funded" ? numerator / 5 : 0;
  if (deltaTicks < -2 * round.coveragePerStake * round.stake) throw new Error("A perda excede a reserva coberta da rodada A1a.");
  const refundTicks = round.kind === "funded" ? result.refundTicks ?? 0 : 0;
  if (!Number.isSafeInteger(refundTicks) || refundTicks < 0 || refundTicks > 2 * round.stake) throw new Error("Restituição A1a inválida.");
  const balanceTicks = round.kind === "funded" ? state.balanceTicks + deltaTicks + refundTicks : state.balanceTicks;
  if (balanceTicks < 0) throw new Error("A liquidação A1a violaria o saldo não negativo.");
  const completedRounds = state.completedRounds + 1;
  const status = completedRounds >= A1A_HORIZON ? "complete"
    : round.kind === "practice" || maxA1aStake(balanceTicks) === 0 ? "practice" : "active";
  const settlement = { roundId, score, deltaTicks: deltaTicks + refundTicks, stake: round.stake, kind: round.kind, ...(refundTicks ? { refundTicks } : {}) } as const;
  return { ...state, status, balanceTicks, round: null, completedRounds,
    settledRoundIds: [...state.settledRoundIds, roundId],
    settlements: [...state.settlements, settlement], lastSettlement: settlement };
}

export function abandonA1aNight(state: A1aBankroll): A1aBankroll {
  if (state.status === "complete" || state.status === "abandoned") throw new Error("A Noite A1a já expirou.");
  return { ...state, status: "abandoned", round: null };
}
