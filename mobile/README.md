# SHOW YOUR HAND Mobile

Native Expo/React Native version of SHOW YOUR HAND.

## Architecture

The mobile app lives inside the existing `show-your-hand` repository so it can import the canonical TypeScript game engine from `../src/game`. We do **not** maintain another copy of the rules.

- Expo SDK 58 / React Native
- Expo Router
- shared deck, scoring, reducer, AI, and rules engine
- native haptics
- existing card artwork reused from `public/cards`
- EAS development, preview, and production profiles
- private room tokens, prefs, stats, and solo saves in Expo SecureStore
- multiplayer reuses the hardened Supabase rooms and `show-your-hand-game` Edge Function

## Current milestone

Branch: `feature/mobile-expo-v0`

Implemented:

- native branded home, rules, tutorial, settings, and stats
- solo table using the real shared engine, 1–5 CPUs
- attacks, defenses, target selection, Drop Color, Shuffle, discard pickup, declaration, scoring, rematch
- swipe-up play / swipe-down pickup and selected-card lift
- chunked SecureStore solo save/resume
- native Online 1v1 against production rooms
- create/join, ready, reconnect polling, rematch, and `showyourhand://join/CODE` deep links
- app icon, splash, and EAS build profiles for internal iOS

## Local development

Use Node **24.3+** (or 22.13+). Node 23 is not in Expo 58's engine range.

```bash
cd mobile
npm install
npm run typecheck
npx expo-doctor
npx expo start
```

This branch does not require or trigger a Netlify deploy.

## Physical iPhone

SDK 58 is a beta. The App Store Expo Go app will not open this project.

On the same Wi-Fi as this computer:

1. Install a compatible client (SDK 58 Expo Go via `eas go`, or an EAS development/preview build).
2. Start Metro from `mobile/`: `npx expo start`
3. Scan the QR code, or open the printed `exp://` / `showyourhand://` URL on the phone.

If the phone cannot see the LAN URL, restart with `npx expo start --tunnel`.

## EAS

Owner: `bferrell514`  
Slug: `show-your-hand-mobile`  
Bundle ID: `com.bthedream.showyourhand`

Do not create a second Expo project. After `eas login`, check for the existing project with:

```bash
cd mobile
eas init --non-interactive
```

Without `--force` this never creates a project. It reports either `Existing project found ... (ID: ...)` or `Project does not exist`. Link an existing project with `eas init --id <ID>`.

Build profiles in `eas.json`:

| Profile | Purpose |
| --- | --- |
| `development` | Internal iOS development client (needs Metro) |
| `preview` | Internal standalone iOS build for device testing |
| `production` | App Store / TestFlight |

Cloud builds incur EAS usage. Do not start them without approval.
