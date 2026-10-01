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

`npm run verify` typechecks the application and preparation script, builds both React tables, runs sample, foundation, and Fighter tests, then calls `./scripts/verify-repository.sh`. The shell script finds the repository relative to itself, so an absolute script path also works from another directory. It runs the repository verifier, Python unittest discovery, and Git whitespace checks for staged and unstaged changes. The Python tests can also be run directly:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -v
```

## What the checks cover

- Required public project files are present and nonempty.
- Inline Markdown links and images that point to local files resolve inside the repository.
- Selected private or generated files are rejected when included in Git's tracked/nonignored file inventory, including files forcibly tracked despite ignore rules.
- The verifier's success and failure behavior is exercised with temporary repositories and synthetic fixtures.
- Git reports no whitespace errors in staged or unstaged diffs.
- Sample-engine and session tests cover invalid and repeated actions, stale-command handling, rejection of the removed Wait action, explicit phase end at zero or forfeiting actions remaining, phase logging once, and numbered-turn continuity. Playwright tests cover direct destination execution, resolution locking, explicit phase end, stable help for unavailable cards, the floating tray and right-side Event log, local requests and reload reset, keyboard interaction, log scrolling, and narrow viewports.

The repository verifier is a small hygiene check, not a complete Markdown parser or secret scanner. It does not validate external URLs, Markdown heading anchors, every credential format, content ownership, or gameplay. Review content before publishing it. The original browser tests validate the synthetic sample. New Fighter browser tests import a synthetic dataset to check the game controls. Foundation unit tests separately cover normalized data validation, private packet failure handling, effective d20 results, optional response priority, random-state replay, and graph traversal using synthetic fixtures. The Fighter slice now integrates those foundations with command/effect tests and complete synthetic games. Local saves and all five Heroes now have automated coverage described below. Complete human play acceptance remains open. The prototype was initially exercised on a macOS 27 arm64 host with Node.js 24.19 and Chromium 153. On September 30, 2026, the Node 26 upgrade passed a clean install, build, eight engine/session tests, five repository tests, and eight Chromium tests on macOS 27.0.1 arm64 with Node.js 26.10.0, npm 11.19.1, and Chromium 153.0.8010.12. Target M1 hardware has not been separately validated.

The data and policy foundation was checked under Node.js 26.10.0: the build, 34 unit tests across seven files, five repository tests, and eight existing Chromium tests passed. The private packet also passed the preparation command. The 26 added unit tests cover data, decision policies, random state, and graph primitives; no playable-game acceptance is implied.

The setup continuation adds schema v2 validation for the photographed supplement and seven isolated setup tests. It checks physical piece conservation, initial supplies and locations, deterministic setup/refill, content fingerprints, unsupported inputs, and hidden-information projection. The actual private packet prepares and initializes successfully; missing/tampered setup evidence preserves the previous prepared output. This is setup coverage, not action resolution or completed-game acceptance.

The Fighter integration adds public synthetic tests for the complete command/effect path and local JSON import. Private local validation additionally exercised all 22 actual Monster-card faces and five full games reaching defeat, then replayed their commands exactly. These private checks use the ignored packet and are not CI inputs. The automated complete victory uses an invented compact fixture; it is not a balance test or a claimed human victory on the real board. Validation on the Apple M1 Max host (macOS 27.0.1, Node 26.10.0, Chromium 153) passed the build, 70 unit tests across ten files, five repository tests, and twelve browser tests. The four Fighter browser tests cover import/projection, keyboard movement and duplicate suppression, local-only requests with a complete phase, and a whole synthetic game ending at deck exhaustion. Private-data desktop (1512 px) and narrow (390 px) visual checks found no page overflow or runtime errors; the board scrolls inside its map panel. This is automated testing on M1-family hardware, not the owner’s human play acceptance or save/recovery validation.

## GitHub CI

The `CI Verify` workflow runs repository checks, the locked npm install, build, engine tests, and Chromium interaction tests on pushes to `main`, pull requests, and manual dispatch. It selects Node 26 from `.nvmrc` and uses pinned checkout and Node setup actions, read-only repository permissions, disabled persisted checkout credentials, a short timeout, and cancellation of superseded runs. Dependabot checks GitHub Actions and npm dependencies weekly; major `@types/node` updates are excluded so a future runtime upgrade can change `.nvmrc`, the package engine requirement, and types together. Minor and patch type updates remain enabled. Repository rules require a pull request for `main`; direct pushes are blocked.

## Acceptance checks for the planned solo game

The Fighter suite now includes complete deterministic synthetic games ending in victory and defeat, command replay, invalid/stale/duplicate/foreign commands, escorts and rescues, d20 overflow and reroll closure, zero-action Perks, Item payment, challenge outcomes, data identity, and hidden-information projection. Monster tests cover phase order, powers before hits, targeting, rays, group movement, and critical failures. Keep expanding source-backed effect coverage as the remaining Heroes and recovery are implemented. Derive cases from verified sources in the [game-data checklist](Game-Data-Checklist.md); keep unresolved interpretations visible.

Test that invalid actions preserve state and that repeated confirmation cannot spend twice, redraw, or reroll. Exercise effects that alter action availability and decisions within monster phases. Verify the selected pair and each base hero independently, then complete games through both victory and defeat paths.

Use the accepted working interpretations and explicit gaps in [Rules-Reference.md](Rules-Reference.md) when writing those tests. Include exhausted Item and Perk supplies, repeated Displacer powers, Cleric self-rescue and effect expiry, Wizard destination 1, dice adjustment finalization, and the chosen board routes. Use the owner-approved v3 policies for out-of-range effective d20 results and competing optional responses. The research handoff alone did not validate gameplay; the implementation tests now exercise the Fighter slice.

When multiplayer is implemented later, cover one, two, and five Hero seats with human/bot controllers, co-located and off-board targets, cross-seat Perks, resource ownership, and active-player versus attacked-Hero choices. Logical consistency of a rule across seat counts is not evidence of tested balance or an implemented multiplayer feature.

Test local save/resume after completed actions and during required choices, preserving committed random outcomes. Include malformed/incompatible saves, storage failure, and interruption between commit and display. The previous valid session must survive failed loading or persistence.

Browser acceptance should cover hover, keyboard-focus, and tap descriptions in the compact help area below the buttons; stable greyed-out cards with reasons; action costs and changing availability; free action selection; direct execution when a legal Move destination is clicked; and disabled Confirm for incomplete consequential choices. Check that controls lock during resolution while required-choice controls remain usable. Test zero-action free perks and explicit phase end separately, including early end, phase logging once, and denial during resolution. The Event log should preserve earlier turns without pulling a reader away from older entries; test save and reload separately once implemented. Validate the simplified map's graph independently of its appearance and use monster-specific prerequisites for Advance and Defeat.

On the target M1 Mac, perform clean setup and full solo play. Disconnect internet after setup, keep the local server running, and check startup, gameplay, required assets, and save/resume. No runtime request to a remote service may be needed to complete the session. Record actual browser/OS versions and limitations when tested.

The finalized [work plan](Work-Plan.md) and [roadmap](Roadmap.md) define milestone completion. The first Fighter playtest checks are not proof of full rules correctness, game balance, or the completed milestone.

## Compact action controls

The October 1 layout refinement reduces the default tray height and adds an accessible Hide/Show actions disclosure to both tables. Browser regressions cover compact desktop geometry, collapse/reopen by keyboard, draft cancellation without gameplay changes, phase end while collapsed, required choices outside the disclosure, added map height, and narrow viewports. The normal command, confirmation, duplicate, and illegal-action checks remain in place. No rules or storage behavior changes.

Final checks for this refinement passed under Node 26.10.0: build, 70 unit tests, five repository tests, and 17 Chromium browser tests. At a 1440×900 viewport the sample tray measures 220px expanded and 58px collapsed; the Fighter tray measures 223px and 58px. The larger synthetic map regression verifies over 100px of added visible height, and pending-choice geometry verifies separation from the collapsed tray. Render checks used synthetic data in isolated test browsers.

## Compact Event log

The subsequent October 1 refinement uses one Event log presentation for both tables. Browser coverage checks the 240px desktop column, 240px scroll-height cap, keyboard hide/show without resource changes, latest-event preview, retained complete history and reading position, and 390/320px layouts. The existing following-new-events and Jump to latest checks remain.

Validation passed under Node 26.10.0: build, 70 unit tests, five repository tests, and all 19 Chromium browser tests. At 1440×900, initial log panels measured approximately 151px tall in the sample and 208px in the Fighter table; collapsed panels measured 91px and 107px. Longer history scrolls within the 240px body cap. Screenshots use synthetic data in isolated test browsers.


## Solo Heroes and local recovery

The October 1 continuation adds Bard, Cleric, Rogue, and Wizard, with synthetic cases for every ability band. Tests include Cleric effect accumulation, rerolls before Powers and Hits, one-die attacks, expiry, self-rescue and defeat-sensitive event continuation; Rogue nearest occupied location and partial supplies; Bard movement order and away movement; and independent Wizard activation/destination rolls, destination 1/20, and Move escorts. Every Hero completes and replays synthetic victory and defeat games. These invented fixtures test legal transitions and consistency, not real-board balance.

Versioned save tests rebuild the full state through legal command replay and compare it with the snapshot, including RNG and pending choices. They reject unsupported versions, tampered state/continuations, invalid commands/data, and oversized piece counts. Session tests verify persistence before publishing, blocked commands during a write, preserved candidate results after failure, identical retries, and stale-tab rejection. Browser tests cover autosave/reload, required-choice restoration, private backup export, invalid imports, previous-save recovery (including damaged metadata), interruption just after commit, and multiple tabs. Each Hero's browser flow runs with all external HTTP requests blocked while local assets remain reachable. This simulates unavailable external services; it does not claim the operating system's Wi-Fi was disabled.

The actual ignored private dataset also completed one command-driven defeat game per Hero, exercising special actions and Monster Phases. Across these games, 89 intermediate or pending-choice snapshots were encoded and restored exactly. No private game data, script output, screenshots, or backups are tracked. Final verification passed: build, 87 unit tests across 13 files, five repository tests, and all 34 Chromium browser tests. The host was an Apple M1 Max MacBook Pro running macOS 27.0.1, Node 26.10.0, and Chromium 153.0.8010.12. Synthetic desktop (1440×1000) and mobile (390×844) screenshots confirmed readable controls and no document overflow; the map retains its own scroll area. Full owner playthrough feedback remains the final human acceptance gate.


## Explicit action forfeiture

The October 1 action refinement removes the invented Wait action from the sample engine and controls. Sample tests use legal moves to retain keyboard, duplicate-command, phase-boundary, and log coverage. Ending early clears the sample budget. Solo projection and save tests verify zero usable actions during the Monster Phase, rejection of ordinary actions while a required choice is pending, exact save restoration, and a fresh next-turn allowance without carryover. The browser regression exercises this through an early phase end, pending Monster choice, reload, and resume. Existing zero-action Perk coverage remains in place; the save format and replay state are unchanged.

Validation passed under Node 26.10.0: build/typecheck, 88 unit tests across 13 files, five repository tests, and all 35 Chromium browser tests. Full human play acceptance remains open.


## Fitted board and action feedback

The subsequent October 1 workspace redesign replaces the solo table's scrollable fixed grid with a fitted SVG and original region-based schematic. The recognized 29-location layout uses the relative placement in the owner's verified board photo; synthetic boards retain a generic fallback. Public layout tests cover complete in-bounds, non-overlapping placement and routes around unrelated nodes. A local audit of the prepared private graph also found no ordinary or passage route crossing unrelated location buttons. Teleport lines appear only for a relevant selected Move; engine legality and adjacency are unchanged.

Browser checks fit all 29 recognized positions at 1440×900, 1024×768, and 800×800, both with optional panels closed and on either side, without map or page scrolling. At 390px the entire board remains visible without horizontal/map scrolling; contextual panels stack below it and may require page scrolling. Tests cover panel repositioning by keyboard, close/reopen, history reading-position preservation, route highlights, visible confirmation below long descriptions, required-choice focus, and inspection of other panels while a choice remains pending.

Every Hero's synthetic special-action test checks the imported roll-range table. Additional tests verify public pending arithmetic (including overflow), finalized outcomes, pre-roll review, visible roll feedback without the Event log, and exact pending-result restoration after reload. The projection exposes no response-window internals, hidden decks, or random state, and the save format is unchanged.

Final checks passed under Node 26.10.0: build/typecheck, 94 unit tests across 15 files, five repository tests, and all 38 Chromium browser tests. Isolated visual checks used the actual local data at 1440×900, 1024×768, and 390×844; private screenshots remain outside Git. Full human play acceptance and the owner's assessment of the redesigned layout remain open.


## Automatic base game and saved-game library

The next October 1 refinement adds a start screen with automatic prepared-data loading, cached components, Hero selection before setup, and independent saved games. Public browser tests intercept the private-data endpoint with synthetic fixtures or an explicit missing-file response, so a developer’s private packet cannot become a test input accidentally.

New endpoint tests cover valid, missing, malformed, oversized, and symlinked data, fixed paths and methods, loopback/origin restrictions, and blocked direct private-directory URLs. Library browser tests cover content deduplication and original version fields, data-version pinning, independent records, atomic failed writes, competing tabs, one-time legacy migration, damaged-current recovery, and restoration of corrupted cached components from the exact validated version. UI tests cover automatic/cached startup, one-time manual import, setup cancellation, independent adventures, invalid-data fallback, initial save retry, and the migrated earlier save. Existing pending-roll, backup, keyboard, Hero, and board regressions remain covered.

Final validation passed under Node 26.10.0: build/typecheck, 97 unit tests across 16 files, five repository tests, and all 52 Chromium browser tests. An isolated browser also used the actual prepared file through the real endpoint, selected Wizard, and opened all 29 board locations. Desktop and 390px screenshots showed the start, Hero, and saved-game views with no horizontal overflow or browser errors. Direct private-file requests returned 404. Private screenshots and data remain outside Git; the user’s live browser save was not used for these checks. Full human game acceptance remains open.

## Concurrent panels, setup pieces, and Wizard context

The next October 1 playtest refinement lets Inventory, Monsters, Event log, and Latest result coexist with independent close/side controls. Browser regressions cover retained Perk disclosures and reading position, preserved action drafts and response selection, required choices alongside other information, the fitted board, and narrow-screen overflow. Long required-choice explanations and options scroll together while confirmation remains visible. Crowded panels use the persistent roll summary instead of a duplicate result card in the choice panel.

New-game checks verify both Monsters, the Hero, 12 starting Items, and all Lair markers before any command. The Board ready summary does not consume actions. Inventory descriptions match the owned Perk projection. Rendering tests cover a crowded location with all piece types, hidden Lair face protection, and a Wizard destination highlight that does not permit ordinary movement.

The reported Wizard sequence is reproducible with the synthetic Hero fixture and seed 105: an ability result of 5 is followed by destination 17, then a choice of an existing Monster. Seed 65 separately verifies that a direct ability result of 17 asks where to move the Wizard. The improved public projection explains these distinct rolls and existing-piece locations. Tests preserve stored pending state, move only the chosen Monster, and restore the pending explanation after save/reload. No setup quantities, rules, command semantics, or save format changed.

Validation passed under Node 26.10.0: build/typecheck, 101 unit tests across 18 files, five repository tests, and all 55 Chromium browser tests. Isolated screenshots with the actual prepared data checked initial setup and four information panels alongside action review or a required choice at 1440×900 and 1024×768, with no browser errors or document overflow. Optional panel bodies scroll when many are open; closing or moving them gives the board and other panels more space. Screenshots and private data remain outside Git. Full human play acceptance remains open.
