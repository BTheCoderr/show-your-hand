# iPhone release checklist

This checklist applies to the `feature/mobile-expo-v0` mobile branch. The web app and Meetopia are separate projects. A green GitHub Action confirms TypeScript and JavaScript bundles, not a signed native iOS binary or physical-device functionality.

## Phone-only GitHub to Expo workflow

A manual-only GitHub Actions workflow lives at `.github/workflows/show-your-hand-eas.yml` on both `main` and `feature/mobile-expo-v0`. It always checks out and validates **`feature/mobile-expo-v0`**. No EAS build starts automatically when code is pushed.

1. Sign into the Expo account that owns Show Your Hand (`bferrell514`) at https://expo.dev/settings/access-tokens and create an access token for GitHub.
2. In https://github.com/BTheCoderr/show-your-hand/settings/secrets/actions select **New repository secret**, set the name to `EXPO_TOKEN`, and paste the Expo token there. **Never paste it into a public issue, commit, screenshot, or ChatGPT conversation.**
3. On your phone or desktop, open https://github.com/BTheCoderr/show-your-hand/actions/workflows/show-your-hand-eas.yml and tap **Run workflow**.
4. Use **mode = preflight** to validate game tests, TypeScript, the iOS JS export, and project identity. This requires **no Expo token** and uses no EAS build credits.
5. After storing `EXPO_TOKEN`, use **mode = check_expo_connection** to run `eas whoami` and verify Expo authentication. This is **read-only and starts no EAS build**.
6. Only after you expressly decide to use your EAS build allowance, set **mode = build_ios_preview** and type `BUILD_IOS_PREVIEW` in the confirmation field. This requests `eas build --platform ios --profile preview --non-interactive --no-wait`. **EAS usage may incur charges.**
7. If there is no `Run workflow` button, make sure GitHub Actions are enabled, the workflow exists on the default branch, and you are signed in with repository write permission. The workflow never requests a TestFlight submission or production release.

**Important:** Initial iOS credentials and internal distribution device registration may still need interactive setup in the Expo/Apple account. An access token doesn't bypass those requirements. The existing workflow queues a **preview** build, not an App Store binary; follow the TestFlight section below later. The currently connected GitHub tools here can edit/inspect GitHub workflows, but may not offer a direct manual-dispatch button. The GitHub website/app can do the manual dispatch.

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

## Apple App Review Guideline 2.1: required evidence

See [APP_REVIEW_2_1.md](./APP_REVIEW_2_1.md) for the fact-checked purpose, access steps, external services, regional explanation, rights check, exact iPhone recording shot list, and an App Review response draft.

**Do not resubmit solely on the strength of green TypeScript/export checks.** Apple's October 14 request requires a recording of the build actually being reviewed, captured from a current-OS **physical iPhone**, plus written answers in BOTH the Resolution Center reply and the App Review Information Notes field.

The existing submission is iOS 1.0 / Expo 0.1.0 / build 2, submitted October 12. The October 13-14 mobile fixes are source changes, so build 2 does not contain them. Upload/select a newer signed production build if you want Apple to review those fixes. Verify the selected build number and test it on a physical device before replying.

**Open compliance risk:** online display names are free text. In-app user-content reporting and blocking have not been verified, so do not tell Apple they exist; resolve this issue before claiming compliance with any applicable UGC requirements.

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
