# Plan

Build a local React and TypeScript interaction prototype on `feat/solo-game-shell`. Use synthetic data and a small independent rules engine to exercise the agreed select, confirm, resolve flow; preserve the durable Work-Plan and its unverified game-data dependencies.

## Scope
- In: Vite/React shell, original labeled sample map, sample hero/actions, remaining actions, descriptions on hover/focus, bottom confirmation, locked resolution, sample turn completion/restart, focused engine and browser tests, setup docs and CI.
- Out: Actual Horrified rules/assets/heroes, monsters, randomness, persistence, accounts, bots, desktop packaging, and merging the PR.

## Action items
[x] Inspect repository guidance, existing tests and architecture; create the requested feature branch and ongoing goal.
[ ] Add pinned React/TypeScript/Vite tooling, test commands and a clean lockfile.
[ ] Build a pure synthetic rules engine with authoritative legality, explicit resolution IDs and rejection without mutation; test costs, invalid movement, duplicate/stale commands and turn completion.
[ ] Build the responsive browser shell and small session adapter with selection/review/confirm, accessible descriptions, visible resolution locking and sample turn reset.
[ ] Add browser tests for free selection, keyboard use, confirmation, resolution locking and a complete sample turn; inspect the rendered interface.
[ ] Update README, AGENTS, architecture, product/roadmap status and verification docs, preserving durable requirements; extend CI and dependency updates.
[ ] Run repository checks, type checking, engine tests, browser tests and production build. Verify no external runtime requests and record actual platform limitations.
[ ] Commit and push, open/attach a draft PR, request Codex review, run Brooks review and follow checks/feedback to a terminal result; do not merge.

## Open questions
- None. Use Node 24, React, TypeScript and Vite; exact versions and lockfile are recorded in the repository. The prototype resets on reload and says so explicitly. A synthetic turn ends after three one-action moves or waits; it does not model any real game's action allowance.
