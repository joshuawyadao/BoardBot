# Plan

Save the completed component verification and rules research as durable project knowledge, with traceable evidence and explicit working interpretations. Publish original research notes through a reviewed PR while preserving full private references locally.

## Scope
- In: Update the component register, add a canonical rules/reference source ledger, record one-to-five-Hero compatibility, preserve an ignored local evidence packet, reconcile project status, and open/review a PR.
- Out: Gameplay implementation, changes to the first solo milestone, new rule inventions, publication of source photos or full component transcriptions, and merging the PR.

## Action items
[x] Inspect canonical docs, private verification record version 6, branch state, content policy, and repository checks.
[x] Save a local evidence packet and verify its identity/ignore status; describe recovery and Git backup limits.
[x] Replace stale pending-photo entries in `docs/Game-Data-Checklist.md` with verified coverage and remaining implementation/publication gates.
[x] Add `docs/Rules-Reference.md` with original research summaries, accepted provisional interpretations, unresolved cases, multiplayer boundaries, and a source ledger.
[x] Update README, Work-Plan, Roadmap, Architecture, and Verification to point to the canonical knowledge without expanding implementation scope.
[x] Audit completeness, evidence grades, interpretation boundaries, private-content exclusion, and local links; run `./scripts/verify-repository.sh`.
[x] Commit and push task-owned documentation, create a draft PR, request Codex review, run Brooks review, and handle actionable findings and CI failures.
[x] Confirm final review/check/mergeability state, retain an unmerged PR, and report exact persistence and readiness limits.

No new tests are planned: this task changes documentation only. Existing repository checks and five tooling tests are applicable; gameplay and multiplayer claims require later engine tests.

Validation: repository file/link checks, all five existing tooling tests, and Git whitespace checks passed. The private packet hashes and component counts match; Git excludes every raw packet file. No test files changed because no executable behavior changed.

PR status: draft PR #2 is open. Codex review was requested through the PR review workflow but declined because the account reached its code-review usage limit. Local Brooks review found no actionable concerns. CI Verify passed and GitHub reported no conflicts; recheck both after the final documentation push. This is a review blocker, not a passing Codex review; keep the PR unmerged and not merge-ready until review can be rerun.

## Open questions
- None blocking this documentation PR. Unresolved game behavior will be recorded as an implementation dependency, not silently resolved. The existing content policy keeps raw component text and photos outside public Git history.
