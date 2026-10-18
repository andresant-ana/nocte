# NOCTE mathematical lab — historical experimental outputs

These JSON files are **snapshots generated during the 2026-10-18 Duas Faces exploration**, not gameplay data nor results of code currently in this repository.

- `results/preliminary-40000.json`: 40k sampling conditional on dealer non-natural, seed 20261018; **superseded as overall edge estimate**.
- `results/exact-weighted-7150.json`: updated 7,150 weighted classes and payout sensitivity including dealer natural probabilities.
- `results/asymmetric-7150.json`: Luz double / Sombra retreat variant.
- `results/mirror-30000.json`: 30k pairwise confrontations at each of 5/10/20 rounds.
- `results/legacy-flat21.json`: additional exploratory output kept for provenance, metric naming not finalized.

**Source and reproducibility limitation:** the original Python exploratory script was created as a prior ChatGPT conversation artifact and has **not** been imported into this GitHub baseline. Therefore the JSON provides auditability of recorded figures, **not in-repo rerunnable proof**. The next @nocte/sim implementation must (a) port and independently check the model and (b) reproduce figures under explicitly identical assumptions before comparing a finite-deck rule engine. Avoid claims that passing a different simulation "verifies" this JSON.

Details/limitations: [docs/VALIDATION.md](../docs/VALIDATION.md).

The TypeScript engine and simulator introduced by NOCTE-P1A are new implementations under versioned experimental profiles. The simulator's heuristic is not an exact EV solver, and its output must not be presented as a reproduction of the historical snapshots above. The profile and open draw/natural/mirror choices are documented in [ENGINE-RFC-P1A.md](../docs/ENGINE-RFC-P1A.md).

## P1B new evidence (separate from immutable historical snapshots)

- `results/p1b-enumeration-{3to2,1to1}-v1.json`: independent TS model enumeration, 7,150 weighted classes, both random conventions and historical deltas.
- `results/p1b-pilot-{3to2,1to1}-v1.json`: seed `nocte-p1b-pilot-v1`, n=2,000 per profile, used only to fix main sample size.
- `results/p1b-benchmark-{3to2,1to1}-v1.json`: seed `nocte-p1b-main-v1`, n=100,000 per profile; three composition agents with identical optimal actions and isolated counterfactual streams.

Methods, commands, statistical assumptions, readable decision study and limitations are in [LAB-P1B.md](../docs/LAB-P1B.md). `result` and `caseStudy` are deterministic; `execution` contains variable timing/environment metadata. The new port reproduces historical optimal/indexed-random aggregate values under matching assumptions; this does not recover the absent Python source or reproduce old conditional/match simulations.

## P1C strategic-depth evidence

Authoritative final evidence uses **v2**: `p1c-exact-{3to2,1to1}-v2.json`, representative alternatives `p1c-scenarios-{3to2,1to1}-v2.csv`, independent 500-session `p1c-pilot-{3to2,1to1}-v2.json`, and 10,000-session `p1c-sessions-{3to2,1to1}-v2.json`. `p1c-tables-v2.md` renders all strata, policies, learned rules and session comparisons. Full distributions remain in JSON; units and uncertainty are explicit.

**All P1C v1 artifacts are exploratory/superseded:** sorted-card inference changed first-available policy tie breaks compared with P1A on original deals. Retained for provenance, never pooled with v2. V2 integrates every dealt permutation exactly and preserves original order in sessions; sample sizes/policies were not retuned. See [LAB-P1C](../docs/LAB-P1C.md) for the correction, frozen protocol, reproduction and limitations. Historical P1A/P1B evidence is unchanged.

## P2B-E Cofre + Foco evidence (separate experimental profile)

`results/p2b-e-*.json` are fixed-seed paired counterfactual reports from Issue #14. They compare baseline, diagnostic ablations, and N-046/N-047 with explicit resource policies, horizon and payout sensitivity. They do not change P1 results or canonize final gameplay. Method, the selected quantitative readout, reproduction and limitations: [LAB-P2B](../docs/LAB-P2B.md).
