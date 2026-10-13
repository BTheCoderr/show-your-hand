# iPhone release checklist

This checklist applies to the `feature/mobile-expo-v0` mobile branch. The web app and Meetopia are separate projects. A green GitHub Action confirms TypeScript and JavaScript bundles, not a signed native iOS binary or physical-device functionality.

## When back at the Mac

```bash
cd /Users/beforreal/show-your-hand
git switch feature/mobile-expo-v0
git pull --ff-only origin feature/mobile-expo-v0
cd mobile
npm install
npm run typecheck
npx expo-doctor
```

Check the branch and Expo project carefully: owner `bferrell514`, project `show-your-hand-mobile`, bundle ID `com.bthedream.showyourhand`. Do not build another app by accident.

## Preview build: for testing, not TestFlight

1. Check your EAS usage and Apple signing profile before starting a cloud build; it may incur cost.
2. `eas build --platform ios --profile preview`
3. Install the resulting compatible preview app on a registered physical iPhone.
4. Verify branding, card fronts/backs, and every screen's `Back` control (including direct join links).
5. Complete a solo round and a full match, then quit and reopen mid-game to test resume.
6. Verify timer resets on the next turn (including 1 CPU), not when choosing targets or when polling online.
7. Create a private online room, invite a different phone/browser, ready up, play attacks, defend, score, rematch.
8. Background/resume the phone and temporarily disconnect/reconnect Wi-Fi. The saved seat should remain available.
9. Test the deliberate "Leave table" confirmation and verify a failed network request never silently discards a seat.
10. Confirm that blue 1–5 and Shuffle still show their old art: no matching new designs were provided.

## TestFlight/App Store

Only after physical tests and any necessary credential checks:

```bash
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

You can use Apple's Transporter for manual IPA delivery instead of `eas submit`, but you do not need both. Expo EAS builds run on cloud machines, not locally in Xcode. Confirm EAS usage, Apple credentials, and the correct build number before starting.

After the upload completes, finish App Store Connect metadata, internal/external tester setup, privacy details, and Apple processing/review as applicable. Uploading the binary does not by itself release the app.

## Known limits

- The native bundle has passed automated CI, but signing, Apple provisioning, physical-device interaction, and real production multiplayer have not been tested by CI.
- The new art is available on the mobile branch only until merged/deployed elsewhere.
- Card design color choices and missing blue/Shuffle artwork are not yet resolved; engine colors and established 70-card rules are unchanged.
