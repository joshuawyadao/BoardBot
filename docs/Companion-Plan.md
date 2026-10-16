# Physical-game companion plan

**Direction agreed October 16, 2026. Planning and proof-of-concept brief only; no companion is implemented.** The on-screen solo game remains a separate experience. Its [human acceptance](Playtest-Checklist.md) is still deferred and open; companion planning does not close that milestone.

## Purpose

Help people prepare a physical board game and find occasional assistance while they play together. The phone is a reference beside the table: useful before play and available when needed, without requiring a second record of every physical action.

The first game is the original Horrified: Dungeons & Dragons, using the five base Heroes and Beholder/Displacer Beast. Setup guidance should eventually serve groups as well as true solo play. Count occupied Hero seats when a setup instruction depends on that count; the number of people holding phones is irrelevant. Physical group guidance does not imply multiplayer support in the on-screen engine.

The reusable product pattern is **Setup, My character, Rules**. Establish it with one game before introducing a general game-plugin framework or promising other supported games.

## Agreed experience

### Setup: show what goes where

1. Choose the game and verified setup options, including Hero count, selected Heroes and Monsters where those choices affect preparation.
2. See an original visual layout and short, ordered instructions covering the board, fixed starting pieces, decks, supplies, Monster areas and player areas.
3. Use the instructions directly, or optionally check off steps. Every instruction remains readable without completing the previous step or starting a tracked session.
4. Leave setup whenever ready. There is no required Start game confirmation.

Show fixed placements precisely, with names/numbers that match the physical components. For random setup, explain the physical draw or roll and how its result determines placement. Do not invent a predetermined starting layout, reveal hidden results or replace physical randomness with a digital draw. A location lookup may help locate a physically drawn destination without recording that draw.

Use an overview plus readable placement details on a small phone screen. Original diagrams and concise sourced instructions must be sufficient without relying on reproduced publisher artwork. Missing or unverified configuration instructions stay unavailable with a clear explanation.

### My character: remember an effect when asked

Select a Hero to see relevant ability guidance. After resolving a physical roll, optionally tap its verified outcome to pin a reminder for an effect that remains available later.

Each pinned reminder identifies the Hero, the effect, whom it can affect, and its printed or accepted timing/expiration. Include a count only when the verified ability supports multiple saved uses. Instant effects can remain reference material; they do not acquire bankable controls.

Pinning, spending, removing and correcting reminders are explicit user actions. Offer a quick Undo for an accidental companion edit. Without turn/phase tracking, the companion cannot determine whether an effect has expired or is currently legal; it shows the timing and lets the player clear it. No timers or automatic turn-boundary consumption are required.

Remember the last selection and pinned effects locally where storage is available. Make existing reminders easy to see and clear when preparing another game; changing a setup selection must not silently erase them. Storage failure should leave reference features usable and visibly explain that edits will not be remembered. These are optional personal reminders, not a complete game log or a cross-device shared state.

### Rules: answer an occasional question

A small Rules button remains reachable from setup and character guidance. It opens a compact search with common topics and plain-language text input. Closing it returns to the previous place without changing reminders or setup selections.

Begin with a curated local reference based on [Rules-Reference.md](Rules-Reference.md). Each answer needs a concise explanation, a source locator, its applicable edition/configuration, and a clear evidence label. Distinguish published instructions, reported clarifications, accepted BoardBot interpretations and unresolved cases. An unmatched question receives a useful no-result state rather than an invented ruling.

Natural-language AI assistance is a possible later enhancement. The first proof of concept uses searchable curated material and requires no external AI service. Before adding AI, decide the provider, cost, data handling, connectivity and fallback behavior explicitly. Any AI explanation must be grounded in the reference, retain citations and uncertainty, and preserve the source distinctions; AI wording cannot promote a working interpretation into an official rule.

## Interaction boundaries

- Players move pieces, draw cards, roll dice, spend resources and resolve effects physically. No app confirmation is required afterward.
- Turn order, phase advancement, action budgets, board positions, inventories, Terror, Monster progress and game outcomes are outside the first companion workflow.
- There is no required session creation, pause, resume or finish ceremony. Local preference/reminder restoration is convenience, not reconstruction of a physical game.
- Character selection works independently of setup, and rules help works independently of both. Someone may use only one feature.
- Pinned reminders may have optional short notes. A detailed action history, notifications and shared multi-phone synchronization are later product decisions.
- Correcting a reminder changes only companion data. It neither undoes a physical move nor submits an undo command to the solo game.

