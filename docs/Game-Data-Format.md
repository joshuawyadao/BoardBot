# Local game data

The data preparation tool converts the private, owner-verified component record into a versioned JSON reference. It does not implement card effects, initialize a Horrified session, or make the sample app playable. A fresh clone can run the synthetic prototype and public tests without the private packet.

## Prepare the reference

Use Node 26 and restore the ignored packet described in [Game-Data-Checklist.md](Game-Data-Checklist.md). From the repository root, run:

```sh
npm run data:prepare
```

The command verifies the packet manifest, hashes of the record and both photos, the canonical version-6 record fingerprint, and the normalized data structure. Only after those checks succeed does it atomically replace `local-data/horrified-dnd/game-data.json`. Missing files, unexpected record versions, hash mismatches, or invalid data fail without replacing a previously prepared reference. The original record and photos are retained.

The reference stays ignored and is not bundled by Vite or served by the sample app. It contains component descriptions that are private source material. Do not commit, upload, or copy it into a public asset directory. A future runtime import must validate the format and separately establish which effects the engine supports. Publication rights remain a separate gate.

## Version and evidence

`src/data/gameData.ts` defines the format, validator, and conversion boundary. The schema version identifies the JSON shape. The interpretation version identifies BoardBot's accepted rules choices. Source-record version, fingerprint, and component pointers make fields traceable without carrying historical private machine paths into the normalized reference.

The schema distinguishes owner-verified content from synthetic fixtures. Capability fields explicitly leave setup verification and a playable rules engine unavailable. Effect descriptions are reference prose, never executable code. A successful conversion verifies data consistency; it does not prove gameplay correctness, validate publication rights, or authenticate arbitrary JSON presented later by a user.

## Board and quantities

Numbered locations, unnumbered spaces, and teleportation circles have stable IDs. Edges distinguish ordinary connections, paired passages, and circle links. The two uncertain city shortcuts are omitted under the accepted interpretation; the ordinary connections are cross-checked against the verified packet. The printed Dragon restriction is stored separately and must not exclude the selected Beholder or Displacer Beast.

Keep quantities and destinations attached to item types and card faces. Expansion into physical token/card instances belongs to session setup, with one stable ID per instance. Do not lose duplicate cards, merge same-named item variants, or invent destinations. Hidden deck order and unrevealed token faces belong to private session state, not a future player's observable view.

## Current engine building blocks

`src/engine/decisionPolicies.ts` implements the approved effective d20 bounds and response ordering as pure functions. It preserves the base roll, modifiers, uncapped total, and effective result. The calling engine determines relevant legal responses and must commit an accepted effect once; the policy helper alone is not a game session.

`src/engine/gamePrimitives.ts` provides deterministic random-state operations and graph traversal. Route ties remain available for player choice. These helpers do not authorize game actions or establish initial monster positions.

The canonical [rules reference](Rules-Reference.md) records the remaining setup dependency and accepted conventions. Before gameplay integration, tests must cover every implemented effect, legal command, ownership boundary, and save/replay transition. See [Verification.md](Verification.md).
