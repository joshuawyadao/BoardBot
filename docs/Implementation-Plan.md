# Plan

Enforce the Node.js 26.12.1 security minimum during npm installation, addressing Codex review feedback on PR #15 while preserving the validated runtime upgrade.

## Scope
- In: repository `.npmrc`, contributor/verification instructions, installation checks under the affected and patched Node runtimes, and PR feedback/CI evidence.
- Out: npm package versions, GitHub Action versions, application/gameplay behavior, save formats, private components, and merging the PR.

## Action items
- [x] Diagnose [Codex feedback](https://github.com/joshuawyadao/BoardBot/pull/15#discussion_r4355501884): the package engine range is advisory unless npm engine-strict is enabled; retain the existing 26.12.1 nvm/CI pin and >=26.12.1 <27 manifest/lock range.
- [ ] Checkpoint this resolved feedback plan before changing configuration.
- [ ] Add `engine-strict=true` in repository `.npmrc` and explain that a normal `npm ci` rejects unsupported Node versions in README/Verification.
- [ ] Verify the actual install path rejects Node 26.10.0 with EBADENGINE in a disposable manifest/lock/config copy; verify clean installation under Node 26.12.1. No application tests need changes for this configuration-only correction.
- [ ] Run `npm run verify`, the 104-case public Chromium suite, and Chromium/WebKit production checks under the patched runtime; preserve existing assertions and recorded historical evidence.
- [ ] Prepare the verified feedback fix for save/push; acknowledge the addressed Codex comment with a thumbs-up after push, repeat Brooks/Codex review, and track complete CI Verify plus mergeability on the PR and in automation memory.
- [ ] Keep the strict-install setting and its documentation in one feedback commit; validate the existing security pin/minimum and unchanged package graph before reporting readiness.

## Open questions
- None.
