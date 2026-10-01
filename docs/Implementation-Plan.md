# Plan

Support several information panels at once while keeping the whole board visible, and make setup pieces, Wizard relocation choices, and owned Perks easier to understand. Preserve the existing rules and save/replay compatibility; use only public projections and the private imported descriptions.

## Scope
- In: Independent Inventory, Monsters, Event log, and Latest result panels; individual close/side controls; visible board occupants and initial setup summary; Castle Corkscrew visual placement in Waterdeep; Wizard choice explanations; Inventory Perk descriptions; focused tests, canonical docs, and final save/push.
- Out: Changing verified setup quantities or rules without a reproduced defect; copied artwork or public component text; extra Monsters; multiplayer; save format changes; PR creation or merging.

## Action items
[x] Inspect the table, projection, Wizard resolution, verified setup references, and browser tests; clarify that the confusing prompt concerned moving the Displacer Beast.
[ ] Checkpoint the resolved plan on the current feature branch.
[ ] Reproduce Wizard special-action versus destination rolls and verify all initial pieces are already placed; add projection-only explanations naming the existing piece and destination, with focused regression tests.
[ ] Improve always-visible Hero/Monster/Item markers and move Castle Corkscrew into Waterdeep in the schematic without changing adjacency or data identities.
[ ] Support independent information panels in side docks, keep actions and required choices usable, and preserve the board fit on desktop and stacked panels on narrow screens.
[ ] Show owned Perk effects in Inventory and an automatic initial board-setup summary before the first action, without adding a game command or changing saved state.
[ ] Extend browser coverage for simultaneous panels, close/reposition behavior, Perk inspection, initial piece visibility, Wizard relocation context, and pending-save recovery.
[ ] Update README, Architecture, Product-Brief, Work-Plan, and Verification; run npm run verify and npm run test:e2e, inspect isolated visuals, then save and push the completed change.

## Open questions
- None blocking. The user confirmed the prompt concerned the Displacer Beast. Distinguish a rolled destination from a special-action result using the existing resolution, and relocate the existing Monster rather than inventing a new setup step. Dock panels independently while retaining the full board.
