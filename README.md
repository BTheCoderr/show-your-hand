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
- Private online 1v1 rooms with six-character room codes
- Shareable `/join/CODE` invite links and QR codes
- READY state before the host can start
- Reconnectable room sessions with live connection presence
- One-tap rematches that keep the same table and room code
- Server-authoritative online moves through a Supabase Edge Function
- Per-player hidden-hand projection so browsers do not receive an opponent's unrevealed cards or draw order
- First-to-5 match scoring
- Full attack and defense resolution
- Show Your Hand reveal flow
- Drop Color selection and dropped-card claiming
- Skip and counter behavior
- One- or two-player Shuffle targeting
- Discard-pile pickup for the next eligible player
- Hand refill and trimming back to five cards
- Scoring-hand declaration flow
- Winning-hand presentation that reveals the scoring five cards, explains the combination, and awards the points visually
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

The 1v1 beta uses a dedicated Supabase project for room coordination and an Edge Function for authoritative game actions.

- Hosts create a private six-character room code plus a shareable join link and QR code.
- Both players explicitly ready up before the host can start.
- The server creates the shuffled match state; the host no longer supplies the deck.
- During play, browsers send **actions**, not replacement game states.
- The Edge Function verifies the room token, active player, state version, and game rule before committing the next state.
- State versions reject stale writes when two devices race.
- Each room read is projected for the requesting player: their own hand remains visible, legally revealed hands remain visible, opponent hidden hands are replaced with placeholders, the draw order is replaced with placeholders, and the RNG state is removed.
- Direct browser table access remains revoked under RLS. Public access is limited to capability-token room RPCs for create/join/read/ready/rematch/leave, while gameplay mutation happens server-side.
- Each device keeps its room token locally so refresh/reconnect returns it to the same seat.
- Completed games can rematch in the same room; both players opting in resets the table and the host automatically starts the new deal.

The current beta still uses short-interval room polling rather than a persistent realtime channel, but hidden cards, draw order, and rule execution no longer need to be trusted to the opponent's browser.

## AI behavior

Computer players operate from a restricted public view of the match. They can use their own hand, scores, the discard pile, and hands that have been legally revealed, but they do not get access to hidden opponent hands or the future draw order.

Their turns are intentionally paced in the UI so players can follow each action instead of seeing multiple CPU decisions collapse into one instant state change.

## Online multiplayer beta

The online path is intentionally separate from solo play. A host creates a room, shares the code/link/QR, both players ready up, and the host starts the match. The same room supports reconnects and rematches without exchanging a new code.

The authoritative game reducer is deployed as `syh-game-action` in Supabase Edge Functions. Online clients send an action and their room capability token; the server applies the same game rules used by solo play, commits the canonical state with optimistic versioning, and returns only the caller's projected view.

This is substantially stronger than the original synchronized-state beta. It is still a beta product: room tokens are capability credentials rather than full user accounts, and polling is used for synchronization, so public matchmaking, rankings, moderation, and abuse controls remain future work.

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
- Supabase Postgres + capability-token room RPCs
- Supabase Edge Functions for authoritative online gameplay
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

Current focus areas include two-device 1v1 playtesting, realtime transport, multiplayer abuse/rate controls, animation quality, clearer opponent feedback, tutorial/onboarding quality, and mobile table layout.

---

Built as an original game design and software engineering project.
