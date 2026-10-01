# Local game data

The data preparation tool converts the private, owner-verified component record and separately photographed setup instructions into a versioned JSON reference. The preparation tool itself does not execute effects. The separate Fighter engine can load its output through the local file picker and execute the selected solo game. A fresh clone can run the synthetic prototype and public tests without the private packet.

## Prepare the reference

Use Node 26 and restore the ignored packet described in [Game-Data-Checklist.md](Game-Data-Checklist.md). From the repository root, run:

```sh
npm run data:prepare
```

The command verifies the packet manifest, hashes of the record and both photos, the canonical version-6 record fingerprint, the separate setup supplement and its photo hash, and the normalized data structure. Only after those checks succeed does it atomically replace `local-data/horrified-dnd/game-data.json`. Missing files, unexpected record versions, hash mismatches, or invalid data fail without replacing a previously prepared reference. The original record and photos are retained.

The reference stays ignored and is not bundled by Vite or served by the sample app. It contains component descriptions that are private source material. Do not commit, upload, or copy it into a public asset directory. A future runtime import must validate the format and separately establish which effects the engine supports. Publication rights remain a separate gate.

## Version and evidence

`src/data/gameData.ts` defines the format, validator, and conversion boundary. The schema version identifies the JSON shape. The interpretation version identifies BoardBot's accepted rules choices. Source-record version, fingerprint, and component pointers make fields traceable without carrying historical private machine paths into the normalized reference.

Schema version 2 distinguishes owner-verified content from synthetic fixtures and records the independently photographed setup facts with their own provenance. Setup locations reference the board's numbered Monster start markers, not their Frenzy order. The setup capability is true only when its required fields and references validate; the data-only `playableRulesEngine` capability remains false because a reference file cannot establish executable gameplay support. The separate engine supplies Fighter behavior. Effect descriptions are reference prose, never executable code. A successful conversion verifies data consistency; it does not prove gameplay correctness, validate publication rights, or authenticate arbitrary JSON presented later by a user.

## Board and quantities

Numbered locations, unnumbered spaces, and teleportation circles have stable IDs. Edges distinguish ordinary connections, paired passages, and circle links. The two uncertain city shortcuts are omitted under the accepted interpretation; the ordinary connections are cross-checked against the verified packet. The printed Dragon restriction is stored separately and must not exclude the selected Beholder or Displacer Beast.

Keep quantities and destinations attached to item types and card faces. Expansion into physical token/card instances belongs to session setup, with one stable ID per instance. Do not lose duplicate cards, merge same-named item variants, or invent destinations. Hidden deck order and unrevealed token faces belong to private session state, not a future player's observable view.

## Current engine building blocks

`src/engine/decisionPolicies.ts` implements the approved effective d20 bounds and response ordering as pure functions. It preserves the base roll, modifiers, uncapped total, and effective result. The calling engine determines relevant legal responses and must commit an accepted effect once; the policy helper alone is not a game session.

`src/engine/gamePrimitives.ts` provides deterministic random-state operations and graph traversal. Route ties remain available for player choice. These helpers do not authorize game actions or establish initial monster positions.

`src/engine/horrifiedState.ts` creates an isolated solo Fighter state from validated setup data. It assigns stable physical instance IDs, shuffles Items/cards/Lairs deterministically, places twelve Items, deals one Perk, sets solo Terror and Frenzy, and separates waiting Citizens from the board. Its explicit player projection hides future draws, random state, and unrevealed Lair identities. Tests cover quantities, original token destinations, replay, supply exhaustion, and rejection of unsupported setup. No actions, Monster Phase, session storage, or playable interface are supplied by this initializer.

The canonical [rules reference](Rules-Reference.md) records the recovered setup evidence and accepted conventions. Fighter command, effect, monster, and deterministic replay tests now accompany the integration. Save/recovery transitions and the remaining four Heroes still require implementation and acceptance. See [Verification.md](Verification.md).
