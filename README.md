# NOCTE

> **A blackjack-based strategy card game.** Art Déco / noir, browser-native, solo and social. **Status: local experimental solo prototype; no production service or human playtest results.**

This is a **new, independent project**. MESA/21 was discontinued because it had become too close to conventional blackjack.

## Start here

1. [Documentation index](docs/INDEX.md) — source of truth.
2. [Decision register](docs/DECISION-REGISTER.md) — every approved, experimental, deferred, open and superseded decision, with IDs.
3. [Game rules](docs/GAMEPLAY.md) — Duas Faces v0.1 experimental contract.
4. [Evidence](docs/VALIDATION.md) — reproducible assumptions and findings; **not** validated production balance.
5. [Execution policy](AGENTS.md) — mandatory constraints for Codex and software-development agents.

## Who does what

- **Codex:** all code, motor, simulations, automated tests, GitHub engineering PRs.
- **ChatGPT:** product strategy, game design, decisions and critical review.
- **Work:** noncoding work tasks, desk research, operational/documentation support.

See [execution model](docs/EXECUTION-MODEL.md) (N-041).

## Non-negotiables

- Fictional credits only. No deposits, withdrawals, prizes of real value, real-money exchange or pay-to-win.
- Initial target: play with ~20 friends at **zero initial hosting cost**, within free quotas.
- Strategy and competitiveness ahead of cosmetic polish; premium Art Déco/noir experience is a product goal.
- Keep approved product constraints distinct from **candidate** rules and **laboratory** parameters.
- NOCTE is the *working* name, not a registered or availability-cleared brand.

## Current milestone

Documentation baseline → TypeScript game engine and simulation lab → gameplay validation with friends → browser multiplayer → economy/ranking → premium audiovisual layer.

The repository is not a live or networked game. NOCTE-P1A supplies the experimental symmetric engine and strategy simulator. P1B adds a model EV solver and controlled strategy benchmark; P1C audits strategic depth. NOCTE-P2A adds a local solo browser prototype and a consent-based playtest protocol. Its rules remain experimental, and no human study has been conducted. See [LAB-P1B.md](docs/LAB-P1B.md), [LAB-P1C.md](docs/LAB-P1C.md), and [PLAYTEST-P2A.md](docs/PLAYTEST-P2A.md). Historical figures remain in [VALIDATION.md](docs/VALIDATION.md).

## Shareable experimental preview (NOCTE-P10)

The optional static preview is built for GitHub Pages under `/nocte/` from `packages/web/dist`; deployment runs only from `main` after Pages is enabled with **GitHub Actions** in repository Settings. The site is not considered published until a successful deployment and URL are verified. See the [P10 volunteer and privacy guide](docs/PLAYTEST-SHARE.md). Playtest consent remains off by default, and study JSON is downloaded only by an explicit local action. GitHub Pages may log visitor IP addresses for infrastructure security; this is separate from NOCTE, which does not send playtest data.

## Solo prototype (NOCTE-P2A)

Requires Node.js 22+ and pnpm 12.9.1. Run `pnpm install` and `pnpm dev`, then open the local URL printed by Vite. The prototype reuses the existing engine, runs in the browser, and keeps study records in memory only. Joining a study is optional; exports require an explicit action, and records can be cleared. Read the [P2A protocol](docs/PLAYTEST-P2A.md) before facilitating or interpreting any session. No human results or definitive rules are implied.

## Local lab (NOCTE-P1A)

Requires Node.js 22+ and pnpm 12. Install dependencies with `pnpm install`, run checks with `pnpm test` and `pnpm typecheck`, and generate a reproducible report with:

```sh
pnpm simulate -- --seed demo-1 --scenarios 1000 --rules DF-SYM-0.1-lab-infinite-3to2-peek-natural-first --out lab-report.json
```

Use `DF-SYM-0.1-lab-infinite-1to1-peek-natural-first` for the natural-payout sensitivity. Both profiles and strategy limitations are documented in [the P1A RFC](docs/ENGINE-RFC-P1A.md); outputs do not reproduce the historical Python results.

## EV laboratory (NOCTE-P1B)

The new CLI preserves the legacy `simulate` command and uses a versioned report schema:

```sh
pnpm benchmark -- --seed nocte-p1b-main-v1 --scenarios 100000 --out ../../lab/results/p1b-benchmark-3to2-v1.json
pnpm enumerate -- --out ../../lab/results/p1b-enumeration-3to2-v1.json
```

Output paths are relative to `packages/sim`. The [P1B contract](docs/LAB-P1B.md) includes both payout commands, pilot/sample rationale, solver APIs, the [5,6,10,10] study and historical comparisons. These offline model results do not validate human gameplay.

## Strategic-depth audit (NOCTE-P1C)

```sh
pnpm depth -- --mode exact --out ../../lab/results/p1c-exact-3to2-v2.json --csv ../../lab/results/p1c-scenarios-3to2-v2.csv
pnpm depth -- --mode sessions --seed nocte-p1c-main-v1 --sessions 10000 --out ../../lab/results/p1c-sessions-3to2-v2.json
pnpm depth:report
```

See [LAB-P1C.md](docs/LAB-P1C.md) for both profiles, pilots, held-out policy checks, the dealt-order correction, quantitative conclusions and conditional next gate. The audit reuses the engine/solver without changing gameplay.
