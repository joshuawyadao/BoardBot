# Plan

Apply the agreed floating action tray and right-side event log to the synthetic practice table. Commit movement when a highlighted destination is chosen, keep confirmation for the sample Wait action, and end the Hero Phase only through an explicit command. Preserve a clear boundary between working sample behavior and planned Horrified actions.

## Scope
- In: Larger map with a reserved bottom tray, stable unavailable-action explanations, immediate movement, explicit early/zero-action phase ending, retained session log, focused tests, and canonical documentation updates on `feat/solo-game-shell` and existing PR #1.
- Out: Full Horrified rules or component data, functional perks or monster resolution, saves, third-party artwork or copied rulebook text, merging the PR.

## Action items
[x] Inspect README, Architecture, Product-Brief, Work-Plan, Roadmap, Verification, current engine/session/UI tests, and existing PR state.
[ ] Checkpoint the resolved plan before implementation.
[ ] Add a revision-checked end-phase command in the sample engine/session. Keep the phase ready at zero actions, reject paid actions there, and reject ending during resolution or replaying stale commands.
[ ] Recompose the board, bottom floating tray, and right-side log. Keep planned actions visible and inspectable but non-executable; retain Wait as an explicitly synthetic confirmation exercise.
[ ] Execute legal board destinations immediately after selecting Move; preserve duplicate guards, keyboard access, resolution locking, and explanatory hover/focus/tap behavior.
[ ] Update engine/session/browser coverage for explicit phase ending, immediate movement, unavailable actions, responsive geometry, stable help, and log reading position.
[ ] Update README, Product-Brief, Architecture, Work-Plan, Roadmap, and Verification to distinguish implemented behavior from the agreed future free-perk and monster requirements.
[ ] Run `npm run verify` and `npm run test:e2e`, inspect the browser, review the diff, and correct regressions.
[ ] Save and push the branch, update existing PR #1, and check its CI/review/mergeability status without merging.

## Open questions
- None. Destination selection executes movement. Other consequential choices retain confirmation. End Hero Phase is explicit even when no paid actions remain; future eligible perks remain available independently of the paid-action budget.
