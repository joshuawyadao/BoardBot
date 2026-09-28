# Roadmap

**Planning baseline finalized September 28, 2026.** Milestone 0 is complete. Application milestones have not started. The [work plan](Work-Plan.md) records the agreed build sequence and the [game-data checklist](Game-Data-Checklist.md) tracks research dependencies.

## 0. Public project foundation - complete

MIT licensing, community policies, contribution templates, repository verification, CI, and GitHub security settings are established. Existing checks validate repository tooling, not gameplay.

## 1. On-screen solo Horrified: Dungeons & Dragons

Deliver a local React browser game for the M1 MacBook Pro, using one human-controlled hero against the Displacer Beast and Beholder. Use a simplified labeled map and generic markers. All five base heroes are selectable at completion; develop and validate them one at a time.

Build in this order:

1. Verify required source data and register unresolved rulings; prepare synthetic fixtures where real data is pending.
2. Establish the app and shared rules/command boundaries.
3. Complete a game with one hero and the selected monster pair.
4. Add and validate the remaining heroes.
5. Finish the action panel, explanations, local recovery, offline behavior, and complete-game validation.

Acceptance criteria:

- A documented local setup starts the app and completes games with each supported hero, including victory and defeat paths.
- Legal actions, current phase, remaining actions, inventory, and outcomes are understandable.
- Hover/focus descriptions, click-to-select, and bottom-button confirmation follow the agreed flow; selection itself is free and there is no undo command.
- Invalid moves and repeated submissions leave state unchanged. Controls lock during resolution while required decision controls remain usable.
- Monster phases preserve player choices required by the rules.
- Save/resume restores state and pending choices without rerolling, redrawing, or replaying committed actions; failures are visible and recoverable.
- Gameplay works with internet disconnected after initial setup while the local server runs.
- Required data, rule interpretations, and source/content provenance are verified and documented. Unsupported or incomplete content is not presented as validated.

## 2. Physical-game companion

Reuse the verified rules foundation for setup assistance, session tracking, and quick rules/edge-case lookup during physical play. Define manual input, correction, and rules-search behavior separately before implementation. Answers should distinguish published rules, reported clarifications, and unresolved interpretations.

## 3. Broader game and device support

Add remaining monsters and their tests, then improve artwork and usability with documented content provenance. Expand platform/browser support and consider optional desktop packaging. These additions are not required to finish the initial two-monster solo milestone.

## Later exploration

Other games, hero-playing bots, controlled bot simulations, and rule variants can follow demonstrated demand. Simulation results must identify the tested policies, versions, and samples; they do not prove balance or optimal strategy. Online multiplayer and paid services remain outside the current plan.
