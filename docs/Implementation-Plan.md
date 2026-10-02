# Plan

Address PR #5's Codex findings against the accepted rules and verified component evidence. Fix confirmed import and Rogue board-selection gaps, preserve existing replay behavior, and document why the Cleric and Jarlaxle changes would contradict their specific printed timing.

## Scope
- In: Supported Monster event-ID validation; optional up-to-two Rogue Items from one nearest board location; versioned save compatibility; focused rule regressions; review replies/reactions, CI, documentation, and PR readiness.
- Out: Changing Cleric's all-attacks critical effect or Jarlaxle's Hero-Phase limit; making discard selection optional contrary to its component text; publishing private wording; merging/deploying; claiming manual acceptance.

## Action items
[x] Inspect all four review threads, canonical Rules-Reference and Game-Data-Checklist, exact verified timing fields, save/replay contracts, and corresponding tests.
[ ] Checkpoint this resolved plan before implementation.
[ ] Reject unsupported executable Monster event IDs before local gameplay, while retaining generic reference-only synthetic validation; add import/data regressions and update Game-Data-Format.
[ ] Allow zero to two Rogue Items from the selected nearest board location for new adventures; version the correction so existing v3/v4 command histories and pending saves retain exact behavior.
[ ] Add regression coverage for the specific Cleric all-attacks duration, Jarlaxle Hero-Phase expiry, Rogue board/discard distinction, and old/new save recovery. Clarify Rules-Reference and compatibility docs without copying private text.
[ ] Validate each feedback item, commit/push it separately, and acknowledge the corresponding Codex comment after its fix is pushed.
[ ] Run npm run verify, npm run test:e2e, relevant production/prepared checks, and fresh CI; address any reproduced failure.
[ ] Record review dispositions and final acceptance limits, refresh the PR description/checks/thread state, and leave the PR ready for later manual playtesting and unmerged.

## Open questions
- None blocking: specific verified component text takes precedence over general summaries. New Rogue board-choice behavior must not silently invalidate existing saves; manual play and physical offline checks remain deferred by the owner.
