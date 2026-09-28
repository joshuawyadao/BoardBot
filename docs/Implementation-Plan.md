# Plan

Prepare the empty BoardBot repository for public development using the conventions of the owner's other public projects. Establish the project as a future computer-based tool for solo board-game play and playtesting with bots, with an honest pre-implementation status, community guidance, repeatable verification, and GitHub security settings.

## Scope
- In: Initialize the local checkout on GitHub's configured `main` branch; adopt the established MIT license and community policies; document product direction and a phased roadmap; add issue/PR templates, repository checks and tests, CI, dependency maintenance, and public repository settings; commit and push the setup.
- Out: Implement a playable game, choose an application stack, bundle commercial game content, add cloud AI/accounts/telemetry, publish a binary, or open/merge a pull request. Game selection remains a future product decision and does not block repository setup.

## Action items
[x] Inspect the empty local/remote repository and compare public setup conventions in Honkshool, MacroFactor Workout Bridge, and yarms. No existing BoardBot docs, code, tests, or assets exist.
[ ] Checkpoint this resolved plan on `main` before implementing the foundation.
[ ] Add README, MIT LICENSE, CONTRIBUTING, SECURITY, CODE_OF_CONDUCT, project AGENTS guidance, ignore rules, and editor defaults.
[ ] Write `docs/Product-Brief.md`, `docs/Architecture.md`, `docs/Roadmap.md`, and `docs/Verification.md`, separating intended behavior and deferred decisions from implemented capabilities.
[ ] Add GitHub bug/feature/game request forms, a PR template, a SHA-pinned `CI Verify` workflow, and weekly GitHub Actions Dependabot updates.
[ ] Add a dependency-free repository verifier with focused regression tests for missing files, broken relative links, unsafe public files, and valid fixtures; exercise local commands and YAML syntax checks.
[ ] Configure and verify the GitHub description/topics, squash-merge defaults, private vulnerability reporting, Dependabot alerts/security updates, and existing secret scanning/push protection. Keep settings consistent with the other public projects.
[ ] Review public content for personal data and third-party game assets, validate docs and checks, save the completed work with `save-branch`, and confirm the pushed commit's GitHub CI result.

## Open questions
- None blocking. The first game and app stack are deliberately deferred to the playable prototype milestone; MIT follows the owner's existing public-project convention.
