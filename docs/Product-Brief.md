# Product brief

## Purpose and status

BoardBot's first experience is for practicing the original Horrified: Dungeons & Dragons, understanding its rules and edge cases, and completing solo games on a computer. The planning baseline is finalized as of September 28, 2026. Only repository tooling and documentation exist; no playable application or complete verified game dataset exists yet.

## Agreed first milestone

- A local React browser application, initially validated on an M1 MacBook Pro.
- One human-controlled hero. All five base-game heroes are selectable by milestone completion, implemented and validated individually during development.
- Displacer Beast and Beholder as the initial monster pair. Monster behavior follows the rules; this milestone does not need strategic bots controlling additional heroes.
- A fully on-screen game, using a simplified map with clear location labels, accurate connections, and generic markers. Richer art can follow as the project matures and content provenance is established.
- Rules enforce action costs, movement, hero-specific abilities, resources, timing, and end conditions. A rejected action changes no gameplay state.
- Local saves and offline gameplay after initial setup. A browser UI does not require a remote gameplay service. Development still requires a running local server; initial dependency installation may require internet access.

## Action interaction

The action panel shows remaining actions and the applicable action allowance, including temporary changes. Hover explains an action; keyboard focus provides the same information. Clicking selects an action without executing it. The player chooses any required destination, target, or items and confirms with a button at the bottom of the panel.

The engine rechecks legality on confirmation. While an action resolves, ordinary selections and repeat submissions are disabled. If resolution needs a player decision, only the controls for that decision become available. The panel refreshes when resolution finishes. The player can change or cancel an unconfirmed selection; the initial design has no undo command.

## Continuity and learning

Use a readable turn history and explanations of unavailable actions. Save after resolved actions and at recoverable pending choices. Resuming must preserve already-committed dice rolls and card draws rather than rerolling or duplicating an action. Save errors should be visible and preserve the last recoverable session. Detailed implementation and storage choices remain to be made within these requirements.

## Later experiences

Stage two is a companion for physical play: setup assistance, session tracking, and quick sourced rules/edge-case lookup. Reuse the verified rules foundation while letting the player report physical outcomes and correct tracking mistakes. The companion's detailed interaction design is future work.

Later expansions may include remaining monsters, other devices, optional desktop packaging, more games, strategic hero bots, and repeatable simulation. Accounts, telemetry, paid AI services, online multiplayer, and cloud saves are not required for the first milestone.

## Research dependencies

The [game-data checklist](Game-Data-Checklist.md) distinguishes available references, unverified details, and missing inputs. Photos and transcriptions from the owner's game are reference material; receiving them does not automatically establish public redistribution permission. Do not silently convert unresolved interpretations into official rules.

See the [implementation plan](Implementation-Plan.md) for execution order, the [roadmap](Roadmap.md) for milestones, and the [architecture](Architecture.md) for boundaries.
