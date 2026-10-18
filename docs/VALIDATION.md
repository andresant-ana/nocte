# Duas Faces — experimental analysis, data provenance and limits

**Date:** 2026-10-18. **Status:** EXPLORATORY. These are previously generated calculations and modeled simulations, not human playtests or certified production-engine results. Raw result files are preserved in [lab/results](../lab/results), with input model described below.

**P1B evidence addendum (2026-10-18):** the independent TypeScript solver and weighted enumeration reproduce the historical optimal/indexed-random aggregates for both payouts within 2e-14 unit. P1A's uniform-distinct random policy has different weights and different EV; both conventions are reported explicitly. A separate 100k-scenario/profile benchmark uses shared named lanes and identical optimal actions for all composition agents. See [LAB-P1B.md](LAB-P1B.md) for methods, uncertainty and results. The historical record below remains unchanged; original Python source remains absent, the conditional 40k and 30k match experiments were not rerun, and no human validation is implied.

## Evaluation question

Does the **initial composition** of four cards into two hands create meaningful decisions, independent of conventional hit/stand/double skill?

Control: choose one of 3 compositions uniformly at random, **then follow optimal blackjack actions**. Intervention: choose composition maximizing modeled expected value, **then follow the same optimal blackjack actions**. This isolates the early composition decision but compares strong-vs-weak composition skill, **not** two expert humans.

## Base assumptions

- Independent rank draw with replacement (infinite-deck approximation): P(A)=1/13, P(2..9)=1/13 each, P(10-value)=4/13; **not a finite shoe**.
- Four initial player ranks + dealer upcard; dealer hole distribution depends on natural peek condition.
- S17 dealer, independently resolved two 10-unit exposures, hitting/standing/doubling rules in [GAMEPLAY](GAMEPLAY.md).
- Opening **composed** A+10 pays 3:2 in base sensitivity, 1:1 in alternate.
- Infinite-deck dynamic programming calculates optimal expected value of hit, stand or double; conditional dealer distributions are recursive.
- Scenario-space weighted enumeration: `C(10+4-1,4)=715` rank multisets × 10 dealer upcards = **7,150 classes**. Multinomial weights sum to approximately 1.00. It accounts for dealer blackjack probability before player action.
- Units: **1 per initial hand**, 2 per combined round; 10 match points per initial hand (20 total). A combined EV of 0.37924 unit = +3.7924 match points on 20 initial points, not “+19% win rate”.

## Weighted enumeration — corrected reference baseline

| Variant | Best-composition total EV (2 unit hands) | Random-composition total EV | Optimized EV / 2 initially at stake | P(best−worst EV >0.2 unit) |
| --- | ---: | ---: | ---: | ---: |
| Symmetric, composed A+10 3:2 | **+0.3792359** | −0.0217348 | **+18.9618%** | 79.2943% |
| Symmetric, composed A+10 1:1 | **+0.2906752** | −0.0668313 | **+14.5338%** | 75.5581% |
| Asymmetric (Luz double/Sombra retreat), composed A+10 3:2 | **+0.3771405** | −0.0341439 | **+18.8570%** | 80.3673% |

Role-model auxiliary results: Luz selected double as first action in **31.378%** weighted scenarios; Sombra retreat **5.273%**. These numbers refer to optimal selected compositions and this restricted simulated model.

**Implication:** choice impacts EV, but modeled optimal play has a *large positive return relative to dealer* under test payouts. The rule is unsuitable for unlimited persistent credit payouts and does not by itself establish a healthy virtual economy.

## Older preliminary 40k sampling — retain as history, not definitive

**Run:** 40,000 sampled four-card/upcard scenarios, seed `20261018`, conditional on **dealer not having natural**. Found optimal composition combined EV +0.476184; random +0.059563; difference +0.416621 *in per-hand-stake units*. About **79.77%** had best-vs-worst EV >0.2 units.

