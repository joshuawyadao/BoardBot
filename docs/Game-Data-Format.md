# Local game data

The data preparation tool converts the private, owner-verified component record and separately photographed setup instructions into a versioned JSON reference. The preparation tool itself does not execute effects. The local app loads its output automatically at startup, caches it separately from saved games, and executes the selected solo game after Hero selection. A one-time local file picker remains available when the prepared file is absent. A fresh clone can run the synthetic prototype and public tests without the private packet.

## Durable private storage

Keep the owner's durable copy outside Git and disposable worktrees. The default is `~/Documents/BoardBot Private Data`, with owner-only directories (0700) and files (0600). Set `BOARDBOT_PRIVATE_HOME` to an absolute owner-controlled location to override it. The tools reject a store inside a Git checkout; do not point it at disposable or publicly shared storage. A folder on this Mac protects against worktree deletion, but still needs the owner's normal disk backup for device failure.

```sh
npm run data:init
npm run data:backup -- /path/to/horrified-dnd
npm run data:restore
npm run dev:private
```

`data:init` only creates the store; it cannot recover missing content. `data:backup` defaults to this checkout's `local-data/horrified-dnd` when no source is given. A directory source must contain the complete canonical version-6 packet and setup supplement. Only its six known evidence files are archived, after canonical fingerprint/setup verification; prepared components are regenerated from those exact bytes. Other source files are excluded.

A prepared `game-data.json` or exported `boardbot-save.json` can also be supplied to `data:backup`. The tool validates the embedded components and retains a byte-exact copy of a supplied save. It does not replay or certify that save's game history; the app performs replay validation on import. Recovering playable components from a save does not recover the original photos, verification record, or evidence manifest. Keep that distinction when recording provenance.

Archives live at `archives/<sha256>/` with an integrity manifest and a separate `latest.json` pointer. Existing snapshots are retained; new valid backups select the latest snapshot. Malformed inputs and corrupted archives fail without replacing that pointer. The store is private and never served by Vite or committed. The checksums detect accidental damage; they are not encryption or an independent authenticity signature.

`data:restore` verifies the selected archive before copying components and any archived evidence into this checkout's ignored `local-data/horrified-dnd`. It leaves saved-game exports in the archive for explicit import through the app. A matching local copy is accepted; a differing/incomplete existing copy blocks restoration without overwriting it. Back that copy up and move it aside intentionally before restoring. The tools reject symbolic-link inputs and output directories.

Use `npm run dev:private` in a fresh worktree to restore when an archive is available and start the ordinary development server. With no archive it reports the missing copy and still allows browser-cache/manual-import use. Corruption or conflicting local data stops startup for review. `npm run dev` remains available without this restoration step, including for isolated synthetic tests. None of these commands automatically exports future browser autosaves: use **Export backup** and archive the downloaded JSON to preserve later progress outside the browser.

## Recover before re-entering components

First open the original browser profile and exact URL (including host and port). Browser storage at `127.0.0.1:5173` is separate from `127.0.0.1:5174` and `localhost:5173`. Resume an existing adventure and choose **Export backup**, then archive that downloaded file with `data:backup`. The existing save includes its complete components. You do not need to re-enter cards if a valid cache, prepared file, or exported save is recoverable. If every such copy and the evidence packet is unavailable, reconstructing exact components becomes a real dependency; never substitute guessed card data.

## Prepare the reference

Use Node 26 and restore the ignored packet described in [Game-Data-Checklist.md](Game-Data-Checklist.md). From the repository root, run:

```sh
npm run data:prepare
```

The command verifies the packet manifest, hashes of the record and both photos, the canonical version-6 record fingerprint, the separate setup supplement and its photo hash, and the normalized data structure. Only after those checks succeed does it atomically replace `local-data/horrified-dnd/game-data.json`. Missing files, unexpected record versions, hash mismatches, or invalid data fail without replacing a previously prepared reference. The original record and photos are retained.

