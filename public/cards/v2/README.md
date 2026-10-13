# Show Your Hand: new graffiti artwork (October 2026)

The 34 JPEGs were uploaded on the `feature/mobile-expo-v0` branch with temporary `att.*.jpeg` names. They are now staged here under descriptive filenames. The anonymous upload copies were removed from the current tree; Git history retains the original upload.

## Live artwork for compatible cards

The web renderer (`src/ui/CardView.tsx`) and the Expo renderer (`mobile/src/cardAssets.ts`) display the new art for:

- Numbered 1–5 in orange, green, and purple (15 images)
- Card back, Blank, Show Your Hand, Drop Color, and the rule-compatible Skip (5 images)

The game logic and saved/online card data still use their original `.png` keys. Both clients translate those keys to this new art only when rendering.

## Unused/retained artwork

- Blue 1–5 and Shuffle retain the original PNGs because the upload contains **no blue numbered cards and no Shuffle illustration**.
- Red 1–5 and yellow 1–5 are retained here for a future color decision, without pretending they are blue.
- `extras/wild.jpeg` is not in the established 70-card deck, and `extras/brand-poster.jpeg` is promotional.
- `alternates/skip-reversal-incompatible.jpeg` advertises a Skip reversal inconsistent with the game rules and must not be activated. `alternates/green-2-alt.jpeg` is an alternate design.

To switch the game colors, plan a coordinated engine, online-server, persistence, and UI change; do not silently relabel cards. The original 26 PNG assets remain in `public/cards/` as backups.

No app-store build or production deployment is performed by this artwork update.
