# Verification

## Local command

Requirements: Git, Python 3.9 or newer, and a POSIX shell on macOS or Linux (or WSL on Windows). No package installation or credentials are required.

From a checkout, run:

```sh
./scripts/verify-repository.sh
```

The script finds the repository relative to itself, so an absolute script path also works from another directory. It runs the repository verifier, Python unittest discovery, and Git whitespace checks for staged and unstaged changes. The Python tests can also be run directly:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

## What the checks cover

- Required public project files are present and nonempty.
- Inline Markdown links and images that point to local files resolve inside the repository.
- Selected private or generated files are rejected when included in Git's tracked/nonignored file inventory, including files forcibly tracked despite ignore rules.
- The verifier's success and failure behavior is exercised with temporary repositories and synthetic fixtures.
- Git reports no whitespace errors in staged or unstaged diffs.

The verifier is a small repository hygiene check, not a complete Markdown parser or secret scanner. It does not validate external URLs, Markdown heading anchors, every credential format, content ownership, or gameplay. Review content before publishing it. There are no application or game tests yet because those components do not exist.

## GitHub CI

The `CI Verify` workflow runs the same command on pushes to `main`, pull requests, and manual dispatch. It uses a pinned checkout action, read-only repository permissions, disabled persisted checkout credentials, a short timeout, and cancellation of superseded runs. Dependabot checks the GitHub Actions dependency weekly. Add runtime dependency manifests and their update configuration when the selected React app is implemented and package versions are pinned.

## Acceptance checks for the planned solo game

No gameplay tests exist yet. During implementation, add focused engine tests for setup, legal/illegal commands, action budgets, movement, resource costs, hero abilities, monster resolution, and end conditions. Derive cases from verified sources in the [game-data checklist](Game-Data-Checklist.md); keep unresolved interpretations visible.

Test that invalid actions preserve state and that repeated confirmation cannot spend twice, redraw, or reroll. Exercise effects that alter action availability and decisions within monster phases. Verify the selected pair and each base hero independently, then complete games through both victory and defeat paths.

Use the accepted working interpretations and explicit gaps in [Rules-Reference.md](Rules-Reference.md) when writing those tests. Include exhausted Item and Perk supplies, repeated Displacer powers, Cleric self-rescue and effect expiry, Wizard destination 1, dice adjustment finalization, and the chosen board routes. Ott out-of-range results and competing optional responses need an explicit policy before assertions can encode expected behavior. No such gameplay tests were added by the research handoff.

When multiplayer is implemented later, cover one, two, and five Hero seats with human/bot controllers, co-located and off-board targets, cross-seat Perks, resource ownership, and active-player versus attacked-Hero choices. Logical consistency of a rule across seat counts is not evidence of tested balance or an implemented multiplayer feature.

Test local save/resume after completed actions and during required choices, preserving committed random outcomes. Include malformed/incompatible saves, storage failure, and interruption between commit and display. The previous valid session must survive failed loading or persistence.

Browser acceptance should cover hover and keyboard-focus descriptions, click-to-select without execution, disabled Confirm for incomplete choices, locked controls during resolution, usable required-choice controls, and clear results. Validate the simplified map's graph independently of its appearance.

On the target M1 Mac, perform clean setup and full solo play. Disconnect internet after setup, keep the local server running, and check startup, gameplay, required assets, and save/resume. No runtime request to a remote service may be needed to complete the session. Record actual browser/OS versions and limitations when tested.

The finalized [work plan](Work-Plan.md) and [roadmap](Roadmap.md) define milestone completion. Passing today's repository checks is not evidence of gameplay correctness.
