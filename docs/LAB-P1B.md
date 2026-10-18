# P1B mathematical laboratory contract

Status: EXPERIMENTAL offline evidence for Issue #5; no gameplay ratification. Existing P1A profiles remain unchanged. O-01/O-02/O-03 remain OPEN.

## Model and information

Ranks A–9 have probability 1/13 each; ten-value has probability 4/13, independently with replacement. The dealer stands on soft/hard 17. A natural is exactly two cards A+10. Composition precedes the peek: ex-ante hand EV is `P(dealer natural) × (0 if player natural else −1) + P(no dealer natural) × conditional EV`. After a negative peek the hole distribution excludes ten-value for an Ace upcard, or Ace for a ten upcard, and renormalizes. Other upcards need no conditioning. A composed natural beats non-natural 21 and pays 1.5 or 1 as specified by the existing experimental profile.

The solver receives only player cards, dealer upcard and the profile. Optimal subsequent actions assume the negative peek already occurred. There is no hole-card, future-card or seed parameter. With replacement, previously seen draws from either hand convey no information about future cards or the dealer; linearity makes sum-of-hand EV exact even with a common dealer. The objective is mean net match score, not match win probability or risk preference.

## Recursion and units

DP states use sum with all Aces worth one plus whether an Ace can be promoted by ten. Every draw increases the low sum, so recursion is acyclic and terminates. Dealer final probabilities include natural, bust and 17–21. Stand integrates net result against the no-natural dealer distribution. Hit integrates the best legal continuation without double. Double integrates one forced draw and stand, with twice the exposure; two-card eligibility is tracked separately from total. Natural hands are terminal. Cache keys include relevant upcard/state/eligibility; payout-dependent cache belongs to the solver instance.

EV is reported in initial-hand exposure units: one unit = 10 match points, two units initially exposed per round. Arithmetic is IEEE-754 double, not rational arithmetic; numerical tests use explicit tolerances. Ties within 1e-12 use deterministic first-in-order selection. Exact means exhaustive expectation under this model, not exact symbolic arithmetic or a finite-shoe solution.

## Baselines and streams

The principal random agent is uniform over P1A's distinct unordered rank partitions. Historical outputs list all three indexed perfect matchings, which can duplicate rank-equivalent outcomes. Enumeration will report both conventions rather than silently change the principal baseline. All three benchmark agents use the same optimal subsequent action policy; only composition differs. The P1A heuristic remains its original total-based rule.

Benchmark v2 uses named initial, dealer, Luz, Sombra and choice streams. A SHA-256 counter generator hashes a JSON-encoded domain/seed/scenario/lane/counter tuple and applies rejection sampling to uniform 32-bit words. Each agent restarts the corresponding lane; variable draw counts cannot shift another lane. This is a counterfactual common-random-number experiment, not a decision about a physical shoe or Noite Espelhada. Seeded lab randomness is not production entropy.

## Statistical protocol

Report sample variance (n−1 denominator), standard error and a normal-approximation marginal 95% interval over independent scenario differences. n=1 yields null variance/error/interval. Report both chosen-composition ex-ante EV and realized score; their residual quantifies luck under the model. Multiple reported pairwise intervals are descriptive and not familywise adjusted. Timing lives outside deterministic results and varies across runs. Legacy `pnpm simulate` retains P1A schema 1; the new benchmark uses schema 2.

A separate pilot seed estimates paired-score variance. Before the main run, choose a fixed sample at least `ceil((1.96 × pilot SD / 0.1)^2)` for optimal minus random in match points; also check the other profile. The 0.1 point target is precision for this offline study, not a product acceptance threshold. No stopping when an observed advantage happens to look favorable. Exhaustive enumeration covers all 7,150 classes with multinomial weights and carries no sampling interval.

Pilot protocol completed before the main run: `nocte-p1b-pilot-v1`, 2,000 scenarios per payout, yielded paired-score variances 175.94 (3:2) and 168.64 (1:1). The formula requires 67,591 and 64,783 scenarios respectively. Fix the main sample at **100,000 per profile**, seed `nocte-p1b-main-v1`; the separate pilot is not pooled into main estimates. An observed main interval wider than the target will be reported, not hidden by outcome-dependent stopping.

## Validation and limitations

Independent references include forward dealer probability propagation with a different state representation, hand-calculated natural and stand/double cases, engine-driven Monte Carlo and combinatorial weight checks. Historical Python is absent; historical JSON stays immutable and is a comparison, not an oracle. Infinite decks omit depletion/counting and these baselines do not represent expert humans. Distinguish model EV, simulated advantage against a weak composition baseline, and human fun/competition (NOT TESTED).

## Reproduction

