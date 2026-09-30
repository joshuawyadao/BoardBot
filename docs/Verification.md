# Verification

## Local command

Requirements for the app checks: Git, Python 3.9 or newer, Node.js 24 with npm, and a POSIX shell on macOS or Linux (or WSL on Windows). The Playwright browser test also requires Chromium. No credentials are required.

From a checkout, run:

```sh
npm ci
npm run verify
npx playwright install chromium
npm run test:e2e
```

`npm run verify` typechecks and builds the React prototype, runs its engine and session tests, then calls `./scripts/verify-repository.sh`. The shell script finds the repository relative to itself, so an absolute script path also works from another directory. It runs the repository verifier, Python unittest discovery, and Git whitespace checks for staged and unstaged changes. The Python tests can also be run directly:

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

The repository verifier is a small hygiene check, not a complete Markdown parser or secret scanner. It does not validate external URLs, Markdown heading anchors, every credential format, content ownership, or gameplay. Review content before publishing it. The engine and browser tests validate only the synthetic sample, not Horrified rules, monsters, saves, or completed games. The prototype was exercised on a macOS 27 arm64 host with Node.js 24.19 and Chromium 153; target M1 hardware has not been separately validated.

## GitHub CI

The `CI Verify` workflow runs repository checks, the locked npm install, build, engine tests, and Chromium interaction tests on pushes to `main`, pull requests, and manual dispatch. It uses pinned checkout and Node setup actions, read-only repository permissions, disabled persisted checkout credentials, a short timeout, and cancellation of superseded runs. Dependabot checks GitHub Actions and npm dependencies weekly. Repository rules require a pull request for `main`; direct pushes are blocked.

## Acceptance checks for the planned solo game

No Horrified gameplay tests exist yet. During implementation, add focused engine tests for setup, legal/illegal commands, action budgets, movement, resource costs, hero abilities, monster resolution, and end conditions. Derive cases from verified sources in the [game-data checklist](Game-Data-Checklist.md); keep unresolved interpretations visible.

Test that invalid actions preserve state and that repeated confirmation cannot spend twice, redraw, or reroll. Exercise effects that alter action availability and decisions within monster phases. Verify the selected pair and each base hero independently, then complete games through both victory and defeat paths.

Test local save/resume after completed actions and during required choices, preserving committed random outcomes. Include malformed/incompatible saves, storage failure, and interruption between commit and display. The previous valid session must survive failed loading or persistence.

Browser acceptance should cover hover, keyboard-focus, and tap descriptions in the reserved help area; stable greyed-out cards with reasons; action costs and changing availability; free action selection; direct execution when a legal Move destination is clicked; and disabled Confirm for incomplete consequential choices. Check that controls lock during resolution while required-choice controls remain usable. Test zero-action free perks and explicit phase end separately, including early end, phase logging once, and denial during resolution. The Event log should preserve earlier turns without pulling a reader away from older entries; test save and reload separately once implemented. Validate the simplified map's graph independently of its appearance and use monster-specific prerequisites for Advance and Defeat.

On the target M1 Mac, perform clean setup and full solo play. Disconnect internet after setup, keep the local server running, and check startup, gameplay, required assets, and save/resume. No runtime request to a remote service may be needed to complete the session. Record actual browser/OS versions and limitations when tested.

The finalized [work plan](Work-Plan.md) and [roadmap](Roadmap.md) define milestone completion. Passing today's prototype and repository checks is not evidence of Horrified gameplay correctness.
