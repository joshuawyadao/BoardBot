# Architecture direction

This records the agreed boundaries for the first Horrified: Dungeons & Dragons game and the current synthetic interaction prototype. The React app runs locally with Vite and TypeScript. The prototype targets Node.js 26 with matching Node 26 type definitions and pinned npm package versions; local game storage uses IndexedDB; Chromium is the current automated browser target.

## Current prototype

`src/engine/sampleGame.ts` owns an invented four-location graph, three-action budget, action legality, pure Move transitions, and an explicit End Hero Phase transition. It rejects invalid, stale, and repeated commands without changing state. At zero actions it remains in the ready phase until the player ends it. Ending early sets its remaining actions to zero. `src/session/sampleSession.ts` owns the session reducer, numbered turns, and append-only in-memory action/phase log entries. It keeps game revisions increasing across sample-turn resets so stale commands cannot apply to a new turn. `src/session/useSampleSession.ts` wraps that reducer and uses a 900 ms display timer to finish a committed resolution. `src/ui/App.tsx` presents the map with reserved space for a floating action tray, direct movement, help, and lock. `src/ui/actionCatalog.ts` labels the eight visible card positions; only Move is executable. `src/ui/SessionLog.tsx` renders the shared sample/Fighter Event log from observed entries. It has a 240px scroll-height cap and an accessible hide/show control with a latest-event preview. It follows new entries only while the reader is at the bottom, preserves an older reading position across collapse, and offers Jump to latest. The 240px desktop right column moves below the board on narrow screens. Reloading creates a fresh session. The prototype has no dice, monsters, playable perks, saved sessions, or Horrified rules. Its engine exercises the intended boundary; it is not the future verified game engine.

## Data and rules foundations

The private packet can be normalized using `npm run data:prepare`; [Game-Data-Format.md](Game-Data-Format.md) describes the schema, evidence, validation, and publication boundary. The output remains ignored and is not loaded into the sample app. Card and ability descriptions are reference prose, not executable effects.

Pure helpers under `src/engine/decisionPolicies.ts` cover effective d20 bounds and optional response priority. `src/engine/gamePrimitives.ts` covers deterministic random state and board routes. `src/engine/horrifiedState.ts` now creates a selected solo Hero's initial state from schema v2's verified setup fields and exposes an explicit player projection that hides future draws and unrevealed Lairs. The Fighter table now uses these foundations through `horrifiedGame.ts` and `monsterResolution.ts`. Local recovery is implemented; complete human play acceptance remains pending.

## Solo playtest engine

`horrifiedRuntime.ts` defines serializable continuations, required choices, d20 response windows, attacks, and commands. `horrifiedGame.ts` owns Hero legality, atomic command application, shared movement/resource effects, Fighter ability outcomes, Perks, and public projections. `heroResolution.ts` owns the base Hero ability outcomes and saved Cleric effects. `monsterResolution.ts` owns Monster-card events, printed activation order, targeting, dice, powers, and hits. The engine modules do not call the UI, network, storage, or a timer.

A command carries an ID, expected revision, seat, and action. The engine rejects invalid, duplicate, foreign, or stale submissions before cloning the state. Commands are bound to the exact validated data snapshot used at initialization; changed or unregistered data is rejected. Each accepted command drains a finite continuation queue until another choice or the phase boundary. The state retains committed random state and structured final d20 arithmetic. Complete command replay is tested. Save loading validates and rebinds this identity by rebuilding the state through deterministic command replay before commands can resume.

`getFighterView` exposes observed resources, counts, choices, and legal controls without future draw order, RNG, hidden Lair faces, or continuation payloads. The React wrapper `LocalGameApp.tsx` imports a local JSON file and owns the persistence lifecycle. `savedSession.ts` locks a candidate result until its atomic write finishes; failed writes retain the same candidate for retry. The UI locks submission synchronously and uses a short display-only busy interval after persistence succeeds. `FighterTable` consumes the projection; decision policy remains in the engine. The private file is never copied into public assets or requested by a remote service. The default synthetic table remains independently usable.

`src/ui/ActionTray.tsx` is shared presentation for the sample and Fighter tables. Its accessible disclosure hides only the action body; phase status, budget, and phase controls remain mounted. Each table owns the disclosure state and clears local draft selection on toggle without dispatching a command. Fighter required-choice controls remain outside this component. The disclosure preference is in memory and is not a saved game setting.

## Responsibilities

| Component | Owns | Boundary |
| --- | --- | --- |
| Verified game data | Board graph, component definitions, quantities, source/version records | Incomplete entries cannot silently become supported gameplay |
| Rules engine | State, legality, transitions, action costs, effects, end conditions | Independent of React, storage, and presentation; sample and Fighter engines are separate |
| Session runner | Turn/phase progression, commands, injected randomness, required choices, event history | Applies commands once through the rules engine; the current reducer/timer only handles the sample turn |
| React interface | Simplified board, floating tray, Event log, descriptions, selections, confirmation where needed, outcomes | Never duplicates rule decisions as a separate authority |
| Local persistence | Versioned snapshots, pending choices, committed random results, recovery | Loading validates data and never executes imported code |
| Future companion | Physical setup/tracking and sourced rules explanations | Reuses rules and data with a different interaction model |

