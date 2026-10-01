# Plan

Redesign the solo table around a complete, fitted board with the physical board's regional arrangement, clear routes, contextual panels, and visible dice outcomes. Keep the existing game rules, command validation, private-data boundary, and save compatibility.

## Scope
- In: Responsive solo workspace; verified board-relative positions; ordinary/passage/teleport route clarity; collapsible and repositionable contextual panels; explicit action confirmation and roll results; Hero outcome ranges from imported data; focused tests, canonical docs, checkpoint commits, final push.
- Out: Copied board artwork or public private-data assets, rules or save-format changes, new Monsters, multiplayer, deployment, PR creation, and merging. Keep the synthetic practice table independently usable.

## Action items
[x] Inspect current layout, projection, action flow, saved board photo, verified location graph, Hero outcome schema, and existing browser tests.
[ ] Checkpoint the resolved plan on the existing feature branch.
[ ] Replace the fixed scrollable grid with a fitted board arranged by the physical regions, use clear ordinary/passage routes, and show teleport links only when relevant; preserve graph legality and keyboard operation.
[ ] Rebuild the solo workspace with compact persistent status/actions and on-demand inventory, Monster, log, and selection panels; let users close optional panels and move the panel to either side.
[ ] Expose only committed public pending-roll values, show prominent pending/final dice arithmetic and ability effects, and display imported special-action roll ranges before confirmation.
[ ] Update browser coverage for fitted board geometry, region layout, reachable routes, panel visibility/position, keyboard movement, confirmation, outcomes, save recovery, and narrow screens; retain rules and duplicate-command coverage.
[ ] Update README, Architecture, Product-Brief, Work-Plan, and Verification to record the new interaction model and remaining human acceptance.
[ ] Run focused tests, npm run verify, and npm run test:e2e; inspect isolated desktop and narrow screenshots, review the diff, checkpoint and push.

## Open questions
- None blocking. Use original schematic styling and relative placement from the verified private photo, without copying its artwork. Panels move between left and right docks through an accessible control. Saved games and the underlying legal graph stay compatible.