From the repository root (Node 22+, pnpm 12.9.1):

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm benchmark -- --seed nocte-p1b-main-v1 --scenarios 100000 --out ../../lab/results/p1b-benchmark-3to2-v1.json
pnpm benchmark -- --seed nocte-p1b-main-v1 --scenarios 100000 --rules DF-SYM-0.1-lab-infinite-1to1-peek-natural-first --out ../../lab/results/p1b-benchmark-1to1-v1.json
pnpm enumerate -- --out ../../lab/results/p1b-enumeration-3to2-v1.json
pnpm enumerate -- --rules DF-SYM-0.1-lab-infinite-1to1-peek-natural-first --out ../../lab/results/p1b-enumeration-1to1-v1.json
```

`--out` is relative to `packages/sim`, the workspace script's working directory. Omit it for stdout. Use `--scenarios 1` for a single-round replay (null uncertainty); pilot commands replace the seed with `nocte-p1b-pilot-v1`, count with 2000 and filenames with `p1b-pilot-*`. Public lab APIs are exported from `@nocte/sim`: `EvSolver`, `enumerate`, `benchmark`. `inspect` returns both hands' ex-ante/negative-peek EV for every distinct partition, best indices, both random baselines and optimized margin. `actions` returns conditional action EVs; for a terminal natural its analytical stand value is reported, but the engine offers no further action.

## Exhaustive model results and historical comparison

Each run enumerates 7,150 classes; total weight = 0.9999999999999497. Units below are initial-hand exposure (multiply by 10 for match points per round).

| Payout | Optimal EV | Random distinct EV (P1A) | Random indexed EV (historical convention) | Optimal − distinct |
| --- | ---: | ---: | ---: | ---: |
| 3:2 | 0.379235919642570 | 0.001721173967339 | −0.021734845490812 | 0.377514745675231 |
| 1:1 | 0.290675178072033 | −0.038572112964048 | −0.066831305698788 | 0.329247291036081 |

The independent TS implementation reproduces the preserved historical optimal and indexed-random aggregates within 2e-14 unit. This is aggregate numerical reproduction under matching assumptions, not recovery of the absent original Python source. Distinct-random deltas versus the historical random values are +0.023456019458153 unit (3:2) and +0.028259192734743 (1:1), explained by different weights on repeated rank-equivalent pairings. No algorithm was tuned to the historic numbers. Historical weighted best-versus-worst gap frequencies also agree within floating-point tolerance. The conditional 40k sample and older 30k match-win experiments were not rerun and must not be substituted for these results.

## Main benchmark results

Seed `nocte-p1b-main-v1`, n=100,000 per payout, all agents use optimal subsequent actions. All values below are **net match points per round**, not percentages or credits. EV columns average ex-ante EV of actually selected partitions in the sample; exhaustive population values above are more precise for optimal/random policies.

| Payout | Composition | Sample mean EV | Mean realized score | Score marginal IC 95% | EV-optimal choice rate |
| --- | --- | ---: | ---: | --- | ---: |
| 3:2 | Random distinct | 0.00879 | −0.02105 | [−0.13411, 0.09201] | 48.936% |
| 3:2 | P1A heuristic | 3.12840 | 3.12125 | [3.00964, 3.23286] | 80.637% |
| 3:2 | Optimal EV | 3.78513 | 3.79175 | [3.67463, 3.90887] | 100% |
| 1:1 | Random distinct | −0.39180 | −0.42180 | [−0.53306, −0.31054] | 48.990% |
| 1:1 | P1A heuristic | 2.22708 | 2.22000 | [2.11143, 2.32857] | 78.928% |
| 1:1 | Optimal EV | 2.90883 | 2.91600 | [2.80102, 3.03098] | 100% |

| Payout | Paired comparison | Mean score difference | Marginal IC 95% | Paired score variance |
| --- | --- | ---: | --- | ---: |
| 3:2 | Optimal − random | 3.81280 | [3.73368, 3.89192] | 162.95619 |
| 3:2 | Optimal − heuristic | 0.67050 | [0.62012, 0.72088] | 66.06759 |
| 3:2 | Heuristic − random | 3.14230 | [3.06367, 3.22093] | 160.95106 |
| 1:1 | Optimal − random | 3.33780 | [3.26037, 3.41523] | 156.07265 |
| 1:1 | Optimal − heuristic | 0.69600 | [0.64443, 0.74757] | 69.24028 |
| 1:1 | Heuristic − random | 2.64180 | [2.56495, 2.71865] | 153.72043 |

The P1A heuristic captures about 82.61% (3:2) / 79.34% (1:1) of the **sampled EV improvement over random**, with a remaining EV gap of 0.65673 / 0.68176 points per round. This describes a transparent software heuristic in this model, not human performance. Multiple distinct optimal partitions occur in 0.296% of sampled scenarios; 10.424% have only one distinct partition, so optimal-choice rates include trivial choices. Population multiple-optimum rate is 0.298955%.

Residual luck remains large: optimal-agent variance of score minus ex-ante EV is 307.73293 (3:2) / 309.22151 (1:1) points squared. For optimal-minus-random the residual variances are 134.26097 / 134.06531. The corresponding residual means' 95% intervals include zero. Advantages in average EV do not eliminate single-round luck and do not establish match win rates or fairness of future live rules.

## Decision study: [5,6,10,10] against 7

Dealer natural probability is zero for upcard 7, so ex-ante and after-peek values coincide. Compose **11 + 20**: EV = 0.462888948864291 + 0.773227226537175 = **1.236116175401466 units** (+12.36116 points). Compose **15 + 16**: EV = −0.369761818073812 − 0.414778831068539 = **−0.784540649142351 units** (−7.84541 points). The composition gap is **2.020656824543817 units** (20.20657 points). Both payout profiles agree here because no composed natural is present. There are two distinct rank partitions but three indexed pairings; the 15+16 outcome appears twice in the latter convention.

## Computational cost and scope

Observed Windows/Node v24.21.0 runs took approximately 64.65s (3:2) / 65.40s (1:1) per 100k-scenario report, run concurrently and overlapping validation work; these are observations, not isolated performance guarantees. Enumeration took 0.61s / 0.50s. Main solver caches held 48 dealer states, 10 conditioned distributions and 610 action states. Storage is bounded by model states; the benchmark streams aggregates rather than retaining every round.

No rule status changed. This work supplies (a) exhaustive EV under the model and (b) simulated gains versus weak composition baselines. (c) Human fun, expert competition, retention, finite-shoe balance and final mirror policy remain **NOT TESTED / OPEN**. Future experiments should compare stronger human-readable heuristics and risk objectives under separately reviewed hypotheses; no P1C or live feature is executed here.
