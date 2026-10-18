# NOCTE-P2A — solo prototype and human-validation protocol

**Protocol:** `P2A-study-v1`
**Status:** prepared for prospective, consent-based validation; no human sessions have been conducted or reported in this delivery.
**Rules status:** Duas Faces `DF-SYM-0.1` and both natural-payout profiles remain **EXPERIMENTAL**. The optional teaching suggestion is also experimental. This document does not ratify rules, balance, or product direction.

## Purpose and boundaries

P2A is a local solo prototype and a structured way to observe initial comprehension, the perceived meaning of composition decisions, confidence, repetition, time burden, and voluntary interest in another session. It can reveal usability problems and generate qualitative hypotheses. It cannot establish population-level preferences, retention, competitive balance, causal effects, or commercial viability. The fixed scenarios are intentionally stratified, not a representative sample of ordinary play.

The prototype reuses the existing Duas Faces engine and solver. It does not add a new gameplay rule. The optional lesson card presents a heuristic previously studied in simulation as an experimental shortcut, labels it as non-canonical, and can be disabled. It is not presented as the correct strategy.

## Local setup

Use Node.js 22+ and pnpm 12.9.1. From the repository root:

```sh
pnpm install
pnpm dev
```

Open the local URL shown by Vite. A facilitator should first read this protocol, use the same browser session throughout a participant's run, and avoid recording names, contact details, screen recordings, or other identifying information in the prototype. The app is local-only: it has no accounts, network submission, analytics, cookies, or persistent study storage. Closing/reloading the page loses the in-memory study data unless it was explicitly exported.

## Consent script

Read this before starting the study:

> Você está sendo convidado(a) a experimentar um protótipo local de NOCTE. Participar é voluntário. Você pode parar, pular perguntas ou retirar o consentimento a qualquer momento. Se consentir, o protótipo manterá temporariamente neste navegador dados limitados às rodadas concluídas, decisões, tempos relativos, resultados e respostas opcionais por alternativas fechadas. Ele não pede nome, não envia dados pela rede e não grava no armazenamento persistente do navegador. Você poderá exportar os dados manualmente ou apagá-los; ao fechar/recarregar a página, dados não exportados serão perdidos. As regras e a dica opcional são experimentais. Esta sessão avalia um protótipo e não é uma avaliação de você. Você concorda em iniciar?

Start only after the participant chooses **Concordo e iniciar estudo**. If they decline, **Declinar e jogar livre** returns to free play; no study record should be produced. Do not pressure the participant to consent, finish, answer questions, or export data. Consent withdrawal stops further logging and clears study answers; the participant can still clear all existing in-memory records explicitly.

## Session protocol

1. **Briefing and consent.** Explain the task without recommending a strategy. The 3:2 natural payout is the default experimental profile. If the study compares profiles, assign the profile before the session and record that assignment outside the app without identifying the participant; do not switch it mid-study.
2. **Familiarization — 3 rounds.** Let the participant explore the composition and play actions without the optional strategy card. Do not coach or reveal the solver's expected values.
3. **Optional teaching stage.** The participant may inspect the clearly labeled experimental heuristic and play one example, or skip this stage. Do not describe the heuristic as canonical or optimal.
4. **Assessment — 9 rounds.** These use distinct, fixed scenarios with no strategy suggestions. Keep the assessment free of coaching. The pools cover dealer-upcard bands and different model-EV decision-gap classes; this is deliberate stratification, not random population sampling.
5. **Optional questionnaire.** Offer the bounded-choice questions about rule understanding, perceived choice significance, repetition, confidence, time burden, and voluntary replay interest. Every answer may be skipped; there is no free-text response field.
6. **Close.** Tell the participant the study is over. Only now may the facilitator disclose that the pools are fixed/stratified and that solver EV/regret are calculated after settlement. Avoid framing the model score as a grade. Export only if the participant explicitly requests it. Otherwise clear all records and answers before ending the session.

### Facilitator checklist

