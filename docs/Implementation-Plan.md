# Plan

Separate the enduring work plan from this replaceable, per-task implementation plan. Preserve the agreed scope in `docs/Work-Plan.md` alongside the existing high-level roadmap.

## Scope
- In: Preserve the baseline, update links, and clarify document ownership for future tasks and merges.
- Out: Application development, rule changes, and repository tooling changes.

## Action items
[x] Inspect the baseline, roadmap, references, and verification workflow.
[x] Move the enduring baseline into `docs/Work-Plan.md`, preserving requirements and removing prior task validation notes.
[x] Update README, CONTRIBUTING, AGENTS, Roadmap, Product-Brief, and Verification references and document the temporary/durable distinction.
[x] Review the diff and remaining references to ensure replacing a task plan leaves durable requirements intact.
[x] Run `./scripts/verify-repository.sh`; no new tests are needed for documentation-only changes.
[x] Prepare the verified documentation change for the final commit and push on `main`.

Verification: repository file/link checks and all five existing tooling tests passed. No executable behavior changed, so test files remain unchanged.

## Open questions
- None. Roadmap remains the milestone overview; Work-Plan holds the detailed enduring plan. This file may be replaced for the next task.
