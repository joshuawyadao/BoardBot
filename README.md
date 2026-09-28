# BoardBot

[![CI Verify](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml/badge.svg)](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

BoardBot is a project for playing board games solo against bots on your computer and trying out games, strategies, and rule variations through repeatable playtests.

> **Status: repository foundation.** There is no playable app, supported game, downloadable release, or game engine yet. This repository currently contains the product direction, contribution guidance, and automated repository checks. The finalized first milestone targets the original Horrified: Dungeons & Dragons in a local React browser app on an M1 MacBook Pro. Application implementation has not started; component verification remains open.

## Intended first experience

- Play the entire game on screen with one human-controlled hero, choosing from all five base-game heroes once each is validated.
- Face the Displacer Beast and Beholder, with rules-driven monster turns and required player choices.
- Use a simplified labeled map with accurate connections and clearly indicated legal actions.
- Hover for action descriptions, click to select, then use a bottom Confirm button. New actions stay locked while the current action resolves.
- Save and resume locally, preserving committed dice/card outcomes and pending choices. Play without internet access after initial setup while the local development server is running.

These are planned capabilities. No game is currently playable. A later physical-game companion will reuse the rules foundation for setup, tracking, and sourced rules lookup. Other monsters, devices, optional desktop packaging, and broader bot playtesting follow later. No paid AI service or account is planned for the initial milestone.

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
| [Implementation plan](docs/Implementation-Plan.md) | Finalized planning baseline, build order, and completion criteria |
| [Game-data checklist](docs/Game-Data-Checklist.md) | Sources, missing component details, and unresolved rulings |

## Public development and game content

This repository makes BoardBot's development reviewable and open to contributions. It currently includes no third-party game rules text, artwork, card scans, or other game assets. Proposed game integrations must document the source and permission or license for any included content. The BoardBot code license does not grant rights to third-party games, trademarks, or assets. See the [contribution policy](CONTRIBUTING.md).

The planned app should keep sessions and bots local by default. Cloud services, telemetry, and account requirements would need an explicit product decision. Keep credentials, personal saves, private prototypes, logs, and unlicensed game assets out of public issues and commits. Report vulnerabilities through [SECURITY.md](SECURITY.md).

GitHub private vulnerability reporting, Dependabot alerts and security updates, secret scanning, and push protection are enabled. GitHub Actions dependency updates are checked weekly.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Use the [issue forms](https://github.com/joshuawyadao/BoardBot/issues/new/choose) to report a problem, propose a feature, or suggest a game. A game request records interest; it does not mean the game is supported.

## License

BoardBot's original code and documentation are available under the [MIT License](LICENSE), except where a file carries a separate notice. Contributor Covenant attribution is retained in the Code of Conduct. BoardBot is independent of board-game publishers.
