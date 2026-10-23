# Plan

Implement the repository-efficiency review on a feature branch, reducing asset, CI and library-listing work while preserving deterministic rules, saved games and the local-only product direction; validate and prepare a reviewed pull request into main.

## Scope
- In: Routine dependency grouping; fail-closed documentation-only CI classification and gate controls; lossless WebP delivery; stale contribution/security/bug-form corrections; canonical JSON ownership with compatibility characterization; measured library-listing optimization; shared distance traversal; narrow browser helpers/readiness waits; proven-dead CSS removal; canonical documentation, validation, checkpoint commits, push and PR review cycle.
- Out: Changing rules interpretations, save formats or save-write interfaces; deleting cached/legacy data; truncating history; cloud/paid integrations; new graph/CSS frameworks; speculative replay workers/caches; claiming human play/VoiceOver acceptance; merging the PR.

## Action items
- [x] Review the October 20 findings, README, Architecture, Local-Saves, existing verification and affected public tests; fetch main and create `codex/repository-efficiency` from its clean tip.
- [x] Checkpoint this resolved plan, install locked dependencies and establish the build/unit/repository baseline; use synthetic data only.
- [x] Group compatible routine updates and classify documentation-only PRs inside CI; test classifier uncertainty, mixed changes, manual/main runs, and every gate failure/cancellation/unexpected-skip state.
- [x] Pin Vite to its patched 8.3.5 release after the installed baseline audit reported advisories affecting 8.3.2; rerun audit and endpoint/build/browser checks.
- [x] Replace the bundled PNG with pixel-identical lossless WebP, preserve provenance, update built-image acceptance, and remove only confirmed-unused CSS selectors.
- [x] Characterize existing canonical bytes/fingerprints and share the encoding implementation without changing existing data identities or supported-save replay.
- [x] Measure 1/10/50-game synthetic library listings; reuse per-listing content validation and avoid portable payload construction where it preserves corruption, size, recovery and concurrency behavior; add native IndexedDB regressions.
- [x] Reuse traversal-aware distance maps in existing engine modules, preserving tie/order, restrictions, unreachable targets and replay; consolidate narrow public-test startup/save helpers and replace fixed sleeps with observable readiness.
- [x] Refresh CONTRIBUTING, SECURITY and the bug form; update README, Architecture, Local-Saves, UI-Design, Verification and asset provenance where behavior or operational guidance changes, while preserving Work-Plan/Roadmap requirements.
- [x] Run focused checks, `npm run verify`, `npm run test:e2e` and `npm run test:production`; record environment limits and before/after measurements, inspect the diff and commit coherent slices.
- [ ] Push this feature branch, open a PR into main, request Codex review, run Brooks review, address actionable feedback/CI failures and verify mergeability; leave the PR unmerged.

## Open questions
- None blocking. Profile-driven proposals remain bounded to library listing; larger save-path/history changes remain follow-up work unless measurements and compatibility evidence justify them separately.

## Verification and review ledger
- Baseline locked build, 148 Vitest cases and five Python repository cases passed before implementation. The patched Vite 8.3.5 installation reports zero vulnerabilities.
- Final local build/typecheck, 154 Vitest cases across 28 files and 12 Python repository/CI cases pass. Canonical fingerprints for synthetic v3/v4/v5 data remain identical.
- The complete Chromium suite passed 106 cases in 5.3 minutes before the final concurrency case was added; all 15 final native-storage cases then passed in Chromium and WebKit (30 executions, 8.9 seconds), including multi-version and concurrent-list checks. The focused WebKit Fighter/Hero/storage run passed 28 cases. This covers the current 107-case public suite across the full Chromium run plus focused final additions; a new complete four-environment run remains the PR gate.
- Both built-app production cases pass in Chromium/WebKit (33.8 seconds), including actual WebP decoding, exact pending/terminal recovery and the enforced loopback-only network.
- The local Firefox probe still fails before creating a page with “Could not find profile folder”; 14 further storage cases were not run. Linux Firefox CI supplies full execution evidence; no owner browser profile or OS permission was changed.
- Public local testing uses a temporary external config on port 4193 because another process occupies 4173; that process is untouched. Synthetic browser contexts do not read owner components or saves.
- Lossless encoding and synthetic listing measurements are recorded in Verification.md. Save-write interface/history/GC redesign remains deferred, and manual owner acceptance is unchanged.
- Independent storage/canonical and CI/helper reviews found no actionable regression. Pre-checkpoint review corrected the final CI gate's missing checkout and tightened nested AGENTS.md classification.
- Checkpoints: 7481e2c (plan), 16a53a3 (CI/groups), d78fcd8 (asset/CSS), e9daf13 (Vite patch), b393325 (library/canonical/traversal), 5771dee (browser helpers). External PR review/CI state is recorded below when available.
