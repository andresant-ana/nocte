/** Local-only A0.1 bankroll ledger. It never interprets engine cards or actions. */
export const A0_BANKROLL_INITIAL = 150;
export const A0_BANKROLL_ROUNDS = 10;
export const A0_BANKROLL_COVERAGE = 40;

export type BankrollRound = Readonly<{
  id: string;
  kind: "funded" | "practice";
  escrow: number;
  available: number;
}>;

export type BankrollNight = Readonly<{
  id: string;
  status: "active" | "practice" | "complete" | "abandoned";
  bankroll: number;
  pendingRound: BankrollRound | null;
  fundedRounds: number;
  practiceRounds: number;
  settledRoundIds: readonly string[];
  settlements: readonly Readonly<{ id: string; score: number }>[];
  lastSettlement: Readonly<{ kind: "funded" | "practice"; score: number; bankDelta: number }> | null;
  expiredBalance: number | null;
}>;

export type CompletedEngineRound = Readonly<{ phase: string; score?: number }>;

export function createBankrollNight(id: string): BankrollNight {
  if (!id.trim()) throw new Error("A Noite precisa de um identificador local.");
  return {
    id, status: "active", bankroll: A0_BANKROLL_INITIAL, pendingRound: null,
    fundedRounds: 0, practiceRounds: 0, settledRoundIds: [], settlements: [], lastSettlement: null, expiredBalance: null,
  };
}

export function beginBankrollRound(night: BankrollNight, roundId: string): BankrollNight {
  if (!roundId.trim()) throw new Error("A rodada precisa de um identificador.");
  if (night.status === "complete" || night.status === "abandoned") throw new Error("A Noite já expirou.");
  if (night.pendingRound) throw new Error("A rodada anterior ainda não foi concluída.");
  if (night.settledRoundIds.includes(roundId)) throw new Error("O identificador da rodada já foi liquidado.");

  const funded = night.status !== "practice" && night.bankroll >= A0_BANKROLL_COVERAGE;
  const kind = funded ? "funded" : "practice";
  const pendingRound: BankrollRound = {
    id: roundId,
    kind,
    escrow: funded ? A0_BANKROLL_COVERAGE : 0,
    available: funded ? night.bankroll - A0_BANKROLL_COVERAGE : night.bankroll,
  };
  return {
    ...night,
    status: funded ? "active" : "practice",
    pendingRound,
    fundedRounds: night.fundedRounds + (funded ? 1 : 0),
    practiceRounds: night.practiceRounds + (funded ? 0 : 1),
  };
}

export function settleBankrollRound(
  night: BankrollNight,
  roundId: string,
  result: CompletedEngineRound,
): BankrollNight {
  const previousSettlement = night.settlements.find((entry) => entry.id === roundId);
  if (previousSettlement) {
    if (result.phase === "complete" && result.score === previousSettlement.score) return night;
    throw new Error("Replay de liquidação diverge do score já registrado para esta rodada.");
  }
  if (night.status === "complete" || night.status === "abandoned") throw new Error("A Noite já expirou.");
  const pending = night.pendingRound;
  if (!pending || pending.id !== roundId) throw new Error("A liquidação não corresponde à rodada pendente.");
  if (result.phase !== "complete" || !Number.isSafeInteger(result.score)) {
    throw new Error("A banca só aceita o score final e inteiro do motor.");
  }
  const score = result.score!;
  if (score < -A0_BANKROLL_COVERAGE || score > A0_BANKROLL_COVERAGE) {
    throw new Error("O score excede a cobertura máxima A0.1.");
  }
  const nextBankroll = pending.kind === "funded" ? night.bankroll + score : night.bankroll;
  if (nextBankroll < 0) throw new Error("A liquidação violaria a cobertura da banca A0.1.");
  return {
    ...night,
    bankroll: nextBankroll,
    pendingRound: null,
    settledRoundIds: [...night.settledRoundIds, roundId],
    settlements: [...night.settlements, { id: roundId, score }],
    lastSettlement: { kind: pending.kind, score, bankDelta: pending.kind === "funded" ? score : 0 },
  };
}

export function expireBankrollNight(night: BankrollNight): BankrollNight {
  if (night.status === "abandoned") throw new Error("A Noite já foi abandonada.");
  if (night.status === "complete") return night;
  return { ...night, status: "complete", pendingRound: null, expiredBalance: night.bankroll };
}

export function abandonBankrollNight(night: BankrollNight): BankrollNight {
  if (night.status === "complete" || night.status === "abandoned") throw new Error("A Noite já expirou.");
  return { ...night, status: "abandoned", pendingRound: null, expiredBalance: night.bankroll };
}
