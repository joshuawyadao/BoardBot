# Plan

Reduce repeated manual acceptance by making the remaining deterministic browser, input, layout and network checks repeatable. Reuse the existing full-game, real-storage and private-component evidence; retain human judgment and the established owner-play/publication gates.

## Scope
- In: Firefox public/production coverage; independent Linux browser jobs plus native M1 macOS WebKit CI; emulated touch input, compact caption/piece and reduced-motion regressions; production network isolation with an enforced loopback-only proxy and a denied-request control; a checklist mapping automated evidence to the smallest remaining human review; validation, checkpoints and branch push.
- Out: Rules/data or save-format changes, new strategic bots, new required accounts/paid services, publishing private components/artifacts, disabling the owner's network, declaring real-device/VoiceOver certification, waiving source/publication or complete owner-game acceptance, deployment and merging.

## Action items
[x] Read README, Architecture, Playtest-Checklist, Work-Plan/Roadmap, Rules-Reference/Game-Data-Checklist and current browser/production/private contracts; identify gaps without duplicating setup, replay or five-Hero outcomes.
[x] Checkpoint this resolved plan on codex/illustrated-tabletop-ui before implementation.
[x] Add Firefox to public/production projects and split CI by browser/OS, preserving the required CI Verify result and one-worker isolation; add a standard native macOS M1 WebKit job.
[x] Add bounded emulated touch input, compact all-location captions/pieces and reduced-motion regressions using synthetic illustrated fixtures and normal native input; report application defects before changing test expectations.
[x] Strengthen production disconnected-network evidence with a real loopback-only proxy, denied HTTP/HTTPS controls, cached-base/pending/terminal recovery and no external gameplay requests; never touch owner network settings or saves.
[x] Update README, Verification, Playtest-Checklist and the browser-coverage notes in Work-Plan/Architecture to distinguish automation, emulation, native CI and remaining subjective/device checks; preserve durable milestone requirements.
[ ] Run focused cases, npm run verify, npm run test:e2e, npm run test:production and existing opt-in private acceptance; investigate reproduced failures, inspect diffs and save coherent checkpoints.
[ ] Push the feature branch, verify the new CI matrix, record exact evidence and leave only the concise human review checklist.

## Verification in progress
- Build/typecheck, 148 Vitest cases and five repository checks pass. Chromium/WebKit production acceptance passes with enforced proxy and bundled art; the additional wrong-loopback-port denial and complete public rerun are pending.
- Chromium passes the new tap, caption/piece and reduced-motion cases. WebKit passes compact geometry and reduced motion; its unsupported maxTouchPoints test assumption was removed while preserving native tap/action assertions. Full browser suites are running.
- Local Firefox fails at launch before page creation on macOS 27, including a temporary-root control; use the Linux Firefox CI leg for execution and retain the upstream environment limitation in Verification.

## Open questions
- None blocking. Use standard public-repository CI runners only. Full owner play and actual VoiceOver/device experience remain human acceptance; automated network isolation is not a claim of physically switching off Wi-Fi.
