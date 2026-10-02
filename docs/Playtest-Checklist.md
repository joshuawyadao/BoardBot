# Solo playtest acceptance

The app supports all five base Heroes against Beholder and Displacer Beast using the prepared private components and accepted BoardBot interpretations. Automated checks do not establish human usability, printed-rule fidelity in every case, or game balance. The owner reports that the current interface looks good so far; a completed human game has not yet been recorded.

## Next owner playthrough

1. Choose **New game**, select a Hero, and start a separate adventure. Check the starting Hero, Monsters, Items, and Lairs against the board and setup summary.
2. Play normally through Pick Up, Move, Advance, and Defeat when eligible. Check that costs, target choices, roll results, and Monster movement make sense. Use Inventory to inspect a Perk and its effect.
3. During a required choice after a roll, note the result, reload, and resume the same adventure. Confirm that the value, resources, location, and pending choice are unchanged; then continue.
4. Finish the game with a victory or defeat. Return to Saved games, reload, and resume it; confirm that the final result remains visible and new actions stay locked.
5. For the target-Mac disconnected-play check, disconnect internet after setup while keeping the local server running. Check opening the app, play, a required choice, and save/resume at the same local URL. Reconnect when finished. Automated external-request blocking is recorded separately from this physical check.

Report the Hero, outcome, whether reload preserved the pending roll, and any confusing or incorrect step. A short description with the displayed action/result is enough to start investigating; save backups contain private component data and should stay local.

## Evidence still needed

| Check | Current evidence |
| --- | --- |
| Interface layout and controls | Owner feedback: looks good so far, October 1 |
| All five Hero rules paths and legal terminal states | Automated synthetic tests; see Verification |
| Actual prepared data | All five Heroes have command-driven defeat/replay checks and isolated browser defeat games. Fighter also completed a legal browser victory under v4 at seed 8, turn 18, after 103 decisions, with Item conservation, complete state replay, and exact pending/victory recovery |
| Complete owner game | Pending owner outcome and feedback |
| Owner validation of the other Hero abilities | Pending full-play feedback; automated coverage exists |
| Physical internet disconnection on the target Mac | Pending owner-run check; automated tests block external HTTP requests while retaining localhost |
| Repeated Slowing Ray penalty | Owner approved cumulative penalties on October 2; new v4 games stack them, while existing v3 saves retain their earlier cap for exact replay |
| Public distribution of game text/assets | Separate publication-rights gate; private playtests do not grant those rights |

Keep the six-task goal open until the required full-game and target-device evidence is recorded. Do not label an automated scripted run as an owner playthrough. The accepted rules and remaining interpretation limits are in [Rules-Reference.md](Rules-Reference.md); supported checks and their exact scope are in [Verification.md](Verification.md).
