import { describe, expect, it } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, dispatchGame } from '../engine/horrifiedGame';
import type { FighterGame, GameCommand, HeroAction } from '../engine/horrifiedRuntime';
import type { GameData } from '../data/gameData';
import { decodeGameSave, encodeGameSave, ENGINE_VERSION, SAVE_VERSION, validateLocalGameData } from './gameSave';

function commit(data: GameData, game: FighterGame, action: HeroAction): FighterGame {
  const command: GameCommand = { id: `save-test-${game.revision}`, revision: game.revision, actorSeatId: 'solo', action };
  const result = dispatchGame(data, game, command);
  expect(result.error).toBeNull();
  return result.state;
}

function chooseFirst(data: GameData, game: FighterGame): FighterGame {
  const choice = game.pending!;
  const pass = choice.options.find(option => option.id === 'pass');
  const selected = pass ? ['pass'] : choice.options.slice(0, choice.min).map(option => option.id);
  return commit(data, game, { kind: 'choose', choiceId: choice.id, selected });
}

describe('local game save replay', () => {
  it('restores a completed action with bound data and continues identically to uninterrupted play', async () => {
    const data = fighterFixture();
    let original = await createFighterGame(data, 17);
    original = commit(data, original, { kind: 'move', destination: 'a', escorts: [] });
    const saved = await decodeGameSave(encodeGameSave(data, original));
    expect(saved.game).toEqual(original);
    expect(saved.data).toEqual(data);
    const next: GameCommand = { id: 'after-restore', revision: original.revision, actorSeatId: 'solo', action: { kind: 'end-phase' } };
    const continued = dispatchGame(saved.data, saved.game, next);
    const uninterrupted = dispatchGame(data, original, next);
    expect(continued.error).toBeNull();
    expect(continued.state).toEqual(uninterrupted.state);
    expect(continued.state.random).toEqual(uninterrupted.state.random);
    const repeated = dispatchGame(saved.data, continued.state, next);
    expect(repeated.error).toMatch(/already applied|duplicate|stale/i);
    expect(repeated.state).toBe(continued.state);
  });

  it('restores a pending d20 response without another roll and resumes the exact choice', async () => {
    const data = fighterFixture();
    let original = await createFighterGame(data, 2);
    original = commit(data, original, { kind: 'special' });
    expect(original.pending?.title).toMatch(/roll|response|perk/i);
    const saved = await decodeGameSave(encodeGameSave(data, original));
    expect(saved.game).toEqual(original);
    expect(saved.game.roll).toEqual(original.roll);
    const resumed = chooseFirst(saved.data, saved.game);
    const uninterrupted = chooseFirst(data, original);
    expect(resumed).toEqual(uninterrupted);
    expect(resumed.random).toEqual(uninterrupted.random);
  });

  it('restores a pending Monster-card choice and retains its card and continuation', async () => {
    const data = fighterFixture();
    data.monsterCards[0].printedId = 314;
    data.monsterCards[0].name = 'Synthetic item trial';
    data.items.forEach(item => { item.locations = ['b', 'b']; });
    let original = await createFighterGame(data, 41);
    original = commit(data, original, { kind: 'pick-up', items: [...original.boardItems.b] });
    original = commit(data, original, { kind: 'end-phase' });
    expect(original.phase).toBe('monster');
    expect(original.pending?.title).toMatch(/Items for the trial/);
    expect(original.currentCard).not.toBeNull();
    const saved = await decodeGameSave(encodeGameSave(data, original));
    expect(saved.game).toEqual(original);
    const resumed = chooseFirst(saved.data, saved.game);
    const uninterrupted = chooseFirst(data, original);
    expect(resumed).toEqual(uninterrupted);
    expect(resumed.random).toEqual(uninterrupted.random);
  });

  it('rejects malformed, incompatible, and tampered snapshots before exposing a game', async () => {
    const data = fighterFixture();
    const game = commit(data, await createFighterGame(data, 17), { kind: 'move', destination: 'a', escorts: [] });
    const valid = JSON.parse(encodeGameSave(data, game));
    const changed = (edit: (envelope: typeof valid) => void) => {
      const envelope = structuredClone(valid); edit(envelope); return JSON.stringify(envelope);
    };
    const invalid = [
      '{broken json',
      changed(envelope => { envelope.saveVersion = SAVE_VERSION + 1; }),
      changed(envelope => { envelope.engineVersion = `${ENGINE_VERSION}-unknown`; }),
      changed(envelope => { envelope.state.seed += 1; }),
      changed(envelope => { envelope.state.dataIdentity = 'sha256:wrong'; }),
      changed(envelope => { envelope.state.commands[0].revision = 99; }),
      changed(envelope => { envelope.state.terror += 1; }),
      changed(envelope => { envelope.state.queue.push({ kind: 'unknown:continuation' }); }),
    ];
    for (const payload of invalid) await expect(decodeGameSave(payload)).rejects.toThrow();
  });

  it('rejects unbounded synthetic card, Perk, and Lair quantities before setup expansion', async () => {
    const baseline = fighterFixture();
    const game = await createFighterGame(baseline, 17);
    for (const enlarge of [
      (data: GameData) => { data.monsterCards[0].quantity = 1_000_000_000; },
      (data: GameData) => { data.perks[0].quantity = 1_000_000_000; },
      (data: GameData) => { data.lairTokens.faces[0].quantity = 1_000_000_000; },
    ]) {
      const data = fighterFixture();
      enlarge(data);
      expect(() => validateLocalGameData(data)).toThrow(/supported local game size/i);
      await expect(decodeGameSave(encodeGameSave(data, game))).rejects.toThrow(/supported local game size/i);
    }
  });
});
