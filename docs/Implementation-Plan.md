# Plan

Implement the approved accessible tabletop renders as live React interfaces, keeping the illustrated board authoritative to the existing geometry and legal graph. Use original code-rendered physical pieces, native readable captions, contextual inspection and decisions, and additive observed-state presentation fields.

## Scope

- In: Integrated floor-rim captions at every location; tactile Hero/Monster/Item/Citizen/Lair presentation; quantities versus Strength; location inspection and a named location list; independent panels; persistent phase/actions/Terror/Frenzy/deck status; Beholder attack/dice/ray context and Slowing previews; Wizard outcome and destination selection; accessible controls, focus restoration and responsive layouts; tests, docs, local browser checks, checkpoints and feature-branch push.
- Out: Rules changes, hidden-state exposure, save migrations, speculative board edges, animations, multiplayer, copied commercial artwork, hosted deployment, PR merging and declaring full human gameplay or assistive-technology acceptance.

## Action items

[ ] Map the existing UI, projection privacy boundary, canonical component/rule references and affected unit/browser tests; checkpoint this resolved plan on codex/illustrated-tabletop-ui.
[ ] Add cloned presentation-only attack/current-card/next-phase information and explicit pending-choice context to the public GameView; test privacy, conditional Slowing previews, legacy interpretation and Wizard choice distinctions.
[ ] Build original reusable SVG standees, miniatures, item illustrations and dice with tactile bases and clear quantity badges; document their provenance and preserve decorative/accessible separation.
[ ] Update GameBoard.tsx and gameBoard.css with live rim captions, distinct crowded pieces, native inspection and engine-projected Wizard selection; preserve all29 anchors and accepted routes, synthetic fallback and hidden Lairs.
[ ] Implement the cream location inspector, named location list, supplies/progress panel and item cards in FighterTable; preserve independent panel toggles/drafts and restore focus to invoking controls.
[ ] Implement Beholder attack context and complete engine-driven responses, next-phase penalty previews, readable Hero range tables/results and map-or-name Wizard destination selection with explicit confirmation.
[ ] Extend focused rendering/projection/browser tests for inspection without spending actions, draft preservation, keyboard focus/return, effective20 outcomes, conditional penalties, enlarged text, narrow layouts, control sizes and save recovery.
[ ] Update README.md, docs/UI-Design.md, docs/Architecture.md, docs/Verification.md and the original-art notice to describe implemented behavior and remaining manual checks; retain the durable Work-Plan/Roadmap baseline.
[ ] Run targeted checks, npm run verify, npm run test:e2e and production/prepared acceptance where applicable; inspect the running local app using an isolated game; save coherent checkpoints and push the feature branch.

## Open questions

- None blocking implementation. The approved images guide styling; native UI derives all game values from the public projection. The existing local Vite app is the live target. Manual VoiceOver, physical disconnection and the owner's full-game acceptance remain separate.

## Discovery notes

- Read README, AGENTS, Architecture, UI-Design, Game-Data-Checklist, Rules-Reference and Verification; reviewed GameBoard, FighterTable, RollResult, current fixtures and browser checks.
- Existing open PR9 already contains the illustrated-board foundation on codex/illustrated-tabletop-ui; this task continues that branch and does not merge it.
- The engine first asks discard versus penalty, then asks which Item to discard. Keep those commands and save/replay semantics; improve the decision presentation without combining commands speculatively.
- SVG pieces are original project artwork. Do not bundle private component text, photographs, saved games or the generated concept screenshots.
