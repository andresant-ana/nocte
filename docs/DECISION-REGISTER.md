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
| N-028 | SUPERSEDED | Histórico: Cofre/Foco/Contratos/Protocolos eram todos DEFERRED no primeiro laboratório. Cofre + Foco agora seguem N-042; Contratos/Protocolos permanecem DEFERRED por N-044. A regra DF-SYM-0.1 continua sem esses recursos. | [GAMEPLAY](GAMEPLAY.md), [COFRE-FOCO](COFRE-FOCO.md) |
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
| N-042 | RATIFIED (direção) | **Cofre + Foco é a próxima direção de aprofundamento de Duas Faces:** carta adicional de reserva, recurso limitado compartilhado na Noite e escolhas com custo de oportunidade entre mãos/rodadas. Ratificação do conceito, **não** dos números nem implementação automática. | [COFRE-FOCO](COFRE-FOCO.md) |
| N-043 | CANDIDATE | Protótipo ilustrativo: 5ª carta no Cofre; orçamento de 3 Foco/Noite, Manobra (troca de carta por 1), Leitura (consulta da carta oculta por 2) e opção conservar Foco. Custos, timing, efeitos, elegibilidade e informação permanecem por validar. | [COFRE-FOCO](COFRE-FOCO.md), [OPEN-QUESTIONS](OPEN-QUESTIONS.md) |
| N-044 | DEFERRED | Contratos, Protocolos, conquistas e progressão econômica/competitiva ficam fora do primeiro experimento Cofre + Foco; fases posteriores mediante tarefa própria. | [COFRE-FOCO](COFRE-FOCO.md), [ROADMAP](ROADMAP.md) |
| N-045 | OPEN | Balanceamento e **regras finais** de Cofre/Foco, fairness multiplayer, diversidade estratégica e evidência humana; não encerrados pela aprovação de um primeiro teste. | [OPEN-QUESTIONS](OPEN-QUESTIONS.md), [COFRE-FOCO](COFRE-FOCO.md) |
| N-046 | EXPERIMENTAL | Fundador autorizou como **primeira configuração de teste solo** a opção B pós-peek; Cofre como 5ª carta aberta; 3 Foco/Noite sem renovação; Manobra 1 e Leitura 2 (solo privada), até uma vez cada por rodada, ordem Leitura→Manobra; 10 rodadas principal, 5/20 sensibilidades, controles B-M/baseline. **Não ratifica regras finais.** | [CF-RFC-P2B](CF-RFC-P2B.md) |
| N-047 | EXPERIMENTAL | No perfil N-046: natural elegível fixado na composição pré-peek; Ás+10 criado por Manobra é 21 comum auto-stand, sem bônus/precedência natural; se dealer tem natural ou todas as mãos já estão terminais, não abrir janela Foco; alvo Manobra sempre mão ativa. | [CF-RFC-P2B](CF-RFC-P2B.md) |
| N-048 | RATIFIED (direção) | O NOCTE deve dar ao jogador **duas motivações complementares**: aumentar sua banca de fichas estritamente fictícias e melhorar sua habilidade; classificação competitiva independente de saldo, stake e volume. Cosméticos podem recompensar dedicação no futuro, sem pay-to-win. **Não ratifica conversão ou venda.** | [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md), [COMPETITION-ECONOMY](COMPETITION-ECONOMY.md) |
| N-049 | CANDIDATE | Futuramente estudar uma loja de cosméticos (verso de carta, mesa, perfil, títulos, efeitos), recompensas por desafios/marcos e eventual compra opcional de cosméticos. Modelo de moeda única com três fontes foi sugerido; alternativa de moedas conquistável/premium segregadas será comparada. Sem lançamento/implementação autorizado. | [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md), [VISION](VISION.md) |
| N-050 | OPEN | É aceitável permitir trocar fichas de jogo por moeda de loja que também pode ser comprada por dinheiro real? Conflito com proibição N-009 no MVP; exigir revisão de emissão ilimitada solo, farming, colusão, segurança, compliance e alternativas de marcos com teto antes de decidir. | [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md), [OPEN-QUESTIONS](OPEN-QUESTIONS.md) |
| N-051 | EXPERIMENTAL (UX) | Aprovação para **testar botões Leitura e Manobra diretamente acessíveis**, sem a etapa visível de recusar Leitura; qualquer clique em Manobra só deve pular Leitura ao confirmar operação atômica, sem reescrever regras do motor. Tarefa P2C-C #21 separada. | [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md), [PLAYTEST-P2C](PLAYTEST-P2C.md) |
| N-052 | RATIFIED (sequência experimental) | **Fundador aprovou estudar A0 → A1**: começar com banca fictícia que zera/reinicia por Noite, exposição inicialmente fixa e solo isolado; só depois avaliar exposições variáveis escolhidas antes das cartas, **sem aprovar A1 em código**. Não ratifica valor inicial, liquidação, falência, double, score, regras finais, carteira persistente ou moeda de loja. | [ECONOMY-RFC-P4](ECONOMY-RFC-P4.md) |
| N-053 | EXPERIMENTAL (A0 contract resolved) | Fundador aprovou **somente o laboratório local A0.1**: B₀=150, H=10, banca reiniciada, exposição fixa 10+10, reserva de pior caso 40, double legal preservado, prática gratuita nas rodadas restantes se B<40, saldo expira ao final ou abandono, liquidação idempotente uma vez pelo `round.score`. **Não aprova A1, B/C, economy final nem monetização.** | [BANKROLL-A0-CONTRACT](BANKROLL-A0-CONTRACT.md) |
| N-054 | EXPERIMENTAL | Fundador autorizou a configuração **BANKROLL-LAB-A0-0.1** para execução isolada por Codex: banca inicial 150 fictícias/Noite, H=10, 10 por mão, cobertura reservada 40, prática sem movimentar saldo abaixo de 40, reset/expiração e separação de Foco, rating e `match_points`. Testes exigidos, PR sem auto-merge. **Não é balanço ou produto ratificado.** | [BANKROLL-A0-CONTRACT](BANKROLL-A0-CONTRACT.md) |
| N-055 | CANDIDATE | RFC propõe avaliar stake pré-deal limitada e igual para Luz/Sombra como futuro experimento A1, mantendo A0.1 como controle. Recomenda A1a por rodada para pesquisa; bandas 5/10/20 e reserva 4s são apenas ilustrações. Não autoriza código A1, não muda A0.1 nem seleciona ranking/solver. | [BANKROLL-A1-RFC](BANKROLL-A1-RFC.md) |
| N-056 | RATIFIED (direção) / EXPERIMENTAL (laboratórios) / DEFERRED (produção audiovisual) | Issue #35 ratifica Art Déco/noir como direção de longo prazo e autoriza laboratórios P5 isolados: identidade ilustrada de cartas como metadado display-only; A1a com stake inteira igual por mão escolhida pré-deal, B₀=150, H=10, mínimo 1, máximo elegível floor(B/4), reserva 4s e prática quando nenhuma aposta mínima couber. Liquidação em meios de ficha; score/Foco/rating e A0.1 independentes. Issue #37 rejeita a execução audiovisual atual do PR #36 e prioriza uma mesa de gameplay ajustada ao viewport; áudio, retratos, ornamentação e produção audiovisual ficam DEFERRED até validação de gameplay e nova autorização. O adaptador simples de rank/figura/naipes continua experimental, sem alterar RNG matemático ou regras. Sem regra final, saldo persistente, compra, monetização ou multiplayer. | [Issue #35](https://github.com/andresant-ana/nocte/issues/35), [Issue #37](https://github.com/andresant-ana/nocte/issues/37), [EXPERIENCE](EXPERIENCE.md), [BANKROLL-A1-RFC](BANKROLL-A1-RFC.md) |
| N-057 | EXPERIMENTAL | Issue #40 autoriza o protótipo local e isolado `PACT-LAB-0.1`: escolha pré-aposta/distribuição da rodada 4 entre Véu, Ferro (com Face Luz/Sombra escolhida) ou recusa; Atos I (1–3) e III (8–10) seguem A1a + Cofre/Foco; Atos II (4–7) aplicam Renúncia e um Privilégio não renovável. Véu oculta a carta aberta somente na projeção da composição e dá uma Leitura gratuita; Ferro proíbe Dobrar a Face escolhida no motor e dá uma Manobra gratuita, preservável ao pagar por Manobra normal. Pactos não mudam banca, Foco, score nem classificação e expiram antes da rodada 8. Isto não altera DF-SYM, P2A, A0.1/A1a existentes, nem ratifica regras finais, multiplayer, Penhor, Reflexo, ruptura ou Editos da Casa. N-044 permanece no registro histórico; esta autorização é limitada ao laboratório P6 separado. | [PACTOS-LAB-P6](PACTOS-LAB-P6.md), [Issue #40](https://github.com/andresant-ana/nocte/issues/40) |

