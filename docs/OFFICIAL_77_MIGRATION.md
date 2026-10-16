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
- Both Wild Cards may substitute independently for *regular* colors/numbers, including the same number, in approved 2-, 3- and 4-point combinations.
- Four points: regular 1–5 same color; three: five of one regular color; two: five of the same number.
- Ordinary 1-point 1–5 different-color hands are **explicitly held pending clarification**. The original wording requires five different colors, but only four ordinary colors exist, and Purple is excluded. The foundation signals `pending-one-point-rule` rather than silently changing the rule.
- Accumulating five normal match points vs Purple as the sole match-win condition is **not decided**. Only the special Purple hand is labeled an instant win.

### Release blockers — do not bypass

1. **Owner decision:** what qualifies as a 1-point different-color 1–5 hand, with four ordinary colors?
2. **Owner decision:** do accumulated five points continue to win a match, or is Purple Victory the only match-winning condition?
3. **Approved artwork:** current repo has Blue 1–5 images, but is missing approved Red 1–5, Yellow 1–5 and Wild art. It contains Purple 1–5 image paths; those assets still need comparison against approved originals. Do not redraw, infer or repurpose any art.
4. **Runtime integration:** migrate BOTH browser and server-authoritative Supabase engine, UI rules/tutorial, AI, fixtures and online state protocol together. Add state schema/save migration because stored sessions contain old Blue/Purple cards, then update hardcoded 70-card copy.
5. **Gameplay correctness:** bring Skip-only-Blank defense and full two-target Shuffle reversal semantics into the authoritative engine; existing beta engine does not implement the approved Shuffle reversal as written.
6. **Modes:** properly implement and test 2v2 team scoring with partners across the table; visual seats alone are not team mechanics.
7. **Physical QA:** inspect approved PDF/card front/back assets, 77-card proof, correct Standard Edition back (not Autism Awareness), die line, bleed and print alignment before manufacturing.
8. **Release QA:** run client/server parity tests and real device playthroughs, including the iPhone and iPad table layout; do not deploy 77 without assets and confirmed rules.

## Credits (retain everywhere)

SHOW YOUR HAND™ — Created by Jamont Patrick  
Digital App Developed by Baheem Ferrell
