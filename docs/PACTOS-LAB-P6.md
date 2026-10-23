# NOCTE-P6-PAC-E — PACT-LAB-0.1

**Status:** isolated solo gameplay experiment, authorized for implementation by Issue #40. Nothing here is a final or RATIFIED game rule. This mode builds on the existing `DF-CF-0.1-lab` + `BANKROLL-LAB-A1a-0.1` browser experiments and does not change their profiles.

## Decision delta

N-057 records the founder's authorization to prototype Pactos por Ato as a separate experimental contract. It does not revise N-044's historical deferral for the earlier Cofre + Foco lab, nor does it reopen multiplayer/economy/progression. The Pact system does not grant or remove bank, stake, Focus, score, or ranking. Véu/Ferro, their timing, Renúncias and Privilégios remain experimental pending review and human validation.

## Versioned contract

`PACT-LAB-0.1` is a solo-only contract over A1a and the Cofre + Foco experimental engine. A Night has ten rounds. Rounds 1–3 use the unchanged A1a stake step and normal Cofre + Foco rules. On entering the betting step for round 4, before any stake confirmation or card preparation, the player may sign Véu, sign Ferro, or refuse both. The offer is resolved once and cannot be reopened. The selected contract applies on rounds 4–7; it expires before round 8 is dealt. Rounds 8–10 return to normal rules. This also applies if the bankroll has entered its ordinary free-practice state.

| Pact | Renúncia during rounds 4–7 | One Privilégio during the act |
| --- | --- | --- |
| Véu | Omit the dealer's open card from the public projection while phase is `compose`. The card is not sent to the table component during this phase. It becomes visible after the player confirms Luz and Sombra. Dealer hole card, future draws and seed remain private under the existing engine contract. | One Leitura at a legal Cofre + Foco window. It marks the ordinary round Read decision as used, reveals only the current hole card under existing solo semantics, and spends zero Focus. It adds no Focus. |
| Ferro | At signature, choose Luz or Sombra. The chosen hand cannot `double` during rounds 4–7. The restriction is enforced by engine legal-action projection and execution, not by button hiding alone. | One Manobra at a legal window/target, spending zero Focus. A normal paid Manobra may be chosen instead and leaves this Privilégio available. |
| Refusal | No Renúncia; ordinary A1a and Cofre + Foco rules continue. | None. |

The Pact state machine names offer, signature, active use, refusal, privilege consumption and expiration explicitly. A privilege is consumed only after its engine operation succeeds; failed actions leave the contract available. A used privilege remains marked consumed after the Pact itself expires. An unused privilege becomes expired when an active contract expires or the Night is abandoned.

## Non-interference and invariants

- The A1a stake remains equal for Luz and Sombra. Reserve stays `R = 4s`, including both possible doubles; settlement continues to use only the motor's exact score and half-chip ledger.
- Pact choice is independent of bankroll state, Focus balance, score and settlement.
- Iron restricts only the selected hand and only while the Act is active. The other hand and rounds 1–3/8–10 retain their previous action availability.
- Véu redacts the actual public projection for `compose`, not only CSS. It does not alter the private engine state, card order, natural peek or the moment the existing engine reveals the upcard.
- Free actions use dedicated engine entry points that preserve normal legality while charging zero Focus. No additional Focus is minted.
- DF-SYM-0.1, `DF-CF-0.1-lab`, P2A, A0.1 and A1a remain separate baselines. No experimental setting is promoted to a permanent rule.

## Validation contract

Required automated cases include offer timing/rejection; no deal before a decision; no early upcard in the Véu projection; recovery of the upcard after composition; no hole/future-draw exposure; one-time free Read/Manobra; Focus conservation; paid Manobra preserving Ferro's privilege; hand-specific double rejection in both engine legality and execution; expiry before round 8; normal doubles after expiry; dealer-natural/no-ability-window behavior; A1a reserve/settlement invariants; and mobile/desktop viewport behavior.

The initial implementation uses deterministic engine/session fixtures and browser Playwright coverage. These tests establish contract behavior, not strategy quality. No human study or policy-advantage comparison is included in this first implementation: the existing P2B-F solver assumes a different action set and has not been extended to price Pact selection. A future paired strategy lab should compare refusal/Véu/Ferro on matched deals, report per-Pact EV and decision-set changes with uncertainty, and avoid comparing a privileged-information agent to an agent that receives that information for free. Do not infer that either Pact is balanced, enjoyable, competitive, or strategically deep from unit/E2E tests.

## Known limits and next gate

This is a client-only local experiment; it is not multiplayer-safe or authoritative for a competitive server. The interface is a compact gameplay test surface, not final Art Déco/noir production. Privileges can remain unused if no legal window appears. The contract deliberately excludes Penhor, Reflexo, Pact-breaking and Editos da Casa. Human comprehension, choice frequency, perceived fairness, strategic differentiation and any quantitative advantage remain OPEN for a separate consent-based study and paired solver/simulator work.
