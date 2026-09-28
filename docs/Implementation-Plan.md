# Plan

**Status: finalized planning baseline, September 28, 2026. Application implementation has not started.**

Build a local React browser app for practicing the original Horrified: Dungeons & Dragons on an M1 MacBook Pro. Deliver rules-enforced, on-screen solo play first; reuse the verified rules foundation for a physical-game companion later. Missing component details and unresolved rulings are explicit dependencies, not permission to guess.

## Scope
- In: One human-controlled hero; all five base-game heroes selectable at milestone completion, validated individually; Displacer Beast and Beholder; a simplified labeled map with accurate connections; automated monster phases with required player choices; confirmation-based actions; local save/resume; offline gameplay after initial setup.
- Out: Other monsters, promo heroes, Ravenloft, multiplayer, strategic bots controlling extra heroes, companion mode, cloud accounts/services, polished commercial artwork, and desktop packaging in the first milestone. This documentation update finalizes planning only and does not authorize starting application development.

## Action items
[ ] Complete the component inventory and rules register in `docs/Game-Data-Checklist.md`; record sources and confidence, resolve required gaps, and keep incomplete content visibly unavailable.
[ ] Establish the React app and a rules engine independent of the interface, with explicit phases, legal commands, injected randomness, and synthetic test fixtures.
[ ] Implement shared setup, movement, action budgets, items, citizens, perks, monster phases, and end conditions; reject invalid commands without changing state or spending resources.
[ ] Deliver a complete internal playthrough with one validated hero and both selected monsters, including required choices during resolution; do not claim faithful gameplay while its data or rulings remain unverified.
[ ] Implement and validate each remaining base hero, then expose all five for selection when the milestone is complete.
[ ] Build the simplified board and action panel: remaining/available actions, hover descriptions, click to select, necessary targets/items, and a bottom Confirm button; provide keyboard-accessible descriptions too.
[ ] Add local autosave, resume, and recovery that preserve committed random results, pending choices, and the action log; reject invalid saves and prevent duplicate action execution.
[ ] Validate complete games, all supported hero abilities, edge cases, reload recovery, keyboard interaction, and disconnected play on the target Mac; update setup, architecture, and verification docs before describing the milestone as playable.

## Action and recovery contract

- Selecting, changing, or cancelling an unconfirmed action has no gameplay cost. There is no undo command in the initial design.
- Confirm remains disabled until selections form a legal action. The engine checks legality again before committing it.
- Once confirmed, block ordinary action selection and repeat confirmation until resolution ends. Enable only choices required by that resolution, including during monster phases.
- Commit each action and random outcome once. A reload must not offer a new roll or repeat a card draw that has already been committed.
- Autosave stable resolution boundaries, including pending choices with their already-determined outcomes. Save after each fully resolved action as well. Surface persistence failures and prevent silent progress beyond a recoverable state.
- After resolution, refresh state, phase, action budget, legal options, and the readable result history. Temporary or bonus effects can change the budget; it is not a hard-coded fixed total.

## Completion criteria

A documented local setup on the M1 Mac can complete a game with either victory or defeat using each supported hero and the selected monster pair. Tests cover illegal actions, duplicate confirmation, interrupted resolution, temporary effects, player decision points, and save/reload without rerolling. All milestone-required data and rulings have verified sources or an explicitly documented user-approved interpretation. Gameplay, bundled assets, and local saves work without external network access after setup; the development server still needs to run locally.

## Dependencies and later updates

- Component reference photos/transcriptions: full cards and item quantities, hero tables, both sides of the Beholder reference, citizens, dice faces, and board/mat details. Track progress in the [game-data checklist](Game-Data-Checklist.md).
- Edge-case rulings: keep publisher rules, reported developer correspondence, and unresolved interpretations distinct. Resolve each affected behavior before implementing it as an authoritative rule.
- Before publishing third-party content, document its source and publication rights. Private reference photos stay outside tracked files. The simplified UI can use original labels and generic markers while content review proceeds.
- Routine build tools, dependency versions, storage mechanism/schema, and supported browser versions will be selected and pinned during implementation. These do not reopen the agreed product scope.
- Stage two is a physical-game companion for setup, tracking, and quick sourced rules/edge-case lookup. Other monsters, devices, and optional desktop packaging follow later.

## Open questions
- None blocking this planning baseline. The explicit research dependencies above remain open; finalized planning does not mean the rules or assets are fully verified.

## Documentation update and validation

This task updates README, AGENTS guidance, product brief, architecture, roadmap, verification guidance, and the game-data checklist to match the planning decisions. No executable behavior changes, so no new test files are needed. Run the existing repository verifier and its five regression tests, inspect the documentation diff, and save the documentation checkpoint using the existing plan-implement-save/save-branch workflow. The earlier repository-foundation plan remains in Git history.
