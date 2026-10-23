# Open questions / experiment queue

These are **not** approved answers. Each question includes a decision ID to amend when resolved.

P1A implementation alternatives and the versioned lab defaults are recorded in [ENGINE-RFC-P1A.md](ENGINE-RFC-P1A.md). That RFC does not close the questions below.

[CF-RFC-P2B.md](CF-RFC-P2B.md) records the founder-approved **first EXPERIMENTAL profile (N-046/N-047)**. O-17..O-21 remain OPEN regarding final product adoption, balance, fairness and empirical evidence. The approved lab contract can be implemented **only under a separate Codex issue**, not by modifying DF-SYM/P2A.

[LAB-P1B.md](LAB-P1B.md) records isolated common-random-number lanes for offline counterfactual comparisons only. This benchmark supplies evidence without closing O-01/O-02/O-03 or selecting a live mirror algorithm.

| Key | Urgency | Question / required evidence |
| --- | --- | --- |
| O-01 | BLOCKER Phase 1 | Finite shoe vs independent-rank draw; count of decks; shuffle/replenish rules; conservation and repeatability. N-024 |
| O-02 | BLOCKER Phase 1 | Exact mirrored future draw allocation when strategies consume different card counts; does dealer lane match? N-024 |
| O-03 | BLOCKER Phase 1 | Dealer natural peek timing; composed two-card naturals and payout 3:2 vs 1:1; exact match scoring. N-020 |
| O-04 | Phase 1 | Default symmetric or asymmetric mode after tests; retreat timing, possible information effects. N-022 |
| O-05 | Phase 2 | Direção Cofre + Foco RATIFIED (N-042), mas **não** os números e efeitos. Como testar ganho de profundidade sem criar uma jogada dominante ou tornar a mecânica obrigatória? N-042/N-043/N-045 |
| O-06 | Phase 2 | What human behaviors distinguish replay desire vs luck chasing? How to gather actionable feedback. N-036 |
| O-07 | Phase 2/3 | Which match length (5/10/20) and room capacity are enjoyable and fair? N-007/N-025 |
| O-08 | Phase 3 | Multiplayer timer, idling, auto-stand, reconnect, spectators, late join and disconnection penalties. N-006 |
| O-09 | Phase 3 | Which rank formula and uncertainty? Glicko-2 vs alternatives; prevent repeated friend farming/collusion. N-013 |
| O-10 | Phase 4 | Fixed-event entry pot vs other credit settlement; avoid loopholes and concentration of supply. N-026 |
| O-11 | Phase 4 | Exact initial credits, daily grants/cooldowns, timezone, subsolo bounded awards and anti-alt controls. N-014–016 |
| O-12 | Phase 4 | Robust puzzle evaluation: reward EV-optimal **decision** given information available, not post hoc win. N-016 |
| O-13 | Phase 4 | Guest identity/session recovery, account creation friction, privacy and match history retention. N-010/N-037 |
| O-14 | Deployment | Validate free-tier limits, monthly requests, object storage, concurrent sockets, logging, database writes and budget no-charge guardrail. N-008/N-029 |
| O-15 | Branding | Availability/registrability of NOCTE, final tagline, final logo and licensing. N-002/N-004 |
| O-16 | Scope | Any future cosmetics/paid offering and legal/classification/privacy review only after explicit founder decision. N-038 |
| O-17 | Pré-experimento Cofre + Foco | A 5ª carta é aberta ao jogador desde a distribuição? Pode ficar oculta? Quando pode ser trocada e para qual mão? Como garantir conservação e replay? N-042/N-043/N-045 |
| O-18 | Pré-experimento Cofre + Foco | Há 3 Foco por Noite, regeneração ou outra dotação? Quanto custam Manobra/Leitura? O que ocorre após gastar/sem saldo? Gasto antes ou depois de hit, double ou peek? N-043/N-045 |
| O-19 | Pré-experimento Cofre + Foco | Leitura é compatível com natural/peek do dealer e informações simétricas no competitivo? Quais consequências de manipulação de Ás+10 e Cofre para payout? N-020/N-024/N-045 |
| O-20 | Gate de profundidade | Comparar baseline P2A sem recursos, Cofre isolado, Foco/ações e variante combinada. Com que métricas de diversidade, regret, escolhas/rodada, aprendizado humano, risco de dominant strategy e número de rodadas? N-036/N-042/N-045 |
| O-21 | Gate de experiência | Como sinalizar reserva, custos e Foco restante sem sobrecarregar iniciantes, e sem associar Foco a créditos ou compras reais? N-004/N-009/N-042/N-045 |
| O-22 | Fase futura — banca | Banca de sessão ou persistente, gestão de exposição, criação/retirada de fichas solo, recuperação e rating independente? N-009/N-012/N-021/N-048 |
| O-23 | Fase futura — recompensas | Uma moeda de loja via desafios, fichas e dinheiro real ou moedas conquistável/premium segregadas? Há conversão permitida? Proteger contra farming, inflação e riscos legais antes de implementar. N-009/N-038/N-049/N-050 |
| O-24 | P2C UX | Validar botões Leitura/Manobra simultâneos, skip transacional e cancelamento sem perder decisão ou Foco, sem mudar lógica de janela pós-peek. N-051 / Issue #21 |
| O-25 | P4/P5 / stake pré-cartas | N-056 autoriza implementar isoladamente o laboratório A1a conforme os parâmetros explicitados na Issue #35, preservando A0.1 como controle. Continuam OPEN a avaliação humana, o comportamento de escolha, a utilidade de risco, a evidência de dominância da aposta máxima, o payout do produto, a fórmula de rating e a adoção final de A1. A aprovação experimental não altera N-055 historicamente nem transforma stake em regra RATIFIED. N-055/N-056 / Issues #32/#35 |
| O-26 | P5 / audiovisual DEFERRED | Produção Art Déco/noir, retratos, animações e som foram adiados pela Issue #37 até validar o fluxo de gameplay e obter autorização. A futura revisão deve avaliar legibilidade, naipes/figuras, teclado, reduced motion, mobile e conforto sensorial. O fluxo matemático segue agregado e infinito; identidade display-only. Não declarar qualidade, preferência ou acessibilidade confirmada só por teste automatizado. N-004/N-005/N-056 / Issue #37 |
| O-27 | P5 / cartas e shoe | Suits e identidades físicas não mudam o modelo atual infinito-com-reposição. Definir eventual baralho físico finito, contagem/renovação e implicações estratégicas somente em RFC/decisão próprios; não inferir baralho de 52 cartas pelo tratamento visual 10/J/Q/K. O-01/N-024/N-056 |

