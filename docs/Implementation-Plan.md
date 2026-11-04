# Plan

Use one location number on each nameplate and make the original pieces substantially larger and more dimensional while preserving board controls, counters and saved-game behavior.

## Scope
- In: Numbered nameplates, removal of duplicate corner numbers, larger board-relative piece geometry, original SVG volume/shading and substantial bases/contact shadows, focused rendering and browser checks, canonical UI documentation.
- Out: Rules, saves, map artwork, third-party game artwork, WebGL dependencies and changes to action feedback.

## Action items
- [x] Read README, UI-Design, current GameBoard/PieceArtwork, and relevant unit/browser tests.
- [x] Move each structured location number into its nameplate and remove the corner marker; preserve accessible naming and passage/choice markers.
- [x] Enlarge physical pieces and refine their original artwork with consistent lighting, molded volume, rimmed bases and grounded shadows; keep grouped counters attached.
- [x] Verify crowded/edge locations, long nameplates, native click-through, hidden Lair isolation and WebKit painting with synthetic tests and screenshots.
- [x] Update UI-Design, README and Verification to record the final presentation and acceptance limits.
- [x] Run npm run verify and npm run test:e2e, checkpoint and push the existing UI refinement branch.

## Open questions
- None. Use code-native SVG modeling and shading with no CSS SVG filters; preserve the separate pointer-transparent piece layer. Scale is a usability approximation, not a measured reproduction of the physical product.

## Implementation and verification evidence

- Numbered locations now have a single explicit number in a nameplate wrapper; all corner-number elements are removed. Unnumbered spaces remain unnumbered; accessible floor names retain their numeric markers.
- Figure/Monster SVG viewports grow from 52×74 to 80/88×118; tokens use 68×82. Staggered groups align at the bottom, stay within the map and retain pointer-transparent native controls. Side-mounted counters avoid covering the Item bag.
- Original artwork has unique per-instance gradients, directional shading, rounded Monster forms, beveled bases, thick token edges and vector contact shadows. No external artwork, WebGL or shared filter IDs.
- Updated GameBoard unit and board-workspace browser coverage includes one number per plate, no corner markers, map bounds, substantial figure-to-floor proportions and counter attachment. Added TabletopPieces.test.ts to detect repeated-piece SVG resource collisions.
- Initial focused board-workspace Chromium/WebKit run passed 38/38; final side-counter/crowding/edge/click-through run passed 8/8. Final `npm run verify` passed the build/type checks, all 173 unit tests, repository verification and 12 repository tests. The final full browser run passed all 228 Chromium/WebKit cases, including every Hero victory/reload scenario. Firefox failed at launch before its first case with the pre-existing `Could not find profile folder` error; fail-fast left its other 113 cases unrun, so Firefox application acceptance is not claimed.

- Final synthetic Chromium/WebKit renders were inspected for shading, counter/body separation and nameplates; a presentation crop using number-free synthetic names is saved outside Git in the chat visualization directory. No owner game actions were submitted.
- Branch: `codex/tabletop-ui-refinements`. Local checkpoints: `88e7636` (resolved plan), `88080ef` (implementation and focused verification), followed by the final results record. Private data and generated images remain excluded from Git; all tracked changes belong to this request.
