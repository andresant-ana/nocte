# Instructions for Codex and software-development agents

Applies to all software-development work in this repository. **Codex owns coding, implementation, refactoring, testing and engineering PRs; ChatGPT Work does not own software development.** See [docs/EXECUTION-MODEL.md](docs/EXECUTION-MODEL.md).

Applies to every coding task in this repository. Read this file, then [docs/INDEX.md](docs/INDEX.md), [docs/DECISION-REGISTER.md](docs/DECISION-REGISTER.md), and the relevant detailed specs **before** planning or changing code.

## Source of truth and authority

1. Explicit latest founder decisions recorded through a reviewed documentation change.
2. [docs/DECISION-REGISTER.md](docs/DECISION-REGISTER.md) with links to detailed specs.
3. Current approved GDD/architecture/acceptance tests.
4. Experimental notes and simulations (evidence, **not normative rules**).
5. Informal earlier ideas, mockups and chats (context, **not authority**).

**Never silently promote** CANDIDATE, EXPERIMENTAL, DEFERRED or OPEN items to RATIFIED. Do not infer approval because a prototype implements a variation. If a concept changes, amend the register: ID, previous/new status, reason, validation basis, affected docs, and date. Historical evidence remains immutable or clearly superseded.

## Boundaries

- No cash/crypto/real-value prizes, purchases of chips, betting transfers or pay-to-win. Credits remain fictional and non-redeemable.
- No real-money gambling integration; do not treat the target as a regulated real-money casino.
- No secrets, identities, dealer hole card, shoe seed, future draws or outcomes in client payloads before legally revealed.
- The server is authoritative for deals, allowed actions, timers, scoring, match results and credit transactions.
- Never use player's accumulated credits as competitive starting exposure or primary skill rank.
- No externally billable infrastructure until the founder authorizes it. Free-tier assumptions need deployment verification.
- MESA/21 code, design or docs are **not** an authority for NOCTE.
- Do not claim any game is implemented, balanced, secure or enjoyable without evidence.

## Engineering workflow

- Work in small branches/PRs; do not silently rewrite history or overwrite unrelated files.
- Tests from day one; deterministic replay; seed-based simulation; property-based tests for invariants; report sample counts and uncertainty.
- Separate pure @nocte/engine from UI, network, persistence and the simulator.
- Fix rules ambiguities **in docs before implementation**. Rule variants require explicit versioned configuration; do not mix them.
- Validate with actual humans before asserting fun, retention or commercial viability.
- Preserve raw research numbers and their limitations, including the distinction between preliminary 40k sampling and the corrected 7,150-class enumeration.
- Favor least complexity: small friend group first, no scale optimization without measurements.

## Cofre + Foco — experiment isolation and rule status

N-042 ratifies **only the strategic direction**. N-043 remains CANDIDATE for final product; N-045 remains OPEN. N-046/N-047 authorize only the isolated `DF-CF-0.1-lab` experiment under Issue #14, not final gameplay. Read [docs/COFRE-FOCO.md](docs/COFRE-FOCO.md) and [docs/CF-RFC-P2B.md](docs/CF-RFC-P2B.md). Keep DF-SYM-0.1, P1A–P1C evidence and the P2A interface/baseline unchanged. No multiplayer, economy, progression, deployment, or product-balance claim is authorized by the experiment.

## Current authorized implementation scope

P1A–P1C and the local P2A prototype/protocol are integrated. Issue #14 authorizes the separate Cofre + Foco experimental engine and offline comparison lab; keep it isolated from P2A and baseline rules. See [docs/LAB-P2B.md](docs/LAB-P2B.md). No networked play, identity, persistence, economy, deployment, human-study outcome, or final balance claim is authorized. N-019/N-020 remain EXPERIMENTAL; N-036, N-024 and O-01/O-02/O-03 remain OPEN. N-042–N-047 retain their recorded statuses; no implementation changes those statuses.

## PR requirements

Every rule-affecting PR includes a decision-register delta, affected specification changes, negative/security tests, reproduction steps, evidence references, and a statement of what remains unvalidated.

## N-046/N-047 implementation boundary

Issue #14 implements the authorized experimental solo profile as a separate engine module and reproducible simulator. The approved test configuration is post-negative-peek Option B; open fifth Cofre card; 3 Focus/Night; Manobra cost 1; private solo Leitura cost 2; once/action/round; 10-round primary horizon and 5/20 sensitivity. Post-swap Ace+10 is ordinary 21 with automatic stand and no natural bonus; no Focus window after dealer natural or when both hands are terminal. These are **EXPERIMENTAL**, not final RATIFIED gameplay. Keep DF-SYM-0.1, P2A, historical research, multiplayer, and economy unchanged. See [docs/LAB-P2B.md](docs/LAB-P2B.md).
