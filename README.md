# SHOW YOUR HAND

**DROP. PICK UP. ATTACK. DEFEND. BUT NEVER SHOW YOUR HAND.**

SHOW YOUR HAND is an original competitive card game being developed as both a physical tabletop game and a polished browser experience.

**Live demo:** https://show-your-hand.netlify.app

## What this build is

The current web build is a playable solo prototype: **1 human vs. 1–5 computer opponents** with the full 70-card deck, scoring system, attack/defense interactions, round flow, and persistent local game state.

The goal of the digital version is not just to reproduce the rules. It is built to feel like a real card table: visible turn flow, touch-first interactions, readable opponent actions, and enough feedback that players can understand what happened without digging through a log.

## Current features

- Full **70-card deck**
  - 40 numbered cards
  - 10 Blank
  - 5 Show Your Hand
  - 5 Drop Color
  - 5 Skip
  - 5 Shuffle
- 1–5 CPU opponents
- First-to-5 match scoring
- Full attack and defense resolution
- Show Your Hand reveal flow
- Drop Color selection and dropped-card claiming
- Skip and counter behavior
- One- or two-player Shuffle targeting
- Discard-pile pickup for the next eligible player
- Hand refill and trimming back to five cards
- Scoring-hand declaration flow
- Swipe-up card play and swipe-down discard pickup
- Active-turn glow and turn timer
- First-visit onboarding that offers the interactive 2-minute How to Play tutorial
- Beginner Mode with no turn clock, slower CPU pacing, and contextual coaching
- Interactive 2-minute How to Play tutorial with practice steps
- **Animated opening-deck shuffle before the first deal**
- **Paced CPU turns so opponent moves are visible instead of happening instantly**
- **On-screen move notices showing what opponents just did**
- **Center-table attack-card spotlight before special attacks resolve**
- Action history
- Rules panel
- Local match persistence
- Test mode for validating card conservation and game state
- Reduced-motion support

## Scoring

| Hand | Points |
| --- | ---: |
| Mixed numbered 1–5 | 1 |
| Five cards with the same number | 2 |
| Five cards with the same color | 3 |
| Same-color 1–5 | 4 |

First player to **5 points** wins the match.

## Digital playtest rules

The browser version uses explicit rule-resolution defaults so every interaction is deterministic and testable.

- Show Your Hand reveals the target's hand until the current turn ends.
- Blank cancels supported attacks but does not reverse them.
- Matching attack cards can counter supported attacks.
- Targeted defenders resolve clockwise from the attacker.
- Two-target Shuffle collects all responses before any affected hand changes.
- Spent attack and defense cards are excluded from hands returned by Shuffle.
- Effects finish and hands refill to five before declarations are checked.
- Declaration priority starts with the active player, then continues clockwise.
- CPU players use the same declaration windows as the human player.
- The discard pile is recycled when the draw pile is exhausted so all 70 cards remain in play.

## AI behavior

Computer players operate from a restricted public view of the match. They can use their own hand, scores, the discard pile, and hands that have been legally revealed, but they do not get access to hidden opponent hands or the future draw order.

Their turns are intentionally paced in the UI so players can follow each action instead of seeing multiple CPU decisions collapse into one instant state change.

## Tech stack

- React
- TypeScript
- Vite
- Vitest
- CSS animations and touch/pointer gestures
- Browser local storage
- Netlify

## Quality checks

The game engine is covered by automated tests for deck construction, scoring, special-card resolution, turn flow, card conservation, and full playthrough behavior.

Run the project locally:

```bash
npm install
npm test
npm run dev
```

Production build:

```bash
npm run build
```

## Deployment

Netlify builds the app with:

- Build command: `npm run build`
- Publish directory: `dist`

## Project direction

The browser prototype is being expanded toward a more complete multiplayer card-game experience while keeping the tabletop rules as the source of truth.

Current focus areas include animation quality, clearer opponent feedback, tutorial/onboarding quality, mobile table layout, multiplayer-ready game flow, and playtesting.

---

Built as an original game design and software engineering project.
