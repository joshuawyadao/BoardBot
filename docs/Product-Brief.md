# Product brief

## Purpose and status

BoardBot's first game experience is for practicing the original Horrified: Dungeons & Dragons, understanding its rules and edge cases, and completing solo games on a computer. The planning baseline was finalized September 28, 2026; the action layout and phase boundary were refined September 29. A local React interaction prototype offers an invented map and three-action sample turn. It exercises direct board movement, an explicit phase end, a brief resolution lock, and an event log across sample turns. The start screen automatically loads prepared private components, offers New Game with Hero selection, and lists independent saved solo games against Beholder and Displacer Beast. One-time manual import remains available when prepared local data is absent. All five base Heroes, shared actions, Perks, monster turns, required choices, end conditions, and local recovery are implemented. The sample resets on reload; the solo game can resume. Full human play acceptance remains open.

## Agreed first milestone

- A local React browser application, initially validated on an M1 MacBook Pro.
- One human-controlled hero. All five base-game heroes are selectable by milestone completion, implemented and validated individually during development.
- Displacer Beast and Beholder as the initial monster pair. Monster behavior follows the rules; this milestone does not need strategic bots controlling additional heroes.
- A fully on-screen game, using a simplified map with clear location labels, accurate connections, and generic markers. Richer art can follow as the project matures and content provenance is established.
- Rules enforce action costs, movement, hero-specific abilities, resources, timing, and end conditions. A rejected action changes no gameplay state.
- Local saves and offline gameplay after initial setup. A browser UI does not require a remote gameplay service. Development still requires a running local server; initial dependency installation may require internet access.

## Action interaction

The map is the main play surface. The solo table fits the entire board to the desktop viewport and arranges its regions and locations like the owner’s physical board. The board uses original schematic styling. Ordinary and passage routes avoid unrelated locations; teleport network lines appear only during a relevant Move. Location buttons retain full accessible names and tooltips even when a short label is used.

A slim action dock keeps eight actions in stable positions, with costs and reasons. Hide actions retains phase status, the action count, and End Hero Phase. Selecting a consequential action opens its review panel; costs and confirmation remain visible while long descriptions scroll. Special Action shows the imported Hero’s outcome ranges before the roll. A persistent roll summary shows the current or last result, and a detailed result panel displays arithmetic, applicable ability effect, and observed events. Pending adjustments are explicitly labeled Awaiting response.

Inventory, Monsters, Event log, Latest result, and help use independent panels that can stay open together. Close each optional panel or move it between left and right; the board resizes to fit beside them. Opening information preserves action selections. Required choices open automatically alongside other panels and remain available with the action dock hidden; Required choice returns focus to the decision. On narrow screens, panels stack below the fitted board and the page scrolls; the map itself never needs scrolling. The synthetic practice table retains its simpler map and compact log.

Before the first action, Board ready summarizes the setup already on the table. Separate location markers show the Hero, both Monsters, Items, Citizens when present, and Lairs without revealing hidden faces. Castle Corkscrew is visually within Waterdeep. Owned Perks expand inside Inventory to show their effects. Wizard Monster relocation prompts distinguish the ability roll from a destination roll, highlight the destination, and name each existing Monster's current and new locations.

There is no Wait action. End Hero Phase forfeits any unused actions and advances to the Monster Phase in the solo game; the next Hero Phase starts with its own allowance. Eligible free Perks remain available at zero actions until the player ends the phase.

Selecting Move is free; clicking a highlighted destination executes the move after the engine rechecks legality. Consequential choices such as spending an item or rolling dice use a separate review and confirmation step. While an action resolves, ordinary selections and repeat submissions are disabled. If resolution needs a player decision, only the controls for that decision become available. The tray refreshes when resolution finishes. Uncommitted selections may be changed or cleared; the initial design has no undo command.

Reaching zero actions does not end the phase automatically. Perks still require their own timing and prerequisites. The sample demonstrates the explicit boundary; the solo table also implements eligible zero-action Perks and Monster Phases.

## Continuity and learning

Both tables share a compact Event log that retains every event. It follows new entries while the reader is at the bottom and provides Jump to latest after scrolling back. Hiding and reopening history preserves an older reading position, even when new events arrive while hidden. These display controls do not submit game commands. The sample log resets on reload. The solo game saves its log, data, committed rolls and draws, and pending choices before presenting each result. Resume restores the same result; it never offers a replacement roll. Failed saves pause further play and retain the resolved result for retry. Independent games and each game’s previous successful save are kept in IndexedDB for this browser origin. Components are cached once per exact version, separate from progress. Starting another game or importing a backup adds a game without replacing existing adventures; private backup export remains available. See [Local-Saves.md](Local-Saves.md).

## Later experiences

Stage two is a companion for physical play: setup assistance, session tracking, and quick sourced rules/edge-case lookup. Reuse the verified rules foundation while letting the player report physical outcomes and correct tracking mistakes. The companion's detailed interaction design is future work.

Later expansions may include remaining monsters, other devices, optional desktop packaging, more games, strategic hero bots, and repeatable simulation. Accounts, telemetry, paid AI services, online multiplayer, and cloud saves are not required for the first milestone.

## Research dependencies

The [game-data checklist](Game-Data-Checklist.md) distinguishes available references, unverified details, and missing inputs. Photos and transcriptions from the owner's game are reference material; receiving them does not automatically establish public redistribution permission. Do not silently convert unresolved interpretations into official rules.

See the [work plan](Work-Plan.md) for execution order, the [roadmap](Roadmap.md) for milestones, and the [architecture](Architecture.md) for boundaries.
