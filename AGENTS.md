# Working on BoardBot

BoardBot is a public, early-stage project for solo board-game play and playtesting with bots on a computer. Read `README.md` and relevant files under `docs/` before making changes. No playable game, app stack, or runtime storage format has been chosen yet; preserve that distinction in public documentation.

- Keep work scoped and update `docs/Implementation-Plan.md` for implementation tasks. Record durable product/architecture choices in the relevant canonical docs.
- Run `./scripts/verify-repository.sh` before submitting changes. Add focused tests for changed executable behavior; do not imply repository checks validate gameplay.
- Keep rules, bot decisions, session orchestration, and UI separate as described in `docs/Architecture.md`. Test legal moves, hidden information, deterministic replay, and end conditions when they are implemented.
- Do not commit credentials, personal data, private game prototypes, generated artifacts, or third-party content without documented publication rights. Use synthetic fixtures and preserve license notices.
- Avoid paid services, telemetry, accounts, or external AI dependencies without an explicit product decision. Never describe planned features as available.
- Keep Git operations sequential, stage task-owned files explicitly, and preserve unrelated work. Do not merge a pull request unless the user explicitly requests it.
- When delegating, assign a bounded responsibility and file ownership; avoid overlapping edits and integrate the resulting verification.

These instructions are tool-neutral; contributing does not require a proprietary assistant or personal skill installation.
