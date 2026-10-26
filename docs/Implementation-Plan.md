# Plan

Complete the smallest Vite security upgrade by adopting the existing Dependabot PR #14, validating its exact locked dependency set, and saving review evidence on that branch.

## Scope
- In: Vite 8.3.2 to 8.3.5 and its existing generated lockfile changes; installation, peer compatibility, security, endpoint, build, public browser and production checks; implementation tracking and PR review.
- Out: Other dependency or Action updates, Node PR #15, repository-efficiency PR #16, application or game-rule changes, private data, and merging the PR.

## Action items
- [x] Read README, Architecture and Verification; map the npm scripts, local endpoint tests, public browser fixtures and isolated production coverage.
- [x] Verify current main at ba9f9cd and adopt existing PR #14 at 45da614 on dependabot/npm_and_yarn/vite-8.3.5 instead of creating another upgrade; preserve the previous clean Node branch.
- [ ] Checkpoint this resolved plan before installation or further implementation.
- [ ] Verify manifest/lock agreement and the compatible Vite ranges in plugin-react 6.1.1 and Vitest 5.0.3; keep all other direct package pins unchanged.
- [ ] Install the exact lockfile with Node 26.12.1/npm 11.20.0, run npm ls --all and a fresh lockfile-only npm audit; record unavailable sources explicitly.
- [ ] Run npm run verify, the public browser suite and built-app production checks; use synthetic disposable storage and system temporary test output. Existing endpoint, five-Hero, save/recovery and production tests cover the dependency behavior, so no new test file is planned.
- [ ] Record Brooks review and any Codex feedback; update this plan with exact results, save the branch and recheck fresh CI Verify and mergeability.
- [ ] Keep the manifest and generated lockfile in one rollback boundary. No canonical documentation change is needed for a compatible patch with unchanged project interfaces or prerequisites; this plan records verification.

## Open questions
- None.

## Review and validation ledger
- Original implementation: Dependabot commit 45da614 changes only package.json and package-lock.json. Vite 8.3.5 clears the previously observed affected 8.3.2 range; the PR's existing six CI jobs passed before this follow-up.
- Compatibility: plugin-react accepts Vite ^8.0.0; Vitest accepts ^6.4.0 || ^7.0.0 || ^8.0.0; Vite supports Node ^20.19.0 || >=22.12.0, including the validation runtime.
- Review helper limitation: the gh-fix-ci skill referenced by pr-review-cycle is absent from the installed plugin cache; use available GitHub check diagnostics and CLI if a CI failure needs investigation.
