# SHOW YOUR HAND — iOS release checklist

Updated November 16, 2026. Scope: native iOS app branch `feature/mobile-expo-v0`. The browser app, App Store Connect submission, and production Supabase database are separate release surfaces.

## Non-negotiable release gates

- [x] Apple review remediation PR #31 merged into `feature/mobile-expo-v0` as commit `052a66c70be3d80d112037b5f1ad87d6096e80db`.
- [ ] Verify the actual version, build number and binary selected in App Store Connect; do not infer them from an old README. Builds 2/3/4 are referenced historically; a later build may already exist.
- [ ] Verify the binary uses the same source commit being tested. Never claim new code is in a previously uploaded binary.
- [x] Privacy disclosure PR #30 merged to `main` and Netlify reported a successful production deploy of commit `aad40d71c5794f7aad8508c72e4501dbf9c94ac8` on November 16, 2026. [ ] Independently confirm the actual live page content and support form in a browser.
- [ ] Check project identity: Expo account `bferrell514`, slug `show-your-hand-mobile`, bundle ID `com.bthedream.showyourhand`, EAS project ID `046d7083-6f3b-4b16-9f22-61894243e100`.
- [ ] Verify game/rules/art parity. The live engine is still the **70-card beta**. A 77-card foundation exists, but do not advertise 77-card gameplay until the art, client, shared engine, Edge Function, tutorial and tests are all integrated.
- [ ] Preserve proper credits: game created by Jamont Patrick, digital app developed by Baheem Ferrell. Check distribution authorization for every included asset.
- [ ] Complete real-device QA and the recording before sending an Apple review response.

## Confirmed production backend contract (read-only inspection, 2026-11-16)

The project's Supabase endpoint in the native source is `iymdhcobwijfoupopljd`. Production has:

- `syh_create_safe_room(p_safety_install_id uuid, p_display_name text)` — **two-player rooms**.
- `syh_join_safe_room(p_code text, p_safety_install_id uuid, p_display_name text)`.
- `syh_report_opponent`, `syh_block_opponent`, `syh_list_blocked_players` and `syh_unblock_player`.
- Recorded migrations for player reporting/blocking and the RPC column-scope fix.

**Not deployed:** `syh_create_safe_room(uuid,text,integer)` and the six-player database migration. The review-fix native branch therefore creates **two-player private rooms only**, and must not send `p_max_players`. This is intentional for the next App Review candidate, not removal of the separately approved six-player goal.

The production Edge Function `show-your-hand-game` exists, but its presence does not prove all two-device gameplay. Test online creation, ready, play, report, block and unblock against production without modifying production data beyond the ordinary test sessions you intentionally create.

## No-cost, no-build code validation

At the project root, on the approved native branch:

```bash
npm ci
npm run check:edge-sync
npm test
npm run build
cd mobile
npm ci
npm run typecheck
npx expo-doctor
npx expo export --platform ios --output-dir dist-ios
```

The root CI runs browser/game tests and a production-web build. Expo export verifies a JavaScript bundle, **not a signed iOS binary or a physical-device interaction**. Expo SDK 58 compatibility and Apple signing should be reviewed before committing to a production build.

The manual GitHub workflow at `.github/workflows/show-your-hand-eas.yml` offers `preflight` and `check_expo_connection` at no EAS build cost, plus explicitly confirmed `build_ios_preview` (internal) or `build_ios_production` (TestFlight-capable). The workflow exists on default `main` and targets the fixed `feature/mobile-expo-v0` source; verify the final source SHA in its run logs. Neither build mode submits the app. Build modes can consume EAS credits and must not be initiated just because CI is green.

## Physical-device validation (do before any resubmission)

Test the exact candidate build on at least two physical iPhones, plus a supported physical iPad because `ios.supportsTablet` is enabled.

- [ ] Fresh launch and relaunch; main menu, tutorial, all navigation and back buttons.
- [ ] Solo modes against different CPU counts, attacks/defenses, draws, discard pickups, scored round, full first-to-five match, and resume.
- [ ] Native 1v1 private create, join with room code, both ready, host deal, complete turns, round progression, reconnect, and rematch.
- [ ] Report Player sends successfully, Block Player closes the room, blocked installations cannot join again, and unblocking restores room access.
- [ ] No broken browser invitations: invite should tell the second person to use the iOS app, not the old web beta.
- [ ] Settings, privacy, terms, support/feedback and Blocked Players load on the real device.
- [ ] Test offline/online recovery, background/foreground transitions, and no data leaks in projections.
- [ ] Confirm actual current app screenshots reflect in-app gameplay, not only logo or splash.
- [ ] Complete the physical-device screen recording exactly as outlined in `APP_REVIEW_2_1.md`.

## Build and review sequence

1. Finish and approve code PRs, verify backend compatibility, and complete no-build checks first.
2. Confirm the EAS project, signing credentials, intended build number, and build usage/cost before initiating **one** justified release build.
3. Make a signed `production` iOS build, deliver it to TestFlight, wait for processing, and validate that exact binary on physical devices.
4. Select the **verified** binary for the App Store review submission in App Store Connect.
5. Upload the screen recording and paste the factual six-part response in **both** the App Review reply and the App Review Information Notes field.
6. Recheck privacy disclosures, screenshots, app permissions, territories, credits, and a real iPad test. Only then submit the version for review.

Production EAS commands (do not run until explicitly approved):

```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios --profile production --latest
```

Do not use these commands simply because a TypeScript check or GitHub Action is green.

## Current evidence status

- Production Supabase RPC existence and mismatch: **verified read-only** November 16.
- iOS source remediation: **merged into the native branch** on November 16; previous PR #31 preflight green.
- Live privacy update: **Netlify production deploy confirmed** on November 16; browser-side content spot check remains pending.
- Current selected App Store Connect binary: **not verified**.
- Physical iPhone/iPad QA: **not verified**.
- Recording and App Review reply: **not completed**.

Do not claim the release is ready until all real-device and submission evidence above exists.
