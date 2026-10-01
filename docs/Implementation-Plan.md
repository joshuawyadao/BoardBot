# Plan

Make the Event log less prominent so the board remains the focus. Use a narrower right column, a short scrollable history, and an accessible hide/show control that retains the latest event without changing gameplay. Continue the existing six-task milestone; remaining Heroes and recovery remain open in Work-Plan.md.

## Scope
- In: Sample and Fighter Event log presentation, shared history behavior, compact right column, keyboard and scroll checks, documentation, commit and push on the current feature branch.
- Out: Rules, game-state changes, persistence, Hero support, other board layout changes, private data publication, PR creation or merging.

## Action items
[x] Inspect existing SessionLog, Fighter history, layout CSS, canonical interaction docs, and browser coverage.
[x] Checkpoint the resolved plan before implementation.
[x] Reuse a compact Event log in both tables, cap the scroll area at 240px, narrow the desktop right column to 240px, and add Hide/Show log with a latest-event preview while collapsed.
[x] Preserve all entries, reading position, and following new events; toggling must not submit a command or alter a pending choice.
[x] Extend browser tests for dimensions, keyboard collapse, latest-event updates, retained older history, and narrow viewports while preserving existing game/control checks.
[x] Update README.md, Product-Brief.md, Architecture.md, Work-Plan.md, and Verification.md to record the presentation change.
[x] Run npm run verify and npm run test:e2e under Node 26 and inspect synthetic renders.
[ ] Commit and push using save-branch. Keep private data and generated files ignored.

## Open questions
- None. Keep the compact history expanded initially, with optional collapse.

## Execution notes
- Plan checkpoint: `3981f7d`. Both tables now share the compact Event log; all entries and scroll behavior remain in presentation state.
- Build, 70 unit tests, five repository tests, and all 19 Chromium browser tests passed under Node 26.10.0. Synthetic desktop screenshots confirm the quieter log and added board width; browser checks cover 390px and 320px layouts. Final commit and push are recorded in Git and the completion response.