## Decisions not to infer

- N-018 **does not** mean player natural bonuses or exact card flow are ratified.
- N-012 **does not** mean Glicko-2 is selected.
- N-008 **does not** guarantee provider free tiers suffice for every load.
- N-004 **does not** authorize visual work before game-engine validation.
- N-014/015 **do not** authorize an exploitable or endlessly redeemable credit generator.

## New entries

Use [DECISION-TEMPLATE.md](DECISION-TEMPLATE.md). Append N-057 onward and update the linked document. Never silently overwrite an existing decision's historical basis.

## P1B evidence addendum — 2026-10-18

N-033/N-034/N-035 retain their **EXPERIMENTAL** statuses. [LAB-P1B](LAB-P1B.md) records independent aggregate numerical reproduction of the 7,150-class symmetric model, distinguishes indexed versus distinct random baselines, and adds a controlled offline benchmark. It does not rerun the conditional 40k or old 30k match-length studies. N-019/N-020 remain EXPERIMENTAL; N-024 and O-01/O-02/O-03 remain OPEN. No product rule is ratified or changed by this evidence update.

## P1C evidence addendum — 2026-10-18

[LAB-P1C](LAB-P1C.md) adds an exact weighted depth/compression audit and controlled 5/10/20-round sessions. N-033/N-034/N-035 and N-019/N-020 remain **EXPERIMENTAL**; N-036, N-024 and O-01/O-02/O-03 remain **OPEN**. Simple competent policies retain most model EV, so competitive depth is not established. The conditional solo-learning recommendation is evidence for a future decision, not authorization of UI, ASYM or a status change. Exploratory v1 artifacts are preserved and explicitly superseded by dealt-order v2. No canonical rule changes.

