# Roadmap

**Planning baseline finalized September 28, 2026; interaction direction updated September 29; research updated September 30.** Milestone 0 is complete. A local solo playtest build with all five base Heroes and recovery is implemented alongside the default synthetic sample; the full milestone is incomplete. The [work plan](Work-Plan.md) records the agreed build sequence. Scoped component verification is complete; the [game-data checklist](Game-Data-Checklist.md) and [rules reference](Rules-Reference.md) retain evidence, accepted interpretations, and remaining implementation/publication dependencies.

## 0. Public project foundation - complete

MIT licensing, community policies, contribution templates, repository verification, CI, and GitHub security settings are established. Existing checks validate repository tooling, not gameplay.

## 1. On-screen solo Horrified: Dungeons & Dragons

Deliver a local React browser game for the M1 MacBook Pro, using one human-controlled hero against the Displacer Beast and Beholder. Use the approved original illustrated map with integrated labels, physical floor placement and distinct tactile markers. All five base heroes are selectable at completion; develop and validate them one at a time.

**In progress:** Prepared private data can now open a solo game with Fighter, Bard, Cleric, Rogue, or Wizard against Beholder and Displacer Beast. The table has shared Hero actions, Perks, monster turns, required choices, action costs and legality, direct movement, confirmed spending/rolls, progress, and an event log. Synthetic complete-game and replay tests cover victory and defeat. Actual prepared-data checks exercise the Monster-card catalog, complete defeat games with all five Heroes, and a full Fighter victory through ordinary browser controls with exact replay and recovery. The owner has approved the compact table layout and illustrated visual direction. The implemented presentation follows [UI-Design.md](UI-Design.md); full visual and gameplay acceptance remain separate. Full human game acceptance remains open.

The default four-location sample is still available without private data. The sample resets on reload. The solo game autosaves before publishing committed outcomes and offers an independent game library, resume, private backup export/import, previous-save recovery, and confirmed deletion. The current table supports simultaneous information panels, visible setup pieces, and explained roll choices. The production build has a separate startup/recovery check with external HTTP requests blocked. Broader human effect acceptance and full owner playthroughs on the target Mac remain open; follow the [owner playtest checklist](Playtest-Checklist.md). See [local data preparation](Game-Data-Format.md).

Build in this order:

1. Preserve the verified source packet, encode suitable game data, and resolve the remaining rules/publication gates; use synthetic fixtures where public data is unavailable.
2. Establish the app and shared rules/command boundaries. A synthetic prototype establishes the first UI/engine/session seam; the Fighter engine now implements the next slice.
3. Complete a game with one hero and the selected monster pair.
4. Add and validate the remaining heroes.
5. Finish the action panel, explanations, local recovery, offline behavior, and complete-game validation.

Acceptance criteria:

- A documented local setup starts the app and completes games with each supported hero, including victory and defeat paths.
- Legal actions, current phase, remaining actions, inventory, and outcomes are understandable.
- The compact tray keeps stable action positions and shows costs, availability, and specific reasons for invalid actions. Hide/Show actions frees map space while retaining phase controls and required choices. Move is selected freely, then commits on clicking a highlighted legal destination. Consequential item or roll choices require review and confirmation; there is no undo command.
- The Hero Phase ends only through an explicit command after the current resolution. Eligible free perks remain usable at zero paid actions until that boundary, subject to their own legality rules.
- Invalid moves and repeated submissions leave state unchanged. Controls lock during resolution while required decision controls remain usable.
- Monster phases preserve player choices required by the rules.
- Save/resume restores state and pending choices without rerolling, redrawing, or replaying committed actions; failures are visible and recoverable.
- Gameplay works with internet disconnected after initial setup while the local server runs.
- Required data, rule interpretations, and source/content provenance are verified and documented. Unsupported or incomplete content is not presented as validated.

## 2. Physical-game companion

Reuse the verified rules foundation for setup assistance, session tracking, and quick rules/edge-case lookup during physical play. Define manual input, correction, and rules-search behavior separately before implementation. Answers should distinguish published rules, reported clarifications, and unresolved interpretations.

## 3. Broader game and device support

Add remaining monsters and their tests, then improve artwork and usability with documented content provenance. Expand platform/browser support and consider optional desktop packaging. These additions are not required to finish the initial two-monster solo milestone.

## Later exploration

Other games, hero-playing bots, controlled bot simulations, and rule variants can follow demonstrated demand. Simulation results must identify the tested policies, versions, and samples; they do not prove balance or optimal strategy. Online multiplayer and paid services remain outside the current plan.
