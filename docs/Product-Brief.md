# Product brief

## Purpose and status

BoardBot's first game experience is for practicing the original Horrified: Dungeons & Dragons, understanding its rules and edge cases, and completing solo games on a computer. The planning baseline was finalized September 28, 2026. A local React interaction prototype now offers an invented map and three-action sample turn. It exercises board destination selection, confirmation, a brief resolution lock, and a session log across sample turns. No Horrified gameplay or complete verified game dataset exists yet; the sample resets on reload.

## Agreed first milestone

- A local React browser application, initially validated on an M1 MacBook Pro.
- One human-controlled hero. All five base-game heroes are selectable by milestone completion, implemented and validated individually during development.
- Displacer Beast and Beholder as the initial monster pair. Monster behavior follows the rules; this milestone does not need strategic bots controlling additional heroes.
- A fully on-screen game, using a simplified map with clear location labels, accurate connections, and generic markers. Richer art can follow as the project matures and content provenance is established.
- Rules enforce action costs, movement, hero-specific abilities, resources, timing, and end conditions. A rejected action changes no gameplay state.
- Local saves and offline gameplay after initial setup. A browser UI does not require a remote gameplay service. Development still requires a running local server; initial dependency installation may require internet access.

## Action interaction

The planned action panel shows remaining actions and the applicable action allowance, including temporary changes. The prototype shows a fixed sample allowance of three. Hover explains an action; keyboard focus provides the same information in a reserved area below the action buttons, without covering or shifting controls. Clicking selects an action without executing it. For Move in the prototype, the player selects a highlighted connected location directly on the board; the separate bottom Confirm button executes the reviewed choice. Future game actions may require other targets or items.

The engine rechecks legality on confirmation. While an action resolves, ordinary selections and repeat submissions are disabled. If resolution needs a player decision, only the controls for that decision become available. The panel refreshes when resolution finishes. The player can change or cancel an unconfirmed selection; the initial design has no undo command.

## Continuity and learning

The prototype has a scrollable, chat-style session log that keeps numbered sample turns as new turns start. It follows new entries while the reader is at the bottom and provides Jump to latest after scrolling back. The log is only in memory and resets on reload. The game milestone requires saving after resolved actions and at recoverable pending choices. Resuming must preserve already-committed dice rolls and card draws rather than rerolling or duplicating an action. Save errors should be visible and preserve the last recoverable session. The prototype has no save or resume; detailed storage choices remain to be made within these requirements.

## Later experiences

Stage two is a companion for physical play: setup assistance, session tracking, and quick sourced rules/edge-case lookup. Reuse the verified rules foundation while letting the player report physical outcomes and correct tracking mistakes. The companion's detailed interaction design is future work.

Later expansions may include remaining monsters, other devices, optional desktop packaging, more games, strategic hero bots, and repeatable simulation. Accounts, telemetry, paid AI services, online multiplayer, and cloud saves are not required for the first milestone.

## Research dependencies

The [game-data checklist](Game-Data-Checklist.md) distinguishes available references, unverified details, and missing inputs. Photos and transcriptions from the owner's game are reference material; receiving them does not automatically establish public redistribution permission. Do not silently convert unresolved interpretations into official rules.

See the [work plan](Work-Plan.md) for execution order, the [roadmap](Roadmap.md) for milestones, and the [architecture](Architecture.md) for boundaries.
