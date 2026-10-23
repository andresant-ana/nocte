# Duas Faces — formal exploratory rulebook

**Rule set:** DF-SYM-0.1; **status: EXPERIMENTAL** (founder ratified the **direction**, not all rules). This is the contract for an offline laboratory, not final production matchmaking.

## Core concept

Keep the blackjack's objective of 21, variable-value Ace, fixed dealer policy and recognisable **hit / stand / double**. Add an initial puzzle: split **four visible starting cards** into **two distinct hands of two**, called **Luz** and **Sombra**. Both play against the same dealer. The upcard is visible during construction; the hole card remains secret until permitted.

A conventional blackjack round mostly presents sequential hit/stand choices. Duas Faces introduces an earlier combinatorial decision with observable differences in expected outcomes. This is the source of the game's candidate skill expression.

## DF-SYM-0.1: normative **for laboratory only**

1. **Scenario:** player sees 4 starting cards; dealer receives 2, one face-up and one face-down.
2. **Compose:** before any hit, player selects an unordered partition of 4 original cards into two 2-card hands. There are up to **three** distinct partitions (duplicates may collapse outcomes). As a game interface, Luz and Sombra can be labeled, but their action sets are identical in DF-SYM-0.1.
3. **Initial competition exposure:** **10 points per hand** (20 per round). These are **match score units**, not debits from a persistent balance.
4. **Peek:** after composition and before actions, if dealer has natural A+10: each assembled A+10 hand **pushes**, each other hand loses its initial exposure; round concludes. This order is a tested model assumption, **not** yet a final live-rule decision.
5. **Actions (per hand):** hit = draw one and continue if total < 22; stand = freeze; double = only with the original two cards, add 10 exposure, draw **exactly one** card, freeze. Action order: Luz then Sombra, unless a new version specifies otherwise.
6. **Scoring values:** A counts 1 or 11 to maximise non-bust total; 2–9 face; 10/J/Q/K count 10. Bust >21 loses regardless of dealer bust.
7. **Dealer:** reveal hole card after player hands. Hit below 17 and **stand on any 17** (S17; soft 17 also stands).
8. **Resolution:** player beats dealer with valid higher total or when dealer busts; loses with lower valid total; equal totals push. Each hand resolved separately.
9. **Player constructed natural:** an opening A+10 composed from original four receives **3:2 on win** in *the exploratory v0.1 calculator*, and pushes on dealer natural. Later 21 pays 1:1. **Natural bonus is UNRATIFIED;** a 1:1 sensitivity case was evaluated. The word "blackjack" here means *assembled* 2-card natural, not necessarily a pair originally dealt together.
10. **Exclusions:** no conventional split, insurance, side bets, surrender, fifth-card reserve, Focus, Contracts or Protocols in DF-SYM-0.1.
11. **Validation:** no action after stand/double/bust, no duplicate action ID or multiple reward settlement, no client-selected draw. Invalid client actions must not mutate state.

**Important:** shoe, shuffle, reveal protocol, deck count and future mirrored draws are **OPEN**. Laboratory draws use independent infinite-deck rank draws, not a finite shoe with conservation.

## Variant DF-ASYM-0.2 — candidate only

- **Luz:** hit, stand, **double** with original 2 cards.
- **Sombra:** hit, stand, **retreat** before its first hit, paying `-0.5` base stake. **No double**.
- Three partitions × two orientations = up to **six** assignments.
- The dealer peek precedes the retreat decision; retreat cannot retroactively defeat dealer natural.
- Exploratory results: best-vs-worst gap > 0.2 unit in 80.37% of weighted scenarios; optimal Sombra selected retreat in about 5.27%. See [VALIDATION](VALIDATION.md).
- Decision: **not adopted**, evaluate against symmetrical variant for cognitive load, frequency of meaningful decisions and fun.

## Removed or superseded hypotheses

- **Variable initial exposure allocation (5–15 / 20)** is **REJECTED for first competitive experiment**. In a simple EV-maximizing setup, players often push to the boundary rather than face interesting tradeoffs. Fixed exposure levels the field.
- Initial idea "two blackjack hands plus decorative achievements" is **insufficient alone** to meet strategic ambition; construction choice, mirror fairness and validation are necessary.
- The original third-card **Reserva** was a brainstormed predecessor. It is **SUPERSEDED as primary mechanic** by Duas Faces; avoid reintroducing without explicit experiment and approval.

