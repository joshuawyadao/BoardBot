# Working on BoardBot

BoardBot is a public, early-stage project for solo board-game play and playtesting with bots on a computer. Read `README.md` and relevant files under `docs/` before making changes. The selected first game milestone is the original Horrified: Dungeons & Dragons, with a local React browser interface on an M1 MacBook Pro. A synthetic React interaction prototype exists; no Horrified game is playable yet. Preserve the distinction between finalized planning and implemented behavior; treat unresolved entries in `docs/Game-Data-Checklist.md` as dependencies, not guessed rules.

- Before game-data or rules work, read `docs/Game-Data-Checklist.md` and `docs/Rules-Reference.md`. They preserve completed component verification, accepted working interpretations, source grades, private evidence access, and open cases. Do not restart source searches or photo requests for completed entries; reopen only a specific gap or conflicting/new evidence. Raw historical proposals do not override the canonical accepted interpretations.

- Keep work scoped and use `docs/Implementation-Plan.md` only for temporary, per-task tracking; it may be replaced by the implementation workflow. Preserve `docs/Work-Plan.md` as the durable detailed baseline and `docs/Roadmap.md` as the milestone overview. Update these intentionally when agreed direction changes, and preserve their requirements when merging feature branches. Record durable product/architecture choices in the relevant canonical docs.
- Run `npm run verify` and `npm run test:e2e` before submitting application changes; run `./scripts/verify-repository.sh` for repository-only changes. Add focused tests for changed executable behavior; sample engine and browser tests do not validate Horrified gameplay.
- Keep rules, bot decisions, session orchestration, and UI separate as described in `docs/Architecture.md`. Test legal moves, hidden information, deterministic replay, and end conditions when they are implemented.
- Do not commit credentials, personal data, private game prototypes, generated artifacts, or third-party content without documented publication rights. Use synthetic fixtures and preserve license notices.
- Avoid paid services, telemetry, accounts, or external AI dependencies without an explicit product decision. Never describe planned features as available.
- Keep Git operations sequential, stage task-owned files explicitly, and preserve unrelated work. Use a feature branch and pull request for `main`; direct pushes are blocked. Do not merge a pull request unless the user explicitly requests it.
- When delegating, assign a bounded responsibility and file ownership; avoid overlapping edits and integrate the resulting verification.

These instructions are tool-neutral; contributing does not require a proprietary assistant or personal skill installation.
