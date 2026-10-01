# Verification

## Local command

Requirements for the app checks: Git, Python 3.9 or newer, Node.js 26 with its bundled npm, and a POSIX shell on macOS or Linux (or WSL on Windows). The Playwright browser test also requires Chromium. No credentials are required.

The supported Node major is recorded in `.nvmrc` and `package.json`. If using nvm, run `nvm install` and `nvm use` from the checkout, then confirm `node --version` reports `v26.x` before installing dependencies. When moving from Node 24, run `npm ci` again under Node 26 to refresh installed packages, including native tooling.

From a checkout, run:

```sh
npm ci
npm run verify
npx playwright install chromium
npm run test:e2e
```

`npm run verify` typechecks the application and preparation script, builds the React prototype, runs sample and foundation tests, then calls `./scripts/verify-repository.sh`. The shell script finds the repository relative to itself, so an absolute script path also works from another directory. It runs the repository verifier, Python unittest discovery, and Git whitespace checks for staged and unstaged changes. The Python tests can also be run directly:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

## What the checks cover

- Required public project files are present and nonempty.
- Inline Markdown links and images that point to local files resolve inside the repository.
- Selected private or generated files are rejected when included in Git's tracked/nonignored file inventory, including files forcibly tracked despite ignore rules.
- The verifier's success and failure behavior is exercised with temporary repositories and synthetic fixtures.
- Git reports no whitespace errors in staged or unstaged diffs.
- Sample-engine and session tests cover invalid and repeated actions, stale-command handling, explicit phase end at zero or with actions remaining, phase logging once, and numbered-turn continuity. Playwright tests cover direct destination execution, separately confirmed Wait, resolution locking, explicit phase end, stable help for unavailable cards, the floating tray and right-side Event log, local requests and reload reset, keyboard interaction, log scrolling, and narrow viewports.

The repository verifier is a small hygiene check, not a complete Markdown parser or secret scanner. It does not validate external URLs, Markdown heading anchors, every credential format, content ownership, or gameplay. Review content before publishing it. The browser tests validate the synthetic sample. Foundation unit tests separately cover normalized data validation, private packet failure handling, effective d20 results, optional response priority, random-state replay, and graph traversal using synthetic fixtures. These helpers are not integrated gameplay; the suite does not validate complete Horrified rules, monsters, saves, or completed games. The prototype was initially exercised on a macOS 27 arm64 host with Node.js 24.19 and Chromium 153. On September 30, 2026, the Node 26 upgrade passed a clean install, build, eight engine/session tests, five repository tests, and eight Chromium tests on macOS 27.0.1 arm64 with Node.js 26.10.0, npm 11.19.1, and Chromium 153.0.8010.12. Target M1 hardware has not been separately validated.

The data and policy foundation was checked under Node.js 26.10.0: the build, 34 unit tests across seven files, five repository tests, and eight existing Chromium tests passed. The private packet also passed the preparation command. The 26 added unit tests cover data, decision policies, random state, and graph primitives; no playable-game acceptance is implied.

The setup continuation adds schema v2 validation for the photographed supplement and seven isolated setup tests. It checks physical piece conservation, initial supplies and locations, deterministic setup/refill, content fingerprints, unsupported inputs, and hidden-information projection. The actual private packet prepares and initializes successfully; missing/tampered setup evidence preserves the previous prepared output. This is setup coverage, not action resolution or completed-game acceptance.

## GitHub CI

The `CI Verify` workflow runs repository checks, the locked npm install, build, engine tests, and Chromium interaction tests on pushes to `main`, pull requests, and manual dispatch. It selects Node 26 from `.nvmrc` and uses pinned checkout and Node setup actions, read-only repository permissions, disabled persisted checkout credentials, a short timeout, and cancellation of superseded runs. Dependabot checks GitHub Actions and npm dependencies weekly; major `@types/node` updates are excluded so a future runtime upgrade can change `.nvmrc`, the package engine requirement, and types together. Minor and patch type updates remain enabled. Repository rules require a pull request for `main`; direct pushes are blocked.

## Acceptance checks for the planned solo game

No complete Horrified gameplay tests exist yet. Isolated policy, graph, and data tests are only prerequisite coverage. During implementation, add focused engine tests for setup, legal/illegal commands, action budgets, movement, resource costs, hero abilities, monster resolution, and end conditions. Derive cases from verified sources in the [game-data checklist](Game-Data-Checklist.md); keep unresolved interpretations visible.

Test that invalid actions preserve state and that repeated confirmation cannot spend twice, redraw, or reroll. Exercise effects that alter action availability and decisions within monster phases. Verify the selected pair and each base hero independently, then complete games through both victory and defeat paths.

Use the accepted working interpretations and explicit gaps in [Rules-Reference.md](Rules-Reference.md) when writing those tests. Include exhausted Item and Perk supplies, repeated Displacer powers, Cleric self-rescue and effect expiry, Wizard destination 1, dice adjustment finalization, and the chosen board routes. Use the owner-approved v2 policies for out-of-range effective d20 results and competing optional responses. No such gameplay tests were added by the research handoff.

When multiplayer is implemented later, cover one, two, and five Hero seats with human/bot controllers, co-located and off-board targets, cross-seat Perks, resource ownership, and active-player versus attacked-Hero choices. Logical consistency of a rule across seat counts is not evidence of tested balance or an implemented multiplayer feature.

Test local save/resume after completed actions and during required choices, preserving committed random outcomes. Include malformed/incompatible saves, storage failure, and interruption between commit and display. The previous valid session must survive failed loading or persistence.

Browser acceptance should cover hover, keyboard-focus, and tap descriptions in the reserved help area; stable greyed-out cards with reasons; action costs and changing availability; free action selection; direct execution when a legal Move destination is clicked; and disabled Confirm for incomplete consequential choices. Check that controls lock during resolution while required-choice controls remain usable. Test zero-action free perks and explicit phase end separately, including early end, phase logging once, and denial during resolution. The Event log should preserve earlier turns without pulling a reader away from older entries; test save and reload separately once implemented. Validate the simplified map's graph independently of its appearance and use monster-specific prerequisites for Advance and Defeat.

On the target M1 Mac, perform clean setup and full solo play. Disconnect internet after setup, keep the local server running, and check startup, gameplay, required assets, and save/resume. No runtime request to a remote service may be needed to complete the session. Record actual browser/OS versions and limitations when tested.

The finalized [work plan](Work-Plan.md) and [roadmap](Roadmap.md) define milestone completion. Passing today's prototype and repository checks is not evidence of Horrified gameplay correctness.
