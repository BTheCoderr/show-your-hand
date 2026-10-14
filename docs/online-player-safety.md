# Online player reporting and blocking

## Implemented (October 14, 2026)

- Native iOS/Android: `Report Player`, `Block Player` on waiting/active/completed/abandoned private tables, and **Settings → Blocked players** with unblock controls.
- Web: report, block and unblock controls inside the Online lobby.
- Backend: installation-level opaque UUID stored in native SecureStore or browser localStorage. Room join server checks blocks in either direction; legacy clients without this protection cannot join a safety-enabled room.
- Reporting reasons: harassment/threats, inappropriate names/content, cheating/exploits, and other. Optional note capped at 500 characters. Reports are stored privately and rate-limited to five per room participant per 24 hours.
- Blocking closes the current room and prevents future room joins between the same installations. Unblocking removes that restriction but **does not delete reports**.
- Security: the opponent's installation ID is not included in room projections. Anonymous clients have EXECUTE on scoped RPCs but no direct SELECT on private report/block tables. Room seat tokens scope reports and blocks to a real opponent in the same room.

## Limitations that must be communicated accurately

These are **installation/browser-profile blocks**, not verified account bans. A reinstallation, clearing browser storage, using another device, or modifying an anonymous client can bypass them. Don't claim users are permanently blocked across all devices. Abuse escalation needs active moderation by an authorized operator.

Players using older clients without a safety installation identity can be reported but cannot be persistently blocked. When the safety-enabled host is in a room, older clients are instructed to update. Deploy the new web client before distributing the new iOS binary so QR and invite-link joins continue to work.

The currently submitted App Store binary 1.0.0 (3) predates these changes. It must be rebuilt, physically tested, and resubmitted before telling Apple these new controls are available in the submitted build.

## Moderator review and response

This is a restricted Supabase project. Only authorized operators with the appropriate server-side role should access reports. **Never embed the service role key in Expo/web code.**

Check pending reports regularly in Supabase SQL Editor as an authorized administrator:

```sql
select id, room_id, reason, details, created_at, status
from public.syh_player_reports
where status in ('pending','reviewing')
order by created_at asc
limit 100;
```

After investigating, update a report's status to `reviewing`, `resolved`, or `dismissed`, and set `reviewed_at`. Keep escalation procedures for threats and illegal content, and document actions outside anonymous game data. No automated moderation alert or administrator dashboard exists yet; operators must actually review incoming reports. Set a clear review cadence and privacy retention policy before public release.

These reports deliberately survive room expiration and cleanup. Update the public privacy disclosure before shipping to explain anonymous installation IDs, moderation reports, how long they are retained, and the support contact.

## Validated in Supabase (test records rolled back)

Tests executed against `Show-Your-Hand` project `iymdhcobwijfoupopljd`, including an actual `anon` database role:
- create/join with two safety identities
- submit a report and reject a self-report
- verify room projection doesn't leak safety identity
- block and close an active room
- deny future joins in blocked pair
- reject legacy join attempts into a safety-enabled room
- list and unblock
- allow a fresh join after unblocking
- verify anonymous clients cannot SELECT private reports/blocks directly

Both migration files are committed under `supabase/migrations/`. No test rows persisted.

## Physical-device QA before App Review

1. On two physical devices, create a room, join by code, ready up, play an action, and report the opponent.
2. Select each reason; verify only one report per action, check optional details, and verify the server receives the entry.
3. Block the opponent during a game. The room should terminate for both players.
4. From a new room on either device, attempt a blocked join. It must fail. Confirm another unblocked user can join.
5. Open Settings → Blocked players, unblock, then retry join successfully.
6. Test guest reports and host reports, room-closed reports, network loss during blocking, and the 24-hour report limit.
7. Test app-to-web and web-to-app invitations with the **updated** website.
8. Verify privacy and support links and physically record all steps for Apple.

Physical signed iOS builds and App Review recording remain unverified by GitHub CI.
