# Game data and rules verification

**Status: owner verification completed for the first-milestone components on September 29, 2026; research and working interpretations consolidated September 30, 2026.** This is evidence of component contents, not a tested rules engine or permission to publish game assets.

Scope: original Horrified: Dungeons & Dragons, the five base Heroes, Beholder and Displacer Beast, and their shared board/cards/tokens. Red Dragon and Mimic-specific gameplay, promotional Heroes, and Ravenloft components are outside this verification scope.

## Read this before repeating research

1. Use this register for physical coverage and evidence access.
2. Use [Rules-Reference.md](Rules-Reference.md) for published findings, reported clarifications, accepted working interpretations, source links, and remaining questions. It is the canonical rules research memory; do not repeat source searches just because a temporary task plan has changed.
3. Use the private local evidence packet for exact component fields. Its data has been confirmed by the owner; distinguish printed facts from interpretive decisions.
4. Reopen research only for a documented gap, a conflicting observation, a different edition, or new authoritative evidence. No additional owner photos or readouts are currently requested.

## Confirmed component coverage

| Component | Confirmed coverage | Quantity / boundary |
| --- | --- | --- |
| Perk cards | Effects and duplicate counts | 20 cards, 10 faces |
| Item tokens | Names, colors, strengths, destinations, duplicates | 60 tokens, 30 types; two per type; 20 per color |
| Monster cards | Gameplay events, Item draws, activation icon order, movement, dice counts, duplicates | 30 cards, 22 faces; descriptive lore excluded |
| Citizens | Names and safe destinations; Monster-card placement references checked | 10 |
| Base Hero tiles | Bard, Cleric, Fighter, Rogue, Wizard: starts, action counts, all ability outcomes | Five; four ordinary actions each before effects |
| Monster dice | Each die's face distribution | Three dice; each has three HIT, one POW, two blank faces |
| d20 | Values | One die, 1-20 |
| Beholder | Mat and full eye-ray reference; original punctuation retained | Ten damage markers |
| Displacer Beast | Mat symbols, power, grid, advance and defeat requirements | Targeting interpretation is separate |
| Lair tokens | All faces and shared reverse; instructions checked | Four: Vault, Red Dragon's Hoard, two D&D-logo faces |
| Tracking markers | Presence and identity | One Terror and one Frenzy marker |
| Board | Twenty numbered locations/names, special spaces, starts, lairs, track, passage labels, 28 clear ordinary connections | Two potential additional city shortcuts remain interpretations |

Perk multiplicities, retained as a factual cross-check: Durnan 2; Mordenkainen 2; Jarlaxle Baenre 1; Laeral Silverhand 2; Mystra 1; The Blackstaff 2; Drizzt Do'Urden 4; Skeemo Weirdbottle 2; Ott Steeltoes 2; Renaer Neverember 2. Total: 20.

The board photo supports the Hall of Heroes-to-Entry Well and Stairway-to-Entry Well corridors separately; it does not establish a direct Hall-to-Stairway connection. The two remaining city ambiguities are House of Wonder-to-Castle Waterdeep (3-4) and Trollskull Alley-to-Yawning Portal Exterior (5-7). Their chosen working routes and uncertainty live in the rules reference.

This is not a full-box accessory inventory. No claim is made that every miniature/base was counted, that excluded monsters were verified, or that every rule interpretation is official.

## Private local evidence packet

The working checkout contains an ignored `local-data/horrified-dnd/` packet:

| File | Purpose |
| --- | --- |
| `verification-record.json` | Exact owner-confirmed component fields, full earlier research history, source locators, and audits through record version 6 |
| `owner-board.jpg` | Owner board reference |
| `owner-perks-and-beholder-reverse.jpg` | Owner Perk faces and reverse eye-ray reference |
| `packet-manifest.json` | Capture date, record version, and SHA-256 fingerprints for the three files above |

The immutable imported record version is 6. Its SHA-256 at capture is `46ff404d179853f854dec0a8565139ec4455f8f60b7f41266cd4bbd16c97e853`. Older draft proposal/approval fields in that historical record are superseded by the accepted interpretations in `Rules-Reference.md`; never implement its earlier Perk-reshuffle proposal.

The packet contains legacy absolute and temporary reference paths. Use the packet's own two photo files and source URLs; a legacy path does not imply the file still exists. Not every research image/PDF was archived. The structured confirmations remain available without those transient files.

**Git does not back up this packet.** A fresh clone or another checkout receives the public research notes, not the raw component fields/photos. The original persistent source packet is also retained outside this worktree on the owner's machine. Before removing a worktree, verify that separate copy or preserve the local packet to an owner-controlled backup. Managed worktree snapshots do not preserve needed ignored files automatically.

To continue in another checkout, copy this private packet into the same ignored directory from an owner-controlled source and compare its manifest hashes and record version. Do not force-add it to Git. If unavailable, stop exact-data work at that dependency; do not fabricate a replacement deck or claim the public coverage table is a complete executable manifest.

## Publication boundary

Tracked material here consists of original project research notes, factual verification metadata, source links, and BoardBot interpretation decisions. Full commercial rules/component text, photos, scans, and private machine paths remain outside public history. No publisher permission or endorsement is asserted. BoardBot's MIT license applies to its original work; it does not license the referenced game content. See [CONTRIBUTING.md](../CONTRIBUTING.md).

Before packaging a public game-data manifest or redistributable assets, document provenance and publication rights for the proposed content. Physical ownership and accurate transcription do not satisfy that gate. A private reference packet is neither a public runtime dependency nor an implemented data importer.

## Remaining implementation gates

- Resolve the explicitly open rules boundaries in [Rules-Reference.md](Rules-Reference.md), notably Ott's out-of-range results and competing optional-response order, before implementing affected behavior.
- Translate confirmed component data into a reviewed, versioned representation with suitable provenance. Check every board edge and deck multiplicity against the packet, not the coverage totals alone.
- Record the accepted interpretation version in sessions/replays. Keep published findings, reported answers, and BoardBot choices distinguishable.
- Add source-linked engine tests and actual complete-game acceptance checks. Repository hygiene checks and synthetic engine/browser tests validate tooling and the invented sample turn, not Horrified component data, game balance, or human/bot multiplayer.

The [work plan](Work-Plan.md) still targets one human-controlled Hero first. The one-to-five-Hero consistency review in the rules reference preserves a later extension path without declaring multiplayer or strategic bots implemented.
