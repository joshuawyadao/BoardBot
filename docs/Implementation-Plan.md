# Plan

Add a Delete option to each saved adventure, with an explicit confirmation naming the selected game. Remove its current and recovery saves atomically while retaining shared base components and other adventures; reject deletion if another tab has changed the selected save.

## Scope
- In: Per-game deletion, accessible confirmation/cancel, failure feedback, concurrency protection, synthetic storage/browser tests, relevant docs, and final branch save/push.
- Out: Deleting any real user save during development, bulk deletion, automatic cleanup of shared data, changes to gameplay or save formats, PR creation or merging.

## Action items
[x] Inspect the saved-game library, home-screen controls, persistence contracts, and existing browser tests.
[x] Checkpoint this resolved plan on the current feature branch (`4f5796c`).
[x] Add `LibraryGame.version` and `GameLibrary.deleteGame(id, expectedVersion)` with an atomic comparison of both save-slot tokens before deleting only that game's record.
[x] Add a Delete control and keyboard-accessible confirmation to each saved game, including cancellation, busy handling, and clear failure feedback.
[x] Cover cancel/confirm, surviving games and shared components, removal of recovery saves, storage failure, stale deletion/writers, and legacy migration persistence using isolated synthetic tests.
[x] Update README, Local-Saves, Architecture, and Verification; run focused tests, npm run verify, and npm run test:e2e before the final branch save.

## Validation and save
- `npm run verify`: build/typecheck, 101 unit tests in 18 files, and five repository tests passed.
- `npm run test:e2e`: all 62 Chromium browser tests passed. Seven new cases cover storage and the end-to-end deletion flow.
- Isolated synthetic screenshots at 1440×900 and 390×844 show an accessible confirmation without horizontal overflow or runtime errors; development did not delete real user saves.
- Final save target: `codex/identify-remaining-boardbot-work`. Private data and screenshots remain outside Git.

## Open questions
- None. Deletion removes the selected adventure and its previous recovery save after confirmation. Existing exported backups and shared base game components remain available.