## Próxima direção ratificada: Cofre + Foco (N-042; sem implementação na v0.1)

O fundador aprovou **a direção de design**, em 2026-10-18, de criar uma **carta de reserva (Cofre)** e **um recurso compartilhado e limitado ao longo de uma Noite (Foco)**. O propósito é que decisões afetem as duas mãos e as rodadas futuras, introduzindo custo de oportunidade que não existe na variante simétrica atual. Esta aprovação não fixa custos, timings, impactos ou recompensas.

A proposta de teste N-043 considera a quinta carta como Cofre e ações chamadas Manobra e Leitura; **3 Foco/Noite; Manobra por 1 e Leitura por 2 são apenas exemplos**. Veja o contrato de design e critérios de teste em [COFRE-FOCO.md](COFRE-FOCO.md).

**DF-SYM-0.1 permanece inalterado, sem Cofre/Foco.** Não adicionar essas mecânicas ao protótipo P2A em andamento; implementar somente em task Codex separada e versionada após revisão do escopo. **Contratos** (ex.: Precisão, Fronteira, Sangue-frio) e **Protocolos** continuam DEFERRED (N-044), não pertencendo ao primeiro teste de Cofre + Foco. Os recursos não devem criar vantagens compráveis nem vulnerabilidades de exposição de cartas ocultas.

## Suggested state machine (candidate)

`WAITING → DEAL → COMPOSE → PEEK → LUZ_ACTIONS → SOMBRA_ACTIONS → DEALER_DRAW → RESOLVE → ROUND_END → NEXT_ROUND/MATCH_END`.

Track rules version, shuffled seed commitment, per-player visible projection, legal actions, idempotency keys and deterministic replay; every state transition must have invariant checks.

## Open mechanic decisions

- Dealer hole peek timing and reveal on non-natural, multiple naturals.
- Single finite shoe vs rank-independent draws; number of decks and refill.
- Split of future draws per player/hand in mirror matches.
- 3:2 or 1:1 payout for *composed* blackjack; score design versus economy.
- Double when 21 is reached immediately or when Ace softness changes.
- Turn timers, reconnect and surrender/retreat UX; dealer simultaneous behavior in multiplayer.
- Distinctness and tie-breaking for duplicate-rank compositions.

Do not finalize these without [OPEN-QUESTIONS](OPEN-QUESTIONS.md) and new decision entry.

## Mandatory unit and property tests

Ace examples: A+6=soft17; A+A+9=21; A+9+9=19. S17 behavior; natural against natural; constructed 21 vs ordinary 21; bust even when dealer busts; double only from 2 cards and exactly 1 additional draw; legal action lists; no stale/duplicate actions; server-only hidden information; deterministic seed/replay; settlement conserved; simulation probabilities sum to 1 and expected-value programs satisfy basic sanity tests.

## P5 display identity adapter — experimental, not a rule change

Issue #35 / N-056 introduces a separate `P5-AV-0.1` browser presentation. The rules engine and solver continue to consume `Card.rank` over `A,2..10`; for a P5 card with mathematical rank `10`, optional `Card.art.faceRank` is selected from `10/J/Q/K`, and `Card.art.suit` from spades/hearts/diamonds/clubs. `handValue` deliberately ignores `art`. Thus Ace + any displayed ten-value face remains a 21/natural by the same existing tests, and a post-Manobra Ace + face remains an ordinary 21 under N-047.

The rank draw lane is unchanged and continues to draw one of 13 mathematical rank buckets with replacement; zero-based bucket indices 9–12 map to mathematical `10`, preserving 4/13 ten-value mass. Display metadata comes from independently namespaced `sha256-counter-p5-art-v1` streams and does not consume or shift the legacy rank stream. Suit and face identity therefore do not imply physical shoe depletion, card counting, or a new solver state. The older DF-SYM/P2A/CF modes still prepare rank-only cards. Public projection remains the sole UI boundary for hidden state; the P5 art layer cannot read the internal hole/draw arrays directly.

The displayed 52 identities are a visual partition of the infinite rank model, not a decision that the product uses a 52-card finite deck. Suit-dependent mechanics, finite-shoe probabilities, and physical-card conservation remain OPEN. N-019/N-020 and all P2A/P2B rule profiles remain unchanged and EXPERIMENTAL as recorded.
