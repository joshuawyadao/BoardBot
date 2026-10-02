# Plan

Audit the solo game against the verified component evidence and accepted rules, then add independent rule assertions and exercise the app through ordinary browser controls. Reuse the existing complete-game suite, add coverage for concrete gaps, and record actual prepared-data browser evidence separately from synthetic tests.

## Scope
- In: All five solo Heroes, shared actions and Perks, Beholder/Displacer challenges and Monster phases, rule-focused automated tests, isolated real-data browser playthroughs, fixes for reproduced defects, verification documentation, commit and push.
- Out: New rule interpretations without user input, other Monsters or multiplayer, changing the user's live game, publication of private component text/assets/saves, and claiming exhaustive rules correctness or human acceptance.

## Action items
[x] Read canonical data/rules, architecture and save boundaries; inspect existing tests and delegate separate read-only audits of shared actions and Monster resolution.
[ ] Checkpoint this plan before implementation.
[ ] Add focused synthetic rule tests from the audits with expected outcomes anchored in the canonical rules, fixing any reproduced implementation defects with save compatibility considered.
[ ] Add browser assertions for currently under-tested rule consequences using ordinary actions and choices, including costs, d20 adjustments, and ineligible controls as appropriate.
[ ] Add an opt-in isolated browser check for the prepared private components and run complete games without modifying the user's browser or committing private output.
[ ] Run targeted checks, npm run verify, npm run test:e2e, npm run test:production, and the opt-in private check; investigate failures without weakening expectations.
[ ] Update Verification.md and relevant canonical docs with findings, tested scope, remaining interpretation limits, and any behavior or save compatibility changes.
[ ] Commit and push the verified task-owned changes and report any remaining user decision.

## Open questions
- None blocking implementation. Existing accepted interpretations remain authoritative; stop for input only if new conflicting evidence requires a rule choice.
