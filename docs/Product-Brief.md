# Product brief

## Purpose

BoardBot will let one person play a supported board game on their computer with bots filling other seats. It will also help that person try strategies and rule variations through repeatable playtests. The first audience is a solo player or hobbyist designer who wants a manageable local session without arranging a group.

## Current state

Only repository setup, public contribution materials, and development checks exist. There are no supported games, runnable app, game assets, or released builds. The first game, interface framework, and supported desktop platforms remain undecided. Python is used for repository checks and does not select the application language.

## Intended workflows

1. **Play a game:** choose an implemented game and rules version, configure seats and bots, start a session, make legal moves, see public results, and reach a clear end state.
2. **Resume a session:** save locally and return to the same turn with the same game state and bot configuration.
3. **Try an idea:** choose a documented rule variation or bot policy, record the setup and seed, play or simulate, and inspect the move history and outcome.
4. **Compare runs:** repeat controlled setups and compare outcomes while retaining the game, bot, and rules versions needed to interpret them.

Simulation outcomes describe the tested policies and sample. They should not be presented as proof that a game is balanced or a strategy is optimal.

## Product principles

- Start with one complete, testable game and a small usable play loop.
- Keep play local by default and make any future network use explicit.
- Prefer clear state, legal actions, and understandable bot behavior over elaborate presentation.
- Give bots only the information their seat is allowed to know.
- Treat reproducibility and a useful turn history as part of playtesting.
- Make game support and content provenance explicit. An arbitrary rulebook is not executable game support.

## Initial boundaries

The first prototype does not require online multiplayer, matchmaking, user accounts, cloud saves, a marketplace, a large game catalog, or an LLM service. Downloadable builds and platform support follow a working prototype. Commercial game integrations require documented content provenance and permissions before publication.

See the [roadmap](Roadmap.md) for staged acceptance criteria and the [architecture direction](Architecture.md) for proposed responsibilities.