## Proof-of-concept build order

| Slice | Deliverable | Evidence before moving on |
| --- | --- | --- |
| 1. Setup guide | Phone-oriented Setup screen for one verified Horrified configuration, with an original placement overview and named detail list | Instructions trace to existing evidence; fixed and random steps are distinct; the guide is usable without checking boxes |
| 2. Character reminders | Hero selection and one verified persistent-effect path, including add, use/remove, correction and local restoration | A player can record and clear the effect with brief optional interactions; timing stays visible and no turn entry is needed |
| 3. Rules help | Persistent entry point, a small sourced topic catalog, text search and honest no-result handling | A known question returns the supporting source and evidence label; an unresolved case retains its uncertainty |
| 4. Combined walkthrough | Setup, character and Rules accessible together; retained selections/reminders and explicit clear controls | Switching features preserves context; reopening restores only companion entries; the app can be put aside during normal play |
| 5. Broader verified coverage | Remaining Hero guidance/reminders and additional supported Hero counts for the same Monster pair | Every added option has reviewed setup/effect evidence and focused tests; group guidance makes no multiplayer-engine claim |

Use one Hero against the existing Monster pair as the first data-backed setup walkthrough. Review the setup conditions for other Hero counts before exposing those options; do not assume that the solo initializer produces correct group instructions. Reuse completed component research and open only a specific missing field or conflicting case.

Keep the interface pattern portable through ordinary game-specific data for setup steps, placement references, character effects and sourced topics. A second game will test which structures should be shared; the first proof of concept does not need an extensible plugin system.

## Proof-of-concept acceptance

The initial runnable walkthrough should demonstrate:

1. Open Setup, choose the supported configuration and find every fixed starting placement and physical random-setup instruction.
2. Leave setup without completing a checklist or recording a turn.
3. Select a Hero, pin an eligible persistent effect and read its timing. Correct or remove it and undo an accidental removal.
4. Open Rules, find a covered question with its source and evidence label, then try an uncovered question.
5. Return to the same reminder and setup selections. Close/reopen the app to check local restoration and explicitly clear stale reminders.
6. Continue physical play without entering another action, phase change or outcome in the app.

Future implementation checks should cover setup conditions and source mapping; reminder identity/counts/correction without invented timing; storage failure and isolation from solo saves; known/unknown rules queries and evidence labels; narrow-screen reading, touch targets and keyboard/focus behavior. Public fixtures must remain synthetic. Actual phone/table use is separate from browser viewport emulation and will require its own later evaluation.

These criteria describe a future demonstration, not completed implementation or a replacement for the deferred solo playtest.

## Architecture, content and delivery constraints

Reuse validated data and pure rule helpers where useful, while keeping companion edits separate from the solo command runner, random state, saved games and phase transitions. The companion stores only its selections, optional checkmarks and user-managed reminders. It is not an engine snapshot and cannot certify the physical board's legal state. See [Architecture.md](Architecture.md).

Keep private component text, photos and existing prepared data within the [game-data publication boundary](Game-Data-Checklist.md). Verified ownership/reference evidence does not grant public redistribution rights. Public demonstrations can use synthetic data and original diagrams; exact private guidance requires an appropriate local data path. No new scans or broad source search are needed for this planning work.

Phone use is the design target, not an available delivery feature. The existing server and private-data endpoint are loopback-only; a phone cannot reach the Mac through the Mac's localhost address. Decide a suitable delivery and private-data arrangement before promising a real-phone demonstration. This plan does not authorize exposing that endpoint, publishing private data or deploying a hosted app. A phone-sized desktop browser can establish the first interaction prototype while delivery is evaluated.

Curated setup, reminders and reference search should be usable locally after preparation. Opening an external source link can require connectivity. Accounts, telemetry, cloud synchronization and paid services are outside the first proof of concept.

## Next task

Design and then build slice 1: the phone-oriented Horrified setup guide, using the existing verified private evidence and a synthetic public fixture. Record its concrete file ownership, content mapping, access approach and test cases in the temporary [Implementation-Plan.md](Implementation-Plan.md) when implementation is requested. This durable plan remains the companion baseline; [Work-Plan.md](Work-Plan.md) continues to govern the separate solo milestone.
