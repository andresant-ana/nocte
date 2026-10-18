# NOCTE-P2A — Solo Playtest Prototype Design

**Status:** design proposal for Issue #9; requires founder review before implementation planning. **Rules:** DF-SYM-0.1 profiles remain EXPERIMENTAL. **Base:** `3399ad5dcb31cdc2ab06a1d98932c86fc5e3581a`.

## Goal and evidence boundary

Build a local, browser playable solo prototype to prepare a small human study of comprehension, learning, decision interest and repetition. The prototype tests the P1C hypothesis that a short rule can make composition decisions rote. It does not claim fun, retention, balance or competitive viability before humans play. No human responses or outcomes will be fabricated, and study findings cannot promote experimental mechanics to RATIFIED.

Success for this delivery means a person can start and complete a Night without help, understand the current phase and available actions, optionally complete a short structured study, and voluntarily export or clear local study records.

## Technical shape

- Add a `packages/web` workspace with React, TypeScript and Vite, consistent with the provisional stack in `docs/ARCHITECTURE.md`.
- A focused game-session adapter calls `@nocte/engine` for round creation, composition, legal actions, action transitions, dealer resolution, settlement and score. It contains no duplicate rule calculations.
- Keep `InternalRound` private to the session adapter. Components receive only a detached `PublicRound` from `publicRound()`. They render `legalActions` and call adapter commands; the UI does not infer action legality or settlement.
- Use versioned deterministic laboratory randomness/scenario pools for reproducible sessions, with distinct seeds for familiarization, optional instruction and assessment. Evaluation scenarios do not repeat earlier study deals. The pool metadata records its construction/version and post-choice EV-gap/upcard strata without displaying the answer before composition.
- The selected default is the existing 3:2 experimental profile for P1C comparability. Let the participant choose the 1:1 sensitivity profile before a Night; label both profiles and all natural/payout descriptions EXPERIMENTAL. A profile cannot change during a round.
- Compose and play in a responsive single-table view. Offer a compact rules reference, clear Luz/Sombra labels, dealer upcard, phase status, legal action buttons, per-hand result and running Night score. Use sober Art Déco/noir colors and typography only; no premium assets, sound or cinematic motion.

## Information and round flow

1. A participant may choose unstructured free play or enter the study flow. The study flow explains its local observation and requests explicit consent before recording any event. Declining consent keeps play available without study logging.
2. Start a round from a versioned lab scenario. During construction, show the four player cards and dealer upcard. Offer only engine-produced distinct partitions; display which pair will become Luz and Sombra.
3. After composition, use the engine phase and public projection to show the natural peek/result or the current hand and its legal actions. Continue until dealer resolution completes the round. The engine remains the only authority for phase and score.
4. Reveal the hole card and dealer draws only when the engine's completed public projection includes them. Do not place seed, future draws, hole card, solver best-choice label, EV or regret in pre-reveal DOM, accessible text, study log, export preview or player-facing copy. The completed table shows every dealer card and a total consistent with those cards.
5. After a completed round, the study adapter may compute ex-ante EV and regret using the existing `EvSolver`, the initial public cards/upcard, chosen partition and selected experimental profile. It appends the record only when consent is active and the round is complete. A post-round recap may explain the outcome; solver optimality/gap is reserved for the observer export, not advice shown during the study.
6. Let the player continue, begin another Night, return to free play, or stop. A Night recap summarizes rounds and score without nudging longer play.

The browser client is an entirely local laboratory, not an anti-cheat boundary. Its deterministic generator and bundled code must not be described as secure or suitable for multiplayer. Hiding pre-reveal values is a presentation/logging contract verified by tests, not protection from a technically capable person inspecting their own browser.

## Human study protocol

Version `P2A-study-v1` has these ordered stages:

