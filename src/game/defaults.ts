export const RULES_TEXT = {
  established: [
    '70-card deck. Each player keeps five cards. After a play or discard, everyone draws back to five.',
    '40 numbered cards: orange, blue, green, purple × 1–5 × two copies. 10 Blank. 5 Show Your Hand. 5 Drop Color. 5 Skip. 5 Shuffle.',
    'Only five numbered cards can score. Specials never count. Score only the highest qualifying combination.',
    '1–5 mixed colors = 1. Five of one number = 2. Five of one color = 3. 1–5 same color = 4.',
    'First player to reach or exceed 5 points wins the match. Collect all 70 cards and redeal between rounds.',
    'Blank blocks an incoming special. Show Your Hand reveals a target. Drop Color drops a named color. Skip skips the next opponent. Shuffle returns one or two hands to the deck.',
  ],
  provisional: [
    'Show Your Hand reveals that hand to everyone until the current turn ends.',
    'Countering Skip cancels the skip. The defender takes their normal next turn — they do not steal the turn immediately.',
    'Targeted defenders respond clockwise from the attacker.',
    'Two-target Shuffle: collect every response before any hand changes. Blank protects only its user. A counter Shuffle protects its user and adds the attacker to the affected players. Each affected player is shuffled once, even if both targets counter. An unprotected original target stays affected. No further counter chain.',
    'Played attack and defense cards are spent before Shuffle returns hands, so those spent cards stay in the discard pile.',
    'Finish every effect and refill all hands to five before checking declarations.',
    'If several players qualify in the same window, declaration priority is the active player, then clockwise.',
    'Computer players get the same declaration windows as you.',
    'Play-short is off. When the draw pile is empty, eligible discards are shuffled back. All 70 cards stay in play.',
  ],
}
