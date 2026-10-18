# P1C strategic-depth audit

Status: EXPERIMENTAL offline audit of Issue #7. P1B base: `f9a91ab4e94932d5d34293b4a01199269f069007`. No rules, payouts or defaults change. O-01/O-02/O-03 and human validation remain OPEN.

## Protocol fixed before experiments

Reuse the P1B solver and engine for both profiles. Enumerate all 7,150 weighted classes, counting distinct unordered rank compositions. Best–second gaps are undefined for one-option classes; do not count those as ties. Report unconditional and nontrivial-choice distributions. Illustrative consequential-gap/regret thresholds are 0.01/0.05/0.1/0.2/0.5/1 initial-hand exposure units (0.1/0.5/1/2/5/10 match points), not official product metrics.

Stratify by dealer upcard, Ace presence, possibility of a composed natural, duplicate ranks, raw rank sum (A=1) and sum of the opening totals in an EV-optimal composition (A optimally 1/11). These axes overlap; within each axis weights sum to one. Regret is best ex-ante composition EV minus chosen EV. All subsequent actions remain optimal, so this audit isolates composition, not complete human blackjack skill.

Research policies fixed before evaluation: P1A; favor 11/20; maximize weaker total; maximize sum of two totals; a dealer-upcard pocket rule; and shallow learned regression rules of depths 2/3/4 (at most 4/8/16 leaves). None receives hole cards, streams or future results. Learned rules see only public, symmetric composition features, predict additive round EV and choose the highest prediction; no solver runs at inference. These are software proxies for learnable rules, not tested human strategies.

Training/validation split is SHA-256 of the sorted four-rank multiset modulo five: four folds train, one held out, all upcards of a multiset together. Tree fits use probability weights divided by option count. Candidate finalists are the two distinct policies with lowest training regret (excluding P1A, which has its own comparison), frozen before examining main-session results. Exact full-domain metrics are descriptive; held-out metrics disclose overfitting. Independent session seeds test stochastic outcomes, not extrapolation to unseen gameplay rules.

Sessions reuse P1B's versioned scenario/dealer/Luz/Sombra lanes and preserve the original dealt order. Ties in policy scores choose the first available partition, as in P1A. Exact policy statistics integrate every distinct dealt permutation of each rank multiset with equal conditional probability (100,000 ordered decision classes within 7,150 multiset/upcard classes). Oracle EV and best/second/worst gaps are invariant to order; policy tie choices need not be. Identical choices produce identical outcomes, and optimal-versus-optimal must always tie. This control does not represent two independent live players. Composition policies are memoryless and receive no seed; ex-ante EV is not a solver for session-win probability.

Run independent-seed pilot sessions first. Before main results, fix n for **unconditional win probability** with a worst-case Wilson 95% half-width at most 0.01: `n >= 1.96²/(4×0.01²) − 1.96²`, rounded up. The main sample will be 10,000 sessions per profile, sufficient regardless of observed win rate; pilot margins/variance are descriptive only. This is an offline precision choice, not a game acceptance threshold. Session lengths 5/10/20 share nested prefixes, so their estimates are correlated; sessions are independent from one another. Report win/loss/tie counts, Wilson intervals, decisive-game win rate separately, margin/sample variance/normal IC95 and residual luck versus expected margin. Multiple intervals are marginal and unadjusted.

Do not infer enjoyment, retention, ratings or live fairness. Outcomes unfavorable to the design are first-class evidence. P1A/P1B artifacts remain immutable. A conditional next gate will follow exact, held-out and session results; no alternative rules or interface will be implemented in P1C.

## Frozen main-run declaration

Before executing main sessions: both profiles selected **upcard-pocket** and **eleven-twenty**, by training regret only. Pilot seed `nocte-p1c-pilot-v1`, 500 sessions/profile, completed; main seed is **nocte-p1c-main-v1**, **10,000 sessions/profile at each of 5/10/20 nested lengths** (200,000 rounds/profile reused across lengths). Worst-case Wilson sample bound is ceil(9600.1584)=9,601; fixed n=10,000 gives maximum half-width about 0.009798. This guarantee applies to unconditional win rate, not the smaller decisive-session subset or mean margins. Do not expand n or retune finalists based on main outcomes.

