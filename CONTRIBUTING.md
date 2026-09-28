# Contributing to BoardBot

BoardBot is at the repository-foundation stage. Read the [README](README.md), [product brief](docs/Product-Brief.md), and [roadmap](docs/Roadmap.md) before proposing a change.

## Propose focused work

Search existing issues first. Use the bug, feature, or game request form for a concrete outcome and observable acceptance criteria. Discuss a new game, a change to the selected React approach, an external service, storage format, or major dependency in an issue before building around it. Follow the finalized [work plan](docs/Work-Plan.md) and its game-data dependencies for the initial solo milestone. These choices affect the whole project.

For a game request, describe the edition, player count, solo experience, and bot behavior you want. Link to an official game page when one exists. Do not attach a commercial rulebook, scans, private prototype, or artwork as a substitute for permission to redistribute it.

## Development workflow

Use `docs/Implementation-Plan.md` for the current task only; future tasks may replace it. Keep lasting requirements in [Work-Plan.md](docs/Work-Plan.md) and milestones in [Roadmap.md](docs/Roadmap.md). When merging branches, preserve those durable documents and update them only for intentional changes to the project direction.

1. Fork the repository if needed and create a descriptive branch from `main`.
2. Keep each pull request focused on one user-visible outcome.
3. Add or update tests for changed executable behavior and use synthetic examples.
4. Update canonical documentation when setup, behavior, storage, game support, or architecture changes.
5. Run `./scripts/verify-repository.sh` and any checks required by the changed component. See [verification](docs/Verification.md).
6. Use the PR template to describe the result, verification, content provenance, and remaining limits. Wait for CI and review before merging.

## Game rules and bots

Keep rule validation separate from bot strategy and presentation. A bot may only receive information available to its seat; reject illegal actions through the same rules used for human moves. Record seeds, game/rule versions, and bot settings in future reproducible fixtures. Include relevant turn-order, scoring, terminal-state, and hidden-information cases when a game is implemented. See the proposed [architecture](docs/Architecture.md).

## Content and privacy

Contribute only material you can publish under its stated license. For third-party content, record the source, author or rights holder, license or permission, and attribution in the proposed game documentation before adding files. Identify original project content separately from third-party material. Avoid implying publisher endorsement.

Use invented session data. Do not commit credentials, personal saves, device logs, local configuration, private paths, unpublished game prototypes, or content without documented redistribution permission. Local working data belongs in ignored `local-data/`, `saves/`, `logs/`, or `outputs/` directories; these are workspace conventions, not an implemented app storage layout.

Report security issues privately through [SECURITY.md](SECURITY.md). Follow the [Code of Conduct](CODE_OF_CONDUCT.md) in all project spaces.
