# NOCTE — decision register (authoritative)

**Baseline 2026-10-18.** Canonical statuses below describe what has actually been approved versus merely modeled. Read linked rationale before implementing.

| ID | Status | Decision / finding | Source |
| --- | --- | --- | --- |
| N-001 | RATIFIED | Independent new project; prior MESA/21 was abandoned for being too conventional/monotonous. | [VISION](VISION.md) |
| N-002 | CANDIDATE | **NOCTE** is the preferred provisional name; availability/registration not established. | [VISION](VISION.md) |
| N-003 | RATIFIED | Browser-native, fullscreen/game-like experience, not an ordinary site layout. | [VISION](VISION.md), [EXPERIENCE](EXPERIENCE.md) |
| N-004 | RATIFIED | Art Déco with noir tonality governs whole product, menu and table. | [EXPERIENCE](EXPERIENCE.md) |
| N-005 | RATIFIED | Gameplay comes before graphics, but a premium animated/audio experience is the long-term quality bar. | [EXPERIENCE](EXPERIENCE.md), [ROADMAP](ROADMAP.md) |
| N-006 | RATIFIED | Supports solo and multiplayer; public/private rooms with user cap; join by invitation. | [VISION](VISION.md), [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-007 | CANDIDATE | Up to six players per room, 5 casual rounds. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-008 | RATIFIED | Small free-to-run initial build for ~20 friends; scale only after product validation. | [ARCHITECTURE](ARCHITECTURE.md) |
| N-009 | RATIFIED | Only fictional, non-purchasable, non-redeemable credits initially; no real stakes, conversion or exploitation. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-010 | RATIFIED | Persistent lightweight personal identity and stats; no elaborate signup flow. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-011 | RATIFIED | Player statistics include played/won/lost, net fictional performance, and more; global leaderboard exists. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-012 | RATIFIED | Primary leaderboard must **not** be nominal credit winnings or bank size; must fairly measure skill. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-013 | CANDIDATE | Uncertainty-aware skill rating (Glicko-2 candidate), ranked paired duels, separate nominal stats. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-014 | RATIFIED | Free daily credits and an always-available zero-stake recovery/practice mode (**Subsolo**, working name). | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-015 | RATIFIED | Subsolo daily/challenge content must be generated and assessed automatically; no daily hand-authoring. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-016 | CANDIDATE | Skill-assessed seeded puzzles, one-off rewards, bounded repeat farming, *Desafio da Meia-Noite*. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-017 | RATIFIED | Blackjack is foundation, **not** final rules; choices and mastery should dominate simple luck and monotony. | [VISION](VISION.md), [GAMEPLAY](GAMEPLAY.md) |
| N-018 | RATIFIED | Duas Faces is the selected central **direction** to deepen and validate. | [GAMEPLAY](GAMEPLAY.md) |
| N-019 | EXPERIMENTAL | Symmetric v0.1: four cards → 2 hands of 2, common dealer, 21 objective, equal 10-point initial exposures. | [GAMEPLAY](GAMEPLAY.md) |
| N-020 | EXPERIMENTAL | Hit/stand/double, S17 dealer, natural handling, 3:2 modeled, no split/insurance. | [GAMEPLAY](GAMEPLAY.md), [VALIDATION](VALIDATION.md) |
| N-021 | REJECTED | Flexible initial exposure allocation (e.g. 5–15 split of 20) in first competitive rules. | [GAMEPLAY](GAMEPLAY.md) |
| N-022 | EXPERIMENTAL | Alternative asymmetric roles: Luz doubles; Sombra can retreat for −0.5 and cannot double. | [GAMEPLAY](GAMEPLAY.md), [VALIDATION](VALIDATION.md) |
| N-023 | CANDIDATE | Mirrored initial deals and equivalent decision conditions for multiplayer fairness. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-024 | OPEN | Mirror future-draw model and finite shoe sequencing, especially divergent actions. | [OPEN-QUESTIONS](OPEN-QUESTIONS.md) |
| N-025 | CANDIDATE | Ranked duel: 1v1, 10 rounds; casual: 5; actual duration/playfeel not human-validated. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-026 | CANDIDATE | Fixed-entry **zero-sum** multiplayer credit redistribution; no dealer-generated persistent winnings. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-027 | CANDIDATE | Solo scored practice initially, without unlimited credit minting; economic details pending. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-028 | DEFERRED | Cofre fifth card, limited Foco, Manobra/Leitura, Contracts and Protocols until core validated. | [GAMEPLAY](GAMEPLAY.md) |
| N-029 | CANDIDATE | Fullstack TypeScript: React/Vite, Workers/Hono, Durable Objects/WebSocket, D1. | [ARCHITECTURE](ARCHITECTURE.md) |
| N-030 | CANDIDATE | CSS/SVG + Motion, Howler/Web Audio; optional PixiJS only if needed. | [EXPERIENCE](EXPERIENCE.md) |
| N-031 | RATIFIED | Authoritative server state; no trusting browser on cards, results, credits or ranking. | [ARCHITECTURE](ARCHITECTURE.md) |
| N-032 | RATIFIED | First delivery priority is isolated rules engine and simulation/testing, not site construction. | [ROADMAP](ROADMAP.md) |
| N-033 | EXPERIMENTAL | Infinite-deck EV model finds meaningful effect of optimal initial partition; **not** production balance. | [VALIDATION](VALIDATION.md) |
| N-034 | EXPERIMENTAL | 40k preliminary results must not replace corrected weighted 7,150-class figures. | [VALIDATION](VALIDATION.md) |
| N-035 | EXPERIMENTAL | 30k paired duels per match length show optimized composition beats random composition; weak-baseline experiment. | [VALIDATION](VALIDATION.md) |
| N-036 | OPEN | Fun/retention/strategic diversity, economic stability, 20-user free infrastructure limit require validation. | [ROADMAP](ROADMAP.md), [OPEN-QUESTIONS](OPEN-QUESTIONS.md) |
| N-037 | CANDIDATE | Guest-first persistence with later recoverable login; strict anti-farming/anti-sybil constraints. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-038 | RATIFIED | No early monetization; later optional cosmetics/business model only via new founder decision, no purchased competitive edge. | [VISION](VISION.md) |
| N-039 | CANDIDATE | Seasonal leaderboards and cosmetic achievements/Prestígio separated from credit balances. | [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-040 | RATIFIED | Preserve audits, assumptions and validation gates in repo; changes must be tracked by decision ID. | [GOVERNANCE](GOVERNANCE.md), [AGENTS](../AGENTS.md) |
| N-041 | RATIFIED | **Codex owns software development, code, simulations and engineering tests; ChatGPT guides product/design and governance; Work is for noncoding work tasks.** | [EXECUTION-MODEL](EXECUTION-MODEL.md), [AGENTS](../AGENTS.md) |

## Decisions not to infer

- N-018 **does not** mean player natural bonuses or exact card flow are ratified.
- N-012 **does not** mean Glicko-2 is selected.
- N-008 **does not** guarantee provider free tiers suffice for every load.
- N-004 **does not** authorize visual work before game-engine validation.
- N-014/015 **do not** authorize an exploitable or endlessly redeemable credit generator.

## New entries

Use [DECISION-TEMPLATE.md](DECISION-TEMPLATE.md). Append N-042 onward and update the linked document. Never silently overwrite an existing decision's historical basis.

## P1B evidence addendum — 2026-10-18

N-033/N-034/N-035 retain their **EXPERIMENTAL** statuses. [LAB-P1B](LAB-P1B.md) records independent aggregate numerical reproduction of the 7,150-class symmetric model, distinguishes indexed versus distinct random baselines, and adds a controlled offline benchmark. It does not rerun the conditional 40k or old 30k match-length studies. N-019/N-020 remain EXPERIMENTAL; N-024 and O-01/O-02/O-03 remain OPEN. No product rule is ratified or changed by this evidence update.

## P1C evidence addendum — 2026-10-18

[LAB-P1C](LAB-P1C.md) adds an exact weighted depth/compression audit and controlled 5/10/20-round sessions. N-033/N-034/N-035 and N-019/N-020 remain **EXPERIMENTAL**; N-036, N-024 and O-01/O-02/O-03 remain **OPEN**. Simple competent policies retain most model EV, so competitive depth is not established. The conditional solo-learning recommendation is evidence for a future decision, not authorization of UI, ASYM or a status change. Exploratory v1 artifacts are preserved and explicitly superseded by dealt-order v2. No canonical rule changes.
