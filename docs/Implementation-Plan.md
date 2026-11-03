# Plan

Preserve private components outside disposable worktrees with validated archival and restore commands, and check the original browser origin before asking the owner to recreate any data.

## Scope
- In: A private store under the owner's Documents folder, immutable validated snapshots, explicit backup/restore commands, a startup restore when available, synthetic regression tests, and recovery/storage documentation.
- Out: Public game content, guessed replacement components, automatic cloud uploads, changes to rules or save formats, and reconstructing the original evidence photos from a runtime save.

## Action items
- [x] Read README, Game-Data-Checklist, Game-Data-Format, Local-Saves, Architecture, and packet/endpoint tests.
- [ ] Check the original browser origin for cached components and saves; preserve any recovered content without overwriting other games.
- [ ] Add a durable private archive with integrity checks, restrictive permissions, non-destructive restoration, and clear missing-data reporting.
- [ ] Add npm commands and restore from the archive before local development when available.
- [ ] Add synthetic tests for archival/restoration, malformed input, corruption, and overwrite protection.
- [ ] Update canonical storage/recovery docs and README with exact commands and limitations.
- [ ] Run focused tests, npm run verify, and npm run test:e2e; inspect publication boundaries and save/push the feature branch.

## Open questions
- None. Use ~/Documents/BoardBot Private Data by default; an explicit environment override supports other owner-controlled backup locations. Creating the store does not mean the missing packet has been recovered.
