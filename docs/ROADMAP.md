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

[ECONOMY-RFC-P4.md](ECONOMY-RFC-P4.md) compara A0/A1 (banca de sessão apenas), B persistente, C duelos de redistribuição e R1/R2/R3 de cosméticos. **N-052 RATIFIED (sequência experimental)**: começar com estudo de banca por sessão A0; só então avaliar stakes dinâmicos A1, sem alterar P2C, abrir carteira, habilitar compras ou real-money mechanics. Gate obrigatório: fundador escolhe hipótese, orçamento/regras, limites do motor, relatório de simulação e experiência humana. N-050 continua OPEN.

**Aprovação do fundador (2026-10-19):** N-052 RATIFIED **somente a sequência A0 → A1**. A Issue sucessora deve fechar o contrato A0 documentando `B₀`, reservas das duas mãos/double, limite de saldo e recuperação gratuita antes de Codex escrever lógica de carteira; essas escolhas continuam N-053 OPEN. O modo P2C atual segue canônico como controle; monetização e loja continuam fora do escopo.

## NOCTE-P4-A0-V — evidência offline da banca (2026-10-19)

Issue #30 adiciona [LAB-P4-A0-V](LAB-P4-A0-V.md): 1.000 Noites pareadas para cada payout, horizonte principal H=10, três políticas de jogo e B0 de sensibilidade 60/100/150/200. Em 3:2, com B0=150, ocorreu prática em 0,6–1,0% das Noites; B0=60 produziu 27,8–36,2%. A banca é uma camada contábil pós-motor e não alterou score/Foco. Teste Chromium determinístico confirma a transição funded→practice em saldo 40 e conservação de `match_points`/Foco. Tudo é evidência computacional, não humana; N-053/N-054 permanecem EXPERIMENTAL só para A0.1. A1, aposta variável, persistência, loja e monetização seguem fora do escopo e sem autorização.

## NOCTE-P4-A1-D — proposta documental, não autorizada para código (2026-10-20)

Issue #32 produz [BANKROLL-A1-RFC](BANKROLL-A1-RFC.md): compara exposição A1a selecionada por rodada, A1b selecionada uma vez por Noite e A1c (A0.1 sem variabilidade). A1a é uma hipótese candidata para um futuro estudo, não uma regra aprovada. O RFC preserva B₀=150, H=10, stake 10 e reserva 40 do A0.1 como controle; exemplos 5/10/20 e reserva `4s` exigem decisão. A1 só pode chegar a simulação/implementação após gate documental do fundador e avaliação humana de A0; nenhum resultado de A0-V mede a resposta a stakes variáveis.

## NOCTE-P5 — fatias experimentais autorizadas (2026-10-23)

Issue #35 / **N-056** aprova a direção criativa P5 e autoriza laboratórios solo separados. Issue #37 altera a prioridade de execução: primeiro uma mesa de gameplay que caiba no viewport, sem scroll ordinário, mantendo motores e estudos como baseline. A direção Art Déco/noir continua RATIFIED como objetivo futuro, mas áudio, retratos e produção visual estão DEFERRED até validar o gameplay e registrar nova autorização. Nenhuma destas aprovações ratifica regra final, saldo persistente, compra, monetização, ranking por banca ou multiplayer.

- **Marco 1 — Issue #37 UX-fit (correção do PR #36):** conservar J/Q/K e naipes como identidade display-only, remover áudio/retratos/ornamentos e organizar HUD, mesa e dock por fase no espaço disponível. A verificação técnica cobre telas desktop e mobile; a interface não altera motor, projeção pública, P2A nem A0.1. A1a ainda é entrega separada.
- **Marco 2 — BANKROLL-LAB-A1a-0.1 (PR separado, autorizado experimentalmente por N-056):** aposta inteira e igual por mão antes de cada rodada, B₀=150, H=10, mínimo s=1, máximo elegível floor(B/4), cobertura 4s, liquidação exata em meios de ficha e prática quando a mínima não couber. Precisa preservar A0.1, pontuação, Foco e perfil CF, além de verificar solver/simulação e interface. Estes parâmetros são do laboratório, não regras finais.
- **Marco 3 — atos/metas (PR separado):** objetivos transparentes, estado de progressão sem manipular chance/payout/Foco, métricas separadas e auditoria de dominância da aposta máxima.
- **Marco 4 — coleções cosméticas (PR separado):** preview e seleção local; sem loja ativa, compras ou conversão; cosméticos não alteram o motor.
- **Marco 5 — backlog social (documentação):** servidor autoritativo e revisão de infraestrutura antes de banco persistente/salas/duelos; sem carteira de browser.

Não há resultados humanos de P5. O viewport-fit requer playtest de clareza e aprendizado; produção audiovisual futura exigirá avaliação independente de acessibilidade e resposta sensorial. Resultados de P1–P4 não demonstram esses atributos.

### NOCTE-P5-A1a-E — Issue #38

Implementação experimental em branch/PR próprio: modo local `BANKROLL-LAB-A1a-0.1`, aposta igual por rodada pré-distribuição, reserva `4s`, ticks de meia ficha e prática gratuita abaixo da aposta mínima coberta. O laboratório preserva A0.1, P2A, perfil e score do motor; testes automatizados cobrem a contabilidade, o fluxo de informação e a fase de aposta sem scroll. Este marco não inclui solver/simulação de política de stake nem playtest humano. Não inferir dominância, diversão, justiça, segurança ou calibragem. Ver [LAB-P5-A1A](LAB-P5-A1A.md).