## P2A implementation addendum — 2026-10-18

Issue #9 authorizes a local solo prototype and a consent-based validation protocol, not a rule or product-status change. The prototype exposes the existing DF-SYM-0.1 experimental profiles, optional experimental teaching suggestions, and post-settlement solver analysis for research. [PLAYTEST-P2A](PLAYTEST-P2A.md) describes the fixed stratified study pools, consent, local in-memory handling, export/clear controls, and interpretation limits. No human sessions or outcomes are represented as completed. N-019/N-020 remain **EXPERIMENTAL**; N-036, N-024 and O-01/O-02/O-03 remain **OPEN**. N-042 ratifies only the future direction; it does not authorize Cofre + Foco in P2A. N-043/N-045 remain candidate/open, and N-044 deferred. This addendum does not ratify gameplay, balance, teaching guidance, or release readiness.

## Aditivo de direção Cofre + Foco — 2026-10-18

A aprovação expressa do fundador em conversa de produto é N-042: aprofundar Duas Faces com carta de reserva + orçamento limitado de ações especiais entre rodadas. Os exemplos quantitativos são **N-043 CANDIDATE**, não resultados de teste nem regras já implementadas. N-028 preserva o histórico como SUPERSEDED; N-044 mantém separadamente o adiamento de Contratos/Protocolos. P1A–P1C e P2A conservam integralmente suas regras e evidências. A P2A ainda tem PR próprio de UI para revisão; este aditivo de documentação não autoriza alteração desse escopo.

## Aprovação do RFC Cofre + Foco — 2026-10-18

O fundador aprovou **N-046/N-047 EXPERIMENTAL** para implementação em task Codex isolada; N-043 preserva o caráter CANDIDATE dos valores em **produto final**, N-042 segue RATIFIED somente como direção e N-045 permanece OPEN para adoção definitiva e resultados. Ações normais da P2A, motor DF-SYM e evidências P1A–P1C não foram alterados neste PR documental.

## Implementação experimental P2B-E — 2026-10-18

