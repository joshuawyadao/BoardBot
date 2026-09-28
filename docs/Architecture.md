# Architecture direction

This describes the finalized planning baseline, not implemented modules. The first interface is a local React browser app targeting an M1 MacBook Pro. The repository still contains only documentation, GitHub configuration, verification scripts, and their tests. Build tooling, package versions, storage technology, and supported browser versions will be pinned during implementation.

## Responsibilities

| Component | Owns | Boundary |
| --- | --- | --- |
| Verified game data | Board graph, component definitions, quantities, source/version records | Incomplete entries cannot silently become supported gameplay |
| Rules engine | State, legality, transitions, action costs, effects, end conditions | Independent of React, storage, and presentation |
| Session runner | Turn/phase progression, commands, injected randomness, required choices, event history | Applies commands once through the rules engine |
| React interface | Simplified board, action panel, descriptions, selections, confirmation, outcomes | Never duplicates rule decisions as a separate authority |
| Local persistence | Versioned snapshots, pending choices, committed random results, recovery | Loading validates data and never executes imported code |
| Future companion | Physical setup/tracking and sourced rules explanations | Reuses rules and data with a different interaction model |

Begin with small modules in one application. A general plugin system, remote backend, and strategic hero bots are unnecessary for the first milestone.

## Action-resolution contract

The interaction progresses through selecting, ready to confirm, resolving, optionally awaiting a required choice, and resolved/game over. These are conceptual states, not final code identifiers.

- Selecting or cancelling has no game-state effect. Confirm requires all inputs and current legality.
- The engine revalidates the submitted command, including phase and available resources. Invalid or duplicate commands must not spend an action, draw a card, roll again, or otherwise change state.
- Ordinary action controls lock at submission, before animation or delayed processing. Required follow-up choices are distinct commands tied to the active resolution.
- Monster phases follow the rules but can pause for player-controlled ties, defenses, effect ordering, or other decisions. Automation must not silently remove a choice granted by the rules.
- A committed result is authoritative; animations only present it. Returning to ordinary selection requires completion of the current resolution and the correct game phase.
- Action allowance can change through effects. Do not assume every successful interaction costs one action or every turn has the same budget.

## Randomness and recovery

Inject randomness so test cases can reproduce dice and card behavior. Version snapshots with the game data, rules interpretation, and save schema. Preserve random-generator state or recorded outcomes, deck and bag state, active effects, and the ordered command/result history. A seed alone is insufficient across rule or algorithm changes.

Persist committed outcomes before presenting a recoverable pending choice. Saving after each resolved action remains the normal stable boundary. On reload, restore the pending choice and its existing outcome; do not execute the original action again. During implementation, choose an atomic persistence approach and define recovery for interruptions between state commit and rendering. Surface storage failures without claiming a session was saved.

Reject malformed or incompatible saves without replacing the current session. Initial storage remains local; cloud sync and cross-device conflict handling are out of scope. Keep private reference photos and personal sessions outside tracked files.

## Offline and portability

Bundle required runtime code and authorized assets locally. Gameplay must not depend on external fonts, remote images, cloud AI, or network APIs. Verify disconnected operation after initial setup with the local server running. Hosted offline caching and installable desktop packaging are later delivery choices, not capabilities already provided.

Keep UI and persistence adapters separate from rules so the companion and other devices can reuse the same verified behavior. Future strategic bots should receive only the information allowed to their seat; they must use the same legal-command boundary.