Fixed policy implementation detail: `eleven-twenty` is an additive hand preference, `maximin` and `sum-totals` have explicit secondary tie breaks, and `upcard-pocket` is the fixed public utility table recorded in report descriptions. Learned trees use the nine public features recorded in reports, with maximum depth 2/3/4, minimum child probability weight 0.005 and leaf prediction rounding to 0.05 exposure unit. These candidate choices were fixed before exact evaluation. No learned model was selected as a session finalist.

### Protocol correction before final delivery

Version 1 sorted the starting cards before inference. That changed first-available policy tie breaks, not only lane orientation, and therefore was not the intended comparison with the P1A policy on original deals. It is preserved as **exploratory/superseded**, including its unfavorable results; do not use v1 as the final P1C estimate. A regression pins [6,7,7,8] vs 7: P1A assigns equal preference to 13+15 and 14+14, but random dealt order chooses them with probabilities 2/3 and 1/3, not the single canonical first option.

Final version **depth-exact-dealt-order-v2 / p1c-dealt-order-prefix-lanes-v2** averages those conditional order probabilities exactly and restores dealt order in sessions. Both finalists remain upcard-pocket/eleven-twenty under training-only selection. Repeat the 500-session pilot under the corrected version and retain **the previously fixed n=10,000**, lengths, confidence method, policies and independent main seed. The versioned lane namespace changes, so corrected outcomes are a new sample and are not pooled with v1. No rules or solver values change. The correction was triggered by comparability with the existing policy, not a search for favorable win rates.

## Final results (v2 only)

Full generated tables, including every stratum, policy overlap, explicit learned rules, representative alternatives and all 18 session comparisons per profile: [p1c-tables-v2.md](../lab/results/p1c-tables-v2.md). Exact JSON retains weighted histograms, quantiles and threshold exceedances; session JSON retains win/loss/tie Wilson intervals, margin variance and residual luck. Exact population results have numerical floating-point tolerance, not sampling confidence intervals. One initial-hand exposure unit = **10 points**; all numbers below use points unless marked otherwise.

### Decision space: consequential choices exist

Across 7,150 classes (100,000 ordered rank/upcard classes), total probability is 0.9999999999999497. One/two/three distinct unordered compositions have mass **10.5073% / 50.6705% / 38.8222%**. Optimal EV ties have mass **0.2990%** of all deals (about 0.334% of deals with alternatives); any pair of tied alternatives has mass 1.8374%. Single-option classes are excluded from best–second distributions.

| Diagnostic | Natural 3:2 | Natural 1:1 |
| --- | ---: | ---: |
| Mean best–second gap, choices only | 6.8645 | 5.9510 |
| Median best–second gap, choices only | 5.3649 | 4.4688 |
| Choices with best–second gap >1 point | 88.91% | 85.68% |
| Choices with best–second gap >5 points | 53.07% | 46.76% |
| Mean best–worst gap, all deals | 6.9803 | 6.1617 |

Thus “almost every composition is equivalent” is false under this model. The historical [5,6,10,10] vs 7 example has a **20.2066-point** gap between 11+20 and 15+16; both P1A and the pocket rule already get it right. Such a striking example demonstrates an error cost, not sustained mastery among competent agents. Representative CSVs also retain tiny-gap, tied, one-option, two-natural and worst-policy-error cases, with all alternatives rather than only the winner.

### Compression: much of the oracle gain is accessible to short rules

| Policy | 3:2 optimal all / choices | 3:2 mean regret | 1:1 optimal all / choices | 1:1 mean regret |
| --- | ---: | ---: | ---: | ---: |
| P1A, unchanged | 80.63% / 78.35% | 0.6522 | 78.92% / 76.45% | 0.6766 |
| Favor 11/20 | 85.08% / 83.33% | 0.3103 | 83.41% / 81.46% | 0.3239 |
| Maximize minimum total | 31.78% / 23.77% | 5.7952 | 33.49% / 25.68% | 5.0511 |
| Maximize sum, minimum tie break | 31.78% / 23.77% | 5.7952 | 33.49% / 25.68% | 5.0511 |
| Dealer-upcard pocket rule | **90.17% / 89.02%** | **0.1594** | **87.00% / 85.48%** | **0.2277** |
| Learned tree depth 2 | 71.63% / 68.29% | 1.3286 | 69.61% / 66.04% | 1.2084 |
| Learned tree depth 3 | 79.17% / 76.72% | 0.6964 | 77.25% / 74.58% | 0.6940 |
| Learned tree depth 4 | 82.13% / 80.03% | 0.4830 | 82.54% / 80.50% | 0.3848 |

