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

## Current authorized implementation scope

**DOCUMENTATION ONLY** in the initial documentation baseline, pending the first explicitly started Codex implementation task. Planned next gate: engine and offline simulator; neither is recorded as delivered. The exact rules for a finite shoe, natural resolution with two composed hands, mirror draw allocation, match timeout and economy distribution are not final; see [OPEN-QUESTIONS.md](docs/OPEN-QUESTIONS.md).

## PR requirements

Every rule-affecting PR includes a decision-register delta, affected specification changes, negative/security tests, reproduction steps, evidence references, and a statement of what remains unvalidated.
