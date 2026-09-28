# BoardBot

[![CI Verify](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml/badge.svg)](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

BoardBot is a project for playing board games solo against bots on your computer and trying out games, strategies, and rule variations through repeatable playtests.

> **Status: repository foundation.** There is no playable app, supported game, downloadable release, or game engine yet. This repository currently contains the product direction, contribution guidance, and automated repository checks. The first game and application technology are still to be selected.

## Intended experience

- Choose a supported game and assign seats to yourself or local bot opponents.
- Play at your own pace with visible legal moves and a readable turn history.
- Save and resume a session, or replay a playtest using its recorded setup and random seed.
- Run bots against each other to explore outcomes and compare strategies.
- Try explicit, versioned rule variants without confusing them with the base game.

These are planned capabilities. A game will need its own implemented rules and tests; BoardBot does not currently import a rulebook or automatically learn an arbitrary board game. Bots may begin with simple random or heuristic policies. No paid AI service or account is required by this repository setup.

## Get started

To explore or contribute to the project, install Git and Python 3.9 or newer, then run:

```sh
git clone https://github.com/joshuawyadao/BoardBot.git
cd BoardBot
./scripts/verify-repository.sh
```

The check command works on macOS and Linux with a POSIX shell; Windows contributors can use WSL. These are contributor prerequisites, not supported platforms for a finished app. No package installation or API keys are needed. See [verification](docs/Verification.md) for what the checks cover and their limits.

## Project direction

| Document | Purpose |
| --- | --- |
| [Product brief](docs/Product-Brief.md) | Intended players, workflows, and boundaries |
| [Architecture direction](docs/Architecture.md) | Proposed rules, bots, sessions, and UI boundaries |
| [Roadmap](docs/Roadmap.md) | Milestones toward a first playable game |
| [Verification](docs/Verification.md) | Local checks, CI, and future game acceptance checks |
| [Implementation plan](docs/Implementation-Plan.md) | The current setup task and its verification record |

## Public development and game content

This repository makes BoardBot's development reviewable and open to contributions. It currently includes no third-party game rules text, artwork, card scans, or other game assets. Proposed game integrations must document the source and permission or license for any included content. The BoardBot code license does not grant rights to third-party games, trademarks, or assets. See the [contribution policy](CONTRIBUTING.md).

The planned app should keep sessions and bots local by default. Cloud services, telemetry, and account requirements would need an explicit product decision. Keep credentials, personal saves, private prototypes, logs, and unlicensed game assets out of public issues and commits. Report vulnerabilities through [SECURITY.md](SECURITY.md).

GitHub private vulnerability reporting, Dependabot alerts and security updates, secret scanning, and push protection are enabled. GitHub Actions dependency updates are checked weekly.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Use the [issue forms](https://github.com/joshuawyadao/BoardBot/issues/new/choose) to report a problem, propose a feature, or suggest a game. A game request records interest; it does not mean the game is supported.

## License

BoardBot's original code and documentation are available under the [MIT License](LICENSE), except where a file carries a separate notice. Contributor Covenant attribution is retained in the Code of Conduct. BoardBot is independent of board-game publishers.
