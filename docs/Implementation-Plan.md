# Plan

Resolve PR #16's conflicts with the merged Vite update by integrating current main, retaining its reviewed dependency lockfile and all repository-efficiency behavior, then validate and follow fresh review/CI to merge readiness.

## Scope
- In: Merge origin/main at 8c03c13 into codex/repository-efficiency; resolve the temporary plan and generated lockfile conflicts; retain Vite 8.3.5, Node 26.12.1 and strict installation; verify source preservation, exact installation and existing acceptance suites; save, push and refresh PR evidence.
- Out: New application behavior, rule/save changes, unrelated dependency upgrades, private data, paid services, history rewriting and merging the pull request.

## Action items
- [x] Inspect README, Verification, current branch/main history, PR #14's resolved plan and manifest/lock differences; confirm the feature branch is clean and PR #16 is still open.
- [x] Checkpoint this resolved plan before starting the merge (4f5645d).
- [x] Merge current main without rewriting history; keep this task plan and adopt main's exact reviewed dependency graph, preserving both security requirements and efficiency changes.
- [x] Confirm application/test/script/CI trees match the pre-merge feature head, direct pins match main, and no conflict markers or unrelated edits remain; no new executable test is needed for a documentation/generated-lockfile resolution.
- [x] Run strict npm ci, npm ls --all, npm audit, npm run verify, full Chromium and production Chromium/WebKit acceptance under Node 26.12.1; retain the documented local Firefox limit and require all four CI browser environments.
- [x] Update this plan with concrete verification and conflict choices; keep durable Architecture, Verification, Work-Plan and Roadmap unchanged unless the integration changes their contracts.
- [x] Prepare the verified merge checkpoint for save/push and fresh Codex review; Brooks integration review found no actionable issue. Follow external feedback and CI on the live PR.
- [x] Establish the live PR as the authority for fresh CI/review/mergeability: require all checks to pass and no conflicts before declaring readiness, and leave PR #16 unmerged. Final external results are recorded there rather than cached in this plan.

## Open questions
- None. Use main's reviewed lockfile rather than creating another transitive update; the manifest already agrees on Vite 8.3.5 and the Node security minimum.

## Conflict resolution ledger
- Main advanced to 8c03c13 through Vite security PR #14. Both branches already pin Vite 8.3.5; main locks Rolldown 1.2.14 and @oxc-project/types 0.154.0 while the earlier efficiency installation selected 1.2.15/0.155.0. Adopt main's exact reviewed lockfile, including integrity values and coherent platform bindings, rather than regenerate a transitive upgrade.
- The conflicts are limited to package-lock.json and this temporary task plan. Preserve all feature application/test/script/CI files byte-for-byte, keep main's Node security settings, and retain previous verification in canonical docs and the PR history. No new executable test or other canonical doc change is needed for this integration.

## Local validation
- Strict npm ci and npm ls --all pass under Node 26.12.1/npm 11.20.0. Lockfile audit reports zero vulnerabilities across 95 dependency records. Main's manifest, lockfile and runtime configuration match exactly; only the lockfile and temporary plan differ from the pre-integration feature head.
- Build/typecheck, all 154 unit cases across 28 files and 12 repository checks pass. All 107 Chromium public cases pass in 3.7 minutes; both Chromium/WebKit production cases pass in 11.8 seconds, including bundled WebP decoding and exact pending/terminal recovery behind the local-only proxy. No new tests or weakened assertions are required for the resolution.
- Independent read-only integration review found no issues. Existing local Firefox limits and manual gameplay/VoiceOver/physical-disconnection gates remain unchanged. Full Linux Firefox/WebKit and native macOS WebKit coverage is required on the fresh CI run.

## Brooks-Lint Review

**Mode:** PR Review
**Scope:** October 28 integration delta: docs/Implementation-Plan.md; generated package-lock.json excluded from maintainability scoring and checked separately for exact main agreement and dependency coherence. The existing PR review remains applicable to application, tests, scripts and CI, which are byte-identical to f707ff9.
**Health Score:** 100/100
**Trend:** Stable at 100.

The resolution preserves both security and efficiency intent without adding application or domain changes.

### Findings
- No actionable findings. Main's exact dependency graph and runtime enforcement remain coherent; no conflicting source changes are discarded.
- Quick Test Check skipped for this documentation/generated-lockfile-only resolution; existing unit and acceptance tests cover the toolchain integration.

### Summary
- Keep the exact reviewed main lockfile, current task plan and existing efficiency sources.
- Require current-head Codex review, all CI checks and conflict-free mergeability on the live PR before readiness.
