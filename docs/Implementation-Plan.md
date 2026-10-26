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
- [x] Push this feature branch, open PR #16 into main, request Codex review and run Brooks review; track external feedback, required CI and mergeability on the live PR before declaring readiness, and leave it unmerged.

- [x] Integrate main's merged PR #15 security minimum without dropping the efficiency changes; preserve the exact Node 26.12.1 pin, >=26.12.1 <27 engine range, strict installs and both verification histories.
- [x] Reinstall and rerun verification, full public Chromium and production Chromium/WebKit under Node 26.12.1; preserve existing assertions and confirm the merge changes only the root engine requirement in the dependency graph.
- [x] Save the conflict-resolution checkpoint and track its fresh review/CI on PR #16 before declaring readiness; the live PR remains the authority for external gate results.

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

## PR handoff
- [PR #16](https://github.com/joshuawyadao/BoardBot/pull/16) targets main from codex/repository-efficiency. Source/support documentation checkpoint: 3148554. The working tree is clean apart from subsequent explicitly recorded review fixes.
- The manual Codex review request was posted successfully. Local Brooks review and independent storage/canonical and CI/helper reviews found no outstanding actionable issue.
- GitHub selected the full application path for this mixed PR; the classifier, repository checks and build/rules passed in the initial run. The live PR is the authority for the latest full browser/production CI, Codex feedback, mergeability and readiness; this plan does not cache a future gate result or waive manual acceptance.

## Main integration — October 26, 2026
- Main advanced to 0077c6a (PR #15) while the Linux WebKit retry completed. The pre-integration c2bd2f2 head passed all eight CI jobs: 154 unit cases, 12 repository cases, 428 public browser cases and four production cases, with no test retries. The first Linux WebKit job timed out after a slow Ubuntu mirror took 23m54s for 117 MB; its focused retry passed.
- The only merge conflicts were the temporary task plan and appended Verification sections. Keep this task plan, retain the complete Node security verification section beside the efficiency section, and accept main's runtime/configuration/setup changes. Both canonical Work-Plan and Roadmap remain unchanged.
- No executable application or test source changes are required for the merge; existing suites cover the combined runtime and efficiency behavior. No new test cases are needed solely for resolving these documentation conflicts. Local verification and the new current-head CI remain required before readiness.
- Clean installation under Node 26.12.1/npm 11.20.0, build/typecheck, all 154 unit cases, 12 repository cases, all 107 Chromium cases (4.7 minutes) and both Chromium/WebKit production cases (21.7 seconds) pass. A read-only integration review found no actionable issue. The initial local server starts were denied by the execution sandbox before page creation; authorized local-server execution passed without source changes. Full Firefox and native macOS/Linux WebKit evidence remains in the new PR CI run.
