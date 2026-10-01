# Plan

Continue the six-task solo-game goal by closing the remaining automated acceptance gaps: complete a victory through ordinary browser controls and verify the production build can start, play, and resume with external network requests blocked. Preserve gameplay and saved-state semantics, then make the remaining human playtest gate explicit.

## Scope
- In: Synthetic browser victory coverage for the base Heroes, built-app local-only startup and save/reload checks, accurate milestone/evidence documentation, a concise human playtest checklist, fixes for any reproduced defects, and final save/push.
- Out: Declaring human play acceptance complete without feedback, changing accepted rules, disconnecting the user's computer, controlling the user's live game, redistributing private content, other Monsters, strategic bots, or PR creation/merging.

## Action items
[x] Review the six-task goal, durable work plan, verified rules/data boundaries, existing complete-game engine tests, and current browser coverage.
[x] Checkpoint the resolved plan on the current feature branch (`4072397`).
[x] Add synthetic complete-victory browser tests using only ordinary controls, including Item selection, Advance/Defeat, required choices, end-state locking, and exact save/resume.
[x] Add a production-build acceptance test using an isolated preview and browser, blocking external requests while exercising cached base data, Hero setup, play, pending recovery, and a complete loss path.
[x] Inspect any failures, fix reproduced defects without guessing rules, and run targeted checks followed by npm run verify and npm run test:e2e plus the production acceptance command. All checks passed; no app defect was reproduced. Keyboard tests wait for controls to become enabled before pressing Enter.
[x] Reconcile stale implementation-status wording in the canonical rules/data and milestone docs; record supported evidence and add a short owner playthrough checklist without treating automation as human acceptance.
[x] Prepare the final task-owned save/push and remaining human feedback handoff. Verification: build/typecheck, 101 unit tests, five repository tests, 67 browser tests, and one production acceptance test passed. Human acceptance remains open.

## Open questions
- No implementation blocker. An optional question about whether the owner has finished a full game is pending; until answered, complete human play acceptance stays open. Real private-data victory and OS-level network disconnection have not been demonstrated by the existing tests.
