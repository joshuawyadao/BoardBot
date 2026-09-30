# BoardBot

[![CI Verify](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml/badge.svg)](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

BoardBot is a project for playing board games solo against bots on your computer and trying out games, strategies, and rule variations through repeatable playtests.

> **Status: interaction prototype.** A local React app demonstrates a synthetic sample turn. It is not a playable version of Horrified: Dungeons & Dragons: its rules, heroes, monsters, saves, and verified game data are still to come. The first game milestone targets the original Horrified: Dungeons & Dragons on an M1 MacBook Pro.

## Try the sample turn

Install Node.js 24 and npm, then run:

```sh
git clone https://github.com/joshuawyadao/BoardBot.git
cd BoardBot
npm ci
npm run dev
```

Open http://127.0.0.1:5173 in your browser. Choose Move in the floating tray, then click a highlighted board destination to move immediately. Wait (sample) uses a separate Confirm button. Hover, focus, or tap a card to inspect it in the fixed help area; planned cards explain why they are unavailable. The invented explorer has three actions. After a roughly 900 ms resolution lock, choose another action or explicitly End Hero Phase, even if actions remain. Reaching zero actions does not end the phase automatically. The right-side Event log keeps earlier sample turns until you reload; it follows new entries while you are at the bottom and offers Jump to latest when you scroll back. On narrow screens the log moves below the board. Reloading resets everything. There is no undo or persistence. Once dependencies are installed, this sample runs locally without a gameplay service or account.

## Intended first experience

- Play the entire game on screen with one human-controlled hero, choosing from all five base-game heroes once each is validated.
- Face the Displacer Beast and Beholder, with rules-driven monster turns and required player choices.
- Use a simplified labeled map with accurate connections and clearly indicated legal actions.
- Use a floating action tray within space reserved at the bottom of the map, with stable positions and action costs. Temporarily illegal actions stay visible with a reason. Selecting Move highlights legal destinations, and clicking one executes it; consequential item or roll choices require confirmation. New actions stay locked while the current action resolves.
- End the Hero Phase explicitly; reaching zero paid actions must not prevent eligible free perks before that boundary.
- Save and resume locally, preserving committed dice/card outcomes and pending choices. Play without internet access after initial setup while the local development server is running.

These are planned Horrified capabilities. The sample turn only tests the interaction pattern; its map, actions, and action budget are invented. Its Guide, Pick Up, Share, Advance, Defeat, Special Action, and Perks cards are unavailable previews, not implemented game actions or legal-rule checks. A later physical-game companion will reuse the rules foundation for setup, tracking, and sourced rules lookup. Other monsters, devices, optional desktop packaging, and broader bot playtesting follow later. No paid AI service or account is planned for the initial milestone.

## Get started

To check a contribution, install Git, Python 3.9 or newer, and Node.js 24. From the checkout, run:

```sh
npm run verify
npx playwright install chromium
npm run test:e2e
```

The first command typechecks, builds, runs sample engine and session tests, and runs repository checks. The browser tests use Playwright Chromium. `./scripts/verify-repository.sh` remains available for repository checks alone. The shell script works on macOS and Linux; Windows contributors can use WSL. These are contributor prerequisites, not supported platforms for a finished game. No API keys are needed. See [verification](docs/Verification.md) for coverage and limits.

## Project direction

| Document | Purpose |
| --- | --- |
| [Product brief](docs/Product-Brief.md) | Intended players, workflows, and boundaries |
| [Architecture direction](docs/Architecture.md) | Proposed rules, bots, sessions, and UI boundaries |
| [Roadmap](docs/Roadmap.md) | Milestones toward a first playable game |
| [Verification](docs/Verification.md) | Local checks, CI, and future game acceptance checks |
| [Work plan](docs/Work-Plan.md) | Finalized planning baseline, build order, and completion criteria |
| [Game-data checklist](docs/Game-Data-Checklist.md) | Sources, missing component details, and unresolved rulings |

## Public development and game content

This repository makes BoardBot's development reviewable and open to contributions. It currently includes no third-party game rules text, artwork, card scans, or other game assets. Proposed game integrations must document the source and permission or license for any included content. The BoardBot code license does not grant rights to third-party games, trademarks, or assets. See the [contribution policy](CONTRIBUTING.md).

The planned app should keep sessions and bots local by default. Cloud services, telemetry, and account requirements would need an explicit product decision. Keep credentials, personal saves, private prototypes, logs, and unlicensed game assets out of public issues and commits. Report vulnerabilities through [SECURITY.md](SECURITY.md).

GitHub private vulnerability reporting, Dependabot alerts and security updates, secret scanning, and push protection are enabled. GitHub Actions and npm dependency updates are checked weekly.

Changes to `main` go through feature branches and pull requests; direct pushes are blocked by repository rules.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Use the [issue forms](https://github.com/joshuawyadao/BoardBot/issues/new/choose) to report a problem, propose a feature, or suggest a game. A game request records interest; it does not mean the game is supported.

## License

BoardBot's original code and documentation are available under the [MIT License](LICENSE), except where a file carries a separate notice. Contributor Covenant attribution is retained in the Code of Conduct. BoardBot is independent of board-game publishers.
