# BoardBot

[![CI Verify](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml/badge.svg)](https://github.com/joshuawyadao/BoardBot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

BoardBot is a project for playing board games solo against bots on your computer and trying out games, strategies, and rule variations through repeatable playtests.

> **Status: solo playtest build with local recovery.** The local React app supports Fighter, Bard, Cleric, Rogue, and Wizard against Beholder and Displacer Beast using the owner’s prepared private data. Shared actions, Hero abilities, Perks, monster turns, required choices, and win/loss conditions follow the accepted BoardBot interpretations. Local autosave and resume preserve committed outcomes. The start screen loads prepared local components automatically and keeps a library of separate saved games. A fresh clone without the private packet offers one-time import and the synthetic sample. Full human play acceptance and public game-content rights remain unfinished.

## Try the sample turn

Install Node.js 26 and its bundled npm, then run:

```sh
git clone https://github.com/joshuawyadao/BoardBot.git
cd BoardBot
npm ci
npm run dev
```

Open http://127.0.0.1:5173 in your browser and choose **Try sample table**. Choose Move in the compact tray, then click a highlighted board destination to move immediately. Hover, focus, or tap a compact action button to inspect it in the help area below the buttons; planned cards explain why they are unavailable. Hide actions collapses the tray to its status and phase controls; Show actions restores it. Hiding clears an uncommitted selection without spending an action. The invented explorer has three actions. After a roughly 900 ms resolution lock, choose another action or explicitly End Hero Phase to forfeit any remaining actions. Reaching zero actions does not end the phase automatically. The compact right-side Event log keeps earlier sample turns until you reload; use Hide log to leave only the latest event visible, or Show log to reopen history. It follows new entries while you are at the bottom and offers Jump to latest when you scroll back. On narrow screens the log moves below the board. Reloading resets everything. There is no undo or persistence. Once dependencies are installed, this sample runs locally without a gameplay service or account.

## Try the local solo game

With the verified private packet present, run `npm run data:prepare`. Start the app: the prepared base game loads automatically from the local server and is cached on this device. Choose **New game**, select a Hero, and choose **Start game** to set up the board. An optional seed repeats setup. If the packet is absent, use **Import game data or backup** to select `local-data/horrified-dnd/game-data.json` once. The opening **Board ready** summary lists the Hero, Monsters, Items, and Lairs already placed. Each location shows separate piece markers, including when several share a space. Use Pick Up to collect Items, Move to travel, and the challenge controls to advance and defeat the two Monsters.

The whole illustrated board fits the desktop table, with floor positions following the physical board and Castle Corkscrew in Waterdeep. Full location names follow each floor rim, leaving space for original standees, miniatures and tokens. Item bags show × quantity; inspection and Inventory label Strength. Violet portals identify the teleport network; amber letters pair the secret passages. Relevant virtual route traces appear when selecting Move. The library, compact controls and information panels use a charcoal and brass tabletop theme. Inventory, Monsters, Event log, Locations, Decks & progress, and Latest result can stay open together. Select a floor or named Locations row to inspect visible contents and Citizens’ safe destinations without spending an action. Move each panel left or right with ⇄ or close it independently; opening information preserves an action selection. Expand an owned Perk in Inventory to read its effect. Lair controls are also under Inventory. Hide actions leaves a slim phase-control strip. Required choices stay open automatically alongside other panels; **Required choice** returns keyboard focus to the decision. Named Move and Wizard destination selectors provide larger alternatives to map targets. Wizard map selection is a draft until Confirm; Beholder responses show observed attack dice and conditional Slowing penalties. Ordinary actions stay locked while a required choice is pending. End the Hero Phase explicitly to forfeit unused actions and begin the Monster Phase; eligible Perks remain available at zero actions until you end the phase.

Special Action opens the selected Hero’s roll ranges and effects before **Roll special action**. A persistent roll summary shows the value; **Latest result** shows its arithmetic, outcome, and recent events. Pending rolls are labeled **Awaiting response** until adjustments are finished.

Required choices validate the complete selection before enabling **Confirm choice**. For example, Mystra explains when the selected Items do not total exactly seven strength.

Wizard relocation prompts distinguish the initial ability roll from a follow-up destination roll. A Monster destination is highlighted, and each choice names the existing Monster’s current location and where it will move. This moves a piece already on the board; it is not an additional setup step.

Each committed action and pending choice saves locally before its result appears. After reloading, choose **Resume saved game** beside the adventure you want. **Saved games** returns to the library; **New game** creates another adventure without replacing earlier games. Each saved game has a **Delete** option: confirm the selected adventure to remove it and its recovery save. Other games and base components remain available. **Export backup** downloads a private save; importing it adds a separate game. Failed saves pause play and offer **Retry saving**, preserving the exact result. Each game has Recovery options to restore its own previous save. See [local saves](docs/Local-Saves.md) for storage and recovery details.

New games use stacking Slowing Ray penalties: two accepted penalties mean two fewer actions next turn, with a minimum of zero. Older saved games retain their previous one-action cap and show an **Earlier rules** explanation. Start a new adventure to use the updated rule; older saves remain available.

Component data is stored once per exact version in this browser, separately from each game’s progress. Games keep the version they started with. The private local server provides only the prepared JSON at startup; no game content is uploaded or bundled into public assets. Gameplay needs no external requests. A fresh clone needs its own verified private packet; the synthetic sample and public tests work without one. See [local data preparation](docs/Game-Data-Format.md).

## Intended first experience

- Play the entire game on screen with one human-controlled hero, choosing from all five base-game heroes.
- Face the Displacer Beast and Beholder, with rules-driven monster turns and required player choices.
- See the entire illustrated board without map scrolling, with the physical floor arrangement, integrated location names, natural ordinary roads, paired secret passages and teleport links shown during a relevant Move.
- Use a compact, collapsible action tray below the map, with stable positions and visible action costs. Phase status, the action count, and End Hero Phase stay available when collapsed. Temporarily illegal actions stay visible with a reason. Selecting Move highlights legal destinations, and clicking one executes it; consequential item or roll choices require confirmation. New actions stay locked while the current action resolves.
- End the Hero Phase explicitly; reaching zero paid actions must not prevent eligible free perks before that boundary.
- Save and resume locally, preserving committed dice/card outcomes and pending choices. Play without internet access after initial setup while the local development server is running.

The full milestone still requires the owner’s complete-game acceptance on the physical game data. The separate sample turn only tests the interaction pattern; its map, actions, and action budget are invented. Its Guide, Pick Up, Share, Advance, Defeat, Special Action, and Perks cards are unavailable previews, not implemented game actions or legal-rule checks. A later physical-game companion will reuse the rules foundation for setup, tracking, and sourced rules lookup. Other monsters, devices, optional desktop packaging, and broader bot playtesting follow later. No paid AI service or account is planned for the initial milestone.

## Get started

To check a contribution, install Git, Python 3.9 or newer, and Node.js 26. From the checkout, run:

```sh
npm run verify
npx playwright install chromium
npm run test:e2e
npm run test:production
```

The first command typechecks, builds, runs sample, data, and game-engine tests, and runs repository checks. The browser tests use Playwright Chromium. `test:production` builds the app and checks startup, pending-save recovery, cached components, and a complete synthetic defeat against an isolated preview on port 4180, with external HTTP requests blocked. `./scripts/verify-repository.sh` remains available for repository checks alone. The shell script works on macOS and Linux; Windows contributors can use WSL. These are contributor prerequisites, not supported platforms for a finished game. No API keys are needed. See [verification](docs/Verification.md) for coverage and limits, and the [owner playtest checklist](docs/Playtest-Checklist.md) for the remaining human acceptance.

With the verified private packet prepared, `npm run test:private` additionally runs isolated browser games for all five Heroes using those actual components. It requires the ignored prepared JSON (or `BOARDBOT_PRIVATE_DATA`), uses port 4182, and keeps artifacts in the system temporary directory. It is opt-in and excluded from public CI; keep any output private.

## Project direction

| Document | Purpose |
| --- | --- |
| [Product brief](docs/Product-Brief.md) | Intended players, workflows, and boundaries |
| [Tabletop design](docs/UI-Design.md) | Illustrated map, geometry, accessibility and asset provenance |
| [Architecture direction](docs/Architecture.md) | Proposed rules, bots, sessions, and UI boundaries |
| [Roadmap](docs/Roadmap.md) | Milestones toward a first playable game |
| [Verification](docs/Verification.md) | Local checks, CI, and future game acceptance checks |
| [Work plan](docs/Work-Plan.md) | Finalized planning baseline, build order, and completion criteria |
| [Game-data checklist](docs/Game-Data-Checklist.md) | Confirmed component coverage, private evidence access, and publication gates |
| [Rules reference](docs/Rules-Reference.md) | Durable sourced findings, accepted interpretations, open cases, and multiplayer boundaries |
| [Local game-data format](docs/Game-Data-Format.md) | Private data preparation, schema, and engine-foundation limits |

## Public development and game content

This repository makes BoardBot's development reviewable and open to contributions. It includes original research summaries and interpretation decisions, not copied rulebooks, full component transcriptions, publisher artwork, or card scans. The original generated map terrain is bundled with its [provenance and publication notice](src/ui/assets/README.md). Exact owner-confirmed data and photos are preserved in a private, ignored local packet; a GitHub clone does not contain that packet. See the [evidence and backup boundary](docs/Game-Data-Checklist.md). Proposed game integrations must document the source and permission or license for included third-party content. The BoardBot code license does not grant rights to third-party games, trademarks, or assets. See the [contribution policy](CONTRIBUTING.md).

The planned app should keep sessions and bots local by default. Cloud services, telemetry, and account requirements would need an explicit product decision. Keep credentials, personal saves, private prototypes, logs, and unlicensed game assets out of public issues and commits. Report vulnerabilities through [SECURITY.md](SECURITY.md).

GitHub private vulnerability reporting, Dependabot alerts and security updates, secret scanning, and push protection are enabled. GitHub Actions and npm dependency updates are checked weekly.

Changes to `main` go through feature branches and pull requests; direct pushes are blocked by repository rules.

## Contributing

Start with [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md). Use the [issue forms](https://github.com/joshuawyadao/BoardBot/issues/new/choose) to report a problem, propose a feature, or suggest a game. A game request records interest; it does not mean the game is supported.

## License

BoardBot's original code and documentation are available under the [MIT License](LICENSE), except where a file carries a separate notice. Contributor Covenant attribution is retained in the Code of Conduct. BoardBot is independent of board-game publishers.
