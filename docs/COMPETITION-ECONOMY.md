# Competitive play, ranking, fictional economy and Subsolo

This document carefully separates founder-ratified **fairness and accessibility** from proposed formats/numerical systems.

## Ratified invariants

1. Solo and social play. Public/private rooms; invite and capacity; accessible from a browser.
2. Competitiveness cannot be determined by who owns/risks the largest virtual bank.
3. Fictional credits only. **No purchase, conversion, cash-out, real-value prize or pay-to-win**.
4. Daily free credit claim and zero-stake practice/recovery so an empty balance does not end participation.
5. Daily challenges must work without manual content creation; no requirement for founder to author daily puzzles.
6. Simple access to persistent stats, history and leaderboard; avoid cumbersome registration.
7. Server authoritative, prevent cheating and repeated redemptions.

## Match types — candidate launch formats

| Mode | Proposed behavior | Status |
| --- | --- | --- |
| Solo | One player vs fixed dealer; practice and full results, no unbounded minting of persistent credits. | CANDIDATE |
| Salão casual | Public/private rooms, invite link, **2–6 participants**, **5 rounds**; simultaneous confidential decisions then dealer reveal/recap. | CANDIDATE |
| Ranked Noite Espelhada | **1v1, 10 rounds** under identical initial scenarios and available rules. | CANDIDATE |
| Subsolo | Always-open zero-stake procedural skill challenges, recover fictitious credits under capped rules. | RATIFIED intent / EXPERIMENTAL implementation |
| Experimental modifiers | Unranked sandbox for Cofre/Foco/Protocolos later. | DEFERRED |

Room full rules, spectator policy, disconnections, inactivity and anti-collusion are OPEN. A five/ten-round Noite is a **test duration**, not a final UX promise.

## Mirroring (candidate; underlying algorithm OPEN)

Each contestant gets equivalent starting cards, same visible dealer upcard and identical challenge resources in an independent copy of an authoritative scenario. Future draws require a defined deterministic common-random-numbers algorithm; cloned general-purpose RNG with divergent draw counts is **not necessarily fair**.

A possible implementation: dealer lane plus fixed Luz and Sombra draw lanes, cloned for both players, eliminating a shared-shoe action-order advantage. Trade-off: it no longer behaves like a conventional finite blackjack shoe; evaluate and specify before production. The research mirror simulation used simplified with-replacement lanes and pre-resolved dealer.

Round match score is combined two-hand outcome; sum round scores for match. Identical total → tie, without arbitrary forced tiebreakers. The private decisions are disclosed only after all participants have completed the round.

## Primary skill leaderboard

**RATIFIED:** do **not** rank by absolute credit balance/total credit profit. People with bigger starting banks would dominate independently of ability.

**CANDIDATE:** independent skill rating accounting for opponents, results, uncertainty and match volume; Glicko-2 is a candidate, not already selected. Initially include placements, uncertainty and minimum sample thresholds; keep 20-friend rating **unofficial** until repeat-player effects and collusion are assessed. No official win-rate claims from uncontrolled matches.

Secondary views may show net fictitious table profit, efficiency per match, most contracts, season placement, streaks and historical stats — avoid equating volume with skill. **Prestígio** (achievements) must not inflate competitive rating.

## Separate accounting ledgers

| Ledger | Purpose | Permanent? |
| --- | --- | --- |
| `match_points` | Equal initial exposure, theoretical score from two hands and dealer. | Match/replay |
| `credit_balance` | Fictional play currency for eligible room entry and progression. | Yes |
| `credit_transactions` | Append-only signed transfer/mint/burn/reward audit. | Yes |
| `skill_rating` | Competitive estimate, independent of credit_balance. | Yes, versioned |
| `prestige` | Challenges, cosmetic unlocks, non-currency progression. | Candidate |

**Proposed no-inflation multiplayer event:** 2 participants escrow 20 credits each; winner receives the 40-credit pot; tie refunds both. Does not mint new chips; both compete with identical match exposure. This is **not approved economy policy**: requires fraud, incentive and abuse analysis before enabling credit transfers.

**Solo:** can't freely mint credits using traditional payouts; modeled optimal play shows positive EV under present constructed-natural rule (see validation). Initial solo is score/practice; controlled awards from procedural challenges are candidate. All credit emissions have explicit limited source and idempotency keys; no hidden house bank illusion.

## Subsolo and Desafio da Meia-Noite

**Ratified design requirement:** daily claim and automatic never-ending content (no founder daily labor), accessible even at 0 credits, with skill-based rewards rather than pure random wins.

**Proposed content engine:**
1. Deterministic seed derived from UTC/local product day and rule version (product timezone OPEN).
2. Generate accessible card/dealer/resource states and candidate action pathways.
3. Solve/evaluate outcomes with exact/Monte Carlo approximations; discard trivial, unwinnable or chance-guessing puzzles.
4. Validate a player's **decisions using only knowledge available at that moment**, not luck-based hindsight.
5. Fixed reward on first eligible completion, account-scoped cooldown or bounded progression; unlimited practice but **not** unlimited remunerated rerolls.
6. Server verifies answer with versioned scorer, idempotent ledger, nonce and replay protection.

The name **Subsolo** is the preferred mode name (working). *Desafio da Meia-Noite* is a concept for automatically generated daily mission. The initial three-step mission and 150-credit reward were **illustrative UI ideas**, not final rewards.

The no-credit user may keep practicing, including while waiting for rewards. Exact replenishment threshold, caps, claim clock, currency creation budget and difficulty matching remain OPEN.

## Profile / access

CANDIDATE onboarding: guest-first ephemeral identity, then optional recoverable account via passkey, provider login or email link (not custom password system). Keep room entry low-friction, but ranking/rewards require verified persistent identity and anti-sybil controls. No account details must be public beyond chosen nickname.

Show total rounds, wins/losses/pushes, hands, 21s/naturals, net table result vs redeemed grants, credits, historical matches, best Noite, contracts, ranking and season record. Metrics require versioned definitions and server events.

## Anti-abuse and fairness tests

Disallow client-ledger writes, duplicated settlement, forged scores, seed exposure, room/collusion exploitation, fake disconnected contestants, mass guest reward farming, same-account repeated claim, self-challenges, time manipulation, and leaderboard manipulation through unequal session lengths. Periodically test inflation/deflation with simulated cohorts.

This is an entertainment product with blackjack-inspired fictitious stake simulation. Any wider release needs independent jurisdiction/classification/privacy review; **do not label it real-money gambling** or claim worldwide legal clearance.

## Atualização de direção 2026-10-19 — banco fictício e recompensas

**N-048 RATIFIED como objetivo, não como mecânica pronta:** dar significado à banca fictícia, mas preservar rating de habilidade independente de saldo, exposição e volume. O jogo básico e o laboratório CF permanecem com pontuação experimental fixa, sem moeda persistente. Não inferir que o solo poderá gerar fichas persistentes ilimitadas.

**N-049 CANDIDATE / N-050 OPEN:** cosméticos futuros e recompensas ganhas por desafios; duas carteiras segregadas de moeda conquistável e eventual compra de cosméticos são uma alternativa à proposta do fundador de conversão direta de fichas para moeda de loja comprável. Esta última envolve potencial de farming e risco regulatório e segue sem autorização. N-009 e N-038 continuam impondo ausência de conversões/monetização no MVP. [ECONOMY-REWARDS-DIRECTION](ECONOMY-REWARDS-DIRECTION.md).