Issue #14 implementa `DF-CF-0.1-lab` em pacote isolado e adiciona laboratório de comparação pareada com controles e sensibilidades documentados em [LAB-P2B.md](LAB-P2B.md). Esta entrega não altera o motor DF-SYM-0.1, a interface P2A, nem promove N-046/N-047 a regras RATIFIED; N-043 continua CANDIDATE para produto final e N-045 continua OPEN. Resultados são evidência computacional do modelo infinito e não evidência humana, fairness multiplayer ou validação de produto. Nenhuma decisão existente foi alterada.

## Evidência de solver P2B-F — 2026-10-18

Issue #16 acrescenta solver condicional exato por estado e comparação do orçamento intertemporal por programação dinâmica sample-average, com treino/avaliação separados e comparação pareada a `conserve/eager/horizon` P2B-E. Em quatro células de 1.000 Noites, a política intertemporal apresentou EV estimado superior ao baseline sob a distribuição infinita com reposição; Leitura foi selecionada raramente e Manobra foi a fonte dominante de ganho. Ver [LAB-P2B-F](LAB-P2B-F.md) e artefatos JSON. Isto é evidência experimental e não muda status: N-042 continua RATIFIED apenas como direção; N-043 CANDIDATE; N-045 OPEN; N-046/N-047 EXPERIMENTAL. Nenhuma regra, interface, economia ou baseline foi ratificado ou alterado.

## Interface solo P2C-A — 2026-10-19

Issue #18 expõe `DF-CF-0.1-lab` como modo solo separado no navegador, reaproveitando o motor experimental e adicionando protocolo exploratório manual [PLAYTEST-P2C](PLAYTEST-P2C.md). A interface não altera o motor DF-SYM-0.1 nem o estudo P2A. Este registro documenta implementação, não uma decisão de design: N-042 permanece RATIFIED somente como direção, N-043 CANDIDATE, N-045 OPEN, e N-046/N-047 EXPERIMENTAL. Não há resultados humanos.

## Direção de banca e mérito; UX experimental — 2026-10-19

O fundador aprovou combinar **crescimento de banca fictícia com melhoria real de habilidade** (N-048 RATIFIED somente como direção). Também propôs loja com cosméticos e moeda obtida por desafios, fichas e dinheiro real: detalhes econômicos seguem N-049 CANDIDATE e N-050 OPEN, preservando N-009/N-038 para MVP. O feedback de Cofre+Foco foi informal n=1, favorável à mecânica e crítico ao clique obrigatório em “Pular Leitura”; a melhoria visual simultânea é N-051 EXPERIMENTAL, autorizada somente para teste de UX na Issue #21. Nenhuma banca, conversão ou compra foi autorizada para código.

## RFC P4-D — pesquisa de banca sem autorização de código (2026-10-19)

Issue #23 documentou opções A (banca por Noite), B (persistente) e C (pote zero-sum em duelos), alternativas de timing da exposição e R1/R2/R3 de recompensa cosmética. Recomendação A0→A1 é **N-052 RATIFIED (sequência experimental)**, sem regra financeira ratificada. N-009/N-012/N-021/N-038 mantidos; N-050 continua OPEN. O relato do fundador sobre a UX corrigida é feedback manual n=1, não playtest completo da economia. [RFC](ECONOMY-RFC-P4.md).

## Aprovação expressa do fundador da sequência de pesquisa — 2026-10-19

Em resposta à proposta “aprova A0 → A1 para os próximos experimentos de banca?”, o fundador respondeu **sim**. Assim, N-052 passa de CANDIDATE a **RATIFIED somente como sequência experimental**: A0 de banca fictícia por Noite e exposição fixa primeiro; A1 de stake limitada pré-cartas como experimento **posterior e não autorizado ainda em código**. N-053 OPEN registra saldos, insuficiência, reservas, double e terminalidade necessários para um contrato executável. A0 não pode ser integrado ao baseline silenciosamente; nenhuma regra econômica, carteira ou loja foi ratificada. N-009/N-021/N-038/N-050 permanecem.

## Aprovação experimental A0.1 — 2026-10-19

O fundador aprovou expressamente o modelo A0.1 com **B₀=150**, **10 rodadas**, **10 fichas por mão**, **reserva de 40** para cobrir ambos os doubles, **prática gratuita no restante da Noite se o saldo cair abaixo de 40**, e **expiração da banca no fim ou abandono**. As regras se tornam **EXPERIMENTAL para implementação isolada**, não RATIFIED finais. N-053 resolvida **somente para A0.1**; N-054 EXPERIMENTAL. A1, economia persistente, monetização, N-045/N-050 continuam sem aprovação.

