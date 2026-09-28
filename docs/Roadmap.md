# Roadmap

Only milestone 0 is part of the repository setup. The remaining milestones describe future implementation; no game is currently playable.

## 0. Public project foundation

Provide clear project status and scope, MIT licensing, contribution and security policies, issue/PR forms, automated repository checks, and GitHub security configuration. A fresh checkout must pass the documented check command without API keys or third-party Python packages.

## 1. One playable game

Select a small first game with publishable content, decide the initial computer interface and stack, and implement its complete rules plus a basic bot. An original small demo game is a possible starting point; no selection has been made.

Acceptance criteria:

- A new contributor can start the prototype using documented commands.
- One human can finish a game with bots filling the required other seats.
- Legal moves, current turn, scoring, and the final result are clear.
- Invalid actions preserve state; bot failures cannot silently corrupt a session.
- Tests cover core moves, turn order, scoring, end conditions, and any hidden-information restrictions.
- Documentation identifies game/rules versions, included assets and their licenses, and supported development environments.

## 2. Durable solo sessions

Add local save/resume, a readable history, and reproducible session fixtures.

Acceptance criteria:

- A saved session resumes at the same turn and state.
- A recorded setup and move sequence reproduce the same result with the same versions.
- Invalid or incompatible saves produce clear errors and preserve existing data.
- Users can distinguish their private live view from any full-information replay view.

## 3. Useful bot playtesting

Add more than one bot policy, controlled bot-versus-bot runs, and clearly labeled summary results.

Acceptance criteria:

- Runs record seeds, policy settings, sample counts, and game/rules/bot versions.
- A failed or timed-out run is identifiable and is not counted as a normal game result.
- Results can be compared under the same setup and exported without personal data.
- A documented rule variant is tested independently from the base rules.

## 4. Public playable release

Polish keyboard access and interaction, document installation, and publish a tested build for explicitly supported platforms. Exercise clean installation and an entire game on each supported platform. State limits, game-content attribution, and save compatibility in release notes before adding more games.
