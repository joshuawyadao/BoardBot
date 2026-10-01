# Work plan

**Status: finalized planning baseline, September 28, 2026; interaction refinements agreed September 29; research updated September 30. A solo playtest game with all five base Heroes and local recovery, plus the optional synthetic sample, are implemented; the full Horrified milestone remains in progress.**

Build a local React browser app for practicing the original Horrified: Dungeons & Dragons on an M1 MacBook Pro. Deliver rules-enforced, on-screen solo play first; reuse the verified rules foundation for a physical-game companion later. Missing component details and unresolved rulings are explicit dependencies, not permission to guess.

Owner verification of the scoped components is complete. [Game-Data-Checklist.md](Game-Data-Checklist.md) records coverage and private evidence access; [Rules-Reference.md](Rules-Reference.md) records accepted interpretations and remaining gaps. Versioned private data preparation and isolated engine helpers have focused test coverage. The owner has approved v3 interpretations, including effective d20 bounds, relevant optional-response ordering, and the three effect decisions. The selected Monster setup gap is now supported by a separate online photo of the printed mat; Fighter integration and initial game tests now pass; publication rights and full human play acceptance remain unfinished; local recovery and the remaining Hero paths are implemented. A consistency review across one to five Hero seats does not expand the first milestone.

This is the durable project baseline. Update it intentionally when agreed scope or requirements change; do not replace it for routine feature tasks. The [roadmap](Roadmap.md) summarizes milestones. [Implementation-Plan.md](Implementation-Plan.md) is temporary task tracking and may be rewritten for each task.

The optional sample demonstrates the invented map, movement, and explicit phase end. The start screen automatically loads prepared local components (with a one-time import fallback), and New Game sets up the solo table after Hero selection. The historically named Fighter table implements the selected Monster pair, shared actions/resources, Perks, required choices, win/loss, and deterministic replay. It uses the stable action tray and engine-provided legality. The sample resets on reload. The solo table now supports all five base Heroes and persists locally before publishing committed outcomes. The solo workspace now fits the full board, uses the physical regional arrangement, and shows action review/results in contextual panels. Full-game feedback remains the next human acceptance checkpoint.

## Scope
- In: One human-controlled hero; all five base-game heroes selectable at milestone completion, validated individually; Displacer Beast and Beholder; a simplified labeled map with accurate connections; automated monster phases with required player choices; direct board movement and confirmation for consequential choices; local save/resume; offline gameplay after initial setup.
- Out: Other monsters, promo heroes, Ravenloft, multiplayer, strategic bots controlling extra heroes, companion mode, cloud accounts/services, polished commercial artwork, and desktop packaging in the first milestone.

## Action items
[ ] Encode the verified component packet described in `docs/Game-Data-Checklist.md` into a reviewed, versioned representation; resolve publication gates there and explicitly open rules cases in `docs/Rules-Reference.md`. Preserve sources, confidence, and accepted interpretation versions, and keep incomplete content visibly unavailable without reopening completed owner verification.
[x] Expand the existing React prototype into a verified rules engine independent of the interface, with explicit game phases, legal commands, injected randomness, and synthetic test fixtures. The Fighter slice implements these boundaries; the separate sample remains invented.
[x] Implement shared setup, movement, action budgets, items, citizens, perks, monster phases, and end conditions; reject invalid commands without changing state or spending resources.
[ ] Deliver a complete internal playthrough with one validated hero and both selected monsters, including required choices during resolution; do not claim faithful gameplay while its data or rulings remain unverified.
[x] Implement and test each remaining base Hero, exposing all five for the solo playtest. Complete human play acceptance remains below.
[x] Connect the floating tray to verified game data: available/remaining actions, card costs, hover/focus/tap explanations, action-specific targets and items, and engine-provided reasons for illegal actions. Keep unavailable cards in stable positions. The Fighter table now uses game-specific targets, costs, Perks, and legality; the sample remains separate. Confirm consequential item and dice choices before committing.
[x] Add local autosave, resume, and recovery that preserve committed random results, pending choices, and the action log; reject invalid saves and prevent duplicate action execution.
[ ] Validate complete games, all supported hero abilities, edge cases, reload recovery, keyboard interaction, and disconnected play on the target Mac; update setup, architecture, and verification docs before describing the milestone as playable.

