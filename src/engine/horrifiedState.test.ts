import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { setupFixture } from './fixtures/setupFixture';
import { createHorrifiedGame, dataIdentity, drawBoardItems, drawItem, gainPerk, projectGame } from './horrifiedState';

describe('solo setup and private state (official rules pp. 4, 7; verified setup supplement)', () => {
  it('fingerprints actual data independently of property order and claimed provenance', async () => {
    const data = setupFixture();
    const reordered = Object.fromEntries(Object.entries(data).reverse()) as unknown as GameData;
    expect(await dataIdentity(reordered)).toBe(await dataIdentity(data));
    const changed = structuredClone(data); changed.items[0].locations.reverse();
    expect(changed.provenance).toEqual(data.provenance);
    expect(await dataIdentity(changed)).not.toBe(await dataIdentity(data));
    const starting = createHorrifiedGame(data, 4);
    const original = structuredClone(data); data.items[0].locations.reverse();
    expect((await starting).dataIdentity).toBe(await dataIdentity(original));
  });

  it('sets explicit monster starts, solo Terror, Frenzy, Hero allowance, and initial supplies', async () => {
    const data = setupFixture(); const before = structuredClone(data);
    const game = await createHorrifiedGame(data, 123);
    expect(data).toEqual(before);
    expect(game.hero).toMatchObject({ location: 'b', actions: 4, allowance: 4, items: [] });
    expect(game.monsters).toEqual({ beholder: { location: 'c', defeated: false }, displacerBeast: { location: 'a', defeated: false } });
    expect(game.terror).toBe(3); expect(game.frenzy).toBe('displacerBeast');
    expect(game.hero.perks).toHaveLength(1); expect(game.perkDeck).toHaveLength(2);
    expect(Object.values(game.boardItems).flat()).toHaveLength(12); expect(game.bag).toHaveLength(4);
    expect(game.monsterDeck).toHaveLength(3);
    expect(Object.values(game.citizens)).toEqual([{ location: null, status: 'waiting' }]);
    expect(Object.values(game.lairs).map(lair => lair.revealed)).toEqual([false, false]);
    expect(Object.values(game.lairs).map(lair => lair.definitionId).sort()).toEqual(['lair-a', 'lair-b']);
  });

  it('keeps physical copies distinct, at their printed destinations, and in exactly one supply', async () => {
    const game = await createHorrifiedGame(setupFixture(), 89);
    const all = [...game.bag, ...Object.values(game.boardItems).flat()];
    expect(new Set(all).size).toBe(16); expect(all.sort()).toEqual(Object.keys(game.items).sort());
    for (const [location, ids] of Object.entries(game.boardItems)) {
      for (const id of ids) expect(game.items[id].destination).toBe(location);
    }
    expect(new Set([...game.monsterDeck, ...game.monsterDiscard]).size).toBe(3);
  });

  it('reproduces setup and subsequent bag refills from serialized random state', async () => {
    const game = await createHorrifiedGame(setupFixture(), 321);
    expect(await createHorrifiedGame(setupFixture(), 321)).toEqual(game);
    expect((await createHorrifiedGame(setupFixture(), 322)).bag).not.toEqual(game.bag);
    drawBoardItems(game, game.bag.length);
    const location = Object.keys(game.boardItems).find(id => game.boardItems[id].length >= 2)!;
    game.itemDiscard = game.boardItems[location].splice(0, 2);
    const restored = JSON.parse(JSON.stringify(game));
    expect(drawBoardItems(game, 4)).toBe(2);
    expect(drawBoardItems(restored, 4)).toBe(2);
    expect(restored).toEqual(game); expect(drawItem(game)).toBeNull();
  });

  it('does not recycle spent Perks when the draw pile is exhausted', async () => {
    const game = await createHorrifiedGame(setupFixture(), 1);
    while (gainPerk(game)) { /* consume finite supply */ }
    game.perkDiscard = game.hero.perks.splice(0);
    expect(gainPerk(game)).toBeNull(); expect(game.perkDiscard).toHaveLength(3);
  });

  it('projects observable state without hidden deck order, random state, or unrevealed faces', async () => {
    const game = await createHorrifiedGame(setupFixture(), 1);
    const view = projectGame(game);
    for (const key of ['bag', 'perkDeck', 'monsterDeck', 'random', 'seed']) expect(view).not.toHaveProperty(key);
    expect(view.lairs).toEqual({ b: { revealed: false }, d: { revealed: false } });
    game.lairs.b.revealed = true;
    expect(projectGame(game).lairs.b).toEqual(game.lairs.b);
    view.hero.items.push('not-an-item'); expect(game.hero.items).toEqual([]);
  });

  it('rejects absent setup, incompatible interpretations, unsupported Heroes, and insufficient supplies', async () => {
    const data = setupFixture(); data.capabilities.setupVerified = false; delete data.setup;
    await expect(createHorrifiedGame(data, 0)).rejects.toThrow(/Verified monster setup/);
    data.interpretationVersion = 'unsupported';
    await expect(createHorrifiedGame(data, 0)).rejects.toThrow(/Unsupported rules/);
    await expect(createHorrifiedGame(setupFixture(), 0, 'hero-wizard')).rejects.toThrow(/Only the Fighter/);
    const short = setupFixture(); short.items = short.items.slice(0, 5);
    await expect(createHorrifiedGame(short, 0)).rejects.toThrow(/twelve Items/);
    const invalid = setupFixture(); invalid.board.soloLabelAt = 7;
    await expect(createHorrifiedGame(invalid, 0)).rejects.toThrow(/Terror/);
  });
});
