# Plan

Apply the smallest dependency maintenance set with verified upstream reliability benefits: isolate Vite 8.3.6 in a feature PR and review the existing setup-node 7.1.0 PR independently.

## Scope
- In: Vite 8.3.5 → 8.3.6 and its required generated lock graph; public regression checks; verification documentation; Codex/Brooks review and CI readiness for this PR and existing Actions PR #10.
- Out: the other six updates in grouped Dependabot PR #20, runtime/type major changes, application/rules/save changes, private game data, and merging PRs.

## Action items
- [x] Read README, Architecture and Verification docs, test configurations, npm peers, official Vite release metadata and existing Dependabot PRs; confirm baseline audit and alerts.
- [x] Create `codex/vite-8-3-6-reliability` from current `origin/main` (`4633e1f`), keeping the completed Node/Vite security and axe label fixes.
- [ ] Checkpoint this resolved plan before implementation.
- [ ] Pin Vite 8.3.6 and regenerate its lockfile with npm; inspect all changed transitive packages and retain the smallest coherent graph.
- [ ] Run clean install, peer/audit checks, `npm run verify`, public Playwright suites and production acceptance; keep generated output temporary and record host limits.
- [ ] Update `docs/Verification.md` with the selected maintenance rationale and actual results. No new tests are planned because no application behavior changes; existing local endpoint, build, recovery, accessibility and full synthetic game tests cover compatibility.
- [ ] Save and push the focused branch; open a draft PR identifying the overlap with #20. Review existing SHA-pinned Actions PR #10 without duplicating its upgrade.
- [ ] Complete Brooks review, request/poll Codex review, require terminal green CI and clean mergeability for both PRs; fix only regressions attributable to these changes and leave merging to the user.

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
