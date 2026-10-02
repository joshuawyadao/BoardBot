# Local saves and recovery

The solo game keeps a library of independent games in IndexedDB, database `boardbot-game-library`, on this browser origin. Each game has its own current save and previous successful save. The optional synthetic sample remains unsaved. Use the same browser profile and URL, including the port, to find the same saved game. The local server must still be running to open the app.

Every legal command is resolved once, then saved atomically before the updated board or pending choice is shown. Each game snapshot references an exact private data version and contains random-generator state, all resource locations and decks, active effects, pending choices, continuation queue, and command/event history. No save or game data is uploaded. Browser storage and exported backups contain private game content; they are not public project artifacts.

After a reload, choose **Resume saved game** on the game you want. **Saved games** returns to the library. **New game → Hero → Start game** prepares and saves a new setup without replacing another adventure; cancelling Hero selection creates no save. **Export backup** downloads `boardbot-save.json`; **Import game data or backup** can import it as a separate game on this or another local instance. Backups remain self-contained and include their exact private components. Clearing browser site data removes local saves, so retain a backup when moving browser profiles or changing origins.

Choose **Delete** on an adventure to open a confirmation with its Hero, turn, and save time. Cancel or Escape leaves it unchanged. **Delete game** removes that game's current and previous recovery records together; the list updates only after the transaction succeeds. There is no in-app undo. Other games, cached base components, and already exported backups remain available, including when the last adventure is deleted.

If another tab changes the game after the list was shown, deletion is rejected. The list refreshes; cancel the confirmation, review the game, and select Delete again if still intended. A storage failure keeps the save and leaves confirmation available to retry or cancel. A tab already playing a deleted adventure cannot silently recreate it: its next save fails, with an option to export the unsaved result as a backup before reloading.

If a write fails, play pauses on the last saved board. **Retry saving** writes the same already-resolved result without drawing or rolling again. The last successful save remains intact. **Export backup** includes the pending result, when it can be serialized. A stale tab cannot overwrite newer progress: load the latest saved game explicitly or export the unsaved result first. Closing a tab before a failed write is retried leaves only the last successful local save; it does not save the pending action.

**Recovery options → Recover previous save** explicitly restores the preceding successful record, which may be one action behind. It replaces only the selected game’s current record through the same atomic boundary. A malformed or incompatible payload never replaces the active game. A damaged record is reported while a valid previous record remains available for explicit recovery. Unavailable storage or damage that cannot be compared safely blocks solo play; the sample remains usable through Try sample table.

## Base game data and migration

At startup the local Vite server serves the ignored prepared file through a fixed, same-origin loopback endpoint. The app validates and caches it, so New Game is ready without a file picker on the owner’s setup. If the file is absent or unavailable, the app can use its cached components. A fresh browser without either source offers a one-time import. A valid newer prepared file becomes the default for new games only.

The library stores data by its canonical SHA-256 identity in a separate `data` store. The `games` store holds each game’s independent current/previous snapshot, version fields, data reference, save timestamp, and concurrency token. `settings` holds the default data reference and migration marker. Ordinary actions update only that game’s snapshots; identical base components are not written again. Missing or damaged cached content can be restored from an exact validated copy. Existing games remain pinned to their original content version even when the default changes.

Deletion compares the listed version of both save-slot tokens inside one `games` transaction, then removes just that record. It does not collect unused data versions or clear settings. The legacy migration marker remains set, so deleting a migrated game does not bring it back on the next visit. The retained old database remains untouched, as with other library operations; deletion is not secure erasure of all historical browser data.

The earlier `boardbot-local-game` database is copied once into a game named by its Hero, with internal ID `legacy`. Both current and previous records are preserved where recoverable. The old database is retained; future opens never import it again or overwrite newer library progress. Resume still performs complete replay validation before play. An incompatible current save leaves recovery or backup import available.

These saves are browser records, not automatically written Mac-folder files. Clearing site storage removes the library and cached components. Portable JSON backups remain the way to retain copies outside browser storage.

## Compatibility and validation

Save format 1 uses engine version `solo-1`, alongside the state's schema, rules interpretation, data fingerprint, and random-generator version. Deterministic rule changes require an explicit version boundary: preserve the old rule path for supported saves, or introduce a deliberate migration/new engine version. Never silently replay old commands under changed semantics.

The engine supports interpretation v3 (`boardbot-dnd-2026-09-30-v3`) and v4 (`boardbot-dnd-2026-10-02-v4`). V4 stacks separate Slowing Ray penalties; v3 retains the earlier one-action cap both during replay and continued play. Earlier games expose an **Earlier rules** explanation in the save controls. Their data, commands, pending outcomes, and save format are unchanged.

Every **New game** uses a cloned version of the selected components with the current v4 interpretation, even when prepared, cached, imported, or backup-derived base data is still v3. Only the new adventure receives that data identity. Existing records and cached source components are not rewritten. Importing a backup preserves that backup's rules; starting a separate new game from its components uses v4. Unknown interpretation versions remain unsupported.

Loading validates the embedded data, bounds file size and physical piece counts, reconstructs setup from the seed and selected Hero, and replays each command through the ordinary engine. It then compares the entire reconstructed snapshot with the saved snapshot, including hidden state and pending outcomes. Only the reconstructed state becomes playable. Saved task objects are never executed directly. A checksum alone would not establish legality or compatibility. Replay validates internal consistency, not ownership of imported content or its authenticity as printed game data.

Files are limited to 8 MiB of serialized text and 5,000 commands. This supports ordinary scoped games while bounding recovery work; saves above these limits are rejected. Browser quota, storage permissions, and available disk space can still prevent writes. The UI reports those failures rather than claiming that progress was saved.

Recovery and backup tests use synthetic data. Full owner play acceptance remains separate from automated replay and browser checks.
