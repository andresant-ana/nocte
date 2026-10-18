# Technical architecture — provisional target, zero-cost MVP

**Decision status:** candidate stack for a founder-ratified objective (R$0 initial spending, ~20 friends, browser based, real-time rooms). No production system or provider quotas have been validated.

## Component diagram

```text
Browser: React + TypeScript + Vite
   | HTTPS / WebSocket
Cloudflare Workers / Hono API
   |           |
   |           +--> Durable Object per room (serialized authoritative match state)
   |                   \--> WebSocket connections / snapshots / timers
   |
   +--> D1 relational DB: accounts, seasons, match history, credits ledger, rewards
   |
Pure shared @nocte/engine (TypeScript) <--> @nocte/sim (offline bots/EV/replay)
```

### Candidate stack

| Concern | Option and rationale |
| --- | --- |
| Web | React + TypeScript + Vite: component-based browser client; independent engine |
| UI state | Zustand if complexity justifies it |
| Styles/animation | CSS/SVG + Motion / Web Animations API |
| Audio | Howler.js and Web Audio API |
| HTTP APIs | Cloudflare Workers with Hono and Zod validation |
| Realtime room | Durable Object as single room authority, WebSocket |
| DB | Cloudflare D1; SQL transactions/consistency constraints must be proven |
| Workspace | pnpm workspaces (light monorepo) |
| Rules | Pure `@nocte/engine`: deterministic reducers, legality, resolution, versioned state |
| Simulation | `@nocte/sim`: seeded games, adversarial bots, equity estimates |
| Verification | Vitest, fast-check/property testing, Playwright, deployment smoke tests |

Durable Objects SQLite, free-tier availability and WebSocket charging behavior require **fresh confirmation** before launch. Free tiers may be capped, change, throttle or deny requests; zero-spend is an objective, **not** unlimited SLA. Start on vendor-provided free domain, no purchased domain required.

## Data boundaries

- The player **never** chooses a card draw, outcome, timestamps, settlement or arbitrary amount of credit in an API mutation.
- An authoritative per-room sequencer validates action legality, turn, nonce, sequence number and idempotency key.
- Each client receives **only visible state**: own hand and actions; dealer upcard; opponents' permitted information; no hole card, shoe seed or opponent secret intentions.
- Real randomness generated securely on server and committed/revealed at appropriate phases. No replay seeds usable to predict future cards midgame.
- Transactions for credit escrow/settlement/reward are atomic/idempotent (DB constraints + transaction strategy validated, not assumed).
- Auth/session tokens and recovery must be secure; room URLs are not sufficient for access to identities or credit transfers.
- Disconnect/timeout handling deterministic and documented, no ghost draws; snapshots/events aid replay and conflict recovery.
- Include schema/rule version in match events and all derived statistics to survive balance patches.

## Candidate domain boundaries

`@nocte/engine`: value objects for card/rank/hand/dealer; state machine; `legalActions`, `applyAction`, `resolve`; invariant tests.

`@nocte/sim`: strategies, EV recursion/Monte Carlo, scenarios, multi-agent benchmark, statistical output, deterministic replay.

`apps/web`: rendering and controls, local session storage, websocket client, accessibility.

`apps/server`: HTTP routes + authoritative DO rooms, accounts, inventory/economy and leaderboards.

## Build / test target

A) Pure engine: explicit finite-shoe decision, seeded deterministic replay, mathematically valid independent tests.
B) Simulator: weak and strong bots, paired-seed comparisons, confidence intervals, economics and fairness metrics.
C) Thin browser client; no animation quality work before human gameplay test.
D) Friends-only room prototype, access control and reconnect tests.
E) Persistent identity, stats and wallets with ledger audit.
F) Production polish and deployment verification under free-tier caps.

## Threats and mitigations

Randomness prediction, malicious client actions, duplicated prizes, credit inflation, alternate accounts, manipulating timing, credit leakage, exposing seed/hole, collusion, replay attacks. Mitigate via authoritative state, monotonic command sequence, secret server entropy, rate limits, anti-sybil gates, event auditing and comprehensive tests.

## Architecture open questions

Serverless idle/connection caps and latency with 20 users; Durable Object billing specifics; D1 write contention/atomic ledger; account identity method; finite shoe/mirror-lane algorithm; local/UTC daily resets; telemetry and optional analytics privacy.
