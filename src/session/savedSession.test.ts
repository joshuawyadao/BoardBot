import { describe, expect, it, vi } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, dispatchGame } from '../engine/horrifiedGame';
import type { GameCommand } from '../engine/horrifiedRuntime';
import { decodeGameSave, encodeGameSave } from './gameSave';
import type { LocalSaveStore, StoredSave } from './localSaveStore';
import { SavedSession } from './savedSession';

function move(revision: number): GameCommand {
  return { id: `move-${revision}`, revision, actorSeatId: 'solo', action: { kind: 'move', destination: 'a', escorts: [] } };
}

function record(payload: string, token = 'token-0'): StoredSave {
  return { token, savedAt: 1, payload };
}

describe('saved session write boundary', () => {
  it('publishes a committed action only after storage completes and blocks another command while writing', async () => {
    const data = fighterFixture();
    const initial = await createFighterGame(data, 17);
    let complete!: (saved: StoredSave) => void;
    const write = vi.fn((_payload: string, _token: string | null) => new Promise<StoredSave>(resolve => { complete = resolve; }));
    const store: LocalSaveStore = { read: async () => ({ current: null, previous: null }), write, close() {} };
    const session = new SavedSession(data, initial, store, record(encodeGameSave(data, initial)));
    const saving = session.submit(move(initial.revision));
    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][1]).toBe('token-0');
    expect(session.game).toBe(initial);
    expect(session.needsSave).toBe(true);
    await expect(session.submit(move(initial.revision))).rejects.toMatchObject({ message: expect.stringMatching(/pending|progress/i) });
    await expect(session.retry()).rejects.toThrow(/already in progress/i);
    const candidate = await decodeGameSave(write.mock.calls[0][0]);
    expect(candidate.game.revision).toBe(initial.revision + 1);
    complete(record(write.mock.calls[0][0], 'token-1'));
    await saving;
    expect(session.game).toEqual(candidate.game);
    expect(session.record.token).toBe('token-1');
    expect(session.needsSave).toBe(false);
  });

  it('freezes the old visible state after failure and retries exactly the same resolved result', async () => {
    const data = fighterFixture();
    const initial = await createFighterGame(data, 2);
    const old = record(encodeGameSave(data, initial));
    const written: { payload: string; expectedToken: string | null }[] = [];
    let attempt = 0;
    const store: LocalSaveStore = {
      read: async () => ({ current: old, previous: null }),
      write: async (payload, expectedToken) => {
        written.push({ payload, expectedToken });
        if (++attempt === 1) throw new Error('Disk full');
        return record(payload, 'token-1');
      },
      close() {},
    };
    const session = new SavedSession(data, initial, store, old);
    const command: GameCommand = { id: 'special-0', revision: 0, actorSeatId: 'solo', action: { kind: 'special' } };
    const uninterrupted = dispatchGame(data, initial, command);
    expect(uninterrupted.error).toBeNull();
    await expect(session.submit(command)).rejects.toThrow('Disk full');
    expect(session.game).toBe(initial);
    expect(session.record).toBe(old);
    expect(session.needsSave).toBe(true);
    expect(session.exportBackup()).toBe(written[0].payload);
    await expect(session.submit(command)).rejects.toThrow(/pending result/i);
    await session.retry();
    expect(written).toHaveLength(2);
    expect(written[1]).toEqual(written[0]);
    expect(session.game).toEqual(uninterrupted.state);
    expect(session.game.random).toEqual(uninterrupted.state.random);
    expect(session.record.token).toBe('token-1');
    expect(session.needsSave).toBe(false);
  });

  it('keeps existing progress when a stale tab loses the storage token race', async () => {
    const data = fighterFixture();
    const initial = await createFighterGame(data, 17);
    const old = record(encodeGameSave(data, initial));
    const write = vi.fn(async (_payload: string, _expectedToken: string | null): Promise<StoredSave> => {
      throw new Error('This game has a newer save in another tab.');
    });
    const session = new SavedSession(data, initial,
      { read: async () => ({ current: old, previous: null }), write, close() {} }, old);
    await expect(session.submit(move(0))).rejects.toThrow(/newer save in another tab/i);
    expect(session.game).toBe(initial);
    expect(session.record).toBe(old);
    expect(session.needsSave).toBe(true);
    await expect(session.submit(move(0))).rejects.toThrow(/pending result/i);
    expect(write).toHaveBeenCalledTimes(1);
  });
});