The pocket rule captures **95.78% / 93.08%** of optimal-minus-distinct-random EV gain (P1B reference gaps 3.7751 / 3.2925 points per round). This ratio describes recovered EV, not optimal-choice accuracy. It is strong evidence of compression, although the tested rule does not solve 99% of choices. The pocket rule still loses >1 point of expected value on **5.506% / 7.764%** of all deals; its P99 regret is 3.5306 / 3.9256 points and maximum 7.2349 points. Residual errors are learnable opportunities, not evidence of an endless skill ceiling.

Training/holdout: 5,810/1,340 classes, probability mass 80.6449%/19.3551%. Pocket regret on holdout is **0.2294 / 0.2550** points; 11/20 is **0.4050 / 0.4249**. Depth-4 tree holdout regret is 0.5196 / 0.4679. No holdout labels entered fitting or finalist selection. Fixed hand-crafted rules reflect prior blackjack knowledge; their holdout score is not an estimate of a naive human's learning ability. The shallow CART attempts are deliberately reported despite underperforming: SSE regression on a small feature family is not an optimal search for minimum-regret rule lists. No proof that an even smaller/better rule set cannot exist is claimed.

Maximin and sum-totals choose **identically across the entire weighted ordered domain**; two names therefore do not constitute strategy diversity. Pocket and 11/20 also choose alike on 87.48% / 83.83% of all deals (86.01% / 81.93% with choices). Differences are mostly skill/error differences within the same additive objective, not demonstrated complementary competitive styles.

### Where the remaining difficulty lies

For 3:2 the pocket rule's conditional mean regret against dealer 2–6 ranges from **0.0311 to 0.0580** points, versus 0.2795 against 9 and 0.2673 against 10. Duplicate-rank deals have 0.1107-point regret versus 0.2362 with four distinct ranks. A possible natural occurs on 18.7668% of deals: regret there is only 0.0010 point at 3:2, but **0.3648** at 1:1. Hence payout sensitivity changes which exceptions matter; it must not be pooled into one claim. At 1:1, regret against an Ace/10 is 0.3595/0.4079 points. The generated tables give every upcard, Ace/duplicate/natural group and raw/optimal-opening total; totals are exploratory overlapping axes, and the optimal-opening axis uses the canonical first optimum when tied. No significance tests were selected post hoc for attractive strata.

### Competent-agent sessions

Each cell below uses 10,000 independent sessions; lengths share prefixes. These are **paired counterfactual** sessions with identical optimal hit/stand/double play. W/L/T are from the first agent's perspective. Decisive win rate conditions on W+L; it excludes ties.

| Profile / length / comparison | W / L / T | Decisive win IC95 | Mean margin IC95 |
| --- | --- | --- | --- |
| 3:2 / 5 / optimal–pocket | 1507 / 1163 / 7330 | 56.44% [54.55,58.31] | 0.828 [0.610,1.046] |
| 3:2 / 10 / optimal–pocket | 2511 / 1980 / 5509 | 55.91% [54.46,57.36] | 1.517 [1.211,1.824] |
| 3:2 / 20 / optimal–pocket | 3767 / 2909 / 3324 | 56.43% [55.23,57.61] | 2.909 [2.473,3.344] |
| 1:1 / 5 / optimal–pocket | 2010 / 1416 / 6574 | 58.67% [57.01,60.31] | 1.193 [0.953,1.433] |
| 1:1 / 10 / optimal–pocket | 3189 / 2258 / 4553 | 58.55% [57.23,59.85] | 2.214 [1.880,2.548] |
| 1:1 / 20 / optimal–pocket | 4440 / 3051 / 2509 | 59.27% [58.15,60.38] | 4.374 [3.897,4.851] |
| 3:2 / 20 / optimal–P1A | 5798 / 2959 / 1243 | 66.21% [65.21,67.19] | 13.403 [12.669,14.136] |
| 1:1 / 20 / optimal–P1A | 5840 / 2994 / 1166 | 66.11% [65.11,67.09] | 13.676 [12.926,14.426] |
| 3:2 / 20 / pocket–11/20 | 4364 / 3432 / 2204 | 55.98% [54.87,57.08] | 2.859 [2.321,3.397] |
| 1:1 / 20 / pocket–11/20 | 4299 / 3866 / 1835 | 52.65% [51.57,53.73] | 1.465 [0.891,2.039] |

