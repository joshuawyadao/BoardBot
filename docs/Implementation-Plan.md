# Plan

Continue the six-task milestone after the approved layout checkpoint. Add reliable local recovery, implement the remaining base Heroes from the verified packet, and validate the resulting solo game while preserving the compact table and private-content boundary.

## Scope
- In: Versioned saves, atomic local autosave before displaying committed results, resume and recovery, all five solo Heroes, focused rules and browser tests, disconnected-play checks, canonical docs, checkpoint commits and final branch push.
- Out: Multiplayer, additional Monsters, public redistribution of private game data, accounts, cloud storage, deployment, PR creation, and merging.

## Action items
[x] Inspect the engine, command/replay boundary, existing tests, and README, Architecture, Work-Plan, Roadmap, Game-Data-Checklist, Rules-Reference, Game-Data-Format, and Verification.
[ ] Checkpoint the resolved implementation plan on the existing feature branch.
[ ] Implement a versioned save codec that reconstructs and validates saved state through deterministic command replay, binds the exact data snapshot, and rejects malformed or incompatible saves.
[ ] Implement an IndexedDB adapter with atomic current/previous records and optimistic concurrency; retain the prior save when writes fail and reject a stale browser tab.
[ ] Integrate autosave, resume, explicit replacement, backup export/import, and visible retry/recovery into the UI. Keep an unsaved committed result for retry and block further commands until it is durable.
[ ] Implement and test Bard, Cleric, Rogue, and Wizard behavior from verified component fields and accepted interpretations; expose Hero selection only after the corresponding paths work.
[ ] Cover completed actions, pending d20 and Monster choices, malformed saves, failed writes, interruption, duplicate submissions, stale tabs, Hero outcomes, complete games, and local-only disconnected play with synthetic public fixtures.
[ ] Update README, AGENTS, Architecture, Product-Brief, Work-Plan, Roadmap, Game-Data-Format, and Verification to distinguish implemented behavior, automated evidence, human play acceptance, and publication gates.
[ ] Run focused checks, npm run verify, and npm run test:e2e under Node 26; inspect synthetic desktop/mobile renders, checkpoint coherent slices, and push with save-branch.

## Open questions
- None currently blocking. Use one saved game on this browser origin, with the previous successful save available for recovery. Store the imported private data locally with the session so reload does not require reimport; no upload occurs. Preserve the unsaved sample as a separate practice mode. Stop for user input if the Hero audit uncovers an unresolved rule.
