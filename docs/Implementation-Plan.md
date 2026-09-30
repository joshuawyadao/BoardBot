# Plan

Apply the agreed floating action tray and right-side event log to the synthetic practice table. Commit movement when a highlighted destination is chosen, keep confirmation for the sample Wait action, and end the Hero Phase only through an explicit command. Preserve a clear boundary between working sample behavior and planned Horrified actions.

## Scope
- In: Larger map with a reserved bottom tray, stable unavailable-action explanations, immediate movement, explicit early/zero-action phase ending, retained session log, focused tests, and canonical documentation updates on `feat/solo-game-shell` and existing PR #1.
- Out: Full Horrified rules or component data, functional perks or monster resolution, saves, third-party artwork or copied rulebook text, merging the PR.

## Action items
[x] Inspect README, Architecture, Product-Brief, Work-Plan, Roadmap, Verification, current engine/session/UI tests, and existing PR state.
[x] Checkpoint the resolved plan before implementation.
[x] Add a revision-checked end-phase command in the sample engine/session. Keep the phase ready at zero actions, reject paid actions there, and reject ending during resolution or replaying stale commands.
[x] Recompose the board, bottom floating tray, and right-side log. Keep planned actions visible and inspectable but non-executable; retain Wait as an explicitly synthetic confirmation exercise.
[x] Execute legal board destinations immediately after selecting Move; preserve duplicate guards, keyboard access, resolution locking, and explanatory hover/focus/tap behavior.
[x] Update engine/session/browser coverage for explicit phase ending, immediate movement, unavailable actions, responsive geometry, stable help, and log reading position.
[x] Update README, Product-Brief, Architecture, Work-Plan, Roadmap, and Verification to distinguish implemented behavior from the agreed future free-perk and monster requirements.
[x] Run `npm run verify` and `npm run test:e2e`, inspect the browser, review the diff, and correct regressions.
[x] Save and push the branch, update existing PR #1, and check its CI/review/mergeability status without merging.

## Open questions
- None. Destination selection executes movement. Other consequential choices retain confirmation. End Hero Phase is explicit even when no paid actions remain; future eligible perks remain available independently of the paid-action budget.

## Verification and review ledger
- Plan checkpoint: `c00652b` — Plan the floating action tray and explicit phase ending.
- Local verification passed: `npm run verify` (type checking, production build, 8 engine/session tests, 5 repository tests) and `npm run test:e2e` (8 browser tests).
- Browser coverage includes direct movement, duplicate/stale commands, keyboard confirmation, early and zero-action phase ending, locked resolution, unavailable-card explanations, desktop/mobile geometry, and retained log reading position.
- Two initial browser fixture failures were corrected: compare help layout after scrolling into view, and generate enough session entries to exercise log overflow. The full browser suite then passed.
- Desktop visual inspection confirmed that the tray clears all map locations and the event log occupies the right rail. The temporary viewport override was reset after inspection. Safari and a screen reader were not manually tested.
- Brooks review found no actionable concerns. Rules, session orchestration, and UI remain separate; planned cards cannot dispatch gameplay commands.
- Existing external Codex review requested on PR #1 previously timed out after repeated polling and is still unanswered. This remains a review blocker, not a passing review. No Codex feedback or reactions were available to handle.
- Implementation saved and pushed as `e9391ee` — Add floating actions and explicit Hero Phase ending. [PR #1](https://github.com/joshuawyadao/BoardBot/pull/1) was updated to describe the complete branch scope and remains a draft.
- [CI Verify](https://github.com/joshuawyadao/BoardBot/actions/runs/36606723257/job/109537528893) passed on `e9391ee`. GitHub reported the branch mergeable; the final review-thread read contained no threads. There were no CI fixes or merge conflicts to resolve. The final documentation checkpoint requires the normal CI rerun after push.
- Completion state: implementation and local validation complete; PR not merge-ready because external Codex review has no response. Resume `pr-review-cycle` on PR #1 when review is available. No merge was performed.
- This is a synthetic interaction prototype. Real heroes, monsters, items, perks, persistence, and Horrified legality remain future work dependent on verified game data.
