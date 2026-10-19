# Execution roadmap and release gates

**As of 2026-10-18:** P1A's experimental engine and offline simulator, P1B's model solver and comparison evidence, and P1C's offline depth audit are integrated. P2A adds a local browser prototype and a consent-based validation protocol; it has not been deployed or tested with human participants. See [PLAYTEST-P2A](PLAYTEST-P2A.md). No backend, accounts, WebSockets, or production balance. Remaining phases below are plans.

## Phase 0 — Documentation baseline (current)

- RATIFIED founder constraints + experimental rule definitions recorded; dissent/unknowns preserved.
- Registers, validation provenance, roadmap, Codex engineering instructions and specs consistent.
- Gate: every consequential rule tagged by status; no silent elevation of lab results.

## Phase 1 — TypeScript engine and offline lab (next; owner: Codex)

- Pure `@nocte/engine` without browser dependencies; explicit `DF-SYM-0.1` config.
- Finite-shoe policy documented and validated (or explicit alternative), controlled server RNG boundary and deterministic test RNG.
- State machine, illegal action validation, versioned events, replay.
- Simulation package with baseline bots (random-composition/optimal-actions, heuristic, fully-optimal under chosen model, risk-aware).
- Vitest + fast-check/property tests; EV cross-checking against recorded experiments under **matching assumptions**, not forced to match under different assumptions.
- Experimental asymmetric `DF-ASYM-0.2` behind rule flag, no default promotion.
- Gate G-ENGINE: determinism, action legality, score conservation and negative security tests pass; no unresolved ambiguity in a given config.

**NOCTE-P1A implementation note (2026-10-18):** PR #4 integrated the symmetric lab slice, seeded local simulator, tests and options RFC. **P1B:** [LAB-P1B](LAB-P1B.md) supplies solver/benchmark evidence, including independent aggregate reproduction for the symmetric 7,150-class model. This does not close O-01/O-02/O-03; finite shoe, mirror allocation, final natural handling, asymmetric mode, human validation and full G-ENGINE signoff remain open/unvalidated.

## Phase 2 — Minimal solo playable + human testing

**NOCTE-P2A implementation note (2026-10-18):** The local, browser-only solo prototype and pre-registered study flow are available in this repository. This is implementation status, not evidence that the study was run. The pool is stratified, the teaching aid is an explicitly experimental suggestion, and outcomes cannot establish population balance, retention or commercial viability. Human recruitment and results remain pending; see [PLAYTEST-P2A](PLAYTEST-P2A.md).

**NOCTE-P2C-A implementation note (2026-10-19):** A separately selectable browser-only `DF-CF-0.1-lab` solo mode reuses the experimental engine and leaves the P2A table/study protocol as the basic-mode baseline. [PLAYTEST-P2C](PLAYTEST-P2C.md) is a manual exploratory protocol; no human sessions or results are claimed. N-045 remains OPEN and N-046/N-047 remain EXPERIMENTAL.

- Flat but usable keyboard/mouse/touch table supporting composition of four cards and dealer steps.
- Invite 5–20 friends for short comparative play; log rounds and feedback **with consent**.
- G-FUN: players recognize decisions, report understanding, desire to play again, and prefer some NOCTE sessions to ordinary blackjack. Qualitative; no invented thresholds.
- G-SKILL: skill advantage persists among non-random bots/humans, with repeated matched scenarios and uncertainty. Strategy diversity measured, not assumed.
- G-ROLES: choose symmetric or asymmetric **only** after controlled comparison.

## Próximo ramo de experimentação — Cofre + Foco (direção de produto N-042)

O fundador aprovou a **direção Cofre + Foco**, motivado por experiência inicial pessoal com o protótipo: divertido, porém ainda próximo de blackjack e sujeito à repetição. **Esse comentário é feedback informal de uma pessoa, não dados do protocolo P2A** nem aprovação de regras exatas.

**Sequência recomendada, ainda não executada:** (1) finalizar o PR P2A com correções e preservar baseline jogável; (2) elaborar versão DF-CF-0.x separada com especificação e matriz de hipóteses; (3) simular baseline vs Cofre-only, Foco-actions e combinado, sob condições equivalentes; (4) executar playtests humanos consentidos e comparar complexidade, decisão significativa, aprendizado e replay voluntário; (5) decidir calibragem ou descarte de variantes antes de multiplayer/ranking.

