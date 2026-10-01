# Plan

Load the prepared base game automatically and start a new game after Hero selection. Keep immutable component data separate from independent autosaved games, with a saved-games screen and compatibility for existing saves and backups.

## Scope
- In: Private local prepared-data loading and browser cache; New Game and Hero selection; multiple independent browser saves; shared versioned base data; migration of the current/previous save; recovery and backup compatibility; tests, docs, checkpoints, final push.
- Out: Automatically written Mac-folder files (the user chose in-app saves), public game-content distribution, rule changes, additional Monsters, multiplayer, cloud storage, PR creation, merging.

## Action items
[x] Inspect initialization, persistence, data validation, canonical docs, and existing recovery/browser tests; resolve browser records versus filesystem saves with the user.
[x] Checkpoint the resolved plan on the existing feature branch.
[x] Add a bounded same-origin local-server endpoint for the ignored prepared data, without including private content in public builds; validate and cache data in the browser.
[x] Add a game library with immutable data versions and separate current/previous records per game; migrate old saves without deleting their source; preserve atomic writes and stale-writer protection.
[x] Replace file-import-first setup with a New Game / Hero selection flow and saved-games list; retain advanced import/export and sample access, exact retry behavior, and explicit recovery.
[x] Cover default/cached startup, missing or invalid prepared data, independent games, new-game cancellation, migration, backup import, pending results, write failure, and conflicting tabs.
[x] Update README, Local-Saves, Game-Data-Format, Architecture, Product-Brief, Work-Plan, and Verification for the new startup and storage behavior.
[x] Run focused tests, npm run verify, and npm run test:e2e; inspect isolated browser views, review publication boundaries, and prepare the completed work for final commit and push.

## Open questions
- None. The user chose separate autosaved games in the app with optional JSON backups. Prepared content remains private and local; a fresh public clone without that content exposes one-time import and the synthetic sample. Existing games stay pinned to their original data version.


## Execution notes
- Plan checkpoint: `0253efa` (Plan automatic base-game loading and separate saved games).
- The user confirmed separate autosaved games in the app, with JSON backups; no automatic Mac-folder saves were added.
- Shared validation was moved to `src/data/localGameData.ts` so the private server route has no engine/session dependency. The portable save format and gameplay rules remain unchanged.
- `npm run verify` passed: build/typecheck, 97 unit tests, and five repository tests. `npm run test:e2e` passed all 52 Chromium tests.
- Isolated actual-data startup selected Wizard and opened the full 29-location board without a file picker; desktop/narrow visual checks found no page overflow or runtime errors. The live user browser was not accessed.
- README, Architecture, Local-Saves, Game-Data-Format, Product-Brief, Work-Plan, and Verification describe the implemented startup, independent saves, migration, and private-content boundary.
- Private data, saves, screenshots, and generated artifacts remain excluded. Git history and the completion response record the final save and push; broader human play acceptance remains unfinished.
