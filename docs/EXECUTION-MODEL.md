# Execution model: ChatGPT / Codex / Work
**Status:** RATIFIED by founder on 2026-10-18. **Decision ID:** N-041.

## Binding responsibility boundaries

| Actor | Owns | Does not own |
| --- | --- | --- |
| ChatGPT (product/design chat) | Founder collaboration, game-design decisions, analysis/critique, prioritization, decision ledger, documentation interpretation | Autonomous implementation claims, treating unapproved design hypotheses as canon |
| **Codex** | **All software development:** source code, architecture implementation, engine, simulation scripts, tests, integration, debugging, dependency updates, code PRs, releases after authorization | Inventing product decisions or overriding status labels |
| ChatGPT Work | **Noncoding work tasks:** research, product-support documentation, operational coordination, gathering feedback and evidence, organization | Being assigned programming, engine implementation, game backend, game frontend or test-suite authoring |

A ChatGPT planning conversation may prepare a specification or request, but technical execution happens in Codex. A noncoding Work task may edit prose as authorized; it does not become the owner of engineering deliverables.

## Handoff format (ChatGPT → Codex)

1. Link to repository, branch target and numbered GitHub issue.
2. Enumerate **RATIFIED** founder constraints and **EXPERIMENTAL/CANDIDATE** mechanics separately.
3. Specify implementation boundary, explicit out-of-scope, runnable checks and acceptance criteria.
4. Require Codex to read `AGENTS.md`, `docs/INDEX.md`, the decision register and relevant rules/specs before any code change.
5. Codex creates a feature branch/PR and returns exact commit SHA, changed files, commands/test output, unresolved rule questions and next task.
6. Any rule ambiguity with material gameplay impact is documented as a testable variant/RFC, not silently resolved as a permanent game rule.

## Immediate technical execution

Progress note, 2026-10-18: P1A is integrated through PR #4. Issue #5 authorizes the P1B offline model solver and strategic benchmark described in [LAB-P1B](LAB-P1B.md); all production/gameplay approvals and ownership boundaries below remain in force.

Next stage: **Phase 1** in [ROADMAP.md](ROADMAP.md). Start with a pure TypeScript Duas Faces engine and offline simulator; keep UI, multiplayer, auth, economics and Cloudflare deployment out of initial scope. Preserve evidence provenance. The exploratory Python source was not imported during documentation baseline; do not imply the existing numerical JSON is independently executable.

See [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) for finite-shoe, dealer natural, draw order and mirror fairness blockers.

## Change governance

New product direction/approval belongs to founder; ChatGPT assists analysis and documentary canonization. Code implementation belongs to Codex. Code changed without a corresponding registry update cannot silently change a RATIFIED product invariant.
