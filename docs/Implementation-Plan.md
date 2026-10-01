# Plan

Add a Delete option to each saved adventure, with an explicit confirmation naming the selected game. Remove its current and recovery saves atomically while retaining shared base components and other adventures; reject deletion if another tab has changed the selected save.

## Scope
- In: Per-game deletion, accessible confirmation/cancel, failure feedback, concurrency protection, synthetic storage/browser tests, relevant docs, and final branch save/push.
- Out: Deleting any real user save during development, bulk deletion, automatic cleanup of shared data, changes to gameplay or save formats, PR creation or merging.

## Action items
[x] Inspect the saved-game library, home-screen controls, persistence contracts, and existing browser tests.
[ ] Checkpoint this resolved plan on the current feature branch.
[ ] Add `LibraryGame.version` and `GameLibrary.deleteGame(id, expectedVersion)` with an atomic comparison of both save-slot tokens before deleting only that game's record.
[ ] Add a Delete control and keyboard-accessible confirmation to each saved game, including cancellation, busy handling, and clear failure feedback.
[ ] Cover cancel/confirm, surviving games and shared components, removal of recovery saves, storage failure, stale deletion/writers, and legacy migration persistence using isolated synthetic tests.
[ ] Update README, Local-Saves, Architecture, and Verification; run focused tests, npm run verify, and npm run test:e2e, then commit and push task-owned changes.

## Open questions
- None. Deletion removes the selected adventure and its previous recovery save after confirmation. Existing exported backups and shared base game components remain available.
