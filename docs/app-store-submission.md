# SHOW YOUR HAND — App Store submission kit

Prepared October 12, 2026 on `release/app-store-website`. Nothing here has been submitted to Apple.
Items marked **CONFIRM** need the owner's decision or information before submission.

## App Store Connect URLs

| Field | URL |
| --- | --- |
| Support URL | https://show-your-hand.netlify.app/support |
| Marketing URL | https://show-your-hand.netlify.app/about |
| Privacy Policy URL | https://show-your-hand.netlify.app/privacy |

These pages exist only on this branch until it is merged and deployed. Verify each URL over HTTPS
after deploying and before entering it in App Store Connect.

## Listing copy

Keep this aligned with the features in the submitted IPA. Do not mention Android or "beta"
(App Review Guidelines 2.2 and 2.3.10).

**Name (30 max):** SHOW YOUR HAND

**Subtitle (30 max):** The 70-card hand battle game *(alt: "Drop. Attack. Defend. Score.")*

**Promotional text (170 max):**
Drop, pick up, attack, and defend in an original 70-card game. Play solo against up to five CPUs or
challenge a friend in a private online room.

**Description:**

DROP. PICK UP. ATTACK. DEFEND. BUT NEVER SHOW YOUR HAND.

SHOW YOUR HAND is an original competitive card game built on one rhythm: drop a card, resolve the
effect, and draw back to five. Build a scoring five-card hand while you use special cards to disrupt
the table. First to 5 points wins.

PLAY SOLO
• Take on 1 to 5 computer opponents who follow the same rules you do
• Beginner Mode removes the turn clock, slows CPU moves, and adds guidance
• Your solo match saves automatically so you can resume later

PRIVATE ONLINE 1V1
• Create a room and share the code with a friend
• Ready up, play, reconnect to your seat, and run it back with a rematch
• The game server validates every move and keeps your hand hidden

SPECIAL CARDS
• Show Your Hand — force a rival to reveal their hand
• Drop Color — make a target drop every card of a color, then claim them
• Skip — take the next player out of their turn
• Shuffle — send one or two hands back into the deck
• Blank — cancel an attack aimed at you

LEARN IN TWO MINUTES
An interactive 8-step tutorial teaches dropping, picking up, attacking, defending, Shuffle, and
scoring with hands-on practice.

ALSO
• Haptic feedback for plays, attacks, defenses, and wins
• Local stats: matches, wins, rounds, attacks, defenses, and best hand
• No account, no ads, no in-app purchases

**Keywords (100 max):**
`card game,cards,strategy,multiplayer,1v1,solo,offline,tabletop,friends,attack,defend,deck,party,duel`

**What's New (first version):** First release of SHOW YOUR HAND for iPhone.

**Category:** Games → Card (primary), Strategy (secondary). **CONFIRM**

**Copyright:** `2026 <legal name or company>` — **CONFIRM**

**Price:** Free (no in-app purchases in the current build). **CONFIRM**

## App Privacy ("nutrition label") — recommended answers, CONFIRM

Based on the audited code in this repository (web `src/`, native `mobile/` on
`feature/mobile-expo-v0`, Supabase migrations and Edge Function):

- **Tracking:** No. No advertising or analytics SDKs; no data shared with data brokers.
- **Data collected by the iPhone app:**
  - *User Content → Gameplay Content* — online room game state, moves, match stats.
    Purpose: App Functionality. Not linked to identity. Not used for tracking.
  - *Identifiers → User ID* — the display name shown to the opponent (a screen name) and the random
    per-room seat token. Purpose: App Functionality. Not linked to identity. Not used for tracking.
- **Not collected by the app:** contact info, location, contacts, health, financial info, browsing
  history, search history, purchases, diagnostics (the app contains no crash-reporting SDK; Apple's
  own opt-in crash sharing does not need to be declared).
- The support/feedback form is on the website, not inside the app, so it is not app data collection.

## Age rating — CONFIRM

Answer Apple's questionnaire honestly. The app has no violence, gambling, or mature themes; it
contains no real-money wagering or simulated gambling (card play is not betting). The only
player-to-player content is a display name of up to 24 characters in private 1v1 rooms — there is no
chat. Decide whether to declare user-generated content for display names.

## App Review notes (draft)

> No account or login is required.
> Solo: tap PLAY SOLO, choose the number of CPU opponents, and start. Tap HOW TO PLAY for the
> 8-step tutorial.
> Online 1v1 needs two devices: on device A tap ONLINE 1V1, enter a display name, and create a room;
> on device B tap ONLINE 1V1, enter a name, and type the room code. Both players tap Ready, then the
> host starts.
> Support: https://show-your-hand.netlify.app/support · Privacy: https://show-your-hand.netlify.app/privacy

