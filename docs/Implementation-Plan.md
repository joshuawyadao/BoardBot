# Plan

Support several information panels at once while keeping the whole board visible, and make setup pieces, Wizard relocation choices, and owned Perks easier to understand. Preserve the existing rules and save/replay compatibility; use only public projections and the private imported descriptions.

## Scope
- In: Independent Inventory, Monsters, Event log, and Latest result panels; individual close/side controls; visible board occupants and initial setup summary; Castle Corkscrew visual placement in Waterdeep; Wizard choice explanations; Inventory Perk descriptions; focused tests, canonical docs, and final save/push.
- Out: Changing verified setup quantities or rules without a reproduced defect; copied artwork or public component text; extra Monsters; multiplayer; save format changes; PR creation or merging.

## Action items
[x] Inspect the table, projection, Wizard resolution, verified setup references, and browser tests; clarify that the confusing prompt concerned moving the Displacer Beast.
[x] Checkpoint the resolved plan on the current feature branch (`ed1e1b7`).
[x] Reproduce Wizard special-action versus destination rolls and verify all initial pieces are already placed; add projection-only explanations naming the existing piece and destination, with focused regression tests.
[x] Improve always-visible Hero/Monster/Item/Citizen/Lair markers and move Castle Corkscrew into Waterdeep in the schematic without changing adjacency or data identities.
[x] Support independent information panels in side docks, keep actions and required choices usable, and preserve the board fit on desktop and stacked panels on narrow screens.
[x] Show owned Perk effects in Inventory and an automatic initial board-setup summary before the first action, without adding a game command or changing saved state.
[x] Extend browser coverage for simultaneous panels, close/reposition behavior, Perk inspection, initial piece visibility, Wizard relocation context, and pending-save recovery.
[x] Update README, Architecture, Product-Brief, Work-Plan, and Verification; run npm run verify and npm run test:e2e and inspect isolated visuals before the final branch save.

## Validation and save
- `npm run verify`: build/typecheck, 101 unit tests in 18 files, and five repository tests passed.
- `npm run test:e2e`: all 55 Chromium tests passed, including crowded panels at smaller widths and Wizard pending-choice recovery.
- Isolated actual-data screenshots at 1440×900 and 1024×768 showed no page overflow or browser errors. Private data and screenshots remain outside Git.
- Save the completed implementation and this plan to `codex/identify-remaining-boardbot-work`; the broader milestone still needs full human play acceptance.

## Open questions
- None blocking. The user confirmed the prompt concerned the Displacer Beast. Distinguish a rolled destination from a special-action result using the existing resolution, and relocate the existing Monster rather than inventing a new setup step. Dock panels independently while retaining the full board.
