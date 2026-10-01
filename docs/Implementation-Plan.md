# Plan

Remove the invented Wait action and use explicit End Hero Phase to forfeit remaining actions. Keep zero-action Perks available before the phase ends and preserve existing solo saves.

## Scope
- In: Sample engine and controls, phase-end action budgets, focused unit/browser regressions, current behavior documentation, checkpoint commits and final branch push.
- Out: New game actions, rules interpretations, onboarding changes, save-format migrations, multiplayer, PR creation, and merging.

## Action items
[x] Inspect README, Architecture, Rules-Reference, Game-Data-Checklist, Verification, sample action/session code, solo phase transitions, and related tests.
[ ] Checkpoint the resolved plan on the existing feature branch.
[ ] Remove Wait from the sample engine and UI, including obsolete confirmation controls and styles; clear unused actions on sample phase end.
[ ] Expose zero usable actions outside the solo Hero Phase through the engine projection, preserving internal replay snapshots and existing save compatibility; explain forfeiture beside the phase controls.
[ ] Update sample engine/session and browser tests to use actual moves, preserving duplicate, stale, keyboard, collapse, and log coverage; verify early end, no action carryover, and zero-action Perks.
[ ] Update README, Architecture, Product-Brief, Work-Plan, and Verification to describe movement and action forfeiture without Wait.
[ ] Run focused checks, npm run verify, and npm run test:e2e; review the diff and save/push the completed branch.

## Open questions
- None. The current full-game command boundary already blocks paid actions during the Monster Phase and resets the next Hero's allowance. A projection-only budget change avoids invalidating existing replay-validated saves.
