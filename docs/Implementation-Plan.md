# Plan

Use one location number on each nameplate and make the original pieces substantially larger and more dimensional while preserving board controls, counters and saved-game behavior.

## Scope
- In: Numbered nameplates, removal of duplicate corner numbers, larger board-relative piece geometry, original SVG volume/shading and substantial bases/contact shadows, focused rendering and browser checks, canonical UI documentation.
- Out: Rules, saves, map artwork, third-party game artwork, WebGL dependencies and changes to action feedback.

## Action items
- [x] Read README, UI-Design, current GameBoard/PieceArtwork, and relevant unit/browser tests.
- [ ] Move each structured location number into its nameplate and remove the corner marker; preserve accessible naming and passage/choice markers.
- [ ] Enlarge physical pieces and refine their original artwork with consistent lighting, molded volume, rimmed bases and grounded shadows; keep grouped counters attached.
- [ ] Verify crowded/edge locations, long nameplates, native click-through, hidden Lair isolation and WebKit painting with synthetic tests and screenshots.
- [ ] Update UI-Design, README and Verification to record the final presentation and acceptance limits.
- [ ] Run npm run verify and npm run test:e2e, checkpoint and push the existing UI refinement branch.

## Open questions
- None. Use code-native SVG modeling and shading with no CSS SVG filters; preserve the separate pointer-transparent piece layer. Scale is a usability approximation, not a measured reproduction of the physical product.
