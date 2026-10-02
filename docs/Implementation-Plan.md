# Plan

Audit the solo game against the verified component evidence and accepted rules, then add independent rule assertions and exercise the app through ordinary browser controls. Reuse the existing complete-game suite, add coverage for concrete gaps, and record actual prepared-data browser evidence separately from synthetic tests.

## Scope
- In: All five solo Heroes, shared actions and Perks, Beholder/Displacer challenges and Monster phases, rule-focused automated tests, isolated real-data browser playthroughs, fixes for reproduced defects, verification documentation, commit and push.
- Out: New rule interpretations without user input, other Monsters or multiplayer, changing the user's live game, publication of private component text/assets/saves, and claiming exhaustive rules correctness or human acceptance.

## Action items
[x] Read canonical data/rules, architecture and save boundaries; inspect existing tests and delegate separate read-only audits of shared actions and Monster resolution.
[x] Checkpoint this plan before implementation (`f8ac056`).
[x] Add seven focused engine tests for field placement, defeat boundaries, attack timing/retargeting, immediate Terror loss, and atomic rejection; no engine mismatch was reproduced.
[x] Add three browser tests for Ott overflow/reward closure, exact Mystra payment, draft cancellation, and Displacer field placement through ordinary controls.
[x] Fix the reproduced Mystra UI confirmation gap using the engine's choice validation, preserving engine semantics and existing saves.
[x] Add the opt-in prepared-component browser suite and complete a legal defeat game with exact pending/terminal reload for each Hero; the user's browser and private files remain untouched.
[x] Run targeted checks and all broader commands: build/typecheck, 108 unit tests, five repository tests, 70 public browser tests, one production test, and five prepared-data browser tests pass. Isolate test artifacts and finish config edits before live browser runs to avoid runner interference.
[x] Update Verification, Rules-Reference, Architecture, README, and Playtest-Checklist with the UI fix, evidence, source limits, and opt-in test command. Repeated Slowing penalties remain unverified; current behavior and saved-game semantics are unchanged.
[x] Prepare verified task-owned changes for final commit/push and the remaining rule-question handoff.

## Open questions
- None for this task. A future change to repeated Slowing Ray penalties needs an owner decision; this audit records the uncertainty without assuming a new interpretation. Human acceptance and real-data victory remain distinct from these automated defeat runs.
