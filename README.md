# SHOW YOUR HAND

Playable solo browser match: one human against 1–3 computer opponents. No account.

## Playtest defaults in this build

These are documented, configurable defaults used to make the first digital version playable. Established scoring, deck composition, and special-card identities stay intact.

- Show Your Hand reveals to everyone until the current turn ends.
- Countering Skip cancels the skip. The defender takes their normal next turn.
- Targeted defenders resolve clockwise from the attacker.
- Two-target Shuffle collects every response before any hand changes. Blank protects only its user. A counter Shuffle protects its user and adds the attacker. Each affected player is shuffled once. An unprotected original target stays affected. No further counter chain.
- Spent attack and defense cards are excluded from hands returned by Shuffle.
- All effects finish and hands refill to five before declarations are checked.
- Declaration priority: active player, then clockwise.
- Computer players share the same declaration windows.
- Play-short is off. The discard pile is recycled when the draw pile is empty. All 70 unique cards stay in play.

## Local

```bash
npm install
npm test
npm run dev
```

## Deploy

This folder is the app root. Netlify should build with `npm run build` and publish `dist`.
