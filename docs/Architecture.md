# Architecture direction

This is a proposed design boundary for future work, not a description of implemented application modules. The repository currently contains documentation, GitHub configuration, `scripts/` for verification, and `tests/` for that tooling. No runtime dependencies or application framework have been selected.

## Responsibilities

| Component | Owns | Boundary |
| --- | --- | --- |
| Game rules | State transitions, legal actions, turn order, scoring, end conditions | Does not depend on UI or a bot policy |
| Bot policy | Choosing an action from a seat's observation | Cannot read the complete private game state or mutate it |
| Session runner | Seat assignments, seeded randomness, action validation, event history | Sends all human and bot actions through the rules |
| Play interface | Displaying the player's view and collecting input | Does not implement a second copy of the rules |
| Persistence and replay | Versioned setup, actions, seeds, and save data | Validates input and makes incompatible versions explicit |
| Simulation runner | Repeated bot sessions and aggregate results | Uses the same game rules as interactive play |

Begin with small modules in one application. There is no need for separate services or a general plugin system to prove one game.

## Turn contract

The runner asks the game which seat can act and obtains that seat's legal observation and actions. The human or bot chooses an action. The rules validate and apply it, returning the next state and public/private events. The runner records the transition and checks whether the game has ended before requesting another action.

Invalid actions must leave state unchanged. Bot errors or time limits should produce a visible recoverable result rather than freeze the session. A bot must not receive hidden opponent cards, secret objectives, or future random outcomes unless the selected game explicitly makes them public.

## Reproducibility and storage

The prototype should make randomness injectable. A later replay format needs a schema version, game and rules version, initial setup, seed or random-generator state, seat/bot configuration and versions, and an ordered action log. A seed alone is insufficient when algorithms or rules change. Do not establish a long-term save format before the first game's state and move model are understood.

Reject malformed, oversized, or incompatible imported data with a useful error. Loading a save or game description must not execute code. Replaying a full session may reveal hidden information; distinguish replay/debug views from information exposed to a live bot.

## Decisions still to make

- The first game and its content provenance.
- Native desktop versus local browser interface, implementation language, and initial operating system targets.
- Initial random/heuristic bot policies and a bounded policy for bot failures.
- Persistence schema and whether simulation runs need a separate command-line entry point.

Record decisions here as they are made, with the reason and verification impact. Follow the [roadmap](Roadmap.md) before broadening the architecture.
