# NOCTE

> **A blackjack-based strategy card game.** Art Déco / noir, browser-native, solo and social. **Status: design and mathematical validation; production engine not implemented.**

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

The repository is not yet a live game. The NOCTE-P1A branch adds an experimental, offline-only symmetric engine and strategy simulator; it is not production gameplay or balance evidence. All historical simulation figures and modeling limitations are documented in [VALIDATION.md](docs/VALIDATION.md).

## Local lab (NOCTE-P1A)

Requires Node.js 22+ and pnpm 12. Install dependencies with `pnpm install`, run checks with `pnpm test` and `pnpm typecheck`, and generate a reproducible report with:

```sh
pnpm simulate -- --seed demo-1 --scenarios 1000 --rules DF-SYM-0.1-lab-infinite-3to2-peek-natural-first --out lab-report.json
```

Use `DF-SYM-0.1-lab-infinite-1to1-peek-natural-first` for the natural-payout sensitivity. Both profiles and strategy limitations are documented in [the P1A RFC](docs/ENGINE-RFC-P1A.md); outputs do not reproduce the historical Python results.
