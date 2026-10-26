# Plan

Complete the smallest Vite security upgrade by adopting the existing Dependabot PR #14, validating its exact locked dependency set, and saving review evidence on that branch.

## Scope
- In: Vite 8.3.2 to 8.3.5 and its existing generated lockfile changes; installation, peer compatibility, security, endpoint, build, public browser and production checks; implementation tracking and PR review.
- Out: Other dependency or Action updates, further Node changes beyond the already merged PR #15 baseline, repository-efficiency PR #16, application or game-rule changes, private data, and merging the PR.

## Action items
- [x] Read README, Architecture and Verification; map the npm scripts, local endpoint tests, public browser fixtures and isolated production coverage.
- [x] Verify initial main at ba9f9cd and adopt existing PR #14 at 45da614 on dependabot/npm_and_yarn/vite-8.3.5 instead of creating another upgrade; preserve the previous clean Node branch.
- [x] Checkpoint this resolved plan before installation or further implementation.
- [x] Verify manifest/lock agreement and the compatible Vite ranges in plugin-react 6.1.1 and Vitest 5.0.3; keep all other direct package pins unchanged.
- [x] Install the exact lockfile with Node 26.12.1/npm 11.20.0, run npm ls --all and a fresh lockfile-only npm audit; record unavailable sources explicitly.
- [x] Run npm run verify, the public Chromium browser suite and all-project built-app production checks; use synthetic disposable storage and system temporary test output. Existing endpoint, five-Hero, save/recovery and production tests cover the dependency behavior, so no new test file is needed.
- [x] Record Brooks review and local validation in this plan; prepare the existing branch for save and Codex review. Observe the final review, CI Verify and mergeability on the live PR after push.
- [x] Keep the manifest and generated lockfile in one rollback boundary. No canonical documentation change is needed for a compatible patch with unchanged project interfaces or prerequisites; this plan records verification.

## Open questions
- None.

## Review and validation ledger
- Original implementation: Dependabot commit 45da614 changes only package.json and package-lock.json. Vite 8.3.5 clears the previously observed affected 8.3.2 range; the PR's existing six CI jobs passed before this follow-up.
- Compatibility: plugin-react accepts Vite ^8.0.0; Vitest accepts ^6.4.0 || ^7.0.0 || ^8.0.0; Vite supports Node ^20.19.0 || >=22.12.0, including the validation runtime.
- Review helper limitation: the gh-fix-ci skill referenced by pr-review-cycle is absent from the installed plugin cache; use available GitHub check diagnostics and CLI if a CI failure needs investigation.
- Installation, all direct manifest/lock versions and npm ls --all pass under Node 26.12.1/npm 11.20.0. Fresh npm audit --package-lock-only reports zero vulnerabilities across 95 locked dependency records; no unrelated direct pin changed.
- npm run verify passes: typecheck/build, 148 unit tests in 27 files and five repository tests. Production Chromium and WebKit pass bundled-asset decoding, enforced local-only traffic, pending/terminal recovery and complete synthetic defeat.
- The all-project production run also reproduced the documented macOS Firefox launch failure: "Could not find profile folder", before page creation. No application assertion failed in that project. Linux Firefox CI remains required for full execution evidence; no browser/OS workaround or test weakening is included.
- The complete public Chromium suite passes all 104 cases in 5.4 minutes, including victory and exact reload recovery for every Hero. Test output is outside the repository under /private/tmp/boardbot-vite-upgrade-browser and /private/tmp/boardbot-vite-upgrade-production.
- No application/test source, other direct package version, Node constraint or GitHub Action changed. The two dependency files retain the original Dependabot commit as their single rollback boundary.
- Post-push Codex review, any feedback, complete cross-browser CI and mergeability are checked on [PR #14](https://github.com/joshuawyadao/BoardBot/pull/14); the automation memory records the final observed state without another documentation-only push.
- Integration resolution: main now includes Node security PR #15 at 0077c6a. The only conflict was the temporary Implementation-Plan.md; retain this current task plan and preserve the Node security decision in main's canonical README/Verification, .nvmrc 26.12.1, >=26.12.1 <27 manifest/lock engines and engine-strict=true. Application/test/configuration trees and the validation runtime are unchanged from the passing local browser/production run. Revalidate exact installation and npm run verify after integration.
- Integrated validation passes: fresh strict-engine npm ci/audit, build/typecheck, 148 unit tests and five repository tests. A complete lock comparison confirms that only the root Node engine range was added to the previously validated Vite graph; application, test, script and browser/CI configuration trees are byte-identical. Prior Chromium and production results therefore apply to this integration.

## Brooks-Lint Review

**Mode:** PR Review

**Scope:** PR #14 versus origin/main: package.json and this implementation plan; generated package-lock.json excluded from maintainability scoring, with its version graph and peer compatibility inspected separately.

**Health Score:** 100/100

**Trend:** Stable at 100.

The patch keeps the dependency boundary coherent and introduces no application, domain or interface changes.

### Findings
- No actionable findings. The generated dependency graph is validated by installation, npm audit, build and existing acceptance tests.
- Quick Test Check skipped for configuration/generated/documentation-only changes. Existing tests cover the affected toolchain behavior, so no test source changes are warranted.

### Summary
- Retain the exact Dependabot lockfile and the Vite-only direct upgrade; use the existing PR as the rollback boundary.
- Require final Codex review and complete CI Verify on the integrated head before declaring readiness.
