# App Review 2.1 response kit

SHOW YOUR HAND iOS version 1.0.0. The App Store review submission that Apple has is still build 3. Build 4, commit 39adcb9, was uploaded to TestFlight on October 14, 2026 and Apple marked that upload valid. Build 4 has not been submitted for App Review.

Build 4 is the first binary that contains Report Player, Block Player, and Settings → Blocked Players. Builds 2 and 3 do not. Do not tell Apple those controls are in the build currently in review.

Physical-device testing and the requested screen recording have not been completed. Do not send the draft notes below until a recording of build 4, captured on a physical iPhone, is attached.

## Reviewer-accessible purpose and audience

SHOW YOUR HAND is an original turn-based strategy card game for players who enjoy casual competitive card games. Players build a scoring hand of five cards, play number or special cards, use defenses, and try to reach five points before their opponents. Solo mode works against one to five computer-controlled opponents. Private online 1v1 lets two friends play using a short room code. It is entertainment, not gambling or a real-money competition.

## How to access all main features

No registration or login is currently used in this native app. No account deletion flow exists because users do not create accounts. No payment, paid unlock, subscription, or in-app purchase is implemented in the mobile source reviewed.

1. Launch SHOW YOUR HAND.
2. Tap HOW TO PLAY for an eight-step interactive tutorial. Finish it and return Home.
3. Tap PLAY SOLO, choose 1 CPU (beginner mode optional), then DEAL THE CARDS. Tap a card to select/play, swipe up to play, use eligible numbered discard pickup or draw, respond to attacks when prompted, and declare a scoring five-card hand when available. Play until a round ends. The solo game saves locally for resume.
4. Tap SETTINGS + STATS to test haptics, beginner settings, local statistics and the support, privacy and terms links.
5. To test private online 1v1, use TWO physical iPhones that both have TestFlight build 4. On one iPhone tap ONLINE 1V1 and CREATE PRIVATE ROOM. The native app assigns fixed labels PLAYER 1 and PLAYER 2 instead of asking for usernames. On the second iPhone, enter the displayed six-character code. Both players tap READY UP, then the host taps DEAL THE MATCH. This requires an internet connection. The room code is temporary and must be created fresh during review.
6. On the online table, tap REPORT PLAYER. Choose a reason, optionally add details, and send the report. Then tap BLOCK PLAYER and confirm. The current table closes. Create a new room and confirm the blocked installation cannot join. On the blocking iPhone, open SETTINGS + STATS → Blocked players, unblock, and confirm a new room can be joined.
7. The public website at https://show-your-hand.netlify.app does not yet include this safety client. A browser on that site cannot join a room created by build 4. Use a second iPhone on build 4 for the online portion of review until the website is deployed.

No reviewer login credentials or sample files are required to play solo or access the tutorial. For multiplayer, there is no permanent demo room code; create a fresh private room as described.

## Third-party and external services used

- Supabase Postgres and Supabase Edge Functions: private online room state, authoritative multiplayer actions, reconnect/rematch logic, private player reports, and installation-level blocks.
- Netlify: hosts the optional browser version, shared invitation URL, support/feedback, privacy and terms pages. The live website does not yet contain the safety-enabled join client.
- Expo / EAS: development/build/distribution tooling. Expo is not a login or paid service used by players.
- Expo SecureStore: device-local persistence of solo saves, settings, a private online seat token, and an anonymous safety installation ID.
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
5. ONLINE 1V1 on two iPhones running build 4: create, join by code, both players ready, host deal, and at least one turn
6. REPORT PLAYER, including a reason and optional details, then the success or error result
7. BLOCK PLAYER with the confirmation alert, and both phones showing the table has ended
8. a refused join between those installations, then SETTINGS + STATS → Blocked players → UNBLOCK, then a successful join

Turn on Do Not Disturb, use example names, and avoid exposing private room seat tokens, personal notifications and passwords. Upload the recording where App Review can access it and attach or link it in both the reply and App Review Information > Notes.

## Native online naming and player safety in build 4

The native app creates and joins rooms with fixed labels (Player 1 / Player 2). There is no native chat, public feed, post, or user media upload. Report details are optional text, capped at 500 characters, stored privately for moderation. They are not shown to the other player.

Report Player offers four reasons: harassment or threats, inappropriate name or content, cheating or exploits, and other. Block Player asks for confirmation, then the server marks the current room abandoned and refuses future joins between those two installations. Settings → Blocked players lists those blocks and can remove one. Unblocking restores joining and does not delete past reports.

These blocks are tied to the app installation, not a verified account. Reinstalling the app can create a new installation ID and bypass a block. Do not describe this as a permanent user ban.

The live privacy page does not yet disclose anonymous installation IDs, moderation reports, or how long those records are kept. Update that disclosure before public release.

## Physical QA signoff (fill with real results)

- iPhone model: NOT YET PROVIDED
- iOS version: NOT YET PROVIDED
- Build number actually tested: NOT YET PROVIDED. TestFlight has 1.0.0 (4); do not record build 3.
- iPad model and iPadOS version: NOT YET PROVIDED (ios.supportsTablet = true)
- No-crash launch, tutorial, solo full match, save/resume: NOT VERIFIED ON PHYSICAL DEVICE
- Two-device online create/join/ready/play/reconnect/rematch: NOT VERIFIED ON PHYSICAL DEVICE
- Report, block, refused rejoin, unblock, successful rejoin: NOT VERIFIED ON PHYSICAL DEVICE
- Support, privacy and terms links: NOT VERIFIED ON PHYSICAL DEVICE
- Physical-device screen recording attached: NO

## Paste into App Review reply / Notes after completing recording and QA

Hello App Review Team,

Thank you for the opportunity to provide more information for SHOW YOUR HAND (iOS 1.0).

A physical-device screen recording of TestFlight build 4 is attached: [ATTACHMENT OR ACCESSIBLE LINK]. It begins at app launch and demonstrates the tutorial, solo gameplay, settings, private online 1v1 between two iPhones, Report Player, Block Player, a refused join, and Unblock. We tested this build on [DEVICE MODEL] running [iOS VERSION] and [IPAD DETAILS, IF SUPPORTED]. Do not send this sentence until that recording and those device tests exist.

Purpose and audience: SHOW YOUR HAND is an original strategy card game for players who enjoy casual competitive games. Players compete to build five-card scoring hands. It offers solo play against one to five computer opponents and private, invite-only online 1v1. It has no real-money wagering.

Access: No account or login is required. From Home, tap HOW TO PLAY for the tutorial, PLAY SOLO to begin a CPU match, SETTINGS + STATS for preferences, legal links, and Blocked players, or ONLINE 1V1 to create or join a private room. For online review, install build 4 on two iPhones, create a room on one, enter the six-character code on the other, tap READY on both, and have the host deal. The current public website cannot join a room created by this build. No permanent credentials or sample files are required. Online opponents use fixed seat labels. Report details are private moderation text. Blocking is per app installation and can be removed in Settings.

Services: The app uses Supabase for private game-room state, action validation, private reports, and installation blocks. Netlify hosts the optional web counterpart and support/legal pages. On-device storage holds the seat token and an anonymous safety ID. Expo/EAS is used to build and distribute the native app. It does not integrate payment, ads, or AI services.

Regions: No region-specific game rules or content are implemented; online play requires network access to the service.

Rights and regulation: This is a fictional, original card-game product, with no gambling, financial, health, or other regulated services. [CONFIRM ARTWORK AND BRAND OWNERSHIP/RIGHTS BEFORE SENDING.]

Please let us know if any additional review steps would help.

Thank you,
SHOW YOUR HAND Team
