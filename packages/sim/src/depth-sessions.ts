import { createHash } from "node:crypto";
import type { RuleProfile } from "@nocte/engine";
import { buildAudit, multisetKey } from "./depth-audit.js";
import { playCounterfactual, SCORING_VERSION } from "./benchmark.js";
import { BenchmarkRandom, scenario, STREAM_VERSION } from "./streams.js";
import { Moments } from "./statistics.js";
import { SOLVER_VERSION } from "./solver.js";
import { wilson } from "./session-statistics.js";
import { publicSelections } from "./depth-order.js";

export const SESSION_VERSION = "p1c-dealt-order-prefix-lanes-v2";
export const SESSION_LENGTHS = [5, 10, 20] as const;
type Accumulator = { wins: number; losses: number; ties: number; margin: Moments; expectedMargin: Moments; luckResidual: Moments };
export function sessionBenchmark(options: { seed: string; sessions: number; rules: RuleProfile }, prepared = buildAudit(options.rules)) {
  if (!Number.isSafeInteger(options.sessions) || options.sessions < 1 || options.sessions > 100000) throw new Error("sessions must be an integer in [1,100000].");
  if (prepared.report.rules !== options.rules.id) throw new Error("Audit/profile mismatch.");
  const [first, second] = prepared.finalists as [string, string];
  const agents = ["optimal", "p1a", first, second];
  const pairs = [["optimal", "p1a"], ["optimal", first], ["optimal", second], [first, "p1a"], [first, second], ["optimal", "optimal"]] as const;
  const accumulators = new Map<string, Accumulator>();
  for (const length of SESSION_LENGTHS) for (const [a, b] of pairs) accumulators.set(`${length}:${a}-vs-${b}`, {
    wins: 0, losses: 0, ties: 0, margin: new Moments(), expectedMargin: new Moments(), luckResidual: new Moments(),
  });
  const rows = new Map(prepared.rows.map(r => [r.key, r]));
  const laneSeed = `${SESSION_VERSION}:${options.seed}`;
  for (let session = 0; session < options.sessions; session++) {
    const totals = Object.fromEntries(agents.map(id => [id, 0]));
    const expected = Object.fromEntries(agents.map(id => [id, 0]));
    for (let round = 0; round < 20; round++) {
      const index = session * 20 + round;
      const initial = scenario(laneSeed, index);
      const row = rows.get(`${multisetKey(initial.cards)}|${initial.up.rank}`)!;
      const selection = publicSelections(initial.cards, initial.up, row.cards, row.inspection, prepared.policies);
      // Choices were computed from public-only policy inputs before any outcome is played.
      const played = new Map<number, number>();
      for (const agent of agents) {
        const choiceIndex = selection.indices[agent]!;
        const canonicalIndex = selection.canonicalIndices[choiceIndex]!;
        let score = played.get(choiceIndex);
        if (score === undefined) {
          const luz = new BenchmarkRandom(laneSeed, index, "luz");
          const sombra = new BenchmarkRandom(laneSeed, index, "sombra");
          const dealer = new BenchmarkRandom(laneSeed, index, "dealer");
          score = playCounterfactual(initial, selection.choices[choiceIndex]!, {
            luz: () => luz.card(), sombra: () => sombra.card(), dealer: () => dealer.card(),
          }, prepared.solver).score;
          played.set(choiceIndex, score);
        }
        totals[agent]! += score;
        expected[agent]! += row.inspection.partitions[canonicalIndex]!.ev * options.rules.initialExposure;
      }
      const length = round + 1;
      if ((SESSION_LENGTHS as readonly number[]).includes(length)) for (const [a, b] of pairs) {
        const acc = accumulators.get(`${length}:${a}-vs-${b}`)!;
        const margin = totals[a]! - totals[b]!; const evMargin = expected[a]! - expected[b]!;
        if (margin > 0) acc.wins++; else if (margin < 0) acc.losses++; else acc.ties++;
        acc.margin.add(margin); acc.expectedMargin.add(evMargin); acc.luckResidual.add(margin - evMargin);
      }
    }
  }
  return { schemaVersion: 1, sessionVersion: SESSION_VERSION, prngVersion: STREAM_VERSION, solverVersion: SOLVER_VERSION,
    scoringVersion: SCORING_VERSION, rules: options.rules.id, seed: options.seed, sessions: options.sessions,
    lengths: SESSION_LENGTHS, finalists: prepared.finalists,
    policyFingerprint: createHash("sha256").update(JSON.stringify({ models: prepared.report.learnedModels,
      policies: prepared.policies.map(p => ({ id: p.id, description: p.description })), finalists: prepared.finalists })).digest("hex"),
    units: "net match points per session; variance is squared match points",
    protocol: "identical optimal actions; original dealt order with first-available ties; common named lanes; nested prefixes; public-only composition",
    winObjective: "EV-optimal composition is not claimed optimal for session win probability; no score/risk-adaptive agent was run",
    comparisons: [...accumulators].map(([key, a]) => ({ key, win: wilson(a.wins, options.sessions), loss: wilson(a.losses, options.sessions),
      tie: wilson(a.ties, options.sessions), decisiveWin: wilson(a.wins, a.wins + a.losses),
      margin: a.margin.summary(), expectedMargin: a.expectedMargin.summary(), luckResidual: a.luckResidual.summary() })),
  };
}
