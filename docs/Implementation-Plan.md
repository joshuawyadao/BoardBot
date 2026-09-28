# Plan

Refine the existing solo-game shell from hands-on feedback: make board destinations obvious, keep action descriptions clear of controls, and present a compact session log. Preserve the sample rules, submission guards, synthetic-content labels, and the existing feature PR.

## Scope
- In: Board-based movement with visible legal destinations and keyboard support, stable inline action help, a scrolling chat-style log retained across sample turns until reload, focused tests and matching docs.
- Out: Actual Horrified content, persistence, undo, new game actions, and merging PR #1.

## Action items
[x] Inspect current app, tests, canonical docs and PR state; retain the existing feature branch.
[ ] Replace the destination dropdown with clearly highlighted board choices and clear movement instructions. Retain the current confirmation contract unless the user chooses immediate movement in the optional preference question.
[ ] Replace overlay tooltips with a reserved description area that updates on hover/focus without covering or shifting action buttons.
[ ] Keep an in-memory session log across sample turn resets, with numbered turns, readable entries, keyboard scrolling and a latest-entry control when reading older messages.
[ ] Update tests for board choice, illegal/duplicate input, keyboard movement, unobstructed hover changes, session log retention, auto-scroll and manual scroll preservation.
[ ] Update README, Product-Brief, Architecture, Roadmap, Work-Plan and Verification for the resulting interaction; preserve game-data dependencies.
[ ] Run npm run verify and npm run test:e2e, inspect desktop/narrow browser layouts, and address observed regressions.
[ ] Commit and push to feat/solo-game-shell, update PR #1 and inspect CI/review status without merging.

## Open questions
- None blocking the description/log improvements. An optional movement preference was requested; the existing select-then-confirm behavior remains the baseline unless the user chooses immediate movement.
