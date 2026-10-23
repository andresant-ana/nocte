# Art direction, UX and audiovisual intent

**Art Déco / noir identity is RATIFIED.** Specific palette/fonts/logos/production assets are merely inspiration until visual review. **Core gameplay validation comes first.**

## Fantasy and atmosphere

A fictional sophisticated nocturnal card club above a dark city: geometric Art Déco architecture, black marble, brass/bronze, emerald felt, restrained wine accents, warmly lit typography, jazz-noir ambience. Menus should feel like distinct rooms or destinations, not a generic website dashboard.

Name **NOCTE** and subtitle/taglines ("Twenty-one is only the beginning", "The House of Twenty-One") are **provisional copy**, not final brand canon.

### Palette candidate (not finalized)

- Noir: `#0B0D12`; emerald `#153B37`; bronze `#C9A86B`; ivory `#EEE3D0`; wine `#702932`.
- Typography: modern, geometric Art Déco headings plus highly readable UI numbers; no actual font files canonized.
- Cards: unusually legible pips, totals and active-state highlights, with sober texture and bevel; clarity outranks ornament.

## Experience contract

- Game-like nearly full-screen canvas that responds to viewport, with optional browser fullscreen after user gesture.
- Browser plays without plugins; desktop and phone layouts; touch, mouse and keyboard operation.
- Player understands current step, legal actions, timer, both hand totals, dealer upcard and latest settlement **without** needing animations.
- Animation communicates consequence (cards recombine between hands, score shifts, dealer reveal), not only decoration.
- Color never carries the only game information; readable contrast, accessible focus order, reduced motion, volume and mute controls.
- Audio opt-in/controls: tactile card/chip cues and optional jazz-noir reactive layers. Verify asset licensing before use.
- Room socials: visible participants, expressive but unobtrusive reactions, recap after each Noite, *Mão da Noite* / *Estrategista* highlights (candidate).
- Optional decorative customization and cosmetic unlocks should never affect competitive odds.

## Technology candidate

React/Vite UI with CSS+SVG; Motion / Web Animations API for transitions, Howler.js/Web Audio API for layered sound; PixiJS is a **later optional** rendering subsystem, not initial dependency. No Unity/Godot requirement and no visual engine entanglement with pure rules logic.

## Phasing

1. Paper-like minimal interface to test composition and choices.
2. Functional social room HUD and accessible menus.
3. Designer-quality art/UI animations, audio systems, accessibility polish, identity.
4. Optional characters, ambience, more sophisticated visual effects and seasonal scenes.

## Avoid compulsion patterns

No pressured countdowns for daily claims, sold mystery bonuses, artificial near-misses, notifications to induce repeated betting or purchases to recover from losses. Reward meaningful strategic mastery and social fun; ability to leave/rejoin is normal.

## P5 gameplay-first interface — Issue #37 (2026-10-23)

The Art Déco/noir direction in N-004 remains the long-term creative goal. The founder rejected the audiovisual presentation introduced in the initial PR #36 diff and deferred sound, illustrated portraits, table ornament and production animation until the gameplay layout is validated and a new authorization is recorded. The current P5 slice is a functional laboratory table: compact viewport HUD, spatial dealer/Cofre/hands, phase-specific controls, and accessible secondary dialogs for extended rules and bank detail. Ordinary supported viewports fit without document scrolling; unusually small or zoomed contexts retain an accessible scrolling fallback.

P5's simple card identity adapter remains experimental and display-only: 10/J/Q/K map to the existing ten-value rank and suits are visible glyphs. Mathematical rank RNG and scoring are unchanged; no finite physical shoe or suit-dependent rule is implied. The existing public projection still controls hidden dealer information. P2A remains on its original study flow and protocol. No human usability, visual quality, enjoyment or accessibility outcome is claimed by automated checks.

The corrected PR #36 provides deterministic screenshots for compose, Foco, player actions, dealer and settlement phases at desktop 1366 × 768 and mobile 390 × 844. Geometry and clickability are checked at 1280 × 720, 1366 × 768, 1920 × 1080, 390 × 844 and 360 × 640. These are technical viewport checks, not human validation.

| Phase | 1280 × 720 | 1366 × 768 | 1920 × 1080 | Mobile 390 × 844 |
| --- | --- | --- | --- | --- |
| Composição | [PNG](evidence/p5-ux-fit/compose-1280x720.png) | [PNG](evidence/p5-ux-fit/compose-1366x768.png) | [PNG](evidence/p5-ux-fit/compose-1920x1080.png) | [PNG](evidence/p5-ux-fit/compose-390x844.png) |
| Foco | [PNG](evidence/p5-ux-fit/focus-1280x720.png) | [PNG](evidence/p5-ux-fit/focus-1366x768.png) | [PNG](evidence/p5-ux-fit/focus-1920x1080.png) | [PNG](evidence/p5-ux-fit/focus-390x844.png) |
| Ações do jogador | [PNG](evidence/p5-ux-fit/player-1280x720.png) | [PNG](evidence/p5-ux-fit/player-1366x768.png) | [PNG](evidence/p5-ux-fit/player-1920x1080.png) | [PNG](evidence/p5-ux-fit/player-390x844.png) |
| Dealer | [PNG](evidence/p5-ux-fit/dealer-1280x720.png) | [PNG](evidence/p5-ux-fit/dealer-1366x768.png) | [PNG](evidence/p5-ux-fit/dealer-1920x1080.png) | [PNG](evidence/p5-ux-fit/dealer-390x844.png) |
| Liquidação | [PNG](evidence/p5-ux-fit/result-1280x720.png) | [PNG](evidence/p5-ux-fit/result-1366x768.png) | [PNG](evidence/p5-ux-fit/result-1920x1080.png) | [PNG](evidence/p5-ux-fit/result-390x844.png) |
