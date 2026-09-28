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

The `CI Verify` workflow runs the same command on pushes to `main`, pull requests, and manual dispatch. It uses a pinned checkout action, read-only repository permissions, disabled persisted checkout credentials, a short timeout, and cancellation of superseded runs. Dependabot checks the GitHub Actions dependency weekly. Add runtime dependency manifests and their update configuration only when the application stack is selected.

## Acceptance checks for future gameplay

When a playable game is added, test legal/illegal actions, turn order, scoring, end conditions, hidden information, deterministic fixtures, and bot failures. For saves, test round trips, malformed data, incompatible versions, and preservation of the prior session on failure. A clean install and a complete human-versus-bot game are required before describing a build as publicly playable. See the [roadmap](Roadmap.md).
