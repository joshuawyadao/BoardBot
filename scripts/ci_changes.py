#!/usr/bin/env python3
"""Conservatively decide whether a pull request changed only ordinary docs."""

import os
import subprocess
import sys


ROOT_DOCS = {"README.md", "CONTRIBUTING.md", "SECURITY.md", "CODE_OF_CONDUCT.md"}


def is_document(path: str) -> bool:
    if path in ROOT_DOCS:
        return True
    if path == ".github/pull_request_template.md":
        return True
    parts = path.split("/")
    return (
        len(parts) >= 2
        and parts[0] == "docs"
        and all(part not in ("", ".", "..") for part in parts)
        and parts[-1].endswith(".md")
        and parts[-1] != "AGENTS.md"
        and not any(ord(char) < 32 or 0xD800 <= ord(char) <= 0xDFFF for char in path)
    )


def run_git(*args: str) -> bytes:
    return subprocess.run(
        ["git", *args], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE
    ).stdout


def classify(event: str, base: str, head: str) -> bool:
    if event != "pull_request" or not base or not head:
        return False
    try:
        base_commit = run_git("rev-parse", "--verify", "--end-of-options", f"{base}^{{commit}}")
        head_commit = run_git("rev-parse", "--verify", "--end-of-options", f"{head}^{{commit}}")
        merge_base = run_git("merge-base", base_commit.decode().strip(), head_commit.decode().strip())
        paths = run_git(
            "diff", "--name-only", "-z", "--no-renames", "--no-ext-diff", "--no-textconv",
            merge_base.decode().strip(), head_commit.decode().strip(), "--"
        )
        if not paths or not paths.endswith(b"\0"):
            return False
        names = [os.fsdecode(path) for path in paths[:-1].split(b"\0")]
        return all(is_document(path) for path in names)
    except (OSError, subprocess.CalledProcessError, UnicodeError):
        return False


def run_app(event: str, base: str, head: str) -> bool:
    return not classify(event, base, head)


def main() -> None:
    decision = "false" if len(sys.argv) == 4 and not run_app(*sys.argv[1:]) else "true"
    print(f"run_app={decision}")
    output = os.environ.get("GITHUB_OUTPUT")
    if output:
        with open(output, "a", encoding="utf-8") as stream:
            stream.write(f"run_app={decision}\n")


if __name__ == "__main__":
    main()
