# Architecture direction

This records the agreed boundaries for the first Horrified: Dungeons & Dragons game and the current synthetic interaction prototype. The React app runs locally with Vite and TypeScript. Node.js 24 and npm package versions are pinned for the prototype; game storage and supported browser versions for the finished milestone remain open.

## Current prototype

`src/engine/sampleGame.ts` owns an invented four-location graph, three-action budget, action legality, and pure state transitions for Move and Wait. It rejects invalid and repeated commands without changing state. `src/session/sampleSession.ts` owns the session reducer, numbered turns, and append-only in-memory log entries. It keeps game revisions increasing across sample-turn resets so stale commands cannot apply to a new turn. `src/session/useSampleSession.ts` wraps that reducer and uses a 900 ms display timer to finish a committed resolution. `src/ui/App.tsx` presents the map, selection, reserved action-help area, confirmation, and lock; `src/ui/SessionLog.tsx` renders the scrollable session log. It follows new entries only while the reader is at the bottom and offers Jump to latest. Reloading creates a fresh session. The prototype has no dice, monsters, saved sessions, or Horrified rules. Its engine exercises the intended boundary; it is not the future verified game engine.

## Responsibilities

| Component | Owns | Boundary |
| --- | --- | --- |
| Verified game data | Board graph, component definitions, quantities, source/version records | Incomplete entries cannot silently become supported gameplay |
| Rules engine | State, legality, transitions, action costs, effects, end conditions | Independent of React, storage, and presentation; currently only a synthetic sample engine exists |
| Session runner | Turn/phase progression, commands, injected randomness, required choices, event history | Applies commands once through the rules engine; the current reducer/timer only handles the sample turn |
| React interface | Simplified board, action panel, descriptions, selections, confirmation, outcomes | Never duplicates rule decisions as a separate authority |
| Local persistence | Versioned snapshots, pending choices, committed random results, recovery | Loading validates data and never executes imported code |
| Future companion | Physical setup/tracking and sourced rules explanations | Reuses rules and data with a different interaction model |

Begin with small modules in one application. A general plugin system, remote backend, and strategic hero bots are unnecessary for the first milestone.

## Action-resolution contract

The interaction progresses through selecting, ready to confirm, resolving, optionally awaiting a required choice, and resolved/game over. These are conceptual states, not final code identifiers.

- Selecting or cancelling has no game-state effect. Confirm requires all inputs and current legality.
- In the prototype, Move highlights reachable board locations. Choosing one selects a destination; confirmation remains a separate step. Hover or focus shows action details in a reserved area without covering controls or moving them.
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
