# SHOW YOUR HAND

**DROP. PICK UP. ATTACK. DEFEND. BUT NEVER SHOW YOUR HAND.**

SHOW YOUR HAND is an original competitive card game being developed as both a physical tabletop game and a polished browser experience.

**Live demo:** https://show-your-hand.netlify.app

## What this build is

The current web build supports **solo play against 1–5 computer opponents** plus a **private online 1v1 beta** backed by Supabase. It includes the full 70-card deck, scoring system, attack/defense interactions, round flow, local persistence, and room-based two-device state sync.

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
- Private online 1v1 rooms with six-character invite codes
- Two-device turn synchronization through Supabase RPCs
- Reconnectable online room sessions stored locally on each device
- Supabase-backed **online 1v1 beta** with private room codes and reconnectable room sessions
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
- Online room state versioning to reject stale simultaneous updates
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

## Online multiplayer architecture

The 1v1 beta uses a dedicated Supabase project for room and match coordination.

- Hosts create a private six-character room code.
- A second device joins that room as Player 2.
- Only the active player's room token can submit the next synchronized game state.
- State versions reject stale writes when two devices race.
- Room and player tables have RLS enabled with direct browser table access revoked.
- The browser only calls narrow `SECURITY DEFINER` RPC functions for create, join, read, start, submit, and leave operations.
- The UI polls the room during the beta so both phones stay synchronized without requiring accounts.

This is currently a trusted-playtest multiplayer path. The synchronized game state still contains hidden-card information, so fully server-authoritative move validation and hidden-hand projection remain future hardening work before competitive public multiplayer.

## AI behavior

Computer players operate from a restricted public view of the match. They can use their own hand, scores, the discard pile, and hands that have been legally revealed, but they do not get access to hidden opponent hands or the future draw order.

Their turns are intentionally paced in the UI so players can follow each action instead of seeing multiple CPU decisions collapse into one instant state change.

## Online multiplayer beta

The online path is intentionally separate from solo play. A host creates a six-character room code, a second player joins from another device, and the host starts a two-player match. Each browser keeps only its room token locally and polls the shared room for new state, so a refresh can reconnect to an active table.

Supabase tables have RLS enabled and direct `anon` / `authenticated` table access is revoked. The browser can only use the narrowly scoped room RPCs for create, join, read, start, submit, and leave operations. State updates use a monotonically increasing version so stale clients cannot overwrite a newer move.

This is still a **beta synchronization model** rather than a hardened competitive anti-cheat architecture: the shared game state currently reaches both room members so each client can run the existing TypeScript game engine. Moving rule execution and hidden-hand filtering fully server-side is the next security step before ranked or prize-based online play.

Local development uses:

```bash
cp .env.example .env.local
```

Then set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`. Production values are configured in Netlify.

## Tech stack

- React
- TypeScript
- Vite
- Vitest
- Supabase Postgres + RPC room backend
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

Current focus areas include online 1v1 playtesting, server-authoritative multiplayer hardening, animation quality, clearer opponent feedback, tutorial/onboarding quality, and mobile table layout.

---

Built as an original game design and software engineering project.