## Action and recovery contract

- Keep the Event log secondary to the board: open solo history only on request, preserve reading position, and provide direct action/roll feedback without relying on history. The display choice never changes game state.
- October 1 startup feedback: automatically load prepared local base components and cache them separately from progress. New Game selects a Hero before setup. Keep independent browser saves, each with its own recovery copy; migrate the earlier save and import backups without replacing other games.
- October 1 workspace feedback: fit the complete board without map scrolling; follow the physical regional layout; distinguish paths and special connections; make optional panels closable and movable between sides. Show action costs and confirmation clearly, with all Hero roll ranges before rolling and a visible saved result afterward. Required choices appear automatically and remain recoverable through a dedicated control.

- October 1 action feedback: remove the invented Wait action. End Hero Phase forfeits unused actions; the next turn starts with its own allowance. Keep eligible free Perks available at zero actions until explicit phase end.
- October 1 playtest feedback: favor map visibility with compact action buttons and an optional Hide/Show actions control. Keep phase status, remaining actions, and phase end available while collapsed; required choices stay visible separately. Hiding clears uncommitted selection without changing gameplay. Put optional Lair controls behind a disclosure.

- Selecting, changing, or cancelling an uncommitted action has no gameplay cost. There is no undo command in the initial design.
- Move executes when the player clicks a highlighted legal destination; consequential item or roll choices require review and Confirm. The engine rechecks legality at execution. Incomplete or illegal choices cannot be committed.
- Once committed, block ordinary action selection and repeat submission until resolution ends. Enable only choices required by that resolution, including during monster phases.
- Keep temporarily invalid cards visible with specific reasons, without changing their tray positions. Legality may differ by monster and action; do not assume shared location is a universal requirement for Advance or Defeat.
- End the Hero Phase explicitly, early or at zero paid actions, only after any current resolution. Eligible free perks remain available at zero actions until that boundary, subject to their own timing and prerequisites. The Fighter engine implements this boundary and free Perks; the sample retains its invented rules.
- Commit each action and random outcome once. A reload must not offer a new roll or repeat a card draw that has already been committed.
- Autosave stable resolution boundaries, including pending choices with their already-determined outcomes. Save after each fully resolved action as well. Surface persistence failures and prevent silent progress beyond a recoverable state.
- After resolution, refresh state, phase, action budget, legal options, and the readable result history. Temporary or bonus effects can change the budget; it is not a hard-coded fixed total.

## Completion criteria

A documented local setup on the M1 Mac can complete a game with either victory or defeat using each supported hero and the selected monster pair. Tests cover illegal actions, duplicate confirmation, interrupted resolution, temporary effects, player decision points, and save/reload without rerolling. All milestone-required data and rulings have verified sources or an explicitly documented user-approved interpretation. Gameplay, bundled assets, and local saves work without external network access after setup; the development server still needs to run locally.

## Dependencies and later updates

- Component reference photos/transcriptions: scoped verification is complete and retained in the private local packet described by the [game-data checklist](Game-Data-Checklist.md). Do not restart photo collection; preserve the packet separately from Git and verify fields when creating the runtime representation.
- Edge-case rulings: use the canonical [rules reference](Rules-Reference.md). Preserve the distinction between publisher rules, reported correspondence, accepted BoardBot interpretations, and still-open cases. Accepted interpretations enable explicit implementation choices; they do not become official rules.
- Before publishing third-party content, document its source and publication rights. Private reference photos stay outside tracked files. The simplified UI can use original labels and generic markers while content review proceeds.
- The prototype uses React, Vite, TypeScript, Node.js 26, and pinned npm dependencies. Local saves use versioned IndexedDB records and replay validation, documented in [Local-Saves.md](Local-Saves.md). Chromium is the current automated browser target; broader browser support is not claimed. These implementation choices do not reopen the agreed product scope.
- Stage two is a physical-game companion for setup, tracking, and quick sourced rules/edge-case lookup. Other monsters, devices, and optional desktop packaging follow later.

## Open questions
- None blocking this planning baseline. The explicit research dependencies above remain open; finalized planning does not mean the rules or assets are fully verified.
