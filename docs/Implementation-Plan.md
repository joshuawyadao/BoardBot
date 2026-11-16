# Plan

Enforce the existing comprehensive CI before merging BoardBot changes.

## Scope
- In: Scoped CI enforcement, automated validation, meaningful orchestration regressions, and canonical verification documentation for BoardBot.
- Out: Product feature changes, deployment, paid services or account changes, personal data, physical-device operation, and release signing/publishing.

## Action items
- [ ] Inspect current workflow classifier, aggregate gate and live main-branch rules.
- [ ] Preserve existing rules while requiring the actual CI Verify status on the current merge candidate.
- [ ] Document the enforcement contract and existing focused versus full validation commands.
- [ ] Run classifier/gate and repository checks; validate live rules after updating them.
- [ ] Record the final gate state and manual gameplay/accessibility boundaries.
- [ ] Save and push the scoped documentation branch.

## Discovery notes
- Baseline: `abaf9cfbd6d14bc9fdf0a3900819f28440b8e050` (`origin/main`), isolated from the original checkout.
- Existing in-progress changes in original project folders remain untouched.
- Missing hosting/account capabilities are reported as concrete limitations; they are not permission to weaken required checks.
