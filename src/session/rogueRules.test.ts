import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { LEGACY_RULESET_VERSION, RULESET_VERSION, STACKING_RULESET_VERSION } from '../engine/decisionPolicies';
import { heroFixture } from '../engine/fixtures/heroFixture';
import { createFighterGame, dispatchGame, gameDataForNewGame } from '../engine/horrifiedGame';
import type { FighterGame, HeroAction } from '../engine/horrifiedRuntime';
import { decodeGameSave, encodeGameSave } from './gameSave';

function fixture(version = RULESET_VERSION): GameData {
  const data = heroFixture();
  data.interpretationVersion = version;
  data.perks = data.perks.filter(perk => perk.id === 'perk-drizzt-dourden');
  return data;
}

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const before = structuredClone(state);
  const result = dispatchGame(data, state, { id: `rogue-${state.revision}`, revision: state.revision, actorSeatId: 'solo', action });
  expect(result.error).toBeNull();
  expect(state).toEqual(before);
  return result.state;
}

function rejected(data: GameData, state: FighterGame, selected: string[]): void {
  const before = structuredClone(state);
  const result = dispatchGame(data, state, { id: `invalid-${selected.join('-')}`, revision: state.revision,
    actorSeatId: 'solo', action: { kind: 'choose', choiceId: state.pending!.id, selected } });
  expect(result.error).toMatch(/eligible options/);
  expect(result.state).toBe(state);
  expect(state).toEqual(before);
}

async function boardChoice(data: GameData): Promise<FighterGame> {
  for (let seed = 0; seed < 300; seed++) {
    const initial = await createFighterGame(data, seed, 'hero-rogue');
    if (initial.boardItems.b.length < 3 || !Object.entries(initial.boardItems).some(([at, ids]) => at !== 'b' && ids.length)) continue;
    const result = dispatchGame(data, initial, { id: 'rogue-special', revision: 0, actorSeatId: 'solo', action: { kind: 'special' } });
    if (!result.error && result.state.pending?.resume.kind === 'rogue:location') return result.state;
  }
  throw new Error('No seeded Rogue board choice found.');
}

function choose(data: GameData, state: FighterGame, selected: string[]): FighterGame {
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected });
}

describe('Rogue choice rules by interpretation version', () => {
  it('allows zero, one, or two Items from one nearest occupied location in a new game', async () => {
    const data = fixture();
    const reached = await boardChoice(data);
    expect(reached.rulesVersion).toBe(RULESET_VERSION);
    expect(reached.pending?.options.map(option => option.id)).toEqual(['b']);
    const outside = Object.entries(reached.boardItems).find(([at, ids]) => at !== 'b' && ids.length)![1][0];
    rejected(data, reached, ['a']);
    for (const count of [0, 1, 2]) {
      let state = choose(data, reached, ['b']);
      expect(state.pending).toMatchObject({ min: 0, max: 2, resume: { kind: 'rogue:take-board', to: 'b' } });
      const items = state.pending!.options.slice(0, count).map(option => option.id);
      const first = state.pending!.options[0].id;
      rejected(data, state, [first, first]);
      rejected(data, state, [...state.pending!.options.slice(0, 3).map(option => option.id)]);
      rejected(data, state, [outside]);
      const before = structuredClone(state);
      state = choose(data, state, items);
      expect(state.hero.items).toEqual([...before.hero.items, ...items]);
      expect(state.boardItems.b).toEqual(before.boardItems.b.filter(id => !items.includes(id)));
      expect(state.boardItems[before.items[outside].destination]).toContain(outside);
      expect(state.pending).toBeNull();
      const decoded = await decodeGameSave(encodeGameSave(data, state));
      expect(decoded.game).toEqual(state);
    }
  });

  it.each([LEGACY_RULESET_VERSION, STACKING_RULESET_VERSION])('replays old %s board choices with their exact two-Item requirement', async version => {
    const data = fixture(version);
    const reached = await boardChoice(data);
    let state = choose(data, reached, ['b']);
    expect(state.pending).toMatchObject({ min: 2, max: 2 });
    const pending = await decodeGameSave(encodeGameSave(data, state));
    expect(pending.game).toEqual(state);
    rejected(data, state, []);
    rejected(data, state, [state.pending!.options[0].id]);
    state = choose(data, state, state.pending!.options.slice(0, 2).map(option => option.id));
    expect((await decodeGameSave(encodeGameSave(data, state))).game).toEqual(state);
    expect(gameDataForNewGame(data).interpretationVersion).toBe(RULESET_VERSION);
  });

  it('offers the single available board Item without inventing a second Item', async () => {
    for (const version of [RULESET_VERSION, STACKING_RULESET_VERSION]) {
      const data = fixture(version);
      let found = false;
      for (let seed = 0; seed < 400; seed++) {
        let state = await createFighterGame(data, seed, 'hero-rogue');
        if (state.boardItems.b.length !== 1) continue;
        state = act(data, state, { kind: 'special' });
        if (state.pending?.resume.kind !== 'rogue:location') continue;
        state = choose(data, state, ['b']);
        expect(state.pending).toMatchObject({ min: version === RULESET_VERSION ? 0 : 1, max: 1 });
        const onlyItem = state.pending!.options[0].id;
        state = choose(data, state, [onlyItem]);
        expect(state.hero.items).toEqual([onlyItem]);
        expect(state.boardItems.b).toEqual([]);
        found = true;
        break;
      }
      expect(found).toBe(true);
    }
  });

  it('keeps discarded Item recovery at two when two are available', async () => {
    const data = fixture();
    for (let seed = 0; seed < 400; seed++) {
      let state = await createFighterGame(data, seed, 'hero-rogue');
      const held = state.boardItems.b.slice(0, 2);
      if (held.length < 2 || held.reduce((sum, id) => sum + data.items.find(item => item.id === state.items[id].definitionId)!.strength, 0) < 3) continue;
      state = act(data, state, { kind: 'pick-up', items: held });
      state = act(data, state, { kind: 'reveal', items: held });
      state = act(data, state, { kind: 'special' });
      if (state.pending?.resume.kind !== 'rogue:take-discard') continue;
      expect(state.pending).toMatchObject({ min: 2, max: 2 });
      rejected(data, state, []);
      rejected(data, state, [held[0]]);
      state = choose(data, state, held);
      expect(state.hero.items).toEqual(held);
      expect(state.itemDiscard).toEqual([]);
      expect((await decodeGameSave(encodeGameSave(data, state))).game).toEqual(state);
      return;
    }
    throw new Error('No seeded Rogue discard recovery found.');
  });
});
