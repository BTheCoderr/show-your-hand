# Show Your Hand — human-reviewed, agent-assisted workflow

This is an instruction file; it does not activate or pay for an AI coding agent.

## Product boundaries
- Game created by Jamont Patrick; digital app developed by Baheem Ferrell. Preserve the two credits.
- The current main game uses a 70-card beta. Issue #27 describes the separately approved 77-card Standard Edition. Restore only after game engine, art, tests, online protocol, and iOS agree. No silent rule changes.
- Never reveal hidden opponent cards, RNG/draw pile, room credentials or private player details.
- No Supabase migrations, main pushes, iOS EAS builds, App Store submissions, billing, or production deployment without founder approval.

## Roles
Planner translates player feedback into one small issue and acceptance tests.
Engineer makes a scoped agent/ branch and draft PR.
QA runs deterministic tests and actually tries the player-visible experience.
Founder reviews UI, rules, data risks and deployment before merge.

## Required validation (Node 24)
- npm ci
- npm run check:edge-sync
- npm test
- npm run build

The existing Build Netlify Artifact workflow handles these on every PR. Agent PR Risk Map validates review headings and flags sensitive paths. Neither workflow is a model-powered coding agent or a production release authorization.

## Pull request contract
Headings required: What changed, Verification, Risk assessment, Human approval and rollback, After release; each as a level-three heading.
No secrets, private player details, or other sensitive content in public issues, PR comments, or CI logs.
