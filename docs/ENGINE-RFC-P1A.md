# NOCTE-P1A engine implementation RFC

**Status:** implementation proposal with explicitly experimental lab defaults; not a gameplay ratification. **Date:** 2026-10-18. **Scope:** `DF-SYM-0.1` local engine and simulator only.

## Unresolved questions and alternatives

| Question | Alternatives | Tradeoffs | P1A lab default | Status after P1A |
| --- | --- | --- | --- | --- |
| Draw model (O-01) | Independent infinite ranks with replacement; finite one/deck shoe with reshuffle policies | Infinite draws are simple to replay and match the documented exploratory model, but ignore depletion/counting. Finite shoe better models conservation but requires deck count, shuffle boundary and exhaustion rules. | Infinite rank draws using A–9 at 1/13 each and ten-value at 4/13, identified by a profile ID. | **OPEN**; not a production shoe decision. |
| Initial draw and action order | Deal all four player ranks, dealer upcard, dealer hole; or interleave draws; play dealer before/after player hands | With replacement, orders have the same rank distribution but different seeded traces. A finite shoe would make order affect depletion and mirrors. | Four player cards first, then dealer upcard and hole; compose; act Luz then Sombra; dealer draws after both. | Implementation trace only; no live/finite-shoe decision. |
| Dealer natural (O-03) | Peek after composition; resolve only at end; natural pays/pushes variants | Peek matches the written DF-SYM-0.1 lab contract and avoids later actions after a dealer natural. Settlement timing and composed-natural payout remain unratified. | Peek after composition; player natural pushes against dealer natural; sensitivity profiles for 3:2 and 1:1. In this lab profile a composed natural beats a non-natural 21. | **OPEN**; profiles and natural precedence are experimental. |
| Future draws / mirrors (O-02) | One shared shoe; per-hand lanes; common-random-number lanes; independent round streams | A shared shoe is physically intuitive but divergent action counts shift every later draw. Separate lanes aid comparisons but do not define a live match. | No mirror mode in this implementation. Each offline strategy replays the same seed for initial conditions and independently consumes its own deterministic continuation. | **OPEN**; CLI explicitly disclaims multiplayer mirror equivalence. |
| Deterministic randomness | Test seed in serialized state; injected card source; server entropy service | Persisted seeds are convenient but can expose future cards. Injection supports repeatable tests without making seed part of a client snapshot. | Engine accepts a `CardSource`; simulator owns a documented test-only seeded PRNG. Internal state has no seed. Public projection omits hole card until completion and never serializes the source. | Server must later supply cryptographically secure entropy and control projections. |

## Chosen implementation boundaries

- `@nocte/engine` is a synchronous state machine with no UI, network, persistence, or random-number generator dependency. Draws are supplied by the caller.
- Composition is retained as terminal Luz/Sombra hands even when dealer natural ends the round immediately. Public projections are detached deep snapshots, so runtime mutation of a projection cannot change authoritative state or another projection. Hand advancement builds a new hands record rather than writing to the input round.
- `@nocte/sim` owns seed parsing, deterministic random ranks, strategy policies and JSON output. Its simple heuristic ranks partitions by resulting hand totals; it is neither exact EV nor a solver.
- The report identifies the simulator and PRNG versions as well as the seed, scenario count and rule profile so seeded output can be replayed against the matching implementation.
- Distinct composition outcomes collapse when the resulting unordered rank-pair groups are equal. The selected partition keeps original card indices so each dealt card is used once.
- The exposed rule profiles are `DF-SYM-0.1-lab-infinite-3to2-peek-natural-first` and `DF-SYM-0.1-lab-infinite-1to1-peek-natural-first`. Both remain `EXPERIMENTAL`. No asymmetric rules are implemented.
- Score uses match units: a win returns positive net score equal to exposure, a loss negative exposure, a push zero; a 3:2 natural win is +1.5 times exposure. This follows the exploratory rulebook's initial exposures and natural sensitivity model, not a persistent credit economy.

## Tests required for this RFC

1. Exhaustive examples for Ace valuation, natural recognition, S17, tie/push, bust precedence, natural peek, composed natural versus non-natural 21, natural payout sensitivity and exact double exposure/draw count.
2. Illegal transition and malformed partition rejection without mutation.
3. Property generation over rank multisets: every partition covers input indices exactly once; output is between one and three distinct rank outcomes.
4. Visibility check: before the post-composition peek, neither dealer hole card nor natural status is present in the public projection; completed rounds may reveal the hole card.
5. Repeated simulator invocation with the same seed, profile and scenario count yields identical JSON data; both strategies appear in output with the non-solver limitation stated.
6. The JSON report includes sample counts and a normal-approximation 95% interval for the paired mean score difference when at least two scenarios are run; this interval is Monte Carlo uncertainty, not a rule-validation result.
7. Dealer-natural regression tests retain the selected Luz/Sombra cards, exposures and terminal statuses in both internal and public state, with the same push/loss settlement. Snapshot regression tests mutate nested cards, hands and settlement across round phases and verify isolation from authoritative state and other snapshots.

These tests validate the implementation against the chosen profile. They do not resolve O-01/O-02/O-03, reproduce the historical Python calculations, demonstrate balance, or establish player enjoyment.