All remaining lengths/comparisons, including pocket–P1A and optimal–11/20, are in the generated tables and raw JSON. Optimal–optimal has **10,000 ties at every length/profile**, zero margins and variance, and undefined decisive win rate. Reusing identical choices/results is a valid common-random control, not evidence about independent live player draws.

Optimal–pocket unconditional 3:2 win probability is only **15.07% at 5 rounds / 37.67% at 20**, with 73.30% / 33.24% ties; it is misleading to report the decisive 56% as unconditional win probability. The edge is measurable, while short-session separation is limited and heavily tied under this coupling. For 1:1 the corresponding win probabilities are 20.10% / 44.40%, with 65.74% / 25.09% ties. A detectable mean advantage is not a product threshold for “significant competition”; no founder-approved threshold exists. Marginal intervals exclude zero for the shown margins, but the finite sample and multiple correlated comparisons do not establish human competitive viability.

Luck remains large relative to the edge: optimal–pocket margin variance at 5/10/20 rounds is **123.75/243.96/493.81 points²** (3:2), versus expected margins on those sampled scenarios of 0.783/1.578/3.162 points. At 20 rounds, residual variance after subtracting scenario-specific EV margin is **484.89 points²**, standard deviation about 22.02 points, while mean observed margin is 2.909 points. At 1:1 the corresponding 20-round margin/residual variances are 592.53/579.22 points² (residual SD 24.07) against expected/observed means 4.534/4.374 points. More rounds accumulate skill advantage and reduce ties, but do not erase single-session noise. Residual variance is a descriptive quantity, not an independent additive variance decomposition: expected and residual margins need not have exactly zero sample covariance.

## Structural interpretation and limitations

1. **Progressive mastery is plausible initially, unvalidated thereafter.** Naive balance heuristics are bad; learning 11/20 and dealer-sensitive exceptions yields a progression. Most available EV is then compressed into a short additive policy. No human learning curve, session boredom, replay motivation or transfer was measured.
2. **The model has finite, separable structure.** Round EV is the sum of two hand utilities against one upcard. The infinite-shoe symmetric solver needs only 270 distinct two-card total/soft/natural/upcard utility states to score openings. That is an oracle lookup reference, not a claimed 270-rule human policy. There is no inter-hand scarce resource, opponent-dependent payoff or incentive for a counter-strategy in this model. No simulation of other agents can create such coupling.
3. **Competent agents separate, but breadth is not established.** The best tested simple rule leaves a measurable 0.1594/0.2277-point round edge for the oracle. The remaining gap is smaller than the large optimal-versus-random story; diversity of labels is not diversity of viable objectives. EV maximization can differ from match-win maximization. Score-aware/risk-adaptive session control was not optimized; this audit's conclusions concern memoryless composition with common optimal downstream play.
4. **Model scope matters.** Infinite independent rank draws, S17, natural-first peek and two lab payouts remain experimental. Finite shoe/card counting, final natural treatment and mirror allocation remain open. Current named hand lanes are a reproducible joint coupling, not a ratified live fairness rule; alternative couplings could change ties/variance without changing EV. Both payout runs share scenario randomness and are sensitivity checks, not independent replications.
5. **Statistical scope matters.** Exact probabilities use rank weights (10 has mass 4/13), not equal classes. Held-out multisets form one deterministic split; repeated held-out tuning was not done. The finite-domain full population is visible to research, and handcrafted rules have prior-domain knowledge. Seeds are independent between pilot/main by namespace, while lengths and pairwise comparisons are correlated. Wilson intervals and normal margin intervals are marginal, unadjusted; no optional stopping or n extension followed main results. A different complexity search or human teaching study may reveal more severe compression.

