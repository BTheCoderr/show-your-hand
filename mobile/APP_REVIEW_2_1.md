# App Review 2.1 response kit

Applies to SHOW YOUR HAND iOS 1.0, Expo version 0.1.0, Apple's submitted build 2, submission e38865ed-2566-4b79-99fc-95840a201fbd (October 12, 2026).

IMPORTANT: Changes made after that submission are not in build 2. If Apple is to review the changes, build and upload a new signed production build and select it in App Store Connect. Do not say the app passed physical-device QA until it actually has.

## Reviewer-accessible purpose and audience

SHOW YOUR HAND is an original turn-based strategy card game for players who enjoy casual competitive card games. Players build a scoring hand of five cards, play number or special cards, use defenses, and try to reach five points before their opponents. Solo mode works against one to five computer-controlled opponents. Private online 1v1 lets two friends play using a short room code. It is entertainment, not gambling or a real-money competition.

## How to access all main features

No registration or login is currently used in this native app. No account deletion flow exists because users do not create accounts. No payment, paid unlock, subscription, or in-app purchase is implemented in the mobile source reviewed.

1. Launch SHOW YOUR HAND.
2. Tap HOW TO PLAY for an eight-step interactive tutorial. Finish it and return Home.
3. Tap PLAY SOLO, choose 1 CPU (beginner mode optional), then DEAL THE CARDS. Tap a card to select/play, swipe up to play, use eligible numbered discard pickup or draw, respond to attacks when prompted, and declare a scoring five-card hand when available. Play until a round ends. The solo game saves locally for resume.
4. Tap SETTINGS + STATS to test haptics, beginner settings, local statistics and the support, privacy and terms links.
5. To test private online 1v1, use TWO devices. On one iPhone tap ONLINE 1V1 and CREATE PRIVATE ROOM. The native app assigns fixed labels PLAYER 1 and PLAYER 2 instead of asking for usernames. On the second device (or the web app at https://show-your-hand.netlify.app), choose online play and enter the displayed six-character code. Both players tap READY UP, then the host taps DEAL THE MATCH. Play, disconnect/reconnect, and rematch as needed. This requires an internet connection. The room code is temporary and must be created fresh during review.

No reviewer login credentials or sample files are required to play solo or access the tutorial. For multiplayer, there is no permanent demo room code; create a fresh private room as described.

## Third-party and external services used

- Supabase Postgres and Supabase Edge Functions: private online room state, authoritative multiplayer actions, and reconnect/rematch logic.
- Netlify: hosts the optional browser version, shared invitation URL, support/feedback, privacy and terms pages.
- Expo / EAS: development/build/distribution tooling. Expo is not a login or paid service used by players.
- Expo SecureStore: device-local persistence of solo saves, settings, and a private online seat token.
- Platform haptics: optional device feedback.
- No user-facing AI model, payment processor, advertisement network, external sports-data provider, or third-party audio streaming service is used in the reviewed mobile code.

## Regional availability

The application contains no location-specific gameplay or regional content differences in the inspected code. Core solo gameplay does not depend on geography. Multiplayer requires network access to its Supabase service and may be unavailable where the service or network is blocked. Confirm intended App Store territories and availability before sending.

## Regulated industry and rights

The product is an original digital card game, not a regulated professional service, gambling product, lottery, or wagering app. Its game rules and card assets are maintained in the developer's own repository. The developer must confirm ownership or distribution rights for all artwork, logos, fonts and other included material before representing to Apple that no licenses are needed. Do not make unsupported legal ownership claims.

## Recording instructions (action required on a physical iPhone)

Record the EXACT build selected for Apple review on a supported physical iPhone running the latest available public iOS version. Use Control Center > Screen Recording. Begin by launching the app from the Home Screen, not in a pre-opened game. Show:

1. launch to Home
2. HOW TO PLAY tutorial, including one interactive practice step
3. return Home, PLAY SOLO, opponent selection, dealing, a few numbered and special-card turns, pickup, and scoring/round progression
4. SETTINGS + STATS and support/legal links
5. ONLINE 1V1 create, join from a second device/browser, both players ready, host deal, play, rematch and leave where practical
6. any actual user-generated-content report/block flows if the app includes them. Do NOT record or claim flows that do not exist.

Turn on Do Not Disturb, use example names, and avoid exposing private room seat tokens, personal notifications and passwords. Upload the recording where App Review can access it and attach or link it in both the reply and App Review Information > Notes.

## Native online naming and content safety

The mobile branch now removes the arbitrary display-name input. The native app creates and joins rooms with fixed labels (Player 1 / Player 2), and applies a display-only sanitization to player names and game history returned from the shared server. Private matches have no native chat, public feeds, posts or user media upload. This is a reduced-surface App Store release choice, not a claim that the browser counterpart has moderation features.

IMPORTANT: This safety change came after Apple's build 2 submission. Do not tell Apple it is in build 2. Confirm the exact replacement binary, inspect the live UI and TestFlight recording, and check that no remotely supplied usernames are displayed. If custom usernames, chat, or other user-generated content are reintroduced, filtering, report and block systems must be implemented and verified under Apple's Guideline 1.2 before describing that functionality as supported.

## Physical QA signoff (fill with real results)

- iPhone model: NOT YET PROVIDED
- iOS version: NOT YET PROVIDED
- Build number actually tested: NOT YET PROVIDED
- iPad model and iPadOS version: NOT YET PROVIDED (ios.supportsTablet = true)
- No-crash launch, tutorial, solo full match, save/resume: NOT VERIFIED ON PHYSICAL DEVICE
- Two-device online create/join/ready/play/reconnect/rematch: NOT VERIFIED ON PHYSICAL DEVICE
- Support, privacy and terms links: NOT VERIFIED ON PHYSICAL DEVICE
- Native app fixed-name projection and no-UGC UI: SOURCE UPDATED, PHYSICAL DEVICE / REPLACEMENT BUILD NOT YET VERIFIED
- Physical-device screen recording attached: NO

## Paste into App Review reply / Notes after completing recording and QA

Hello App Review Team,

Thank you for the opportunity to provide more information for SHOW YOUR HAND (iOS 1.0).

A physical-device screen recording of build [BUILD NUMBER] is attached: [ATTACHMENT OR ACCESSIBLE LINK]. It begins at app launch and demonstrates the onboarding tutorial, solo gameplay, special card actions, scoring, settings, and [private online 1v1 showing fixed player labels; any additional UGC safety flows only if actually implemented]. We tested this build on [DEVICE MODEL] running [iOS VERSION] and [IPAD DETAILS, IF SUPPORTED].

Purpose and audience: SHOW YOUR HAND is an original strategy card game for players who enjoy casual competitive games. Players compete to build five-card scoring hands. It offers solo play against one to five computer opponents and private, invite-only online 1v1. It has no real-money wagering.

Access: No account or login is required. From Home, tap HOW TO PLAY for the tutorial, PLAY SOLO to begin a CPU match, SETTINGS + STATS for preferences and records, or ONLINE 1V1 to create or join a private two-device room. For online review, create a room on one device, enter the displayed six-character code on another device or at https://show-your-hand.netlify.app, tap READY on both, and have the host deal. No permanent credentials or sample files are required. [AFTER TESTING REPLACEMENT BUILD: The native game has no player-submitted text, chat, posts or uploads; online opponents are displayed using fixed seat labels.]

Services: The app uses Supabase for private game-room state and action validation, Netlify for its optional web counterpart and support/legal pages, and on-device storage/haptic features. Expo/EAS is used to build and distribute the native app. It does not integrate payment, ads, or AI services.

Regions: No region-specific game rules or content are implemented; online play requires network access to the service.

Rights and regulation: This is a fictional, original card-game product, with no gambling, financial, health, or other regulated services. [CONFIRM ARTWORK AND BRAND OWNERSHIP/RIGHTS BEFORE SENDING.]

Please let us know if any additional review steps would help.

Thank you,
SHOW YOUR HAND Team
