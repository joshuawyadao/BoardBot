# Plan

Respond to the Fighter playtest feedback by giving the map more space: compact the action controls and add an accessible hide/show toggle to both tables. Keep phase controls and required choices reachable, with no changes to game rules or committed state. This is a UI refinement within the existing six-task goal; remaining Heroes, save/resume, and full milestone acceptance remain pending in Work-Plan.md.

## Scope
- In: Shared compact tray layout; show/hide control; stable action positions, costs, and explanations; smaller selection area; optional Lair controls; responsive and keyboard verification; current feature branch.
- Out: Rules changes, other Heroes, persistence, private data publication, map topology redesign, PR creation or merging.

## Action items
[x] Inspect README.md, Product-Brief.md, Architecture.md, Work-Plan.md, Roadmap.md, Verification.md, current tray components/styles, and browser coverage. Identify the reserved help, card, and editor heights that crowd the board.
[ ] Checkpoint this resolved plan locally before implementation.
[ ] Add a shared compact tray frame with an accessible hide/show control; retain phase status, action count, and phase-end control when collapsed. Hiding clears uncommitted action selections without changing gameplay.
[ ] Compact action cards and help in both tables, remove empty editor space, and put optional Lair controls behind a disclosure. Give the Fighter map more visible height when actions are hidden; keep required choices outside the collapsed controls.
[ ] Update browser coverage for reduced tray height, collapse/reopen by keyboard, no unintended commits, visible required choices, phase end while collapsed, and narrow layout. Preserve legality, confirmation, and duplicate guards.
[ ] Update README.md and canonical Product-Brief.md, Architecture.md, Work-Plan.md, Roadmap.md, and Verification.md to describe the smaller, collapsible controls and unchanged unfinished milestone requirements.
[ ] Run npm run verify and npm run test:e2e under Node 26, inspect rendered layout using permitted test tooling, review the task diff, and commit/push the feature branch with save-branch. Keep private data and generated output ignored.

## Open questions
- None. Implement a compact expanded default with an optional collapsed view; this follows the user's suggested direction without requiring another preference decision.