After correcting dealer-natural probabilities through weighted scenario enumeration, use **+0.3792359** optimal and **−0.0217348** random for this model. **Do not combine** conditional preliminary EV with the corrected unconditional data. Earlier wording of +4.17 expected points vs random refers to the conditional 40k simulation, not the unconditional corrected baseline.

A separate legacy `flat_21_results.json` is retained without promoting its internal metric labels to stable definitions; consult script/assumptions before analysis.

## Reproducible decision example

Initial ranks `[5,6,10,10]`, dealer upcard `7`.
- Compose 5+6=11 and 10+10=20 → total EV **+1.236116** units.
- Compose 5+10=15 and 6+10=16 → total EV **−0.784541** units.
- Gap = **2.020657** total stake units, or ~**20.21** match points when each of two initial hands stakes 10.

No Ace+10 natural in the starting cards, so this example demonstrates composition strategy beyond the constructed-natural special case.

## Mirrored match simulation — separate approximation

**30,000 paired contests for each session length**, same initial scenarios/streams for both agents; optimal composition vs random composition. Subsequent blackjack actions optimal for **both**. This is simplified independent with-replacement draw lanes and pre-resolved dealer; it is **not** yet a correct finite-shoe, networking or multiplayer implementation.

| Session | Optimal wins | Random wins | Ties | Mean optimal margin |
| --- | ---: | ---: | ---: | ---: |
| 5 rounds | **69.85%** | 18.80% | 11.35% | +20.771 |
| 10 rounds | **82.25%** | 13.90% | 3.85% | +41.706 |
| 20 rounds | **91.37%** | 7.33% | 1.30% | +83.329 |

Interpretation: even one mastered decision layer can overpower random composition over repeated matched trials. **Not** proof of replay enjoyment, master-vs-master rankings, exact win rates in live rooms or recommended final session length.

## Scientific limitations and next study

1. Infinite deck with replacement ignores rank depletion, deck count and counting effects.
2. Exact weighted enumeration evaluates EV **under the model**, not a real finite-shoe game.
3. Matches use common-random-number lanes and a pre-resolved dealer, not a fully specified physical dealing algorithm.
4. Results optimize EV, not necessarily probability of winning a match, risk of ruin or season rating.
5. No broad search of metagame strategic diversity; expert-vs-expert comparisons missing.
6. A theoretical edge from composition does **not** mean 18.96% more hands are won.
7. No human fun, learning curve, latency, social dynamics, accessible UX or long-term retention measurements.
8. Confidence intervals should be supplied for future Monte Carlo metrics, with seeds, bot versions and sample sizes.
9. Economy emissions, repeat play, collusion, and ~20 concurrent connections require separate adversarial tests.

## Next experimental protocol (acceptance preparation)

- Implement seed-versioned, rules-configured TS engine with a **finite-deck** option and replay.
- Reproduce simple blackjack reference probabilities; verify unit tests and property invariants.
- Compare optimal composition to random/balanced/basic blackjack and constrained near-optimal heuristics, reporting effect size and CI.
- Test symmetric vs asymmetric Luz/Sombra via blinded friend sessions (decision count, comprehension, perceived skill, repeat interest).
- Simulate EV/variance for credits under multiple match-pool and rescue conditions; enforce non-negative ledger constraints.
- Keep underlying results and model parameters in repo; label unrun new metrics as PLANNED.

See [lab/README.md](../lab/README.md) for raw output records. The source Python lab from the earlier exported artifact must be imported/ported separately before claims of *in-repo full reproducibility*; these preserved numeric outputs alone do not constitute the runnable model.

## P1C strategic depth

[LAB-P1C](LAB-P1C.md) audits exact decision gaps, order-averaged regret, explainable policies and paired 5/10/20-round sessions using the existing experimental model. It documents adverse compression evidence and the superseded sorted-order experiment. This does not validate human mastery, fun, live mirroring or competitive diversity.
