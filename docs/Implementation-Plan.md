# Plan

Audit the current website against the accepted rules, keyboard access, readable layouts and save behavior. Fix the reproduced interface defects and add focused accessibility regressions while preserving the engine, public-state boundary and existing saves.

## Scope

- In: Full existing regression suites; axe and browser checks; keyboard focus recovery; required choices at enlarged text and narrow widths; keyboard scrolling; usable reading space with many panels; accessible unavailable-action explanations; tests, canonical verification/design notes, checkpoints and feature-branch save.
- Out: New rules, different rule interpretations, save/data migrations, animations, copied artwork, deployment, PR merging, and claiming complete WCAG or human gameplay acceptance.

## Action items

[x] Read the canonical rules/data, UI design and verification docs; map tests and diagnose reproduced failures before changing code.
[ ] Checkpoint this resolved plan on codex/illustrated-tabletop-ui.
[ ] Make action cancellation/confirmation and required-choice return focus a visible, useful control or result; associate action explanations with their controls.
[ ] Keep many open panels readable with scrollable panel space and explicit keyboard access, preserving mounted drafts, disclosures, reading positions and the fitted board.
[ ] Correct repeated result semantics and manually resolve automated contrast checks that cannot evaluate gradients or artwork.
[ ] Add focused browser regressions and repeat automated accessibility checks across setup, ordinary actions, required decisions, inspection, deletion confirmation and enlarged/narrow layouts.
[ ] Update docs/UI-Design.md and docs/Verification.md with implemented fixes, current evidence and remaining human/VoiceOver acceptance; preserve Work-Plan and Roadmap requirements.
[ ] Run npm run verify, npm run test:e2e and affected production/prepared acceptance; review the final diff, commit and push the feature branch.

## Open questions

- None blocking. This is an audit and scoped UI correction using the existing accepted rule contracts. Full human play and VoiceOver experience remain manual acceptance gates.

## Discovery notes

- Baseline passed: 142 unit tests in 26 files, five repository checks, 83 public browser cases, one production case and six prepared-component cases (all five Heroes plus Fighter victory).
- Browser probes reproduce focus falling to BODY after named Move and action cancellation; at 320 CSS pixels with 200% text the required-choice heading remains below the viewport; nine open panels reduce the choice options viewport to 4px.
- Axe identifies unfocusable scroll regions and duplicate named roll landmarks. Automated contrast checks require manual gradient/artwork inspection; no contrast conclusion is inferred from an incomplete result.
- The full-game test controller checks integration and deterministic replay using engine-provided legal options; independent boundary tests and canonical source evidence establish the narrower supported-rule contracts.
- Private packet, user saves, audit screenshots/logs and temporary test-library downloads stay outside public commits. Continue the existing PR9 feature branch without merging it.
