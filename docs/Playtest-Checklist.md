# Solo playtest acceptance

The app supports all five base Heroes against Beholder and Displacer Beast using the prepared private components and accepted BoardBot interpretations. Automated checks do not establish human usability, printed-rule fidelity in every case, or game balance. The owner reports that the current interface looks good so far; a completed human game has not yet been recorded.

## Checks already automated

Use the latest successful [verification evidence](Verification.md#reduced-manual-acceptance-october-8-automation) for the same executable revision. Repeating these mechanically by hand is unnecessary unless a test fails or play reveals a new case.

| Acceptance question | Executable evidence |
| --- | --- |
| Are setup, actions and abilities consistent with accepted rules? | Setup/conservation, legal/illegal commands, costs, every Hero band, Monster ordering, hidden information and complete deterministic victory/defeat/replay tests; opt-in private games exercise actual components |
| Can rolls and completed games survive reload? | Exact pending/terminal snapshots, RNG/replay, cached-base recovery, locked terminal controls and built-app acceptance |
| Are saving and recovery safe when writes fail or tabs compete? | Real IndexedDB aborts, preserved retry candidates, previous saves, imports, deletion and competing-tab browser regressions |
| Can people use visible controls and receive feedback? | Native keyboard/focus, named alternatives, enlarged text, axe scans, independent panels/preferences, tap input and required-choice confirmation |
| Do names and pieces fit the compact board? | All 29 names, in-board captions, in-floor pieces, desktop/narrow geometry and horizontal-overflow checks |
| Does reduced motion work? | Media preference, disabled transitions/smooth scrolling and unchanged Move/focus behavior |
| Does gameplay need internet services? | Built HTML/JavaScript/map-art requests through a local-only proxy, denied external HTTP/HTTPS controls, complete game and save recovery |
| Does it work across browser engines and on macOS? | Chromium/WebKit/Firefox public and production suites; an additional native M1 macOS WebKit CI job |

## Small remaining human review

1. During normal play, judge whether location names, pieces, routes and action/result wording are comfortable and clear. Note confusing steps or hard-to-read combinations; axe cannot fully judge text against painted terrain. There is no separate mandatory setup/reload exercise for each Hero.
2. On the target Mac, briefly try the keyboard flow with actual Safari and VoiceOver: open information, review a named Move, and reach a required choice when available. Check the spoken names/status, reading order and focus visibility. Automated DOM/engine checks cannot establish the actual assistive experience. Physical touch hardware is a separate spot check when a touch device is a delivery target.
3. For physical disconnected-play acceptance, turn off internet after setup while keeping the local server running. Open the same local URL, play, and save/resume; reconnect afterward. The proxy already checks missing external services, but does not exercise the Mac's network settings.
4. When time permits, finish one owner game and report the Hero, outcome and any confusing or apparently incorrect step. This remains the established full-game human acceptance gate; additional Hero feedback can be collected during later normal play rather than repeating the automated matrix by hand.

A short description with the displayed action/result is enough to investigate. Save backups contain private component data and should stay local.

## Evidence still needed

| Check | Current evidence |
| --- | --- |
| Interface layout and controls | Owner feedback: looks good so far, October 1 |
| All five Hero rules paths and legal terminal states | Automated synthetic tests; see Verification |
| Actual prepared data | All five Heroes have command-driven defeat/replay checks and isolated browser defeat games. Fighter also completed a legal browser victory under v4 and again under v5 at seed 8, turn 18, after 103 decisions, with Item conservation, complete state replay, and exact pending/victory recovery |
| Complete owner game | Pending owner outcome and feedback |
| Owner validation of the other Hero abilities | Pending full-play feedback; automated coverage exists |
| Keyboard, layout and browser mechanics | Automated keyboard/axe, compact captions/pieces, reduced motion and emulated tap sequences; Chromium/WebKit/Firefox plus native macOS WebKit CI. Actual VoiceOver and hardware experience remain human checks |
| Physical internet disconnection on the target Mac | Pending owner-run check; production automation enforces an exact local-only proxy with external HTTP/HTTPS denial controls |
| Repeated Slowing Ray penalty | Owner approved cumulative penalties on October 2; new games stack them, while existing v3 saves retain their earlier cap for exact replay |
| Public distribution of game text/assets | Separate publication-rights gate; private playtests do not grant those rights |

The owner deferred manual acceptance on October 2 and paused the six-task goal. The PR can be reviewed and readied without a full human game now; this checklist remains open until the owner records full-game and target-device evidence. Do not label an automated scripted run as an owner playthrough. The accepted rules and remaining interpretation limits are in [Rules-Reference.md](Rules-Reference.md); supported checks and their exact scope are in [Verification.md](Verification.md).