1. Short neutral rules briefing: four visible player cards are split into two hands; each is played against the shared dealer; explain Ace, hit, stand, double, bust and push from the experimental rulebook without recommending a composition.
2. A small familiarization block without tips, using a fixed seed pool. The study instructions do not give a strategy.
3. Optional short teaching card marked as an experimental rule of thumb, based on P1C's dealer-upcard pocket / 11–20 rule. The participant may skip it, dismiss it, or toggle all suggestions/explanations off. It is a candidate teaching aid, not a canonical game hint.
4. Assessment block without on-screen suggestions, drawing from a disjoint fixed pool selected for varied dealer upcards and composition EV gaps. Pools and selection version are recorded; outcomes/gaps are not shown before the composition decision. Assessment deals are not reused from familiarization or instruction.
5. Brief optional questions on rule comprehension, perceived meaningful choice, repetition/routine, confidence, decision time burden and voluntary desire to play more. Responses are anonymous by default, stored only in the current browser session and optional to skip.

This fixed sequence is a usability/learning probe, not randomized or blinded research. Familiarization, instruction, order, small convenience samples and repeated exposure confound any causal interpretation. The protocol will ask participants for consent and avoid collecting names, contact details or other identity data.

## Consent, local records and export

- Logging is opt-in for the study flow. Store records only in in-memory app state for the current page session; do not add localStorage, cookies, analytics, uploads or account/personalization state.
- Append a completed-round record only after settlement. It contains app/study/rule/randomness/scenario versions, the scenario seed/id (post-round only), initial deal/upcard, selected composition, action sequence with elapsed decision times, result/score, and post-round solver EV/regret. It has no name, email, IP or free-form identity field.
- Provide participant-initiated JSON and CSV downloads and a clear-all button. Confirm the clear action, then remove all session records and optional questionnaire answers. Closing/reloading the page naturally discards unsaved records.
- Explain that exports may contain detailed gameplay and are under the participant's control. No result is automatically sent to the project owner.

## Failure behavior and accessibility

Invalid or stale UI commands are rejected by the engine and surfaced as a plain-language recoverable message; they do not mutate the current round. Random-source failure prevents the next round/action, preserves already completed rounds and offers a safe return/restart. A score is shown only from completed engine state. Buttons have visible keyboard focus, descriptive labels and touch-sized targets; card ranks and outcome are conveyed in text as well as color. Free play offers a collapsed native details/summary quick reference for experimental rules without strategy tips; the study flow omits it to preserve the no-hint sequence. Responsive layout keeps both hands, dealer and current phase readable on a narrow screen.

## Verification

- Strict TypeScript, `pnpm install --frozen-lockfile`, `pnpm typecheck`, `pnpm test`, `pnpm build`.
- Vitest and React Testing Library for initial compose choices, each legal action and hand progression, dealer natural, double, bust, push, score, both payout profiles, new Night, invalid/RNG error paths, keyboard operations, consent, post-completion-only logging, JSON/CSV export and clearing.
- Pre-reveal tests inspect rendered text/accessible content and study state through compose/player/dealer phases; hole, seed, future draw and EV/regret are absent until completed and post-round logging.
- One Playwright local smoke journey if compatible with the repository's free GitHub Actions runner: start study, complete a round, verify reveal, and export/clear. If browser binary/runtime cannot be installed in CI, keep deterministic interaction tests in CI and document the reproducible local smoke command/limitation.
- No external deployment is needed. Document local `pnpm` commands and manual playtest setup.

## Scope, decision status and next gate

No engine rule, solver, or gameplay-rule changes. The only engine change permitted by the existing PR review is an additive terminal `PublicRound` projection of dealer draws, with regression proof that hidden cards remain absent from compose/player/dealer views. The free-play quick reference is plain rules instruction, without strategy guidance. Finite shoe, official mirror model, DF-ASYM, Cofre/Foco/Protocolos, networking, accounts, economy, ranking or high-polish audio/visual assets remain excluded. Update the decision register with evidence only: N-017/N-018/N-032 remain their current statuses; N-019/N-020 stay EXPERIMENTAL; N-036 and O-01/O-02/O-03 stay OPEN. Add `docs/PLAYTEST-P2A.md` before any human recruitment, including protocol, limitations and a blank post-study report template that separates observation from inference. P2A delivers that study instrument, not results. Any human collection or rule decision belongs to a later reviewed gate. N-042's separate Cofre + Foco direction does not authorize implementation here; preserve N-043/N-044/N-045 as CANDIDATE/DEFERRED/OPEN.
