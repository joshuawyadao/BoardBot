# Plan

Reduce repeated manual acceptance by making the remaining deterministic browser, input, layout and network checks repeatable. Reuse the existing full-game, real-storage and private-component evidence; retain human judgment and the established owner-play/publication gates.

## Scope
- In: Firefox public/production coverage; independent Linux browser jobs plus native M1 macOS WebKit CI; coarse-pointer/touch, compact caption/piece and reduced-motion regressions; production network isolation with an enforced loopback-only proxy and a denied-request control; a checklist mapping automated evidence to the smallest remaining human review; validation, checkpoints and branch push.
- Out: Rules/data or save-format changes, new strategic bots, new required accounts/paid services, publishing private components/artifacts, disabling the owner's network, declaring real-device/VoiceOver certification, waiving source/publication or complete owner-game acceptance, deployment and merging.

## Action items
[x] Read README, Architecture, Playtest-Checklist, Work-Plan/Roadmap, Rules-Reference/Game-Data-Checklist and current browser/production/private contracts; identify gaps without duplicating setup, replay or five-Hero outcomes.
[ ] Checkpoint this resolved plan on codex/illustrated-tabletop-ui before implementation.
[ ] Add Firefox to public/production projects and split CI by browser/OS, preserving the required CI Verify result and one-worker isolation; add a standard native macOS M1 WebKit job.
[ ] Add bounded touch/coarse-pointer, compact all-location captions/pieces and reduced-motion regressions using synthetic illustrated fixtures and normal native input; report application defects before changing test expectations.
[ ] Strengthen production disconnected-network evidence with a real loopback-only proxy, denied HTTP/HTTPS controls, cached-base/pending/terminal recovery and no external gameplay requests; never touch owner network settings or saves.
[ ] Update README, Verification, Playtest-Checklist and the browser-coverage notes in Work-Plan/Architecture to distinguish automation, emulation, native CI and remaining subjective/device checks; preserve durable milestone requirements.
[ ] Run focused cases, npm run verify, npm run test:e2e, npm run test:production and existing opt-in private acceptance; investigate reproduced failures, inspect diffs and save coherent checkpoints.
[ ] Push the feature branch, verify the new CI matrix, record exact evidence and leave only the concise human review checklist.

## Open questions
- None blocking. Use standard public-repository CI runners only. Full owner play and actual VoiceOver/device experience remain human acceptance; automated network isolation is not a claim of physically switching off Wi-Fi.
