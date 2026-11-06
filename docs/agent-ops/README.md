# Show Your Hand agent-assisted operating system

Adapted to this project, not a literal copy of SmartProBono's legal/IP workflows.

## What the starter adds
- A product-specific AGENTS instruction file.
- An Agent task issue template and PR review template.
- A deterministic PR risk-map check, with game/online/mobile/security flags.
- A manual-only GitHub operating brief; no scheduled noise until reviewed.
- Existing Build Netlify Artifact CI remains the source of truth for tests and build. It does not deploy to production automatically on a PR.

## Human activation required
1. Review CI on the setup PR, then merge it when approved.
2. In Settings > Rules > Rulesets, protect main from deletion and force push. Require PRs and passing status checks named build and risk-map. A solo founder can use zero required approvals while still reviewing every merge.
3. In Actions, manually run Show Your Hand Agent Brief and confirm one issue appears.
4. Start issue #27: restore the approved 77-card Standard Edition without guessing composition or breaking the server-authoritative engine.
5. Do not infer a connected coding agent from green GitHub Actions. Human-assisted work is operational; a true autonomous agent requires a separately authorized runtime.

## Safety
Never authorize EAS mobile builds, Netlify production actions, Supabase migrations, paid services or private player data access solely through automation. Review gameplay on devices before merging substantive changes. The current production beta remains unchanged by this documentation and workflow PR.
