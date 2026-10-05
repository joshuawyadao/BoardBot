# Plan

Implement the approved illustrated tabletop UI, making the board's names, numbered spaces, terrain and legal connections read as one map. Use the owner's physical-board reference to validate placement, keep the accepted movement graph authoritative, and preserve the existing solo-game and recovery behavior.

## Scope
- In: Physical-board layout validation; original illustrated assets with documented provenance; integrated location lettering and numbered floor markers; terrain-following routes; distinct portals and paired secret passages; tactile pieces; dark panels and brass controls; responsive and keyboard interaction; tests, documentation, branch checkpoints, and a fully reviewed pull request.
- Out: Animations; new rules or speculative connections; engine/save migrations; multiplayer; publishing the private evidence packet or copied commercial artwork; declaring complete manual gameplay acceptance; merging without the owner's request.

## Action items
[x] Inspect the approved visual direction, physical-board evidence, accepted Rules-Reference and Game-Data-Checklist, architecture, current board rendering, and existing geometry/browser tests; activate the UI goal and create the feature branch.
[ ] Validate all 29 physical-board locations and author a board geometry contract in src/ui/boardLayout.ts, preserving the 28 accepted ordinary routes, two passage pairs and teleport network; prevent unrelated-node crossings and misleading neutral junctions.
[ ] Create original production artwork suited to that geometry and record source/publication provenance before committing assets; keep private photos, component data and concept screenshots ignored.
[ ] Update GameBoard.tsx and gameBoard.css with integrated names and numbering, coherent roads/bridges, clear portal/passage cues, distinct pieces and accessible hit targets; retain the complete synthetic fallback.
[ ] Apply the approved charcoal/brass styling to the existing library, phase controls, action tray, independently toggled panels, inventory/perk explanations and persistent roll results.
[ ] Extend focused geometry/rendering tests and browser checks for map fit, path endpoints, legal selections, keyboard focus, crowded pieces, pending choices and panel toggles; preserve the existing gameplay and recovery assertions.
[ ] Record the durable design and asset decisions in a focused docs/UI-Design.md; update README.md, Architecture.md, Verification.md, Roadmap.md and Work-Plan.md where implemented behavior or accepted direction changes.
[ ] Run targeted checks, npm run verify and npm run test:e2e; inspect the actual prepared-game board on the target desktop size, then use production/prepared checks where visual changes leave interaction or recovery risks.
[ ] Save coherent checkpoints, push the feature branch, and run the full pr-review-cycle through Codex/Brooks feedback, CI and conflict resolution until merge-ready; leave full manual game acceptance and merging to the owner.

## Open questions
- None blocking the approved scope. The generated concept is a visual reference, not evidence of exact geometry or legal paths; implementation must validate those independently against the canonical graph and physical board.
