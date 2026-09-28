# Plan

Build a local React and TypeScript interaction prototype on `feat/solo-game-shell`. Use synthetic data and a small independent rules engine to exercise the agreed select, confirm, resolve flow; preserve the durable Work-Plan and its unverified game-data dependencies.

## Scope
- In: Vite/React shell, original labeled sample map, sample hero/actions, remaining actions, descriptions on hover/focus, bottom confirmation, locked resolution, sample turn completion/restart, focused engine and browser tests, setup docs and CI.
- Out: Actual Horrified rules/assets/heroes, monsters, randomness, persistence, accounts, bots, desktop packaging, and merging the PR.

## Action items
[x] Inspect repository guidance, existing tests and architecture; create the requested feature branch and ongoing goal.
[x] Add pinned React/TypeScript/Vite tooling, test commands and a clean lockfile.
[x] Build a pure synthetic rules engine with authoritative legality, explicit resolution IDs and rejection without mutation; test costs, invalid movement, duplicate/stale commands and turn completion.
[x] Build the responsive browser shell and small session adapter with selection/review/confirm, accessible descriptions, visible resolution locking and sample turn reset.
[x] Add browser tests for free selection, keyboard use, confirmation, resolution locking and a complete sample turn; inspect the rendered interface.
[x] Update README, AGENTS, architecture, product/roadmap status and verification docs, preserving durable requirements; extend CI and dependency updates.
[x] Run repository checks, type checking, engine tests, browser tests and production build. Verify no external runtime requests and record actual platform limitations.
[x] Commit and push, open/attach a draft PR, request Codex review, run Brooks review and follow checks/feedback to a terminal result; do not merge.

## Open questions
- None. Use Node 24, React, TypeScript and Vite; exact versions and lockfile are recorded in the repository. The prototype resets on reload and says so explicitly. A synthetic turn ends after three one-action moves or waits; it does not model any real game's action allowance.

## Validation and review ledger

- Build and typecheck passed; three engine tests and five repository tooling tests passed.
- Four Chromium browser tests passed after replacing the implicit destination label with an explicit label/control association. The tests cover same-tick repeat confirmation, resolution locking, keyboard completion/restart, local-only requests/reload reset, and a narrow viewport. Resolution tests pause the clock to avoid wall-clock races.
- Manually inspected the local UI in the in-app browser and confirmed a move, the lock, updated allowance and history. Tested host: macOS 27 arm64, Node 24.19; this does not certify all M1/browser combinations.
- PR #1 opened as draft; Codex review requested. Initial poll: no feedback yet; CI Verify running; no merge conflicts.
- Brooks PR review: 100/100, no actionable findings across the engine, session, UI, tests, and configuration. Generated lockfile excluded. The initial scaffold is a large but coherent slice; no speculative plugin/bot framework or UI-owned rule validation was introduced. Review does not certify real-game accuracy, persistence, Safari, or full assistive-technology behavior.
- CI Verify passed on the first PR run (46 seconds). No CI fixes or merge-conflict resolution were required. Codex review timed out after more than five minutes of repeated conversation/review-thread checks (request 19:25:55 UTC; final poll 19:31:31 UTC). No bot review or comments arrived. This external review gate is blocked, so PR #1 remains a draft and is not declared merge-ready. Resume the PR review cycle on PR #1 when review becomes available.
