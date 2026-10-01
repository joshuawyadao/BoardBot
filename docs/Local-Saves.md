# Local saves and recovery

The solo game keeps one current save and the previous successful save in IndexedDB, database `boardbot-local-game`, on this browser origin. The default sample remains unsaved. Use the same browser profile and URL, including the port, to find the same saved game. The local server must still be running to open the app.

Every legal command is resolved once, then saved atomically before the updated board or pending choice is shown. The save contains the imported private data, random-generator state, all resource locations and decks, active effects, pending choices, continuation queue, and command/event history. No save or game data is uploaded. Browser storage and exported backups contain private game content; they are not public project artifacts.

After a reload, choose **Resume saved game**. Returning to the sample leaves the saved game intact. Importing new game data or a backup prepares it first; if a save already exists, **Replace saved game** is required before overwriting it. **Export backup** downloads `boardbot-save.json`; import it through the setup panel on another local instance if needed. Clearing browser site data removes local saves, so retain a backup when moving browser profiles or changing origins.

If a write fails, play pauses on the last saved board. **Retry saving** writes the same already-resolved result without drawing or rolling again. The last successful save remains intact. **Export backup** includes the pending result, when it can be serialized. A stale tab cannot overwrite newer progress: load the latest saved game explicitly or export the unsaved result first. Closing a tab before a failed write is retried leaves only the last successful local save; it does not save the pending action.

**Recovery options → Recover previous save** explicitly restores the preceding successful record, which may be one action behind. It replaces the current record through the same atomic boundary. A malformed or incompatible payload never replaces the active game. A damaged record is reported while a valid previous record remains available for explicit recovery. Unavailable storage or damage that cannot be compared safely blocks solo play; the sample remains usable.

## Compatibility and validation

Save format 1 uses engine version `solo-1`, alongside the state's schema, rules interpretation, data fingerprint, and random-generator version. Changing deterministic rules or state shape requires a deliberate save-version migration or a new engine version; do not silently replay old commands under changed semantics.

Loading validates the embedded data, bounds file size and physical piece counts, reconstructs setup from the seed and selected Hero, and replays each command through the ordinary engine. It then compares the entire reconstructed snapshot with the saved snapshot, including hidden state and pending outcomes. Only the reconstructed state becomes playable. Saved task objects are never executed directly. A checksum alone would not establish legality or compatibility. Replay validates internal consistency, not ownership of imported content or its authenticity as printed game data.

Files are limited to 8 MiB of serialized text and 5,000 commands. This supports ordinary scoped games while bounding recovery work; saves above these limits are rejected. Browser quota, storage permissions, and available disk space can still prevent writes. The UI reports those failures rather than claiming that progress was saved.

Recovery and backup tests use synthetic data. Full owner play acceptance remains separate from automated replay and browser checks.
