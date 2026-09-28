# Plan

Refine the existing solo-game shell from hands-on feedback: make board destinations obvious, keep action descriptions clear of controls, and present a compact session log. Preserve the sample rules, submission guards, synthetic-content labels, and the existing feature PR.

## Scope
- In: Board-based movement with visible legal destinations and keyboard support, stable inline action help, a scrolling chat-style log retained across sample turns until reload, focused tests and matching docs.
- Out: Actual Horrified content, persistence, undo, new game actions, and merging PR #1.

## Action items
[x] Inspect current app, tests, canonical docs and PR state; retain the existing feature branch.
[x] Replace the destination dropdown with clearly highlighted board choices and clear movement instructions. Retain the current confirmation contract unless the user chooses immediate movement in the optional preference question.
[x] Replace overlay tooltips with a reserved description area that updates on hover/focus without covering or shifting action buttons.
[x] Keep an in-memory session log across sample turn resets, with numbered turns, readable entries, keyboard scrolling and a latest-entry control when reading older messages.
[x] Update tests for board choice, illegal/duplicate input, keyboard movement, unobstructed hover changes, session log retention, auto-scroll and manual scroll preservation.
[x] Update README, Product-Brief, Architecture, Roadmap, Work-Plan and Verification for the resulting interaction; preserve game-data dependencies.
[x] Run npm run verify and npm run test:e2e, inspect desktop/narrow browser layouts, and address observed regressions.
[ ] Commit and push to feat/solo-game-shell, update PR #1 and inspect CI/review status without merging.

## Open questions
- None blocking the description/log improvements. An optional movement preference was requested; the existing select-then-confirm behavior remains the baseline unless the user chooses immediate movement.

## Validation and review

- `npm run verify`: build/typecheck, six engine/session tests, and five repository checks passed.
- `npm run test:e2e`: six Chromium tests passed, including overlay-free descriptions, board keyboard selection, retained session messages, and preserving the reader's scroll position. The log test waits for native Home scrolling to finish before checking its position.
- Manual in-app browser inspection verified highlighted destination selection by keyboard, a confirmed move, resolution locking and the new message. Mouse interaction is covered by Chromium tests.
- Incremental review found no actionable issues. Session revisions remain monotonic across turn resets so stale prior-turn commands cannot spend or append messages.
- Confirmation stays separate in this pass; the optional preference question has not received an answer. No scope change to actual game rules, persistence, or undo.
- PR #1 remains an existing draft; its earlier Codex review request has not received a response. CI on this follow-up is pending publication.
