import { FEATURE_NAMES, features, type Policy } from "./depth-policies.js";

export type TrainingPoint = { x: number[]; y: number; weight: number };
export type Tree = { prediction: number; weight: number; feature?: number; threshold?: number; left?: Tree; right?: Tree };
const sum = (points: TrainingPoint[]) => points.reduce((s, p) => ({ w: s.w + p.weight, y: s.y + p.weight * p.y, yy: s.yy + p.weight * p.y * p.y }), { w: 0, y: 0, yy: 0 });
const sse = (w: number, y: number, yy: number) => w > 0 ? yy - y * y / w : 0;
/** Weighted CART regression, depth-limited; predictions quantized to 0.05 exposure units. */
export function fitTree(points: TrainingPoint[], depth: number): Tree {
  if (!points.length || depth < 0) throw new Error("Invalid tree training set/depth.");
  const all = sum(points);
  const leaf: Tree = { prediction: Math.round((all.y / all.w) / 0.05) * 0.05, weight: all.w };
  if (!depth) return leaf;
  let bestGain = 1e-14; let split: { feature: number; threshold: number } | undefined;
  for (let feature = 0; feature < FEATURE_NAMES.length; feature++) {
    const ordered = [...points].sort((a, b) => a.x[feature]! - b.x[feature]!);
    let w = 0; let y = 0; let yy = 0;
    for (let i = 0; i < ordered.length - 1; i++) {
      const point = ordered[i]!; w += point.weight; y += point.weight * point.y; yy += point.weight * point.y * point.y;
      if (point.x[feature] === ordered[i + 1]!.x[feature] || w < 0.005 || all.w - w < 0.005) continue;
      const gain = sse(all.w, all.y, all.yy) - sse(w, y, yy) - sse(all.w - w, all.y - y, all.yy - yy);
      if (gain > bestGain + 1e-14) { bestGain = gain; split = { feature, threshold: (point.x[feature]! + ordered[i + 1]!.x[feature]!) / 2 }; }
    }
  }
  if (!split) return leaf;
  const { feature, threshold } = split;
  return { ...leaf, feature, threshold, left: fitTree(points.filter(p => p.x[feature]! <= threshold), depth - 1),
    right: fitTree(points.filter(p => p.x[feature]! > threshold), depth - 1) };
}
export function predict(tree: Tree, x: number[]): number {
  if (tree.feature === undefined) return tree.prediction;
  return predict(x[tree.feature]! <= tree.threshold! ? tree.left! : tree.right!, x);
}
export function treePolicy(tree: Tree, depth: number): Policy {
  return { id: `tree-${depth}`, kind: "learned", description: `Weighted regression rules, depth ≤${depth}, ≤${2 ** depth} leaves, prediction step 0.05 unit; oracle-supervised training only.`,
    select: (cards, up, choices) => {
      let best = -Infinity; let selected = 0;
      choices.forEach((choice, i) => { const value = predict(tree, features(cards, up, choice));
        if (value > best + 1e-12) { best = value; selected = i; }
      });
      return selected;
    } };
}
export function treeRules(tree: Tree, prefix = "always"): string[] {
  if (tree.feature === undefined) return [`${prefix}: predicted EV ${tree.prediction.toFixed(2)} units`];
  const condition = `${FEATURE_NAMES[tree.feature]} ≤ ${tree.threshold}`;
  return [...treeRules(tree.left!, `${prefix} AND ${condition}`), ...treeRules(tree.right!, `${prefix} AND NOT (${condition})`)];
}
