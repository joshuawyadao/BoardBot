# Local saves and recovery

The solo game keeps a library of independent games in IndexedDB, database `boardbot-game-library`, on this browser origin. Each game has its own current save and previous successful save. The optional synthetic sample remains unsaved. Use the same browser profile and URL, including the port, to find the same saved game. The local server must still be running to open the app.

Every legal command is resolved once, then saved atomically before the updated board or pending choice is shown. Each game snapshot references an exact private data version and contains random-generator state, all resource locations and decks, active effects, pending choices, continuation queue, and command/event history. No save or game data is uploaded. Browser storage and exported backups contain private game content; they are not public project artifacts.

After a reload, choose **Resume saved game** on the game you want. **Saved games** returns to the library. **New game → Hero → Start game** prepares and saves a new setup without replacing another adventure; cancelling Hero selection creates no save. **Export backup** downloads `boardbot-save.json`; **Import game data or backup** can import it as a separate game on this or another local instance. Backups remain self-contained and include their exact private components. Clearing browser site data removes local saves, so retain a backup when moving browser profiles or changing origins.

If a write fails, play pauses on the last saved board. **Retry saving** writes the same already-resolved result without drawing or rolling again. The last successful save remains intact. **Export backup** includes the pending result, when it can be serialized. A stale tab cannot overwrite newer progress: load the latest saved game explicitly or export the unsaved result first. Closing a tab before a failed write is retried leaves only the last successful local save; it does not save the pending action.

**Recovery options → Recover previous save** explicitly restores the preceding successful record, which may be one action behind. It replaces only the selected game’s current record through the same atomic boundary. A malformed or incompatible payload never replaces the active game. A damaged record is reported while a valid previous record remains available for explicit recovery. Unavailable storage or damage that cannot be compared safely blocks solo play; the sample remains usable through Try sample table.

## Base game data and migration

At startup the local Vite server serves the ignored prepared file through a fixed, same-origin loopback endpoint. The app validates and caches it, so New Game is ready without a file picker on the owner’s setup. If the file is absent or unavailable, the app can use its cached components. A fresh browser without either source offers a one-time import. A valid newer prepared file becomes the default for new games only.

The library stores data by its canonical SHA-256 identity in a separate `data` store. The `games` store holds each game’s independent current/previous snapshot, version fields, data reference, save timestamp, and concurrency token. `settings` holds the default data reference and migration marker. Ordinary actions update only that game’s snapshots; identical base components are not written again. Missing or damaged cached content can be restored from an exact validated copy. Existing games remain pinned to their original content version even when the default changes.

The earlier `boardbot-local-game` database is copied once into a game named by its Hero, with internal ID `legacy`. Both current and previous records are preserved where recoverable. The old database is retained; future opens never import it again or overwrite newer library progress. Resume still performs complete replay validation before play. An incompatible current save leaves recovery or backup import available.

These saves are browser records, not automatically written Mac-folder files. Clearing site storage removes the library and cached components. Portable JSON backups remain the way to retain copies outside browser storage.

## Compatibility and validation

Save format 1 uses engine version `solo-1`, alongside the state's schema, rules interpretation, data fingerprint, and random-generator version. Changing deterministic rules or state shape requires a deliberate save-version migration or a new engine version; do not silently replay old commands under changed semantics.

Loading validates the embedded data, bounds file size and physical piece counts, reconstructs setup from the seed and selected Hero, and replays each command through the ordinary engine. It then compares the entire reconstructed snapshot with the saved snapshot, including hidden state and pending outcomes. Only the reconstructed state becomes playable. Saved task objects are never executed directly. A checksum alone would not establish legality or compatibility. Replay validates internal consistency, not ownership of imported content or its authenticity as printed game data.

Files are limited to 8 MiB of serialized text and 5,000 commands. This supports ordinary scoped games while bounding recovery work; saves above these limits are rejected. Browser quota, storage permissions, and available disk space can still prevent writes. The UI reports those failures rather than claiming that progress was saved.

Recovery and backup tests use synthetic data. Full owner play acceptance remains separate from automated replay and browser checks.
