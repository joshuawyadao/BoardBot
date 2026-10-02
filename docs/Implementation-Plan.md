# Plan

Address PR #5's Codex findings against the accepted rules and verified component evidence. Fix confirmed import and Rogue board-selection gaps, preserve existing replay behavior, and document why the Cleric and Jarlaxle changes would contradict their specific printed timing.

## Scope
- In: Supported Monster event-ID and required citizen-start validation; optional up-to-two Rogue Items from one nearest board location; versioned save compatibility; focused rule regressions; review replies/reactions, CI, documentation, and PR readiness.
- Out: Changing Cleric's all-attacks critical effect or Jarlaxle's Hero-Phase limit; making discard selection optional contrary to its component text; publishing private wording; merging/deploying; claiming manual acceptance.

## Action items
[x] Inspect all four review threads, canonical Rules-Reference and Game-Data-Checklist, exact verified timing fields, save/replay contracts, and corresponding tests.
[x] Checkpoint this resolved plan before implementation.
[x] Reject unsupported executable Monster event IDs before local gameplay, while retaining generic reference-only synthetic validation; add import/data regressions and update Game-Data-Format.
[x] Allow zero to two Rogue Items from the selected nearest board location for new adventures; version the correction so existing v3/v4 command histories and pending saves retain exact behavior.
[x] Add regression coverage for the specific Cleric all-attacks duration, Jarlaxle Hero-Phase expiry, Rogue board/discard distinction, and old/new save recovery. Clarify Rules-Reference and compatibility docs without copying private text.
[x] Validate, commit/push, and acknowledge the two actionable Codex findings; record the two component-timing false positives with regression evidence and resolve all four review threads.
[x] Run npm run verify, npm run test:e2e, and production/prepared checks: all passed (127 unit, five repository, 75 browser, one production, six prepared).
[x] Fix the Brooks follow-up for unresolved Citizen references and rerun all local acceptance suites.
[x] Record review dispositions and deferred manual acceptance in the docs and PR description. Keep the PR unmerged.

## Final external gate
Report merge readiness only after CI Verify on the final pushed head is green, all review threads are addressed, and GitHub reports no conflicts. The live PR checks hold this status; a passing earlier head does not satisfy it.

## Open questions
- None blocking: specific verified component text takes precedence over general summaries. New Rogue board-choice behavior must not silently invalidate existing saves; manual play and physical offline checks remain deferred by the owner.
