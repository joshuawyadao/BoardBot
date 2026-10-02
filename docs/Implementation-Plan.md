# Plan

Continue the current solo milestone by checking its remaining automated victory gap with the actual prepared components. Find a bounded, legal winning acceptance scenario, run it through ordinary controls in an isolated browser, and keep human play feedback and physical disconnected-play acceptance separate.

## Scope
- In: One full real-component victory with the selected Monster pair, legal command/replay checks, an opt-in browser regression, exact pending/terminal recovery, updated evidence and remaining-goal status, final commit/push.
- Out: Changing game data, random outcomes, rules or resource supplies to obtain a win; production hero-playing bots; reading or changing the user's live game; publishing private component data/history/artifacts; claiming balance or human acceptance.

## Action items
[x] Inspect the goal, durable work plan, rules/evidence boundaries, existing synthetic victories, and prepared-component defeat coverage.
[x] Checkpoint this resolved plan (`3e82ac4`).
[x] Develop a bounded test-only scenario driver using legal engine actions and the actual data under current rules; verify a winning command history without mutating setup or outcomes. Seed 8 wins on turn 18 after 103 legal decisions.
[x] Reproduce the winning scenario using ordinary browser controls, including Item costs, both Monster challenges, required choices, pending reload, and exact victory resume. Complete saved state matches replay and every Item remains accounted for.
[x] Run focused prepared tests and relevant broad verification; fix only reproduced defects and stop for new rule decisions if necessary. Build/typecheck, 114 unit tests, five repository checks, 74 public browser tests, and the new prepared victory test passed; no product or rule change was needed.
[x] Record the exact acceptance scope in Verification, Playtest-Checklist, Work-Plan, and Roadmap; retain owner playthrough and physical disconnection gates.
[x] Save/push the task-owned changes and report the next required feedback. The remaining gates are complete owner playthrough/ability feedback and physical internet-disconnection acceptance; the six-task milestone remains open.

## Open questions
- None blocking. A winning seeded scenario validates an executable path, not a general strategy, game balance, or human acceptance. If bounded exploration cannot reach a legal victory, record that result without changing rules or supplies.
