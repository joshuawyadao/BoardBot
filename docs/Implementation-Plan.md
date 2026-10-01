# Plan

Remove the invented Wait action and use explicit End Hero Phase to forfeit remaining actions. Keep zero-action Perks available before the phase ends and preserve existing solo saves.

## Scope
- In: Sample engine and controls, phase-end action budgets, focused unit/browser regressions, current behavior documentation, checkpoint commits and final branch push.
- Out: New game actions, rules interpretations, onboarding changes, save-format migrations, multiplayer, PR creation, and merging.

## Action items
[x] Inspect README, Architecture, Rules-Reference, Game-Data-Checklist, Verification, sample action/session code, solo phase transitions, and related tests.
[x] Checkpoint the resolved plan on the existing feature branch.
[x] Remove Wait from the sample engine and UI, including obsolete confirmation controls and styles; clear unused actions on sample phase end.
[x] Expose zero usable actions outside the solo Hero Phase through the engine projection, preserving internal replay snapshots and existing save compatibility; explain forfeiture on the phase controls and in action help.
[x] Update sample engine/session and browser tests to use actual moves, preserving duplicate, stale, keyboard, collapse, and log coverage; verify early end, no action carryover, and zero-action Perks.
[x] Update README, Architecture, Product-Brief, Work-Plan, and Verification to describe movement and action forfeiture without Wait.
[x] Run focused checks, npm run verify, and npm run test:e2e; review the diff and prepare the completed branch for final save/push.

## Open questions
- None. The current full-game command boundary already blocks paid actions during the Monster Phase and resets the next Hero's allowance. A projection-only budget change avoids invalidating existing replay-validated saves.


## Execution notes
- Resolved plan checkpoint: `7a7674e` (Plan removal of the invented Wait action).
- Focused checks passed (27 tests). Final checks passed: build/typecheck, 88 unit tests, five repository tests, and 35 Chromium browser tests.
- Updated three unit/session test files and both affected browser suites, including pending Monster Phase save/resume and no carryover. Public fixtures remain synthetic; private data is excluded.
- Implementation and validation are complete. Git history and the completion response record the final commit and push.
