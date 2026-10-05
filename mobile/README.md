# SHOW YOUR HAND Mobile

Native Expo/React Native version of SHOW YOUR HAND.

## Architecture

The mobile app lives inside the existing `show-your-hand` repository so it can import the canonical TypeScript game engine from `../src/game`. We do **not** maintain another copy of the rules.

- Expo SDK 58 / React Native
- Expo Router
- shared deck, scoring, reducer, AI, and rules engine
- native haptics
- existing card artwork reused from `public/cards`
- EAS-ready configuration for future TestFlight / Play builds
- multiplayer will reuse the hardened Supabase rooms and `show-your-hand-game` Edge Function

## Current milestone

Branch: `feature/mobile-expo-v0`

Implemented:
- native branded home screen
- native rules screen
- first solo table using the real shared engine
- CPU turns using the existing AI
- attacks, defenses, target selection, Drop Color and Shuffle
- discard pickup, declaration, scoring, rounds, and match-over
- native haptic feedback
- card artwork loaded from the existing asset set

Next:
1. install dependencies inside `mobile/`
2. run `npx expo start` and smoke-test on a physical iPhone
3. tune small-screen layout from device screenshots
4. wire native Online 1v1 to the existing Supabase backend
5. configure the Expo/EAS project ID
6. create the first internal iOS build, then TestFlight

This branch does not require or trigger a Netlify deploy.
