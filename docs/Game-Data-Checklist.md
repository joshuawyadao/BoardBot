# Game data and rules verification

**Status: open research dependencies for the finalized planning baseline, September 28, 2026.** This register covers the original Horrified: Dungeons & Dragons base game, all five base heroes, and the Displacer Beast/Beholder pair. It does not cover Ravenloft or promotional heroes.

## Source baseline

- [Ravensburger product page](https://www.ravensburger.us/en-US/products/games/board-games/horrified-dungeons-dragons--24754) links the [official 12-page instructions](https://product-files.ravensburger.cloud/manuals/704005.pdf). The instructions were downloaded and visually inspected during planning. They identify five base heroes and recommend the chosen monster pair; the store listing has inconsistent component counts, so do not use it as the component manifest.
- The [BoardGameGeek clarification collection](https://boardgamegeek.com/thread/3582087/official-clarifications-dragon-mimic-beholder-rogu) reproduces answers attributed to developer Mike Mulvihill. Available indexed excerpts were inspected; direct retrieval was restricted. Treat this as secondhand correspondence pending corroboration, not publisher-hosted errata.
- Owner-provided photos/transcriptions are pending. Record edition and component identifiers when received. Private source files stay outside tracked files; do not add the full rulebook or scans to this public repository automatically.

## Component coverage

| Component | Current evidence | Needed before faithful gameplay |
| --- | --- | --- |
| Core rules | Setup, phases, actions, combat and end conditions are documented | Encode requirements and source-linked tests |
| Five heroes | Bard, Cleric, Fighter, Rogue and Wizard tiles are illustrated | Readable full ability tables; confirm start locations, action limits and timing |
| Beholder | Challenge described; reference card front illustrated | Readable front and reverse with every ray and symbol |
| Displacer Beast | Challenge and placement exceptions described | Verify mat spaces, symbols, thresholds, and solo power resolution |
| Board | Illustrated map and special movement rules | Transcribe and cross-check every edge, connector and numbered location |
| 30 monster cards | Examples and processing rules | All events, draw counts, activation order/symbols, movement, dice counts and multiplicities |
| 20 perk cards | Examples and play timing | Complete effects, restrictions and multiplicities |
| 60 item tokens | Examples and attributes | Full names, types/colors, strengths, destinations and quantities |
| 10 citizens | Standees illustrated | Verify each safe destination and relevant placement references |
| Monster dice | Symbols described | Verify face counts/distribution for each die |
| Lair tokens and relevant mats | Setup and examples present | Confirm any effects still relevant when Dragon and Mimic are excluded |

Availability is not the same as a completed transcription. Check symbols and visual tables against images; extracted PDF text can include duplicated or clipped artwork text and omit color/icon meaning.

## Verification process

For each entry, record its identifier, edition, source and page/component, transcribed data, duplicate count where relevant, review status, and associated tests. Use statuses such as missing, transcribed, cross-checked, or unresolved. Do not mark an entire deck verified from a handful of examples.

The first useful photo batch is the Beholder reference front/back, five hero tiles, and an overhead board view. Follow with readable batches of cards and tokens, retaining duplicates in the inventory; then citizens and all monster-die faces. Images need to be legible reference material, not polished app art.

## Edge-case register

These are questions to resolve or cross-check, not asserted new rules:

- Displacer Beast target selection and attack redirection with one hero.
- Beholder temporary restrictions, skipped turns in solo play, and effects when a hero is temporarily off-board.
- Cleric/Fighter effect ordering, repeated effects, duration and self-protection.
- Wizard movement/location rolls and their interaction with rewards and global dice rules.
- Rogue nearest-item selection when fewer items are available, bag draws, and discard selection.
- Perks referring to other heroes in a one-hero session.
- Tied routes/targets, depleted bag/decks, nested choices, and interruptions during resolution.

Label conclusions as published rule, corroborated clarification, reported clarification, or explicit interpretation. Document conflicts and resolve affected behavior before calling it authoritative. If a choice cannot be settled from sources, obtain and record an explicit interpretation instead of silently filling the gap.

## Implications already identified

The rules require more than a fixed action counter: perks and effects can change action availability, and some resolution decisions belong to the player. The interface must pause at required choices even within automated monster turns. The rules also distinguish hero and monster dice outcomes and the timing of a failed required card draw. Use these as targeted test categories rather than importing assumptions from other Horrified editions.

## Publication and implementation gates

Synthetic fixtures can support infrastructure work without pretending to be a real deck. Faithful complete-game acceptance is gated on the relevant manifest and rulings. Record publication rights separately from factual transcription; the public engine does not automatically grant permission to redistribute source images or game content. Retain the simplified map and original generic markers for the first interface.
