# Plan

Implement the owner's October 2 decision that repeated Slowing Ray penalties stack. Version the new interpretation so new games use cumulative penalties while existing games retain exact replay and their original rules; cover forced penalties, elected penalties, payment, expiry, zero actions, and save recovery.

## Scope
- In: Interpretation v4, repeated Slowing application, compatible v3 replay, current rules for every new-game entry path, a short older-save notice, focused engine/save/browser tests, canonical docs, validation, commit and push.
- Out: Rewriting existing game history or private component evidence, changing other rays or accepted interpretations, multiplayer, and PR creation/merge.

## Action items
[x] Inspect Slowing resolution, turn-start cleanup, version checks, save replay, cached/imported data, and canonical rules/saves documentation.
[x] Checkpoint this plan on the current feature branch (`3a71591`).
[x] Add versioned cumulative Slowing penalties and retain the legacy cap for existing v3 games; preserve zero-action floors and existing defeat/expiry behavior.
[x] Start every new game under v4 without mutating cached/base content or older saves, and explain older saves' retained rule in the table.
[x] Add six integrated/replay tests and four browser cases for repeated penalties, discard responses, zero actions, next-turn clearing, and legacy save compatibility; retain explicit v3 storage-migration coverage.
[x] Update Rules-Reference, Local-Saves, Game-Data-Checklist/Format, Playtest-Checklist, README, and Verification to record the decision and compatibility boundary.
[x] Pass targeted checks and all broader commands: build/typecheck, 114 unit tests, five repository checks, 74 public browser tests, one production test, and five prepared-component browser playthroughs.
[x] Prepare task-owned changes for final save/push and report the behavior and compatibility limit.

## Open questions
- None. The owner approved stacking. Earlier saves remain pinned to their recorded rules rather than silently replaying history with different outcomes; new games use the approved rule.
