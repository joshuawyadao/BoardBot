# Plan

Finish the illustrated tabletop with remembered presentation preferences, accessible error recovery and automated WebKit coverage. Keep preferences separate from game data and retain the existing engine, save/replay boundaries and manual acceptance requirements.

## Scope
- In: Browser-wide table panel/tray preferences and Reset layout; error focus and announcements for import, save/retry, recovery and competing-tab failures; WebKit projects and CI coverage; focused regressions, canonical docs, local checkpoints and branch push.
- Out: Rules/data changes, save migrations, restoring uncommitted drafts or inspected contents across reload, animations, new platforms beyond tested browsers, deployment, PR review requests and merging.

## Action items
[x] Read README, Architecture, Local-Saves, UI-Design, Verification and existing browser/configuration contracts; confirm the clean codex/illustrated-tabletop-ui branch.
[ ] Checkpoint the resolved plan before implementation.
[ ] Add validated, versioned, nonfatal presentation preferences for persistent information panels, their sides, decision-panel side and collapsed tray; keep transient inspector/selection state out of storage and add Reset layout without changing game progress or required choices.
[ ] Give asynchronous errors a visible focus target with specific recovery guidance; announce save progress and success without duplicate alert/status content, including retry, import, previous-save and stale-tab failures.
[ ] Add focused unit/browser regressions for preference restoration/reset, malformed or unavailable preference storage, retained drafts and pending choices, and keyboard error recovery without rerolling or overwriting saves.
[ ] Add WebKit to public and production browser configuration and CI, install the compatible engine, and address reproduced browser differences without weakening valid tests.
[ ] Update README, UI-Design, Local-Saves, Architecture and Verification to describe implemented behavior, browser coverage and remaining manual acceptance.
[ ] Run focused tests, npm run verify, npm run test:e2e and npm run test:production; inspect the resulting UI and final diff, commit coherent slices and push the feature branch.

## Open questions
- None blocking. Layout is a preference for this browser origin across solo games; malformed/unavailable preference storage falls back to defaults and must not block saving. Ephemeral drafts and selected location contents remain unpersisted. WebKit coverage does not imply Safari or VoiceOver certification.
