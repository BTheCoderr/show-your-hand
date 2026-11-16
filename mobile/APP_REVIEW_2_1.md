# SHOW YOUR HAND — Apple App Review 2.1 response kit

Updated November 16, 2026. This is a working checklist and response draft, **not proof that Apple has accepted the app**.

## Submission and build identity — confirm before replying

Apple's October 15, 2026 message requests a physical-device screen recording plus six written answers, in both the App Review reply and **App Review Information → Notes**. The historical repository notes mention builds 2, 3 and 4. More recent discussions mention build 5. **No current App Store Connect selected-build number or physical-device recording has been independently verified.** Do not quote any one build number until checking the actual binary selected in App Store Connect.

The native development branch is `feature/mobile-expo-v0`. The Apple remediation PR is intended to merge into that branch before any new release candidate is built. No binary is created or submitted by changing this Markdown file.

## Verified source and backend compatibility

- Game: SHOW YOUR HAND, an original turn-based card game, game created by Jamont Patrick and digital app developed by Baheem Ferrell.
- Native app: Expo / React Native, bundle ID `com.bthedream.showyourhand`; account `bferrell514`.
- Current release candidate deliberately provides **private two-player online matches**, rather than showing an unready 2–6-player selector.
- Read-only production Supabase inspection on November 16, 2026 confirmed `syh_create_safe_room(p_safety_install_id uuid, p_display_name text)`, and the report, block, list and unblock RPCs. The 3-argument, six-player `syh_create_safe_room` overload is **not deployed**. Never send `p_max_players` from the current App Review candidate.
- Safety migrations through the fix for player safety RPC column scope are recorded in production. The newer 6-player migration is not shown as deployed. A migration in source control alone is not evidence that it is active.
- The current playable engine uses the **older 70-card beta rules**. The approved 77-card Standard Edition foundation remains a future integration and needs assets, browser, Edge Function, AI, tutorial and native parity before release.
- The public website does not currently support the new safety-enabled native rooms, so **review online multiplayer with two iOS devices on the same candidate build**. The native invite should advertise its own app link/room code, not claim the web join works.
- No phone tests, deployment tests, or report/block/unblock end-to-end results are attested by this document.

## Apple's requested information

### 1. Physical-device recording and quality assurance

Record the **exact production/TestFlight build selected for App Review** on a supported physical iPhone running the latest available public iOS. Begin on the Home Screen and open the app while recording. Test and demonstrate:

1. Launch to Home; open HOW TO PLAY, work through an interactive step, return Home.
2. Open PLAY SOLO, choose CPU opponents, deal, play/draw/pick up and respond to a special attack; reach a scored hand and demonstrate round progression. Demonstrate saved solo game recovery after relaunch.
3. Open SETTINGS + STATS; show preferences, privacy, terms, support and Blocked Players.
4. On two supported **physical iPhones** on the same exact build: create a private two-player room, enter the six-character code on the second phone, both tap READY UP, host deals, play a turn, and verify reconnect or rematch.
5. Open REPORT PLAYER, select a report reason and submit; show the real success result. Open BLOCK PLAYER and confirm; verify the room closes.
6. Attempt a new room between the same installations and show the blocked invitation fails. Navigate to SETTINGS + STATS → Blocked players → UNBLOCK; then verify a new two-player room can be joined.
7. Verify no crash on either phone, and that privacy/legal/support links open correctly. Blur notifications, sensitive room tokens or personal data from recording.

Because `ios.supportsTablet = true`, also test launch, tutorial, solo play and layout on an actual supported iPad. If iPad is not usable, address tablet support **before** submission rather than pretending it was tested.

Attach the recording or share an accessible video URL in the App Review reply **and** in App Review Information → Notes. A link must be accessible to Apple without a private account.

### 2. Purpose and audience

SHOW YOUR HAND is a competitive strategy card game for people who enjoy casual turn-based card games. Players build five-card scoring hands, play action cards and defense cards, and race to five match points. Solo mode offers one to five computer opponents, and private online mode allows two players to compete using a room code. The game is entertainment only: it has no gambling or real-money prizes.

### 3. How a reviewer accesses the app

No registration, login or account creation is required. Therefore there is no account deletion feature for accounts created within this app. No demo credentials or sample files are needed.

- From Home, tap HOW TO PLAY for the tutorial or PLAY SOLO for a local CPU match.
- Tap SETTINGS + STATS for preferences, local statistics, privacy, terms, support and blocked players.
- Tap ONLINE 1V1. On iPhone A choose CREATE PRIVATE ROOM; on iPhone B choose JOIN ROOM and enter the displayed six-character code. Both tap READY UP; the host taps DEAL THE MATCH.
- In the room, use REPORT PLAYER and BLOCK PLAYER. On the blocking device, go to SETTINGS + STATS → Blocked players to unblock.
- The room code is created on demand, not a permanent demo account. Use two iPhones running the selected review build; the public browser client is **not** a substitute for iPhone B.

The app has no in-app purchase, subscription, or paywalled content in the inspected native source. Online play requires connectivity.

### 4. External services and tools

