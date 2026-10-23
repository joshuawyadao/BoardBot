# Plan

Require the Node.js 26.12.1 security release for BoardBot development and CI, validate the existing application under that runtime, and prepare a reviewed PR into main.

## Scope
- In: `.nvmrc`, the root Node engine constraint in `package.json` and `package-lock.json`, contributor setup instructions in `README.md` and `docs/Verification.md`, and validation/review evidence.
- Out: npm package upgrades, GitHub Action upgrades, gameplay changes, save migrations, private components, and merging the PR.

## Action items
- [x] Confirm the [October 21 Node security release](https://nodejs.org/en/blog/release/v26.12.1), inspect setup/CI/browser configurations, and reuse `codex/node-26-security-upgrade` from current main.
- [ ] Checkpoint this resolved plan before implementation.
- [ ] Pin `.nvmrc` to `26.12.1`, require `>=26.12.1 <27` in the manifest and lockfile, and preserve every locked package version/integrity.
- [ ] Update current contributor prerequisites and explain the security minimum in README/Verification; preserve historical test evidence and durable product/architecture plans.
- [ ] Install/select the patched Node runtime, run a clean `npm ci`, and verify runtime/manifest/lock agreement. Use the existing application tests: no executable application behavior changes or new test cases are needed.
- [ ] Run `npm run verify`, public Chromium browser checks, and production checks under Node 26.12.1; use the full Linux/macOS CI browser matrix for platform coverage and record any local environment limits.
- [ ] Save/push the branch, open its PR, request Codex review, run Brooks PR review, address actionable feedback, and require passing CI Verify plus conflict-free mergeability before reporting ready.
- [ ] Keep this as one runtime upgrade batch: revert the version/configuration/docs commit together if a compatibility regression requires rollback; do not claim the previous vulnerable runtime is a security fix.

## Open questions
- None.
