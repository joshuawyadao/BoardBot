# Plan

Complete the Node.js 26 upgrade on PR #4 by aligning the runtime, type definitions, dependency metadata, and contributor documentation. Validate the existing prototype under Node 26 before publishing the updated PR.

## Scope
- In: PR #4, `.nvmrc`, package metadata and lockfile, Dependabot policy, setup and architecture documentation, and Node 26 validation.
- Out: Gameplay changes, unrelated dependency upgrades, private research data, and changes to other projects' Node installations.

## Action items
[x] Review runtime references, CI, locked dependency requirements, and existing unit, repository, and browser checks; reconcile the PR branch with current main.
[x] Align `.nvmrc`, `package.json`, and `package-lock.json` with Node 26 and retain the PR's Node 26 types.
[x] Keep future major `@types/node` upgrades coordinated with the runtime through `.github/dependabot.yml`.
[x] Update `README.md`, `docs/Architecture.md`, `docs/Verification.md`, and the runtime reference in `docs/Work-Plan.md`; preserve historical validation evidence and the durable game requirements.
[x] Perform a clean locked install, `npm run verify`, and `npm run test:e2e` with Node 26; record the actual runtime and results. Existing tests cover the unchanged executable behavior, so no test files need changing.
[x] Review the final diff for runtime/type mismatches, dependency churn, documentation drift, and preservation of current main.
[ ] Commit and push the task-owned changes to PR #4, update its title and description, and confirm CI on the pushed commit before completing the previously authorized merge and branch cleanup.

## Validation

Local validation passed on macOS 27.0.1 arm64 using the official Node.js 26.10.0 distribution and bundled npm 11.19.1: a clean `npm ci`, `npm run verify` (build, eight unit tests, five repository tests), and `CI=1 npm run test:e2e` (eight Chromium 153.0.8010.12 tests). The existing fsevents native module also loaded successfully under Node 26. The locked application dependencies did not change beyond Dependabot's original Node/Undici type updates. Independent Brooks review found no actionable issues.

Publication and merge are deliberately unchecked in this pre-push snapshot. Record CI against the actual pushed commit and the merge outcome in [PR #4](https://github.com/joshuawyadao/BoardBot/pull/4), rather than claiming future checks passed in the commit they will validate.

## Open questions
- None. The user authorized a complete Node 26 upgrade on PR #4 and previously authorized merging the reviewed PRs once ready.