## Implementação experimental P4-A0-E — 2026-10-19

Issue #28 implementa `BANKROLL-LAB-A0-0.1` como modo solo explicitamente selecionado, separado do Cofre + Foco sem banca e de DF-SYM/P2A. A banca local e temporária aplica exclusivamente o `round.score` final do motor, reserva 40 sem débito, congela abaixo da cobertura em prática gratuita e expira ao concluir/abandonar. [PLAYTEST-P4-A0](PLAYTEST-P4-A0.md) é apenas prospectivo; não há resultados humanos. N-053/N-054 permanecem **EXPERIMENTAL** somente para A0.1; N-009/N-012/N-021/N-038/N-048/N-050/N-052 permanecem inalteradas. Nada nesta implementação autoriza A1, persistência, economia, ranking por banca ou monetização.

## Evidência experimental P4-A0-V — 2026-10-19

Issue #30 mede offline a transição para prática de A0.1 sob quatro saldos de sensibilidade, três políticas computacionais, payouts 3:2/1:1 e comparação pareada do score sem a camada bancária. Em H=10, n=1.000, a configuração B0=150 chegou à prática em 0,6–1,0% das Noites simuladas nas políticas; B0=60, em 27,8–38,2%. A simulação reaproveita score final do motor; saldo não altera ações, `match_points` ou Foco. Playwright determinístico prova a sequência de saldo 40→0→prática e independência de score/Foco. Evidência e limites estão em [LAB-P4-A0-V](LAB-P4-A0-V.md) e `lab/results/p4-a0-v-*.json`. Estes dados **não ratificam saldo, exposição, payout ou regra** e não medem resposta humana; N-053/N-054 permanecem EXPERIMENTAL para A0.1. N-009/N-012/N-021/N-038/N-048/N-050/N-052 permanecem sem alteração. Nenhuma autorização de A1, persistência, loja, moeda ou monetização é inferida.

## RFC P4-A1-D — proposta de exposição pré-cartas (2026-10-20)

Issue #32 acrescenta [BANKROLL-A1-RFC](BANKROLL-A1-RFC.md), comparando stake limitada por rodada (A1a), fixa por Noite (A1b) e controle A0.1 sem variabilidade (A1c). N-055 é **CANDIDATE** somente para avaliar essa hipótese; nenhuma implementação A1 foi aprovada. A recomendação A1a, bandas ilustrativas, reserva `4s`, unidade fracionária e protocolo ainda exigem decisão expressa do fundador. A0.1 e os relatórios A0-V permanecem inalterados; O-25 fica OPEN.

## Repriorização de UX P5 — 2026-10-23

O fundador rejeitou a apresentação audiovisual inicial do PR #36 e abriu a Issue #37 para priorizar uma mesa de gameplay que caiba no viewport e permita concluir uma Noite sem rolagem ordinária. Esta atualização preserva N-004 como direção criativa RATIFIED de longo prazo e N-056 como autorização EXPERIMENTAL dos laboratórios de cartas/A1a; retratos ilustrados, som, efeitos e ornamentação audiovisual ficam DEFERRED até o gameplay ser validado e haver nova autorização. A correção atual conserva ranks/naipes e sua separação do cálculo matemático, mas simplifica a apresentação. Nenhuma mecânica, perfil de regras, banca A0.1, estudo P2A ou status de decisão é alterado.

## NOCTE-P5-A1a-E — execução experimental (2026-10-23)

Issue #38 implementa o laboratório isolado `BANKROLL-LAB-A1a-0.1` sob a autorização já registrada em N-056: banca 150, H=10, stake inteiro igual por mão escolhido antes de distribuir, cobertura `4s`, liquidação em meios de ficha e prática quando `floor(B/4)=0`. O ledger/UI permanece separado do contrato A0.1; stake não altera `match_points`, Foco, regras do motor nem classificação. Nenhuma decisão é acrescentada: N-055 continua CANDIDATE, N-056 continua direção RATIFIED / implementação EXPERIMENTAL, e o payout segue o perfil experimental existente. A evidência automatizada e as limitações são descritas em [LAB-P5-A1A](LAB-P5-A1A.md). Não há dados de jogador humano, solver de stake, multiplayer, persistência ou validação antifraude.