The reference stays ignored and is not bundled into Vite build assets. A local development/preview middleware serves only this validated file through `GET /__boardbot/local-game-data`, with an 8 MiB limit, no-store headers, and same-origin loopback restrictions. Direct access to the private `local-data` directory is blocked. Static deployments without this middleware use cached or manually imported data. It contains component descriptions that are private source material. Do not commit, upload, or copy it into a public asset directory. The startup and manual import paths validate the format; the separate engine determines supported effects. Publication rights remain a separate gate.

The executable local-game boundary accepts Monster-card printed IDs 300–321, the event catalog implemented by the solo engine. Citizen events 308–311 and 316–321 also require a valid starting location and a card name matching exactly one Citizen name. These checks apply to imported components, cached components, and data embedded in save backups. Owner-verified references must satisfy the same checks when prepared. A synthetic reference without gameplay support can retain arbitrary IDs and omit event-specific fields for format tests.

## Version and evidence

`src/data/gameData.ts` defines the format, validator, and conversion boundary. The schema version identifies the JSON shape. The interpretation version identifies BoardBot's accepted rules choices. Source-record version, fingerprint, and component pointers make fields traceable without carrying historical private machine paths into the normalized reference.

The current interpretation is v4 (`boardbot-dnd-2026-10-02-v4`), adding owner-approved cumulative Slowing Ray penalties. Preparation labels new output with that interpretation. The app can use supported v3 components for a new game by cloning them with the current interpretation; it does not rewrite the private packet or cached original. Existing v3 saves keep their original data and cap for exact replay. See [Local-Saves.md](Local-Saves.md).

Schema version 2 distinguishes owner-verified content from synthetic fixtures and records the independently photographed setup facts with their own provenance. Setup locations reference the board's numbered Monster start markers, not their Frenzy order. The setup capability is true only when its required fields and references validate; the data-only `playableRulesEngine` capability remains false because a reference file cannot establish executable gameplay support. The separate engine supplies all five base Hero behaviors. Effect descriptions are reference prose, never executable code. A successful conversion verifies data consistency; it does not prove gameplay correctness, validate publication rights, or authenticate arbitrary JSON presented later by a user.

## Board and quantities

Numbered locations, unnumbered spaces, and teleportation circles have stable IDs. Edges distinguish ordinary connections, paired passages, and circle links. The two uncertain city shortcuts are omitted under the accepted interpretation; the ordinary connections are cross-checked against the verified packet. The printed Dragon restriction is stored separately and must not exclude the selected Beholder or Displacer Beast.

Keep quantities and destinations attached to item types and card faces. Expansion into physical token/card instances belongs to session setup, with one stable ID per instance. Do not lose duplicate cards, merge same-named item variants, or invent destinations. Hidden deck order and unrevealed token faces belong to private session state, not a future player's observable view.

## Current engine building blocks

`src/engine/decisionPolicies.ts` implements the approved effective d20 bounds and response ordering as pure functions. It preserves the base roll, modifiers, uncapped total, and effective result. The calling engine determines relevant legal responses and must commit an accepted effect once; the policy helper alone is not a game session.

`src/engine/gamePrimitives.ts` provides deterministic random-state operations and graph traversal. Route ties remain available for player choice. These helpers do not authorize game actions or establish initial monster positions.

`src/engine/horrifiedState.ts` creates an isolated solo state for the selected base Hero from validated setup data. It assigns stable physical instance IDs, shuffles Items/cards/Lairs deterministically, places twelve Items, deals one Perk, sets solo Terror and Frenzy, and separates waiting Citizens from the board. Its explicit player projection hides future draws, random state, and unrevealed Lair identities. Tests cover quantities, original token destinations, replay, supply exhaustion, and rejection of unsupported setup. No actions, Monster Phase, session storage, or playable interface are supplied by this initializer.

The canonical [rules reference](Rules-Reference.md) records the recovered setup evidence and accepted conventions. Fighter command, effect, monster, and deterministic replay tests now accompany the integration. Save/recovery transitions and all five Heroes now have executable coverage. Full human play acceptance is still required. Imported data is stored privately by exact version, separately from each game’s progress; see [Local-Saves.md](Local-Saves.md). See [Verification.md](Verification.md).