- **Supabase**: Postgres + Edge Functions for private multiplayer, authoritative actions, room sessions, player-safety reports and installation-level blocks.
- **Netlify**: Hosts an optional, separate browser beta and the support, privacy and terms pages; the website cannot currently join safety-enabled native rooms.
- **Expo/EAS**: Native development, build and distribution tooling, not an end-user account service.
- **Expo SecureStore**: On-device storage of local preferences, solo saves, online seat tokens and the anonymous safety installation ID.
- **Device haptics**: Optional local tactile feedback.
- No end-user AI model, ad network, payment processor or paid features in the reviewed native source.

### 5. Regional differences

Gameplay rules and available modes do not vary by region in the inspected app code. Private multiplayer requires network access to Supabase and may fail on a network or in a region that blocks access. Confirm App Store territory settings before submitting.

### 6. Rights and regulation

This is a card game for entertainment, not a financial, medical, legal, lottery or gambling service. Credit **Game created by Jamont Patrick** and **Digital app developed by Baheem Ferrell**. Before making any representation about rights, have the game's creator/developer verify permission to distribute the specific card art, branding, audio, logos and fonts that are in the submitted binary. If Apple requests authorization, provide the appropriate signed approval or license; do not claim to have proof that has not been checked.

## Privacy and moderation disclosure gate

The iOS app uses an anonymous, per-installation identifier. Reports can include a selected reason, optional details, the room and related player/installation IDs, and moderation status. Blocked installations can be unblocked; reinstalling can create a new installation ID and evade a block. Blocks and reports may outlive rooms. The **live** privacy page must disclose this before public release. A GitHub privacy update does not update the site until its deployment is verified.

## Record actual QA results here (never fill in speculatively)

| Evidence | Verified result |
| --- | --- |
| Selected App Store Connect build number / version | NOT VERIFIED |
| Git SHA and Expo EAS build link for that binary | NOT VERIFIED |
| Physical iPhone model and current iOS version | NOT VERIFIED |
| Second physical iPhone / iOS version | NOT VERIFIED |
| Physical iPad / iPadOS version | NOT VERIFIED |
| Solo complete match and relaunch/resume | NOT VERIFIED |
| 2-device online create/join/ready/play/reconnect | NOT VERIFIED |
| Report / block / refused rejoin / unblock | NOT VERIFIED |
| Privacy / terms / support live URL tests | NOT VERIFIED |
| Screenshots reflect actual current app | NOT VERIFIED |
| Physical-device screen recording accessible to Apple | NO LINK PROVIDED |
| Card art, branding and distribution rights checked | NOT VERIFIED |

## Ready-to-paste reply and Review Notes template — send ONLY after verification

Hello App Review Team,

Thank you for reviewing SHOW YOUR HAND. We are providing the requested information for iOS version [VERSION], build [EXACT SELECTED BUILD].

1. Recording: [PUBLICLY ACCESSIBLE RECORDING LINK OR ATTACHMENT]. The recording was captured on [PHYSICAL IPHONE MODEL] running iOS [VERSION] and shows launch, interactive tutorial, solo gameplay, private online room creation/joining and gameplay on two devices, Report Player, Block Player, and the blocked/unblocked join flow. We also tested [IPAD MODEL / IPADOS VERSION OR EXPLAIN TABLET AVAILABILITY]. [ONLY DESCRIBE FLOWS THAT WERE SUCCESSFULLY RECORDED.]

2. Purpose and audience: SHOW YOUR HAND is an original turn-based strategy card game for casual competitive players. Players build scoring five-card hands, attack and defend with special cards, and compete to reach five points. It offers solo play against computer opponents and private online two-player matches. There is no real-money wagering.

3. Access: No registration or login is required; therefore there are no account credentials or account-deletion steps. Tap HOW TO PLAY for the tutorial, PLAY SOLO for a CPU match, SETTINGS + STATS for preferences and legal/support links, or ONLINE 1V1 for private multiplayer. On two iPhones using the submitted build, create a room on one, enter the six-character code on the other, tap READY on both, and have the host deal. Reporting, blocking and unblocking are available from the online game and Settings. No sample files or paid content are required.

4. Services: Supabase provides multiplayer room state, action validation and private moderation records; Netlify hosts the separate browser beta and support/legal pages; Expo/EAS is used for distribution; and Expo SecureStore is used for on-device local data. The app does not offer ads, paid features or end-user AI services.

5. Regions: The inspected app uses the same gameplay and content in all intended territories. Internet access is required for online multiplayer.

6. Regulation/rights: SHOW YOUR HAND is an entertainment card game, not a regulated or gambling service. Game created by Jamont Patrick; digital app developed by Baheem Ferrell. [ADD THE VERIFIED AUTHORIZATION OR ART/BRAND RIGHTS EXPLANATION IF NEEDED.]

Please let us know if further information would assist your review.

Thank you,
SHOW YOUR HAND Team

---

**Submission gate:** Check the selected binary, validate every line above against that binary, attach the recording, update App Review Information → Notes, then reply. **Do not submit this template with placeholders or unverified claims.**