**Não** incorporar ao motor DF-SYM-0.1/P2A silenciosamente, nem tratar números/custos exemplificativos como RATIFIED. Contratos, Protocolos, economia e sistema de conquistas **continuam fases posteriores** (N-044). Questões O-17..O-21 e [COFRE-FOCO.md](COFRE-FOCO.md) orientam o escopo de uma task Codex futura, separada.

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

## Execution ownership

Coding and software architecture implementation are owned by **Codex**. ChatGPT handles product decisions, gameplay analysis and design-governance support. **Work** handles noncoding work/research/operational tasks; it must not be assigned engine, test or application implementation. See [EXECUTION-MODEL.md](EXECUTION-MODEL.md).

## Immediate follow-up

P1C's conditional recommendation has a local prototype and study protocol in P2A, but recruitment and human evidence are still pending; this does not satisfy G-FUN/G-SKILL. Competitive online/ranking investment is not supported yet. If playtests suggest simple-rule teaching removes decision interest, propose a separately reviewed DF-ASYM comparison before competitive implementation. O-01/O-02/O-03 remain open. See [LAB-P1C](LAB-P1C.md) for evidence and stop conditions and [PLAYTEST-P2A](PLAYTEST-P2A.md) for the protocol.

## Experimento Cofre + Foco — gate pós-RFC (2026-10-18)

O fundador aprovou a configuração **N-046/N-047 EXPERIMENTAL** para teste solo separado, como variante `DF-CF-0.1-lab`. A primeira tarefa Codex deve implementar **motor determinístico versionado e simulador** com Manobra/Leitura, 3/1/2, 10 rodadas principal (5/20 sensibilidades) e controles B-M/baseline; preservar P2A intacta. Após revisão da engenharia e análise, uma segunda task poderá integrar a variante a uma interface jogável para testes humanos consentidos. Sem promessa de melhora, regras finais, multiplayer ou pagamentos.

**NOCTE-P2B-F implementation note (2026-10-18):** [LAB-P2B-F](LAB-P2B-F.md) adds exact within-round conditional valuation and an approximate sample-average finite-horizon Focus policy. Its simulated EV supports moving to a separately selectable solo experimental variant for human comprehension/repetition testing after review; it does not satisfy human validation or authorize changes to P2A, online play, N-045, or rule status.

## Direção econômica futura e UX experimental — 2026-10-19

**N-048 RATIFIED como direção:** o jogador deve buscar tanto banca virtual fictícia quanto melhoria de habilidade. A métrica competitiva não pode ser apenas saldo/stake. **N-049 CANDIDATE / N-050 OPEN:** desafios e possíveis cosméticos de loja futura; conversão de fichas para moeda de loja e monetização real dependem de RFC separado, controles anti-farm e revisão de compliance. N-009 e N-038 continuam valendo no MVP; nenhuma economia adicional foi implementada nem autorizada. Veja [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md).

**Próximo sprint de interface:** NOCTE-P2C-C, Issue #21, **N-051 EXPERIMENTAL** — acessar Leitura/Manobra diretamente abaixo das mãos, sem tornar obrigatória a rejeição explícita da Leitura; confirmação de Manobra sem gasto/skip ao cancelar. Retomar playtest antes de abrir qualquer implementação de fichas e loja.

## P4-D — RFC documental da banca (proposta, 2026-10-19)

[ECONOMY-RFC-P4.md](ECONOMY-RFC-P4.md) compara A0/A1 (banca de sessão apenas), B persistente, C duelos de redistribuição e R1/R2/R3 de cosméticos. **N-052 CANDIDATE** recomenda avaliar saldo de sessão A0 antes de stakes dinâmicos A1, sem alterar P2C, abrir carteira, habilitar compras ou real-money mechanics. Gate obrigatório: fundador escolhe hipótese, orçamento/regras, limites do motor, relatório de simulação e experiência humana. N-050 continua OPEN.
