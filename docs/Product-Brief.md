# Product brief

## Purpose and status

BoardBot's first game experience is for practicing the original Horrified: Dungeons & Dragons, understanding its rules and edge cases, and completing solo games on a computer. The planning baseline was finalized September 28, 2026; the action layout and phase boundary were refined September 29. A local React interaction prototype offers an invented map and three-action sample turn. It exercises direct board movement, an explicit phase end, a brief resolution lock, and an event log across sample turns. A separate local import opens a solo playtest game against Beholder and Displacer Beast using prepared private data. All five base Heroes, shared actions, Perks, monster turns, required choices, end conditions, and local recovery are implemented. The sample resets on reload; the solo game can resume. Full human play acceptance remains open.

## Agreed first milestone

- A local React browser application, initially validated on an M1 MacBook Pro.
- One human-controlled hero. All five base-game heroes are selectable by milestone completion, implemented and validated individually during development.
- Displacer Beast and Beholder as the initial monster pair. Monster behavior follows the rules; this milestone does not need strategic bots controlling additional heroes.
- A fully on-screen game, using a simplified map with clear location labels, accurate connections, and generic markers. Richer art can follow as the project matures and content provenance is established.
- Rules enforce action costs, movement, hero-specific abilities, resources, timing, and end conditions. A rejected action changes no gameplay state.
- Local saves and offline gameplay after initial setup. A browser UI does not require a remote gameplay service. Development still requires a running local server; initial dependency installation may require internet access.

## Action interaction

The map is the main play surface. Following the October 1 playtest feedback, both tables use a compact, collapsible action tray below the board. Eight buttons keep their order and show action costs; wide layouts use one row, while narrower layouts wrap. Captions are available to assistive technology, and full explanations appear in a small scrollable help area below the buttons on hover, focus, or tap. Unavailable actions remain inspectable with reasons. Details for targets, Items, and rolls appear only after selection; the Lair action has its own disclosure.

Hide actions leaves phase status, the action count, End Hero Phase, and Show actions in a slim strip. It clears uncommitted selection without changing game state or spending resources. The Fighter map gains visible height when actions are hidden. Required choices remain separate and visible even when ordinary controls are collapsed. A 240px right column gives more width to the board on desktop. The Event log has a scroll area capped at 240px and a Hide/Show log control; collapsed mode shows a short preview of the latest event. It remains beside the board on wide screens and below on narrow screens.

There is no Wait action. End Hero Phase forfeits any unused actions and advances to the Monster Phase in the solo game; the next Hero Phase starts with its own allowance. Eligible free Perks remain available at zero actions until the player ends the phase.

Selecting Move is free; clicking a highlighted destination executes the move after the engine rechecks legality. Consequential choices such as spending an item or rolling dice use a separate review and confirmation step. While an action resolves, ordinary selections and repeat submissions are disabled. If resolution needs a player decision, only the controls for that decision become available. The tray refreshes when resolution finishes. Uncommitted selections may be changed or cleared; the initial design has no undo command.

Reaching zero actions does not end the phase automatically. Perks still require their own timing and prerequisites. The sample demonstrates the explicit boundary; the solo table also implements eligible zero-action Perks and Monster Phases.

## Continuity and learning

Both tables share a compact Event log that retains every event. It follows new entries while the reader is at the bottom and provides Jump to latest after scrolling back. Hiding and reopening history preserves an older reading position, even when new events arrive while hidden. These display controls do not submit game commands. The sample log resets on reload. The solo game saves its log, data, committed rolls and draws, and pending choices before presenting each result. Resume restores the same result; it never offers a replacement roll. Failed saves pause further play and retain the resolved result for retry. One local game and its previous successful save are kept in IndexedDB for this browser origin. Replacement is explicit; private backup export/import is available. See [Local-Saves.md](Local-Saves.md).

## Later experiences

Stage two is a companion for physical play: setup assistance, session tracking, and quick sourced rules/edge-case lookup. Reuse the verified rules foundation while letting the player report physical outcomes and correct tracking mistakes. The companion's detailed interaction design is future work.

Later expansions may include remaining monsters, other devices, optional desktop packaging, more games, strategic hero bots, and repeatable simulation. Accounts, telemetry, paid AI services, online multiplayer, and cloud saves are not required for the first milestone.

## Research dependencies

The [game-data checklist](Game-Data-Checklist.md) distinguishes available references, unverified details, and missing inputs. Photos and transcriptions from the owner's game are reference material; receiving them does not automatically establish public redistribution permission. Do not silently convert unresolved interpretations into official rules.

See the [work plan](Work-Plan.md) for execution order, the [roadmap](Roadmap.md) for milestones, and the [architecture](Architecture.md) for boundaries.
