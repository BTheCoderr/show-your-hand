# LOCKED DESIGN: Show Your Hand casino poker/blackjack table

**Authoritative gameplay visual brief (October 14, 2026).**

The request is **a recognizable casino-style card table**, NOT merely a green rectangular layout, a tall capsule, or placing opponents at mathematically spaced coordinates. The approved references are the actual presentation of a poker table and a blackjack table (furniture, felt, padded rail, cards at seats, players around the perimeter). The actual game is still **SHOW YOUR HAND** and does **not** adopt poker or blackjack rules, dealers, betting chips, or intellectual property.

## Hard acceptance criteria

1. A real-looking tabletop dominates the gameplay screen: one **wide oval or foreshortened curved table**, rich emerald/forest green felt with subtle depth/shading, a thick dark padded rail and a visible fine inner trim/playing boundary. **Do not stretch the felt into a full-height vertical pill.** The old implementation's `flex: 1; minHeight: 520` felt with width-based `borderRadius` is not sufficient.
2. Seat 0 (YOU) is at the bottom edge, with your five playable, readable cards fanned toward the viewer, visibly attached to your position around the table. Keep cards/gestures interactive and large enough to play.
3. Opponents sit **around the perimeter**, facing toward the playing area, not randomly positioned inside it or collected in an opponent dashboard. Each opponent's hand is directly in front of their seat, with a compact name/score and an orange turn ring. Seats must remain visible and tappable for attack targeting.
4. Allow exactly **2–6 occupied seats total**, counting YOU. Offline Solo is YOU + 1–5 CPUs. Online private table is 2–6 humans. Any future mixed human/CPU table must also respect six total and must not be faked visually. Seat count adapts to 2/3/4/5/6 players, with clear clockwise order. No seventh seat, no 1v6.
5. Keep DRAW and DISCARD physically on the green felt's central playing area; status/turn cues integrated into the tabletop. A selected action or special card is shown on the table, not in a separate full-page section.
6. Maintain clear, readable card art. Back sides should look consistent at opponent positions. No hands should be offscreen, under the rail, or hidden behind gameplay controls. All five cards in the local hand must remain tappable/swipeable.
7. **Portrait iPhone:** preserve the visual *shape of a horizontal/foreshortened casino tabletop* within phone width. Use a carefully composed three-quarter/top-down view and position player hand near bottom; **not a narrow vertical oval made by rounding a tall rectangle**. If optional landscape gameplay is proposed, do not force a global orientation change without approval.
8. **iPad and landscape:** scale table proportionately. Keep the tabletop oval/rail shape, card hit targets, and seats; do not simply enlarge a tall phone dashboard.
9. Show a win overlay with the five actual cards, correct combination, score, and next action. Preserve standard/showdown gameplay, special cards, animations, existing audio/haptics, turn validation, reconnect, reporting/blocking/unblocking, and the original palette and art.
10. **Same visual language for every mode:** native Solo, native Online, web Solo, web Online. They may use different layout implementations but must portray the same actual casino-style table.

## Completion gate

- Create and inspect **actual native iPhone portrait and iPad screenshots**, not only browser preview or TypeScript results, for 2/3/4/5/6 total seats and at least one special-card targeting interaction.
- Confirm room state and CPU counts are real, not placeholder seats.
- Run engine and table-position tests, native TypeScript, and iOS/Android bundle checks.
- **Do not claim design approval** based on six-seat math alone. Show the user the visual result and get approval BEFORE an EAS build, spending build credits, or submitting to TestFlight/App Review.
- The live six-seat online rollout also requires the six-player database migration, matching game Edge Function, and updated public website; don't represent unreleased backend work as live.

## Current implementation gap

As of the baseline at commit `281d4bda9`, `mobile/src/GameTable.tsx` renders `styles.felt` as a flex-filling tall rectangle with width-derived border radius and flat green fill, whereas `src/styles.css` uses an independently sized pseudo-oval. Changing `src/ui/tableSeats.ts` alone cannot satisfy the requested poker/blackjack table presentation. This requires a deliberate responsive visual composition and device previews.


## Implementation candidate (October 14, 2026)

The code-side visual repair is developed on `fix/casino-poker-table-ui-20261014` and is intended to merge into `feature/mobile-expo-v0` after automated checks.

- `mobile/src/GameTable.tsx`: fixed-width, wide casino table instead of a height-filling vertical felt rectangle; upholstered rail, metallic trim, inset green playing area and one consistent seat map for Solo/Online. Player hand overlaps front of table at its own dock and the action panel sits below it, no longer over the center pile.
- `src/ui/casinoTableGeometry.ts`: aspect-ratio lock at phone (1.28:1) and tablet (1.52:1) widths, shared calculation imported by mobile component and covered with tests at widths 320–1366.
- `src/styles.css`: browser tabletop returns to a horizontal upholstered oval at phone and tablet widths, no longer a vertical mobile `flex: 1` pill. Web player hand attaches at the front rail.
- `src/ui/tableSeats.ts`: existing clockwise 2–6-player seat map remains unchanged. No seventh player. Team mode not enabled.
- Full game rules, cards, blocking/reporting, online game networking and Solo CPU logic are preserved.

**Still required before public release:**
1. Capture actual Xcode iOS simulator screenshots for 2–6 players (portrait phone + iPad) and inspect interaction states for card clipping. A JavaScript bundle check alone does not prove pixel-perfect visual output.
2. Have user approve the screenshots. Only then create an EAS signed release and validate on two physical devices.
3. Coordinate six-player SQL migration + matching Edge Function + current public website deployment. These are not performed by this purely visual update.
4. Mixed online human/CPU rooms remain a separate unimplemented feature and must not be portrayed as supported.

Do not mark the design QA gate as complete on the strength of browser captures alone.