- [ ] Run the local app; confirm the consent screen and profile label.
- [ ] Read the consent script verbatim and wait for a voluntary choice.
- [ ] Give the neutral rules briefing; avoid strategy coaching.
- [ ] Observe actions and spontaneous comments without adding identity data.
- [ ] Keep the teaching suggestion optional and clearly experimental.
- [ ] Do not disclose scenario labels, fixed seeds, or EV/regret before the relevant round and session are complete.
- [ ] Offer the optional questionnaire and accept skips.
- [ ] Ask whether the participant wants an export; do not export on their behalf without an explicit request.
- [ ] Clear records and answers when requested; confirm the displayed record count is zero.
- [ ] Record observations separately from interpretations and limitations in the blank report below.

## Data handling and scenario disclosure

The app stores a record only after a round settles and only while consent is active. Study records and answers live in component memory for the current page session. They include protocol/game/rule/stream/pool/solver versions; a scenario seed/index; initial cards and dealer upcard; composition, actions and relative decision durations; settled hands, outcome and score; and model EV/regret computed after the round. They contain no participant name, email, device identifier, free-text answer, or wall-clock timestamp. There is no browser storage or network submission.

Scenario seed/index and solver EV/regret are available in explicit JSON/CSV export, and remain hidden from the game view before the round is complete. Dealer hole and dealer-drawn cards are absent from compose/player/dealer views; after completion the public projection and table reveal the full dealer sequence, and the displayed total is computed from those cards. The study uses the committed versioned scenario pools: 3 familiarization rounds, 1 optional teaching example, and 9 assessment rounds. Pool construction is deterministic and stratified by dealer-upcard band and best-versus-second-best modeled EV gap. These choices make runs reproducible and support controlled comparisons; they do not represent the natural frequency of deals. The app does not show pool labels to the participant during play.

Export is an explicit browser download (`nocte-p2a-study.json` or `.csv`). The participant/facilitator is responsible for any exported copy; the app does not control where the browser saves it. Withdrawing consent stops future logging. **Apagar todos os dados** clears current records and questionnaire answers; it cannot delete a file previously downloaded. Clearing data is irreversible in the current session.

## Bounded questionnaire

The prototype offers only these optional fixed-choice topics:

| Topic | Choices (shortened) |
| --- | --- |
| Rule understanding | understood / mostly understood / still unsure |
| Meaningful composition choice | 1–5 |
| Repetition | not repetitive / somewhat / very |
| Confidence | 1–5 |
| Time burden | comfortable / somewhat long / too long |
| Voluntary replay interest | yes / maybe / no |

All questions can be skipped. Treat responses as exploratory descriptions of this small convenience sample. Do not aggregate or publish them as representative metrics.

## Blank session report

Use one report per session or clearly state the number of sessions. Keep direct observations separate from inference.

```text
Protocol version:
Date (facilitator record; not collected by the app):
Number of consenting participants:
Rule profile(s) assigned:
Sessions completed / stopped early:

OBSERVATIONS (observable actions or verbatim non-identifying comments):
-

QUESTIONNAIRE COUNTS (include denominator; skipped answers are missing, not negative):
- Understanding:
- Meaningful choice:
- Repetition:
- Confidence:
- Time burden:
- Voluntary replay interest:

INFERENCE (interpretations; identify the observation supporting each one):
-

LIMITATIONS / DEVIATIONS (facilitator help, interruptions, device/browser issues, selection bias):
-

RECOMMENDATION (next test or design question; do not silently change rules):
-

DATA DISPOSITION (export explicitly requested? where did the facilitator place it? in-app records cleared?):
```

## Interpretation and decision boundary

This protocol is a starting instrument for a small, formative study. Report sample counts, missing responses, deviations, and counterexamples. The fixed pool and optional teaching stage create selection and order effects; the study has no control arm, representative sample, preregistered pass threshold, or evidence of long-term retention. Solver EV/regret describe the existing model assumptions, not an objectively correct human choice. Any proposed rule, teaching, or product change requires a separately reviewed decision-register amendment and suitable evidence. No human validation result, G-FUN/G-SKILL gate, final balance conclusion, or production-readiness claim is made by P2A implementation alone.
