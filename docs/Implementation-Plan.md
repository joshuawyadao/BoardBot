# Plan

Load the prepared base game automatically and start a new game after Hero selection. Keep immutable component data separate from independent autosaved games, with a saved-games screen and compatibility for existing saves and backups.

## Scope
- In: Private local prepared-data loading and browser cache; New Game and Hero selection; multiple independent browser saves; shared versioned base data; migration of the current/previous save; recovery and backup compatibility; tests, docs, checkpoints, final push.
- Out: Automatically written Mac-folder files (the user chose in-app saves), public game-content distribution, rule changes, additional Monsters, multiplayer, cloud storage, PR creation, merging.

## Action items
[x] Inspect initialization, persistence, data validation, canonical docs, and existing recovery/browser tests; resolve browser records versus filesystem saves with the user.
[x] Checkpoint the resolved plan on the existing feature branch.
[ ] Add a bounded same-origin local-server endpoint for the ignored prepared data, without including private content in public builds; validate and cache data in the browser.
[ ] Add a game library with immutable data versions and separate current/previous records per game; migrate old saves without deleting their source; preserve atomic writes and stale-writer protection.
[ ] Replace file-import-first setup with a New Game / Hero selection flow and saved-games list; retain advanced import/export and sample access, exact retry behavior, and explicit recovery.
[ ] Cover default/cached startup, missing or invalid prepared data, independent games, new-game cancellation, migration, backup import, pending results, write failure, and conflicting tabs.
[ ] Update README, Local-Saves, Game-Data-Format, Architecture, Product-Brief, Work-Plan, and Verification for the new startup and storage behavior.
[ ] Run focused tests, npm run verify, and npm run test:e2e; inspect isolated browser views, review publication boundaries, commit and push the completed work.

## Open questions
- None. The user chose separate autosaved games in the app with optional JSON backups. Prepared content remains private and local; a fresh public clone without that content exposes one-time import and the synthetic sample. Existing games stay pinned to their original data version.
