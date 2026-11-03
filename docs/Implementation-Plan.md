# Plan

Preserve private components outside disposable worktrees with validated archival and restore commands, and check the original browser origin before asking the owner to recreate any data.

## Scope
- In: A private store under the owner's Documents folder, immutable validated snapshots, explicit backup/restore commands, an explicit private-development startup restore when available, synthetic regression tests, and recovery/storage documentation.
- Out: Public game content, guessed replacement components, automatic cloud uploads, changes to rules or save formats, and reconstructing the original evidence photos from a runtime save.

## Action items
- [x] Read README, Game-Data-Checklist, Game-Data-Format, Local-Saves, Architecture, and packet/endpoint tests.
- [x] Check the original browser origin for cached components and saves; preserve any recovered content without overwriting other games.
- [x] Add a durable private archive with integrity checks, restrictive permissions, non-destructive restoration, and clear missing-data reporting.
- [x] Add npm commands and restore before `dev:private`; preserve plain `dev` for isolated public/synthetic tests.
- [x] Add synthetic tests for archival/restoration, malformed input, corruption, and overwrite protection.
- [x] Update canonical storage/recovery docs and README with exact commands and limitations.
- [x] Run focused tests, npm run verify, and npm run test:e2e; inspect publication boundaries and save the feature branch. Firefox runtime verification is limited by the local launch failure recorded below.

## Open questions
- None. Use ~/Documents/BoardBot Private Data by default; an explicit environment override supports other owner-controlled backup locations. Creating the store does not mean the missing packet has been recovered.

## Recovery evidence

The original in-app-browser origin at 127.0.0.1:5173 retained base components and a Cleric turn-3 save. The app resumed it through replay validation; Export backup produced a self-contained save. That save was archived in the durable Documents store and its components restored into this checkout. The original packet/photos remain unlocated; they are not required to resume this recovered game. Private files remain outside Git.

## Validation

- Focused private-store suite: 11/11 synthetic cases passed, including save-component recovery, exact export retention, integrity failure, nested paths, symlinks, and non-overwrite restoration.
- `npm run verify`: build, 166 unit tests, repository policy checks, and 12 repository tests passed.
- `npm run test:e2e`: 214 cases passed across Chromium and WebKit. All 107 Firefox cases failed before test execution because the local browser reported `Could not find profile folder`. A standalone `firefox.launch()` with no app or URL reproduces the failure, including with `TMPDIR=/private/tmp`; this is an environment limitation, not a verified Firefox application result.
- Independent read-only archive safety review: no actionable data-loss or path-boundary findings.
- Live recovery: original browser save resumed, exported, archived, restored, and restored idempotently. Source packet/photos remain missing.
- Save sequence: plan checkpoint `e3c2a95`, implementation checkpoint `309305c`, final verification record committed separately on `codex/durable-private-data`.
