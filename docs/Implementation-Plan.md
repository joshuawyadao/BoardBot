# Plan

Make physical pieces readable above the illustrated map and keep committed action feedback visible beside the board without changing rules, command timing, or saves.

## Scope
- In: A UI refinement branch based on the preserved private-data work; larger distinct physical piece presentation, grouped counters, visible action/event feedback and changed-location emphasis, accessibility and responsive coverage, canonical UI docs.
- Out: Map repainting, rule/data changes, save migrations, hidden-state animation, and automatic advance through required player choices.

## Action items
- [x] Read README, UI-Design, Architecture, existing board/workspace tests, and inspect the committed-event and focus boundaries.
- [ ] Refine the board piece layer with distinct silhouettes/bases, counters, unclipped elevation above locations, and pointer-transparent artwork.
- [ ] Add view-only changed-location comparisons and an always-visible event navigator for each committed action; preserve focus, pending decisions, and reduced-motion preferences.
- [ ] Add focused tests for crowded pieces, click-through, hidden information, event stepping, saved-result timing, and responsive layouts.
- [ ] Update README, UI-Design, Architecture, Work-Plan, and Verification with the refined behavior and acceptance limits.
- [ ] Run focused checks, npm run verify, and npm run test:e2e; inspect the live recovered game without advancing the owner's save.
- [ ] Commit checkpoints and push the completed feature branch.

## Open questions
- None. Keep the current original artwork and use code-native pieces; changed-location hints compare public views only. Give events manual Previous/Next controls, with no timed playback or extra game commands.
