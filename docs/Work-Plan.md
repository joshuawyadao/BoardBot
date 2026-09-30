# Work plan

**Status: finalized planning baseline, September 28, 2026; interaction refinements agreed September 29; research updated September 30. A synthetic interaction prototype is implemented; the Horrified game milestone remains in progress.**

Build a local React browser app for practicing the original Horrified: Dungeons & Dragons on an M1 MacBook Pro. Deliver rules-enforced, on-screen solo play first; reuse the verified rules foundation for a physical-game companion later. Missing component details and unresolved rulings are explicit dependencies, not permission to guess.

Owner verification of the scoped components is complete. [Game-Data-Checklist.md](Game-Data-Checklist.md) records coverage and private evidence access; [Rules-Reference.md](Rules-Reference.md) records accepted interpretations and remaining gaps. Exact data packaging, publication provenance, unresolved response/result boundaries, and gameplay tests still gate faithful implementation. A consistency review across one to five Hero seats does not expand the first milestone.

This is the durable project baseline. Update it intentionally when agreed scope or requirements change; do not replace it for routine feature tasks. The [roadmap](Roadmap.md) summarizes milestones. [Implementation-Plan.md](Implementation-Plan.md) is temporary task tracking and may be rewritten for each task.

The current React shell has an original four-location map, a sample explorer, Move and Wait, and a fixed three-action turn. A floating eight-card tray occupies reserved space below the map: Move is usable, while Guide, Pick Up, Share, Advance, Defeat, Special Action, and Perks are inspectable unavailable previews. Move highlights connected destinations and executes when a destination is clicked. The separate invented Wait control uses selection and Confirm. An explicit End Hero Phase works early or at zero actions, after resolution, and logs the boundary once; there is no Monster Phase yet. A roughly 900 ms display lock prevents new actions during resolution. The right-side Event log retains numbered sample turns and respects readers who scroll back, with Jump to latest; it moves below the board on narrow screens. The session resets on reload. This is an interaction step, not a verified Horrified rules engine or playable game. Rules data, monsters, all base heroes, recovery, and milestone acceptance remain open.

## Scope
- In: One human-controlled hero; all five base-game heroes selectable at milestone completion, validated individually; Displacer Beast and Beholder; a simplified labeled map with accurate connections; automated monster phases with required player choices; direct board movement and confirmation for consequential choices; local save/resume; offline gameplay after initial setup.
- Out: Other monsters, promo heroes, Ravenloft, multiplayer, strategic bots controlling extra heroes, companion mode, cloud accounts/services, polished commercial artwork, and desktop packaging in the first milestone.

## Action items
[ ] Encode the verified component packet described in `docs/Game-Data-Checklist.md` into a reviewed, versioned representation; resolve publication gates there and explicitly open rules cases in `docs/Rules-Reference.md`. Preserve sources, confidence, and accepted interpretation versions, and keep incomplete content visibly unavailable without reopening completed owner verification.
[ ] Expand the existing React prototype into a verified rules engine independent of the interface, with explicit game phases, legal commands, injected randomness, and synthetic test fixtures. The prototype currently has only invented Move/Wait rules and no random outcomes.
[ ] Implement shared setup, movement, action budgets, items, citizens, perks, monster phases, and end conditions; reject invalid commands without changing state or spending resources.
[ ] Deliver a complete internal playthrough with one validated hero and both selected monsters, including required choices during resolution; do not claim faithful gameplay while its data or rulings remain unverified.
[ ] Implement and validate each remaining base hero, then expose all five for selection when the milestone is complete.
[ ] Connect the floating tray to verified game data: available/remaining actions, card costs, hover/focus/tap explanations, action-specific targets and items, and engine-provided reasons for illegal actions. Keep unavailable cards in stable positions. The sample demonstrates layout and direct movement, but not game-specific targets, costs, perks, or rules. Confirm consequential item and dice choices before committing.
[ ] Add local autosave, resume, and recovery that preserve committed random results, pending choices, and the action log; reject invalid saves and prevent duplicate action execution.
[ ] Validate complete games, all supported hero abilities, edge cases, reload recovery, keyboard interaction, and disconnected play on the target Mac; update setup, architecture, and verification docs before describing the milestone as playable.

## Action and recovery contract

- Selecting, changing, or cancelling an uncommitted action has no gameplay cost. There is no undo command in the initial design.
- Move executes when the player clicks a highlighted legal destination; consequential item or roll choices require review and Confirm. The engine rechecks legality at execution. Incomplete or illegal choices cannot be committed.
- Once committed, block ordinary action selection and repeat submission until resolution ends. Enable only choices required by that resolution, including during monster phases.
- Keep temporarily invalid cards visible with specific reasons, without changing their tray positions. Legality may differ by monster and action; do not assume shared location is a universal requirement for Advance or Defeat.
- End the Hero Phase explicitly, early or at zero paid actions, only after any current resolution. Eligible free perks remain available at zero actions until that boundary, subject to their own timing and prerequisites. The sample implements only the explicit boundary, not perks or a Monster Phase.
- Commit each action and random outcome once. A reload must not offer a new roll or repeat a card draw that has already been committed.
- Autosave stable resolution boundaries, including pending choices with their already-determined outcomes. Save after each fully resolved action as well. Surface persistence failures and prevent silent progress beyond a recoverable state.
- After resolution, refresh state, phase, action budget, legal options, and the readable result history. Temporary or bonus effects can change the budget; it is not a hard-coded fixed total.

## Completion criteria

A documented local setup on the M1 Mac can complete a game with either victory or defeat using each supported hero and the selected monster pair. Tests cover illegal actions, duplicate confirmation, interrupted resolution, temporary effects, player decision points, and save/reload without rerolling. All milestone-required data and rulings have verified sources or an explicitly documented user-approved interpretation. Gameplay, bundled assets, and local saves work without external network access after setup; the development server still needs to run locally.

## Dependencies and later updates

- Component reference photos/transcriptions: scoped verification is complete and retained in the private local packet described by the [game-data checklist](Game-Data-Checklist.md). Do not restart photo collection; preserve the packet separately from Git and verify fields when creating the runtime representation.
- Edge-case rulings: use the canonical [rules reference](Rules-Reference.md). Preserve the distinction between publisher rules, reported correspondence, accepted BoardBot interpretations, and still-open cases. Accepted interpretations enable explicit implementation choices; they do not become official rules.
- Before publishing third-party content, document its source and publication rights. Private reference photos stay outside tracked files. The simplified UI can use original labels and generic markers while content review proceeds.
- The prototype uses React, Vite, TypeScript, Node.js 24, and pinned npm dependencies. Game storage mechanism/schema and supported browser versions for the milestone remain to be selected. These implementation choices do not reopen the agreed product scope.
- Stage two is a physical-game companion for setup, tracking, and quick sourced rules/edge-case lookup. Other monsters, devices, and optional desktop packaging follow later.

## Open questions
- None blocking this planning baseline. The explicit research dependencies above remain open; finalized planning does not mean the rules or assets are fully verified.
