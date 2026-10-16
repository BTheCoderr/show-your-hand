# SHOW YOUR HAND™ — Official 77-Card Standard Edition migration

**Game created by: Jamont Patrick**  
**Digital app developed by: Baheem Ferrell**  
**Authoritative reference:** October 2026 approved master project handoff, not the repo's historical 70-card rulebook.

## Scope of this branch

`src/official77/` is an **isolated, non-deployed foundation** for the locked 77-card product. It defines the exact card inventory and implements only scoring outcomes already approved by the owner. The 70-card browser and Supabase Edge engines are intentionally unchanged in this branch; the app is **not yet running a 77-card match**.

### Verified inventory specification

| Type | Count |
|---|---:|
| Green 1–5 (2 copies each) | 10 |
| Orange 1–5 (2 copies each) | 10 |
| Yellow 1–5 (2 copies each) | 10 |
| Red 1–5 (2 copies each) | 10 |
| Purple 1–5 (1 copy each) | 5 |
| Wild | 2 |
| Blank | 10 |
| Show Your Hand | 5 |
| Drop Color | 5 |
| Skip | 5 |
| Shuffle | 5 |
| **Total** | **77** |

Hardcore Mode excludes all 10 Blank cards and contains 67 cards.

### Scoring rules implemented in the independent foundation

- Five actual, unique Purple 1–5 cards score **5 points and immediately win the match**.
- Purple cards never count toward ordinary hands, and Wilds never replace Purple.
- Both Wild Cards may substitute independently for *regular* colors/numbers, including the same number, in approved 1-, 2-, 3- and 4-point combinations.
- Four points: regular 1–5 same color; three: five of one regular color; two: five of the same number.
- **CONFIRMED 2026-10-16:** A 1–5 sequence using **at least two regular colors** is worth **1 point**, even if any of the four regular colors repeats. There is no requirement for five distinct colors. Regular Wild substitutions are permitted. A complete 1–5 run of the same regular color scores 4 points instead. Purple is never permitted in this 1-point combination.
- **CONFIRMED 2026-10-16:** The game has two ways to win the match: a player or team reaches **5 accumulated points** through ordinary scoring hands, OR collects all five actual Purple 1–5 cards for an **instant match win**. Purple cards are exclusive to that instant-winning five-card set, cannot be mixed with regular cards or Wilds, and never score as part of an ordinary hand. There are exactly five physical Purple cards total, one per number.

### Final confirmed scoring restrictions and dual match-win conditions

**Purple cards are exclusively for the Purple 1–5 instant match victory.** There is exactly one actual Purple 1, Purple 2, Purple 3, Purple 4, and Purple 5 in the 77-card Standard Edition. No Purple card may count toward a normal scoring hand, and Wild Cards cannot replace any Purple card. **Regular cards (with permitted Wild substitution) can still win the match by earning 5 cumulative points.** A 1–5 mixed-regular-color run earns 1 point, repeated colors allowed, while a same-color 1–5 earns 4. Both win conditions and this 1-point clarification are approved; do not reopen or silently modify them.

### Release blockers — do not bypass

1. **Approved artwork:** current repo has Blue 1–5 images, but is missing approved Red 1–5, Yellow 1–5 and Wild art. It contains Purple 1–5 image paths; those assets still need comparison against approved originals. Do not redraw, infer or repurpose any art.
2. **Runtime integration:** migrate BOTH browser and server-authoritative Supabase engine, UI rules/tutorial, AI, fixtures and online state protocol together. Add state schema/save migration because stored sessions contain old Blue/Purple cards, then update hardcoded 70-card copy.
3. **Gameplay correctness:** bring Skip-only-Blank defense and full two-target Shuffle reversal semantics into the authoritative engine; existing beta engine does not implement the approved Shuffle reversal as written.
4. **Modes:** properly implement and test 2v2 team scoring with partners across the table; visual seats alone are not team mechanics.
5. **Physical QA:** inspect approved PDF/card front/back assets, 77-card proof, correct Standard Edition back (not Autism Awareness), die line, bleed and print alignment before manufacturing.
6. **Release QA:** run client/server parity tests and real device playthroughs, including the iPhone and iPad table layout; do not deploy 77 without assets and confirmed rules.

## Credits (retain everywhere)

SHOW YOUR HAND™ — Created by Jamont Patrick  
Digital App Developed by Baheem Ferrell
