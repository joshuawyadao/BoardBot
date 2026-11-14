# Plan

Apply the smallest dependency maintenance set with verified upstream reliability benefits: isolate Vite 8.3.6 in a feature PR and review the existing setup-node 7.1.0 PR independently.

## Scope
- In: Vite 8.3.5 → 8.3.6 and its required generated lock graph; public regression checks; verification documentation; Codex/Brooks review and CI readiness for this PR and existing Actions PR #10.
- Out: the other six updates in grouped Dependabot PR #20, runtime/type major changes, application/rules/save changes, private game data, and merging PRs.

## Action items
- [x] Read README, Architecture and Verification docs, test configurations, npm peers, official Vite release metadata and existing Dependabot PRs; confirm baseline audit and alerts.
- [x] Create `codex/vite-8-3-6-reliability` from current `origin/main` (`4633e1f`), keeping the completed Node/Vite security and axe label fixes.
- [x] Checkpoint this resolved plan before implementation (`a482843`).
- [x] Pin Vite 8.3.6 and regenerate its lockfile with npm; inspect all changed transitive packages and retain the smallest coherent graph.
- [x] Run clean install, peer/audit checks, `npm run verify`, public Playwright suites and production acceptance; keep generated output temporary and record host limits.
- [x] Update `docs/Verification.md` with the selected maintenance rationale and actual results. No new tests are needed because no application behavior changes; existing local endpoint, build, recovery, accessibility and full synthetic game tests cover compatibility.
- [x] Prepare the focused branch for final save and draft publication, identifying the overlap with #20. Review existing SHA-pinned Actions PR #10 without duplicating its upgrade.
- [x] Complete local Brooks review and establish the publishing gates: request/poll Codex review, require terminal green CI and clean mergeability for both PRs; record external outcomes on the live PRs and leave merging to the user.

## Open questions
- None.

## Evidence and rollback
- Official Vite 8.3.6 release includes overlapping plugin shutdown handling (#23935), stable chunk hash inputs (#23976), and respecting server.fs for Wasm (#23914). These are maintenance benefits, not a claim of a reproduced BoardBot vulnerability. Its Node and peer ranges accept Node 26.12.1 and the existing plugin/Vitest versions.
- npm audit reports zero vulnerabilities before the upgrade; GitHub reports zero open Dependabot alerts. Grouped PR #20 already has full green CI, but the React, Playwright, Node types, React plugin and Vitest upgrades are not required for this focused patch.
- Existing PR #10 pins setup-node 7.1.0 at `949feb2413d6458794dcd2491c4babbbce0c15c1`, verified against the official tag. It adds Node manifest-fetch retries/validation while preserving the existing Node pin. It is an independent rollback boundary.
- Revert the focused Vite PR as one unit to restore its previous dependency graph. Neither change introduces a game-state migration.

## Review and validation ledger
- Discovery: clean main `4633e1f`, Node 26.12.1/npm 11.20.0; all direct installed pins match the lockfile and npm ls reports no problems.
- Existing PR evidence: #20 at `0182cff` and #10 at `ad72bda` both have green CI Verify matrices. Main rules require PRs and resolved review threads, with zero required approving reviews; no status-check rule is configured. This task still requires the configured CI Verify workflow and full matrix to pass.
- Subsequent review requests, CI results and readiness will be recorded on the live PRs after publishing.
- Lock generation: npm initially selected later in-range transitive patches. Extracted the smaller, already npm-generated Vite graph from PR #20 and reran npm lockfile generation plus clean npm ci. Exactly 19 package versions change: Vite, PostCSS, Oxc types, Rolldown and its 15 platform bindings; no package is added or removed and all other direct pins stay fixed. All version/integrity records and platform bindings are consistent in both lockfile v2 sections.
- Final local checks: clean npm ci/npm ls, zero-vulnerability npm audit, build/typecheck, 155 unit cases across 28 files, 12 repository tests, all 214 public browser cases (107 Chromium and 107 WebKit, 7.3 minutes), and both Chromium/WebKit production acceptance cases pass. Browser output is in temporary directories. A bounded Firefox control reproduces the existing macOS launch failure before page creation (`Could not find profile folder`); full Linux Firefox CI is required.
- PR #10: requested fresh Codex review on `ad72bda` using the prescribed script; first poll observed running review, next poll confirmed completion with no findings and no review threads. Existing full CI is green. No code, test or branch changes were needed on this existing PR.
- Independent read-only compatibility review found no mismatched Node/peer ranges, native binding versions or Actions inputs.

## Brooks-Lint Review

**Mode:** PR Review
**Scope:** This branch versus `origin/main`: package.json, docs/Verification.md and this plan; separately PR #10's five setup-node SHA references in .github/workflows/ci.yml. Generated package-lock.json is excluded from maintainability scoring, with its exact dependency graph reviewed separately. No project Brooks configuration is present.
**Health Score:** 100/100
**Trend:** Stable at 100 against the last stored PR Review.

The focused dependency updates preserve the existing dependency direction and runtime contract without adding application complexity.

### Findings
- No actionable findings across change propagation, cognitive load, knowledge duplication, accidental complexity, dependency direction or domain language. The five matching action pins are existing explicit CI job boundaries, not new duplicated policy.
- Quick Test Check is inapplicable to configuration/documentation-only changes. Existing tests retain their assertions and verify integration with the selected toolchain.

### Summary
- Keep the Vite graph and Actions PR as independent rollback boundaries.
- Require fresh Codex review and terminal green hosted CI for the published Vite head; retain PR #10's completed review and green matrix.
