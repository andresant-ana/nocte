# Execution roadmap and release gates

**As of 2026-10-18:** Only design, model exploration and initial canonical documentation are confirmed. No shipped game, backend, accounts, WebSockets, or production balance. Sequence below is a plan, not a status report.

## Phase 0 — Documentation baseline (current)

- RATIFIED founder constraints + experimental rule definitions recorded; dissent/unknowns preserved.
- Registers, validation provenance, roadmap, Work instructions and specs consistent.
- Gate: every consequential rule tagged by status; no silent elevation of lab results.

## Phase 1 — TypeScript engine and offline lab (next)

- Pure `@nocte/engine` without browser dependencies; explicit `DF-SYM-0.1` config.
- Finite-shoe policy documented and validated (or explicit alternative), controlled server RNG boundary and deterministic test RNG.
- State machine, illegal action validation, versioned events, replay.
- Simulation package with baseline bots (random-composition/optimal-actions, heuristic, fully-optimal under chosen model, risk-aware).
- Vitest + fast-check/property tests; EV cross-checking against recorded experiments under **matching assumptions**, not forced to match under different assumptions.
- Experimental asymmetric `DF-ASYM-0.2` behind rule flag, no default promotion.
- Gate G-ENGINE: determinism, action legality, score conservation and negative security tests pass; no unresolved ambiguity in a given config.

## Phase 2 — Minimal solo playable + human testing

- Flat but usable keyboard/mouse/touch table supporting composition of four cards and dealer steps.
- Invite 5–20 friends for short comparative play; log rounds and feedback **with consent**.
- G-FUN: players recognize decisions, report understanding, desire to play again, and prefer some NOCTE sessions to ordinary blackjack. Qualitative; no invented thresholds.
- G-SKILL: skill advantage persists among non-random bots/humans, with repeated matched scenarios and uncertainty. Strategy diversity measured, not assumed.
- G-ROLES: choose symmetric or asymmetric **only** after controlled comparison.

## Phase 3 — Friends-only realtime rooms

- Public/private join/invite, user cap, server authoritative web sockets, timers, reconnection and action privacy.
- Mirrored 1v1 if chosen; first social casual rooms.
- G-NET: reliability with ~20 concurrent participants within selected free-tier resource quotas **actually measured**, not promised.
- Gate G-FAIR: scenario parity and future draw fairness verified by property tests and adversarial clients.

## Phase 4 — Accounts / stats / fictitious economy / Subsolo

- Guest-first access with recoverable profiles.
- Credit transaction ledger, zero-money play, automatic daily claim, procedural skill puzzles, anti-farm and abuse controls.
- Score/rating independent of credit balance; seasons and leaderboards after measurement.
- G-ECON: simulated cohorts do not yield trivial infinite credit exploits, no unauthorized minting or transfers, abuse and idempotency tests passed.

## Phase 5 — Premium audiovisual product / wider beta

- Final Art Déco/noir system, responsive HUD, cards, audio, accessible cues, polished animations, characterful navigation.
- Optional advanced social highlights, cosmetics; user-tunable motion/audio.
- G-QUALITY: usability, accessibility and stability measured on browsers/devices.
- Expansion/paid infrastructure/monetization requires separate founder review and documented decision.

## Required reporting in every execution handoff

- Current git branch, commit/PR, changed files and decision IDs.
- Tests executed and exact outcomes, including skipped checks.
- What is **RATIFIED**, **implemented**, **tested**, **deployed**, **still experimental**.
- Blockers, next executable task and whether approvals are needed.
- No claim of a PR merged or a deploy online unless confirmed by GitHub/provider.

## Immediate follow-up

Design a prototype-specific finite dealing/mirroring RFC in [OPEN-QUESTIONS](OPEN-QUESTIONS.md), then implement Phase 1. No signup, premium animation or live financial mechanics required for this.
