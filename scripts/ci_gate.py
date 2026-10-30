#!/usr/bin/env python3
"""Require a successful repository check and all expected application jobs."""

import os
import sys


APP_JOBS = ("BUILD_RESULT", "CHROMIUM_RESULT", "WEBKIT_LINUX_RESULT", "FIREFOX_RESULT", "WEBKIT_MACOS_RESULT")


def accepted(results: dict[str, str]) -> bool:
    if results.get("CLASSIFIER_RESULT") != "success" or results.get("REPOSITORY_RESULT") != "success":
        return False
    decision = results.get("RUN_APP")
    if decision not in ("true", "false"):
        return False
    expected = "success" if decision == "true" else "skipped"
    return all(results.get(job) == expected for job in APP_JOBS)


if __name__ == "__main__":
    results = {name: os.environ.get(name, "") for name in (*APP_JOBS, "RUN_APP", "CLASSIFIER_RESULT", "REPOSITORY_RESULT")}
    print("; ".join(f"{name}={value}" for name, value in results.items()))
    sys.exit(0 if accepted(results) else 1)