## Relation to earlier experiments

P1B's exact optimum/random aggregates and historical 11+20 example are unchanged: the shared iterator refactor preserves their model and weighting. Corrected P1C P1A regret **0.6522 / 0.6766** points is compatible with P1B's sampled 0.6567 / 0.6818 points. The initial P1C v1 values (0.6836 / 0.7079) instead evaluated canonical sorted-order ties; this comparability defect is preserved, explained and covered by regression, not attributed to gameplay balance. Final v2 sessions use a new versioned stream namespace and must not be pooled with v1. Historical 30k mirror results lack the original Python source and share neither these policies nor the verified lane contract: differences are not a replication failure or proof of a rule change.

## Recommended next gate (proposal, not ratification)

**Conditional GO to a separately scoped minimal solo learning experiment; NO-GO to a claim of established competitive depth or investment in online/ranking now.** The core contains consequential decisions, so a small falsifiable human test is justified; the strong compression signal makes broad competitive development premature. This recommendation does not authorize that implementation within P1C.

The next task should compare unassisted play, brief teaching of the pocket/11–20 rules, and held-out/repeated scenarios with consent. Measure improvement, residual costly errors, decision time, reliance on a lookup, perceived routine and voluntary replay. Require founder-reviewed stop/advance criteria before collecting data; do not invent numerical enjoyment thresholds from these bot results. If teaching rapidly removes decision interest or residual errors become rote exceptions, stop advancing the symmetric competitive core and scope a **separate DF-ASYM hypothesis comparison**, with explicit rule approval and its own audit. If humans retain meaningful decisions and replay interest, resolve O-01/O-02/O-03 and test fairness before any competitive claim. Cofre/Foco/Protocolos and other depth systems remain deferred; P1C implements none of them.

## Reproduction and engineering validation

Node 22+ / pnpm 12; from repository root (outputs are relative to `packages/sim`):

```sh
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm depth -- --mode exact --out ../../lab/results/p1c-exact-3to2-v2.json --csv ../../lab/results/p1c-scenarios-3to2-v2.csv
pnpm depth -- --mode sessions --seed nocte-p1c-pilot-v1 --sessions 500 --out ../../lab/results/p1c-pilot-3to2-v2.json
pnpm depth -- --mode sessions --seed nocte-p1c-main-v1 --sessions 10000 --out ../../lab/results/p1c-sessions-3to2-v2.json
```

Repeat the three `depth` commands with `--rules DF-SYM-0.1-lab-infinite-1to1-peek-natural-first` and `1to1` output filenames; then `pnpm depth:report`. Reports preserve version/profile/seed/finalists, learned models and policy fingerprint. `result` is deterministic; `execution.elapsedMs`/Node version are metadata. Do not overwrite committed artifacts to test replay: compare deterministic result objects or use a temporary output path.

Regression coverage includes independent ordered-rank option probabilities, probability/stratum mass conservation, historical gap, dealt-order P1A ties, weighted quantiles, public-only legal policies, grouped holdout/training weights, deterministic limited tree fitting, independent Wilson boundary/precision cases, deterministic sessions, win/loss/tie partition, zero-margin control, n=1 undefined uncertainty and CLI invalid-input/smoke checks. Existing engine/solver Monte Carlo and independent exact reference tests remain applicable. No engine, gameplay profile or solver policy changes were made.

Local validation on Node 24.21.0 / pnpm 12.9.1: frozen installation and strict TypeScript passed; **8 test files / 60 tests passed** (17.72 seconds). Both final exact reports, both corrected pilots, both 10,000-session runs and the Markdown renderer completed successfully. CI uses Node 22. Execution metadata records actual run time; full audit training/order integration is recomputed for each CLI invocation, so this research tool prioritizes traceability over interactive latency. Exact result objects and short-session replay are exercised in tests; the 10k runs are retained evidence, not a routine CI workload. Final PR handoff records the exact-head CI run and commit separately.