**CONFIRM** before mentioning it to App Review: whether a browser at show-your-hand.netlify.app can
join a room created in the iPhone app (both use the same backend, but cross-play has not been tested).

## Screenshots (required, not yet captured)

Use real screens from a working iPhone build only — not the website, not mockups.

- **iPhone with Dynamic Island (medium display)** — required. 1206×2622 or 1179×2556 portrait
  (e.g. iPhone 17 / 16 / 15 Pro). Up to 10.
- **iPhone 6.9" (large display)** — optional but recommended: 1320×2868 (iPhone 17/16 Pro Max).
- **iPad 13"** — required because `mobile/app.json` sets `ios.supportsTablet: true`: 2064×2752 or
  2048×2732. Either capture real iPad screens after testing the iPad layout, or set
  `supportsTablet: false` before the App Store build. **CONFIRM**
- No alpha channel / transparency. Suggested set: home screen, solo table, an attack (Drop Color),
  a defense prompt, round-win / scoring reveal, online room with code, tutorial step.

## Asset inventory

| Asset | Path | Notes |
| --- | --- | --- |
| Original icon artwork | `branding/source/show-your-hand-icon-original.jpg` | Supplied gold-frame card icon (unchanged) |
| Original logo artwork | `branding/source/show-your-hand-logo-original.jpg` | Supplied wordmark banner (unchanged) |
| App Store icon 1024×1024 | `branding/app-store/app-store-icon-1024.png` | Opaque RGB PNG, no rounded corners. Byte-identical to `mobile/assets/icon.png` on `feature/mobile-expo-v0` |
| Square logo | `branding/logo-square-1024.png` | |
| Android adaptive foreground | `branding/android-adaptive-icon-1024.png` | Matches `mobile/assets/adaptive-icon.png` |
| Horizontal logo (black bg) | `branding/logo-horizontal-on-black.png` | Same as `mobile/assets/logo.png` splash |
| Horizontal logo (transparent) | `branding/logo-horizontal-for-dark-backgrounds.png`, `public/brand/logo-horizontal.{webp,png}` | Only for dark backgrounds |
| Favicons | `public/favicon.ico` (16/32/48), `public/favicon-32.png` | |
| Apple touch icon | `public/apple-touch-icon.png` (180) | |
| PWA icons | `public/brand/icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | |
| Social sharing image | `public/brand/og-image.png` (1200×630) | Logo + real card art; marketing image, not a gameplay screen |
| Web gameplay previews | `public/screens/web-*.webp` | Real captures of the browser build (Beta 0.1.2) |

Regenerate derived files with `python3 branding/build_assets.py` (requires Pillow).

The unused numbered "casino" icon variant was intentionally not included.

**Brand consistency note:** the supplied icon and logo show green/yellow/orange/red cards with
traditional suits. The in-game deck uses black cards with orange, blue, green, and purple numbers
1–5 and hand-gesture specials — there are no yellow or red cards or suits in the game. The marketing
page therefore shows the real card art next to the logo. Consider a future icon revision that uses the
actual deck colors.

## Native app items to resolve before the App Store build

These are in `mobile/` on `feature/mobile-expo-v0` and need a new IPA:

1. **New icon and splash** are committed (`c861f9c`) but appear only in a new build.
2. **"Beta" wording** — the home screen shows `BETA MOBILE · 0.1.0` and online shows
   `NATIVE ONLINE BETA`. Guideline 2.2 says betas belong on TestFlight. Remove or rename before App
   Store submission. The footer text "Native Expo build · shared rules + shared online backend" is
   developer-facing and should also be replaced.
3. **Support link** — Settings + Stats → "Feedback + support" opens `/feedback`; point it at
   `/support` once deployed.
4. **Rules screen** — `mobile/app/rules.tsx` exists but nothing links to it.
5. **iPad support** — see Screenshots.
6. **Delete all local data** — iPhone users can reset stats, but there is no single control that
   clears the saved solo match, preferences, and online session; iOS Keychain items can survive app
   deletion. Recommended (not required for apps without accounts).

## Owner information still needed

- Legal name / seller name for copyright and App Store Connect. **CONFIRM**
- A support or privacy email address, if you want one listed (none is published today; the site uses
  the contact form, which records the sender's email only when provided). **CONFIRM**
- App Review contact (name, phone, email) in App Store Connect.
- Confirm the hourly Supabase cleanup job `syh-expired-room-cleanup` is active in production
  (defined in `supabase/migrations/20260930200000_beta_0_1_2_audit_hardening.sql`; the deployed
  project could not be inspected from this environment). The privacy policy describes it.
- Confirm Netlify Forms notifications reach you and that you are comfortable with the retention
  wording for feedback messages.
- Confirm whether Netlify Analytics or any other server-side analytics is enabled on the site.
- Governing law / jurisdiction for the Terms, if desired.
