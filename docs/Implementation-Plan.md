# Plan

Continue the six-task solo-game goal by closing the remaining automated acceptance gaps: complete a victory through ordinary browser controls and verify the production build can start, play, and resume with external network requests blocked. Preserve gameplay and saved-state semantics, then make the remaining human playtest gate explicit.

## Scope
- In: Synthetic browser victory coverage for the base Heroes, built-app local-only startup and save/reload checks, accurate milestone/evidence documentation, a concise human playtest checklist, fixes for any reproduced defects, and final save/push.
- Out: Declaring human play acceptance complete without feedback, changing accepted rules, disconnecting the user's computer, controlling the user's live game, redistributing private content, other Monsters, strategic bots, or PR creation/merging.

## Action items
[x] Review the six-task goal, durable work plan, verified rules/data boundaries, existing complete-game engine tests, and current browser coverage.
[ ] Checkpoint the resolved plan on the current feature branch.
[ ] Add synthetic complete-victory browser tests using only ordinary controls, including Item selection, Advance/Defeat, required choices, end-state locking, and exact save/resume.
[ ] Add a production-build acceptance test using an isolated preview and browser, blocking external requests while exercising cached base data, Hero setup, play, pending recovery, and a complete loss path.
[ ] Inspect any failures, fix reproduced defects without guessing rules, and run targeted checks followed by npm run verify and npm run test:e2e plus the production acceptance command.
[ ] Reconcile stale implementation-status wording in the canonical rules/data and milestone docs; record supported evidence and add a short owner playthrough checklist without treating automation as human acceptance.
[ ] Save and push task-owned changes; ask for the remaining human outcome/feedback when autonomous checks are complete.

## Open questions
- No implementation blocker. An optional question about whether the owner has finished a full game is pending; until answered, complete human play acceptance stays open. Real private-data victory and OS-level network disconnection have not been demonstrated by the existing tests.
