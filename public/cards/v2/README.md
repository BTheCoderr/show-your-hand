# New card artwork - staging area

These 34 images were uploaded on 2026-10-13. Each file in this folder is a clearly named alias for the uploaded image in `public/cards/att.*.jpeg`. None of the old 26 game images were deleted or overwritten.

**Not live yet.** The playable deck remains 70 cards (four colors: orange, blue, green, purple), while these 25 numbered images use five colors (orange, green, red, yellow, purple), with no blue. Choosing a mapping requires an explicit decision to avoid changing rules and breaking online compatibility.

- `skip.jpeg` is the compatible Skip illustration: only Blank cancels Skip.
- `alternates/skip-reversal-incompatible.jpeg` says another Skip reverses it, contradicting the rules. Never activate as-is.
- `alternates/green-2-alt.jpeg` duplicates the green-2 design.
- `extras/wild.jpeg` represents a Wild card, not part of the current deck.
- `extras/brand-poster.jpeg` is promotional art.
- No Shuffle illustration was included in the 34-image upload.
- The user expected 37 images. Three may still be pending.

When final artwork and color choices are confirmed, update both the web art paths in `src/game/deck.ts` and native mappings in `mobile/src/cardAssets.ts`, plus web/mobile card-back references. Preserve the original 70-card deck until the user explicitly approves a rules change.
