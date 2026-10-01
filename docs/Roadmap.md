# Roadmap

**Planning baseline finalized September 28, 2026; interaction direction updated September 29; research updated September 30.** Milestone 0 is complete. A synthetic interaction prototype exists; no Horrified game is playable yet. The [work plan](Work-Plan.md) records the agreed build sequence. Scoped component verification is complete; the [game-data checklist](Game-Data-Checklist.md) and [rules reference](Rules-Reference.md) retain evidence, accepted interpretations, and remaining implementation/publication dependencies.

## 0. Public project foundation - complete

MIT licensing, community policies, contribution templates, repository verification, CI, and GitHub security settings are established. Existing checks validate repository tooling, not gameplay.

## 1. On-screen solo Horrified: Dungeons & Dragons

Deliver a local React browser game for the M1 MacBook Pro, using one human-controlled hero against the Displacer Beast and Beholder. Use a simplified labeled map and generic markers. All five base heroes are selectable at completion; develop and validate them one at a time.

**In progress:** A React sample-turn shell demonstrates a floating action tray with eight stable card positions, descriptions in a reserved help area, direct movement to highlighted destinations, a separately confirmed invented Wait, action counts, an explicit End Hero Phase, a short resolution lock, and restart. Seven cards are unavailable previews with explanations, not game actions. The right-side Event log keeps numbered sample turns and moves below the board on narrow screens. Its four-location map, explorer, Move/Wait actions, and three-action allowance are invented. Reloading resets the session. It does not satisfy the game, data, monster, offline acceptance, or save/resume criteria below.

Private data normalization and isolated dice, response, random-state, and route helpers now support the engine foundation. They are not connected to the sample UI. The selected Monster setup steps have been recovered from a readable online photo of the printed mat and await runtime integration; no new owner photo is needed for those sections. See [local data preparation](Game-Data-Format.md).

Build in this order:

1. Preserve the verified source packet, encode suitable game data, and resolve the remaining rules/publication gates; use synthetic fixtures where public data is unavailable.
2. Establish the app and shared rules/command boundaries. A synthetic prototype establishes the first UI/engine/session seam; the verified game engine is still to be built.
3. Complete a game with one hero and the selected monster pair.
4. Add and validate the remaining heroes.
5. Finish the action panel, explanations, local recovery, offline behavior, and complete-game validation.

Acceptance criteria:

- A documented local setup starts the app and completes games with each supported hero, including victory and defeat paths.
- Legal actions, current phase, remaining actions, inventory, and outcomes are understandable.
- The floating tray keeps stable positions and shows action costs, availability, and specific reasons for invalid actions. Move is selected freely, then commits on clicking a highlighted legal destination. Consequential item or roll choices require review and confirmation; there is no undo command.
- The Hero Phase ends only through an explicit command after the current resolution. Eligible free perks remain usable at zero paid actions until that boundary, subject to their own legality rules.
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
