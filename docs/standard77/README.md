# Approved SHOW YOUR HAND Standard Edition — staged implementation

**Status:** Rules module and unit tests only, not yet connected to the live game. This branch does not release new gameplay or change production.

## Locked 77-card physical inventory

| Card class | Quantity |
| --- | ---: |
| Red, Green, Orange, Yellow numbered 1–5, two copies each | 40 |
| Purple numbered 1–5, exactly one each | 5 |
| Wild, two physical cards | 2 |
| Blank | 10 |
| Show Your Hand | 5 |
| Drop Color | 5 |
| Skip | 5 |
| Shuffle | 5 |
| **Total** | **77** |

Hardcore Mode removes the ten Blanks, leaving 67.

## Score rules (highest qualifying score only)

- Mixed regular colors numbered 1–5 (two or more regular colors; repeats permitted) = 1 point.
- Five of a regular number = 2 points.
- Five of a regular color = 3 points.
- A same-regular-color 1–5 = 4 points.
- The five distinct Purple 1–5 cards are exclusive and give a **five-point instant match win**.
- Wilds can act as any numbered **regular** card, including the same role twice. Wilds cannot represent Purple. Purple may not mix with Wilds or regular cards to score.
- Ordinary match victory occurs when a player reaches 5 accumulated points. Purple Victory ends the match immediately.
- Maximum 6 players.

## Remaining integration gates

1. Source exact approved graffiti/grunge art for four regular colors (Red/Green/Orange/Yellow), Purple, Wild, and the replacement special faces. Current public/cards in main are predominantly Orange/Blue/Green/Purple and do not meet the locked 77-card art spec. Do not improvise production assets.
2. Keep existing 70-card online matches and persisted games versioned; migrate or explicitly reset with user notice. Do not coerce 70-card state into 77.
3. Wire this tested deck/scoring module into the browser engine, AI, tutorials, rules and all player-visible screens.
4. Port behavior to the server-authoritative Supabase Edge engine and expand source-sync verification before enabling 77-card rooms; avoid introducing hidden-information leaks.
5. Full six-player, Wild scoring, Skip/Blank, Shuffle reversal, and round/match regression tests. Existing 70-card gameplay tests do not prove 77-card correctness.
6. Recheck official creator credit: game created by Jamont Patrick, digital app developed by Baheem Ferrell.
7. Founder reviews physical artwork and game parity, then authorizes release. No EAS builds, Supabase migrations or production game-rule changes occur in this foundation PR.

The approved rulebook and print-ready PDFs are referenced in prior product handoffs, but actual approved production art files have not been confirmed accessible here.
