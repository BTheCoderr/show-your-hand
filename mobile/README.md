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
- solo table using the real shared engine
- CPU turns using the existing AI
- attacks, defenses, target selection, Drop Color and Shuffle
- discard pickup, declaration, scoring, rounds, and match-over
- native haptic feedback
- card artwork loaded from the existing asset set
- native Online 1v1 using the same production Supabase rooms
- create/join private rooms with the existing six-character codes
- ready check, host start, server-authoritative moves, reconnect polling and rematch
- native session persistence with AsyncStorage
- room deep-link route plus shareable web invite

Next:
1. install dependencies inside `mobile/`
2. run the mobile validation workflow
3. smoke-test solo and online on a physical iPhone
4. tune small-screen layout from device screenshots
5. configure the Expo/EAS project ID
6. create the first internal iOS build, then TestFlight

This branch does not require or trigger a Netlify deploy.