## Standard resolution record

For each answer: baseline rule version, contenders rejected, tests performed, effects on fairness and credits, founder approval status, new registry entry, and date. Don't close the issue by merely choosing a default in source code.

## Aditivo RFC P4-D — questões deliberadamente não encerradas (2026-10-19)

O-22 continua OPEN: banca reiniciada por Noite (A0/A1) versus persistente (B), exata regra de insuficiência de fichas, aposta pre-deal versus pós-composição, double sem crédito e ranking normalizado. O-23 continua OPEN: desbloqueio direto R1, moeda conquistável/premium segregadas R2 ou moeda única de três origens R3 (proposta original do fundador), conversão sujeita a N-009/N-050 e revisão jurídica. A recomendação **N-052 RATIFIED somente como sequência A0→A1** não equivale à aprovação de código, stakes, loja nem saldo persistente. Ver [ECONOMY-RFC-P4](ECONOMY-RFC-P4.md).

**Atualização 2026-10-19:** a ordem de pesquisa **A0 → A1** foi aprovada expressamente (N-052 RATIFIED como direção experimental), mas O-22/N-053 seguem OPEN quanto a saldo inicial, insuficiência, semântica de double, baixa liquidez/falência, prática gratuita e tratamento de exposições. Nenhum default numérico foi ratificado. O-23/N-050 permanecem OPEN para loja/moeda real.

**Especificação P4-A0-S — proposta para revisão, 2026-10-19:** [BANKROLL-A0-CONTRACT](BANKROLL-A0-CONTRACT.md) compara reserva máxima A0.1, double condicional A0.2 e saldo meramente visual A0.3. Recomenda A0.1, `B₀=150`, exposição 10+10, reserva 40, horizonte H=10 e prática gratuita quando `B<40`; cada elemento é CANDIDATE e aguarda aprovação. N-053/O-22 permanecem OPEN; não iniciar A0-E por inferência nem modificar N-009/N-012/N-021/N-038/N-050/N-052.

**Decisão posterior (2026-10-19) — prevalece sobre referências históricas acima:** A0.1 aprovada para laboratório solo com B₀ 150, H10, 10+10, cobertura 40, prática restante da Noite abaixo de 40 e expiração sem persistência. N-053 **EXPERIMENTAL (resolvida apenas para A0.1)** e N-054 **EXPERIMENTAL**. O-22 ainda OPEN para A1, B/C e jogo final; O-23/N-050 permanecem OPEN.

## RFC P4-A1-D — exposição pré-cartas (2026-10-20)

O-25 foi aberta para as decisões de stake pré-deal e objetivo de política. [BANKROLL-A1-RFC](BANKROLL-A1-RFC.md) recomenda apenas estudar A1a por rodada como candidato, compara A1b e preserva A1c/A0.1 como controle. Os exemplos `{5,10,20}` e reserva `4s` não foram aprovados. A1 permanece sem autorização de implementação até revisão expressa do fundador, evidência A0 humana e definição do próximo protocolo. N-053/N-054 seguem limitadas ao A0.1.
