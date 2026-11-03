# Plan

Make physical pieces readable above the illustrated map and keep committed action feedback visible beside the board without changing rules, command timing, or saves.

## Scope
- In: A UI refinement branch based on the preserved private-data work; larger distinct physical piece presentation, grouped counters, visible action/event feedback and changed-location emphasis, accessibility and responsive coverage, canonical UI docs.
- Out: Map repainting, rule/data changes, save migrations, hidden-state animation, and automatic advance through required player choices.

## Action items
- [x] Read README, UI-Design, Architecture, existing board/workspace tests, and inspect the committed-event and focus boundaries.
- [x] Refine the board piece layer with distinct silhouettes/bases, counters, unclipped elevation above locations, and pointer-transparent artwork.
- [x] Add view-only changed-location comparisons and an always-visible event navigator for each committed action; preserve focus, pending decisions, and reduced-motion preferences.
- [x] Add focused tests for crowded pieces, click-through, hidden information, event stepping, saved-result timing, and responsive layouts.
- [x] Update README, UI-Design, Architecture, Work-Plan, and Verification with the refined behavior and acceptance limits.
- [ ] Run focused checks, npm run verify, and npm run test:e2e; inspect the live recovered game without advancing the owner's save.
- [ ] Commit checkpoints and push the completed feature branch.

## Open questions
- None. Keep the current original artwork and use code-native pieces; changed-location hints compare public views only. Give events manual Previous/Next controls, with no timed playback or extra game commands.

## Implementation and validation evidence

- Separate native SVG piece layer, larger original standee/miniature/token silhouettes, attached quantity badges and staggered crowded groups. Separate public-change rings preserve legal destination strokes. No map paint, engine, data or save changes.
- Persistent event review waits for the committed save, explains Move/Pick Up with public outcomes, preserves required choices/focus, and starts at the latest saved event after resume. Event stepping never submits a game command.
- New unit/browser suites: actionFeedback.test.ts and action-feedback.spec.ts; updated GameBoard.test.ts and board-workspace.spec.ts for raised pieces, count proximity and click-through.
- Focused feedback browser checks: 14/14 Chromium/WebKit. Final crowded/raised layout checks: 6/6 Chromium/WebKit. All 171 unit tests, build/type checks and 12 repository tests passed via npm run verify. Full browser suite running.
- A screenshot caught a foreignObject count-painting offset that geometry checks alone missed. Replaced that counter layer with native SVG; inspected the corrected painting. Live owner save was resumed for inspection only, without submitting a game command.

- Full-suite first pass found a fractionally clipped Confirm choice at enlarged text/short windows. Added response-control scroll margin; the existing strict viewport test and axe checks then passed in both Chromium and WebKit (6/6), without weakening their assertions. Full suite restarted after that correction.
