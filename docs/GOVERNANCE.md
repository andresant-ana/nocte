# Governance and decision canon

## 1. Why this exists

The founder requested on 2026-10-18 that **every decision and analysis to date be documented in GitHub**, preventing Work/agents from rewriting the design by inference. This is the initial authoritative baseline, not an implementation authorization.

## 2. States and transitions

| State | Meaning |
| --- | --- |
| RATIFIED | Explicit founder commitment, applies to planning and delivery |
| EXPERIMENTAL | Defined for laboratory tests; can change after evidence |
| CANDIDATE | Proposed and not approved; do not rely on as stable contract |
| DEFERRED | Valuable idea intentionally outside the first motor |
| OPEN | Still undefined/needs study |
| REJECTED | Explicitly excluded from current scope |
| SUPERSEDED | Historically recorded, replaced by newer documented decision |

Transitions: CANDIDATE → EXPERIMENTAL → RATIFIED only with a new justification and authorization; either may become REJECTED or SUPERSEDED. RATIFIED changes require explicit new founder decision, documented consequence and new entry/REV note.

**Do not confuse** ratification of the *Duas Faces direction* with ratification of every underlying payout, timing, economy and shuffle rule.

## 3. Evidence policy

- Preserve raw outputs, modeling assumptions, scripts, dates, seeds and version names.
- Tables should identify method, denominator, units, and whether observations are simulations, EV calculations or human playtest data.
- Uncertainty or sample bias must be stated, not hidden.
- Don't call an infinite-deck weighted enumeration an exact finite-deck simulation.
- Version rule config and experiments; update all linked docs when a decision changes.

## 4. Change control

For any impactful change:
1. Propose scope and motivation in a PR; cite relevant decision IDs.
2. Explain proposed state change, rejected alternatives and effects on economy/ranking/security/UX.
3. Update register, exact spec, open questions, tests and relevant evidence in one logical unit.
4. Get founder agreement before calling a new mechanic RATIFIED.
5. Record result and mark superseded history explicitly rather than deleting it.

## 5. Definition of done for a docs baseline

- Every founder-confirmed requirement is RATIFIED and traceable.
- Every unapproved mechanical detail is tagged EXPERIMENTAL/CANDIDATE/OPEN.
- Early and corrected research figures coexist with methodological distinction.
- Architecture is a selected direction for exploration, not a falsely delivered system.
- Work instructions prohibit undocumented scope drift.

## 6. Contradiction procedure

If a message, test script and doc disagree: record the conflict in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md). Do not silently choose a convenient interpretation. The latest explicitly confirmed founder choice governs only what it actually decides; experiments never overrule user intent.
