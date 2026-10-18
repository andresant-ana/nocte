# NOCTE mathematical lab — historical experimental outputs

These JSON files are **snapshots generated during the 2026-10-18 Duas Faces exploration**, not gameplay data nor results of code currently in this repository.

- `results/preliminary-40000.json`: 40k sampling conditional on dealer non-natural, seed 20261018; **superseded as overall edge estimate**.
- `results/exact-weighted-7150.json`: updated 7,150 weighted classes and payout sensitivity including dealer natural probabilities.
- `results/asymmetric-7150.json`: Luz double / Sombra retreat variant.
- `results/mirror-30000.json`: 30k pairwise confrontations at each of 5/10/20 rounds.
- `results/legacy-flat21.json`: additional exploratory output kept for provenance, metric naming not finalized.

**Source and reproducibility limitation:** the original Python exploratory script was created as a prior ChatGPT conversation artifact and has **not** been imported into this GitHub baseline. Therefore the JSON provides auditability of recorded figures, **not in-repo rerunnable proof**. The next @nocte/sim implementation must (a) port and independently check the model and (b) reproduce figures under explicitly identical assumptions before comparing a finite-deck rule engine. Avoid claims that passing a different simulation "verifies" this JSON.

Details/limitations: [docs/VALIDATION.md](../docs/VALIDATION.md).
