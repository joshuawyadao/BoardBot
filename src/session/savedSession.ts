import type { GameData } from '../data/gameData';
import { dispatchGame } from '../engine/horrifiedGame';
import type { FighterGame, GameCommand } from '../engine/horrifiedRuntime';
import { encodeGameSave } from './gameSave';
import type { LocalSaveStore, StoredSave } from './localSaveStore';

/** A failed write retains the exact already-resolved candidate for retry, without another roll. */
export class SavedSession {
  private pending: { game: FighterGame; payload: string } | null = null;
  private writing = false;
  constructor(readonly data: GameData, private current: FighterGame, private store: LocalSaveStore, private saved: StoredSave) {}
  get game() { return this.current; }
  get record() { return this.saved; }
  get needsSave() { return this.pending !== null; }

  async submit(command: GameCommand): Promise<void> {
    if (this.writing || this.pending) throw new Error('Save the pending result before taking another action.');
    const result = dispatchGame(this.data, this.current, command);
    if (result.error) throw new Error(result.error);
    // Retain the committed state even if serialization itself fails.
    this.pending = { game: result.state, payload: '' };
    await this.retry();
  }

  async retry(): Promise<void> {
    if (this.writing) throw new Error('A save is already in progress.');
    if (!this.pending) return;
    this.writing = true;
    try {
      const pending = this.pending;
      pending.payload ||= encodeGameSave(this.data, pending.game);
      const saved = await this.store.write(pending.payload, this.saved.token);
      this.saved = saved;
      this.current = pending.game;
      this.pending = null;
    } finally { this.writing = false; }
  }

  exportBackup(): string { return encodeGameSave(this.data, this.pending?.game ?? this.current); }
}