Begin with small modules in one application. A general plugin system, remote backend, and strategic hero bots are unnecessary for the first milestone.

## Action-resolution contract

The interaction progresses through selection or targeting, optional confirmation, resolution, any required follow-up choice, and an explicit phase boundary. These are conceptual states, not final code identifiers.

- Selecting or cancelling has no game-state effect. In the prototype, Move highlights reachable board locations and clicking one commits the move immediately. Consequential choices such as item spending or dice rolls require complete review and confirmation. Hover, focus, or tap shows action details below the stable compact buttons. Hiding ordinary actions clears only local draft selection and leaves required choices visible.
- An unavailable action stays in its tray position with a specific reason. The UI can preview legality, but only the engine authorizes a command. Monster challenge and defeat prerequisites must use verified monster-specific data. Eligible free perks do not depend on remaining paid actions and remain available until the explicit Hero Phase end, subject to their own timing rules.
- The engine revalidates the submitted command, including phase and available resources. Invalid or duplicate commands must not spend an action, draw a card, roll again, or otherwise change state.
- Ordinary action controls lock at submission, before animation or delayed processing. Required follow-up choices are distinct commands tied to the active resolution.
- Monster phases follow the rules but can pause for player-controlled ties, defenses, effect ordering, or other decisions. Automation must not silently remove a choice granted by the rules.
- A committed result is authoritative; animations only present it. Returning to ordinary selection requires completion of the current resolution and the correct game phase.
- Action allowance can change through effects. Do not assume every successful interaction costs one action or every turn has the same budget.
- End Hero Phase is an explicit, revision-guarded command, allowed early or at zero actions while ready and disallowed during resolution. Ending early forfeits unused actions; there is no Wait action. Record that boundary once; the Fighter engine then resolves its Monster Phase and required choices. The solo player projection exposes zero usable actions outside the Hero Phase. Internal snapshots retain the prior count for existing save/replay compatibility, but phase legality blocks spending it and the next Hero Phase resets the allowance without carryover.

## Randomness and recovery

Inject randomness so test cases can reproduce dice and card behavior. Version snapshots with the game data, rules interpretation, and save schema. Preserve random-generator state or recorded outcomes, deck and bag state, active effects, and the ordered command/result history. A seed alone is insufficient across rule or algorithm changes.

Persist committed outcomes before presenting a recoverable pending choice. Saving after each resolved action remains the normal stable boundary. On reload, restore the pending choice and its existing outcome; do not execute the original action again. The atomic persistence boundary covers interruptions between state commit and rendering. Surface storage failures without claiming a session was saved.

The initializer stores a SHA-256 fingerprint of the actual validated data, canonically ordered, alongside its rules and random-generator versions. Source labels alone cannot establish save compatibility. The versioned save codec includes imported data and the complete snapshot, but never trusts saved continuation objects. It replays validated commands from setup, compares every reconstructed field, and returns the reconstructed state. Unknown formats, versions, tampered state, or incompatible data fail before replacing an active game.

`localSaveStore.ts` stores current and previous records in one IndexedDB transaction with an expected-token check. This rejects stale writers from another tab. `savedSession.ts` persists before publishing a result and freezes further commands after failure. A retry writes the same candidate; it does not re-execute a command. `LocalGameApp.tsx` offers resume, explicit replacement, recovery of the previous record, and private backup export/import. See [Local-Saves.md](Local-Saves.md) for the storage contract.

Reject malformed or incompatible saves without replacing the current session. Initial storage remains local; cloud sync and cross-device conflict handling are out of scope. Keep private reference photos and personal sessions outside tracked files.

## Offline and portability

Bundle required runtime code and authorized assets locally. Gameplay must not depend on external fonts, remote images, cloud AI, or network APIs. Verify disconnected operation after initial setup with the local server running. Hosted offline caching and installable desktop packaging are later delivery choices, not capabilities already provided.

Keep UI and persistence adapters separate from rules so the companion and other devices can reuse the same verified behavior. Future strategic bots should receive only the information allowed to their seat; they must use the same legal-command boundary.

## Rules knowledge and future Hero seats

Use [Rules-Reference.md](Rules-Reference.md) as the canonical interpretation/evidence register and [Game-Data-Checklist.md](Game-Data-Checklist.md) for component coverage and private reference access. A historical raw record can contain superseded proposals; source confidence and the selected interpretation version must remain explicit in any future runtime data and replay format.

The one-to-five-Hero review is a compatibility requirement, not implemented multiplayer. Keep Hero-seat identity separate from its human/bot controller, the active seat, the attacked Hero, and an effect or resource owner. Controllers must receive their permitted decisions, including during another seat's turn. Use the approved active-seat-first optional-response order from Rules-Reference.md, prompting only owners with a currently legal response relevant to the event. Preserve uncapped d20 totals and modifiers, while rules use the effective result capped to 1-20. Do not let network or bot response speed determine precedence. These constraints preserve the existing first milestone and require no general bot framework now.
