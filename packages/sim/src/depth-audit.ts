import { createHash } from "node:crypto";
import { handValue, type Card, type RuleProfile } from "@nocte/engine";
import { weightedScenarios } from "./enumeration.js";
import { EvSolver, EV_TOLERANCE, RANKS, SOLVER_VERSION, type CompositionInspection } from "./solver.js";
import { features, FEATURE_NAMES, fixedPolicies, POLICY_VERSION } from "./depth-policies.js";
import { fitTree, treePolicy, treeRules, type TrainingPoint } from "./depth-learning.js";
import { weightedSummary } from "./weighted-statistics.js";
import { orderDistribution } from "./depth-order.js";

export const AUDIT_VERSION = "depth-exact-dealt-order-v2";
export type DepthRow = { key: string; multiset: string; weight: number; cards: readonly Card[]; up: Card;
  inspection: CompositionInspection; holdout: boolean; selected: Record<string, number>; order?: ReturnType<typeof orderDistribution> };
export const multisetKey = (cards: readonly Card[]) => cards.map(c => c.rank).sort((a, b) => RANKS.indexOf(a) - RANKS.indexOf(b)).join(",");
export const heldOut = (key: string) => createHash("sha256").update(`nocte-p1c-split-v1:${key}`).digest().readUInt32LE(0) % 5 === 0;
export const secondGap = (row: DepthRow): number | null => {
  const sorted = row.inspection.partitions.map(p => p.ev).sort((a, b) => b - a);
  return sorted.length > 1 ? Math.max(0, sorted[0]! - sorted[1]!) : null;
};
const worstGap = (row: DepthRow) => row.inspection.bestEv - Math.min(...row.inspection.partitions.map(p => p.ev));
const mass = (rows: DepthRow[]) => rows.reduce((s, r) => s + r.weight, 0);
const regretValues = (row: DepthRow, id: string) => row.inspection.partitions.flatMap((p, i) => {
  const probability = row.order!.probabilities[id]![i]!;
  return probability > 0 ? [{ value: Math.max(0, row.inspection.bestEv - p.ev), weight: row.weight * probability }] : [];
});
const meanRegret = (row: DepthRow, id: string) => regretValues(row, id).reduce((s, v) => s + v.weight * v.value, 0) / row.weight;
const accuracy = (rows: DepthRow[], id: string) => rows.flatMap(r => regretValues(r, id)).reduce((s, v) => s + (v.value <= EV_TOLERANCE ? v.weight : 0), 0) / mass(rows);
function policySummary(rows: DepthRow[], id: string) {
  const w = mass(rows);
  return { probabilityMass: w, accuracy: accuracy(rows, id),
    regret: weightedSummary(rows.flatMap(r => regretValues(r, id))) };
}
export function strata(row: DepthRow): string[] {
  const optimal = row.inspection.partitions[row.inspection.bestIndex]!.partition;
  const openingTotal = [optimal.luz, optimal.sombra].reduce((s, pair) => s + handValue(pair.map(i => row.cards[i]!)).total, 0);
  const ace = row.cards.some(c => c.rank === "A");
  const sum = row.cards.reduce((s, c) => s + (c.rank === "A" ? 1 : Number(c.rank)), 0);
  return [`up:${row.up.rank}`, `ace:${ace}`, `naturalPossible:${ace && row.cards.some(c => c.rank === "10")}`,
    `duplicates:${new Set(row.cards.map(c => c.rank)).size < 4}`, `rankSum:${sum}`, `optimalOpeningTotal:${openingTotal}`];
}
export function buildAudit(rules: RuleProfile) {
  const solver = new EvSolver(rules);
  const rows: DepthRow[] = [...weightedScenarios()].map(({ cards, up, weight }) => {
    const multiset = multisetKey(cards);
    return { key: `${multiset}|${up.rank}`, multiset, cards, up, weight,
      inspection: solver.inspect(cards, up), holdout: heldOut(multiset), selected: {} };
  });
  const points: TrainingPoint[] = rows.filter(r => !r.holdout).flatMap(row => row.inspection.partitions.map(p => ({
    x: features(row.cards, row.up, p.partition), y: p.ev, weight: row.weight / row.inspection.partitions.length,
  })));
  const models = [2, 3, 4].map(depth => { const tree = fitTree(points, depth); return { depth, tree, rules: treeRules(tree) }; });
  const policies = [...fixedPolicies(rules), ...models.map(m => treePolicy(m.tree, m.depth))];
  for (const row of rows) {
    const choices = row.inspection.partitions.map(p => p.partition);
    for (const policy of policies) row.selected[policy.id] = policy.select(row.cards, row.up, choices);
    row.selected.optimal = row.inspection.bestIndex;
    row.order = orderDistribution(row.cards, row.up, row.inspection, policies);
  }
  const ids = policies.map(p => p.id);
  const train = rows.filter(r => !r.holdout); const holdout = rows.filter(r => r.holdout);
  const nontrivial = rows.filter(r => r.inspection.partitions.length > 1);
  const summaries = Object.fromEntries(policies.map(policy => [policy.id, { kind: policy.kind, description: policy.description,
    all: policySummary(rows, policy.id), nontrivial: policySummary(nontrivial, policy.id),
    train: policySummary(train, policy.id), holdout: policySummary(holdout, policy.id) }]));
  const finalists = policies.filter(p => p.id !== "p1a").map(p => ({ id: p.id,
    trainingMeanRegret: summaries[p.id]!.train.regret!.mean })).sort((a, b) => a.trainingMeanRegret - b.trainingMeanRegret || a.id.localeCompare(b.id)).slice(0, 2);
  const groups = new Map<string, DepthRow[]>();
  for (const row of rows) for (const key of strata(row)) { const group = groups.get(key) ?? []; group.push(row); groups.set(key, group); }
  const stratified = Object.fromEntries([...groups].map(([key, group]) => {
    const choice = group.filter(r => secondGap(r) !== null); const w = mass(group);
    return [key, { probabilityMass: w, nontrivialMass: mass(choice),
      meanBestSecondNontrivial: weightedSummary(choice.map(r => ({ value: secondGap(r)!, weight: r.weight })))?.mean ?? null,
      policies: Object.fromEntries(ids.map(id => [id, { accuracy: accuracy(group, id),
        nontrivialAccuracy: choice.length ? accuracy(choice, id) : null,
        meanRegret: group.reduce((s, r) => s + r.weight * meanRegret(r, id), 0) / w }])) }];
  }));
  const overlap = ids.flatMap((a, i) => ids.slice(i + 1).map(b => ({ a, b,
    sameChoice: rows.reduce((s, r) => s + r.weight * r.order!.overlap[`${a}|${b}`]!.same, 0),
    sameChoiceNontrivial: nontrivial.reduce((s, r) => s + r.weight * r.order!.overlap[`${a}|${b}`]!.same, 0) / mass(nontrivial),
    equalEv: rows.reduce((s, r) => s + r.weight * r.order!.overlap[`${a}|${b}`]!.equalEv, 0),
  })));
  const representatives = new Map<string, { reason: string; row: DepthRow }>();
  const addRepresentative = (reason: string, row: DepthRow | undefined) => {
    if (row) { const previous = representatives.get(row.key); representatives.set(row.key, { reason: previous ? `${previous.reason};${reason}` : reason, row }); }
  };
  addRepresentative("historical-11+20-versus-15+16", rows.find(r => r.key === "5,6,10,10|7"));
  addRepresentative("order-sensitive-P1A-tie", rows.find(r => r.key === "6,7,7,8|7"));
  addRepresentative("two-naturals-versus-A", rows.find(r => r.key === "A,A,10,10|A"));
  addRepresentative("largest-best-second-gap", [...nontrivial].sort((a, b) => secondGap(b)! - secondGap(a)!)[0]);
  addRepresentative("smallest-positive-best-second-gap", [...nontrivial].filter(r => secondGap(r)! > EV_TOLERANCE).sort((a, b) => secondGap(a)! - secondGap(b)!)[0]);
  addRepresentative("optimal-tie", rows.find(r => r.inspection.bestIndices.length > 1));
  addRepresentative("single-option", rows.find(r => r.inspection.partitions.length === 1));
  for (const id of ["p1a", ...finalists.map(f => f.id)]) addRepresentative(`largest-order-averaged-regret-${id}`, [...rows].sort((a, b) => meanRegret(b, id) - meanRegret(a, id))[0]);
  const representativeScenarios = [...representatives.values()].map(({ reason, row }) => ({ reason, key: row.key, weight: row.weight,
    strata: strata(row), bestIndices: row.inspection.bestIndices, selections: row.selected, selectionProbabilities: row.order!.probabilities,
    options: row.inspection.partitions.map(p => ({ luz: p.partition.luz.map(i => row.cards[i]!.rank),
      sombra: p.partition.sombra.map(i => row.cards[i]!.rank), luzEv: p.luz.exAnte, sombraEv: p.sombra.exAnte, ev: p.ev })) }));
  const sufficientStates = new Set<string>();
  for (let a = 0; a < RANKS.length; a++) for (let b = a; b < RANKS.length; b++) for (const up of RANKS) {
    const h = handValue([{ rank: RANKS[a]! }, { rank: RANKS[b]! }]);
    sufficientStates.add(`${up}:${h.total}:${h.soft}:${h.natural}`);
  }
  const report = { schemaVersion: 1, auditVersion: AUDIT_VERSION, policyVersion: POLICY_VERSION, solverVersion: SOLVER_VERSION,
    rules: rules.id, units: "initial-hand exposure units; multiply EV/gap/regret by 10 for match points",
    classes: rows.length, orderedDecisionClasses: rows.reduce((s, r) => s + r.order!.orders, 0), totalWeight: mass(rows),
    tieConvention: "statistics integrate every equally likely dealt order; representative selections show canonical order only",
    optionCountMass: Object.fromEntries([1, 2, 3].map(n => [n, mass(rows.filter(r => r.inspection.partitions.length === n))])),
    optimalTieMass: mass(rows.filter(r => r.inspection.bestIndices.length > 1)),
    anyAlternativeTieMass: mass(rows.filter(r => r.inspection.partitions.some((p, i, options) =>
      options.slice(i + 1).some(other => Math.abs(p.ev - other.ev) <= EV_TOLERANCE)))),
    bestSecond: { undefinedSingleMass: mass(rows) - mass(nontrivial), nontrivial: weightedSummary(nontrivial.map(r => ({ value: secondGap(r)!, weight: r.weight }))),
      populationMeanWithUndefinedAsZero: nontrivial.reduce((s, r) => s + r.weight * secondGap(r)!, 0) / mass(rows) },
    bestWorst: { all: weightedSummary(rows.map(r => ({ value: worstGap(r), weight: r.weight }))),
      nontrivial: weightedSummary(nontrivial.map(r => ({ value: worstGap(r), weight: r.weight }))) },
    split: { version: "sha256-multiset-4of5-v1", trainClasses: train.length, holdoutClasses: holdout.length,
      trainMass: mass(train), holdoutMass: mass(holdout) },
    selectionRule: "two lowest training-regret policies excluding P1A; holdout and sessions not used to choose finalists",
    finalists, policies: summaries, featureNames: FEATURE_NAMES, learnedModels: models, overlap, strata: stratified,
    compressionReference: { oracleTwoCardUtilityStates: sufficientStates.size,
      caution: "An exact utility lookup is an oracle reference, not a human heuristic; no inter-hand EV interaction under the model." },
    representativeScenarios,
  };
  return { report, rows, policies, finalists: finalists.map(f => f.id), solver };
}
export function representativeCsv(report: ReturnType<typeof buildAudit>["report"]): string {
  const columns = ["reason", "scenario", "probability", "option", "luz", "sombra", "luzEv", "sombraEv", "roundEv", "optimal", "p1aCanonicalChoice", "p1aOrderProbability", ...report.finalists.map(f => `${f.id}OrderProbability`)];
  const records = report.representativeScenarios.flatMap(r => r.options.map((o, i) => [r.reason, r.key, r.weight, i,
    o.luz.join("+"), o.sombra.join("+"), o.luzEv, o.sombraEv, o.ev, r.bestIndices.includes(i), r.selections.p1a === i,
    r.selectionProbabilities.p1a![i], ...report.finalists.map(f => r.selectionProbabilities[f.id]![i])]));
  return [columns, ...records].map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n") + "\n";
}
