import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { fighterFixture } from './fixtures/fighterFixture';
import { createRandomState, nextInt } from './gamePrimitives';
import { createFighterGame, dispatchGame, getActionReason, getFighterView } from './horrifiedGame';
import type { FighterGame, HeroAction } from './horrifiedRuntime';

function hold(state: FighterGame, ids: string[]) {
  for (const id of ids) {
    state.bag = state.bag.filter(item => item !== id);
    state.itemDiscard = state.itemDiscard.filter(item => item !== id);
    for (const at of Object.keys(state.boardItems)) state.boardItems[at] = state.boardItems[at].filter(item => item !== id);
  }
  state.hero.items.push(...ids);
}

function placeOnField(state: FighterGame, placements: Record<string, string>) {
  hold(state, Object.values(placements));
  state.hero.items = state.hero.items.filter(item => !Object.values(placements).includes(item));
  state.displacement = { ...placements };
}

function nextRoll(state: FighterGame, desired: number) {
  for (let seed = 0; seed < 10_000; seed++) {
    const random = createRandomState(seed);
    if (nextInt(random, 20).value + 1 === desired) { state.random = random; return; }
  }
  throw new Error(`No synthetic seed for ${desired}`);
}

function command(data: GameData, state: FighterGame, action: HeroAction, id: string) {
  return dispatchGame(data, state, { id, revision: state.revision, actorSeatId: 'solo', action });
}

function rejectAtomically(data: GameData, state: FighterGame, action: HeroAction, id: string) {
  const before = structuredClone(state);
  expect(getActionReason(data, state, action)).toBeTruthy();
  const result = command(data, state, action, id);
  expect(result.error).toBeTruthy();
  expect(result.state).toBe(state);
  // Includes RNG, revision, action budget, item supplies, Monsters, and recorded commands.
  expect(state).toEqual(before);
}

// Placement exception: published D&D instructions p.10; challenge costs: verified mats.
// Ordinary-miss relocation: accepted v3 interpretation in docs/Rules-Reference.md.
describe('challenge boundaries on the synthetic Displacer and Beholder boards', () => {
  it('matches every field cell to low strengths by row and accepts strengths 4–6 in any row', async () => {
    const data = fighterFixture();
    const state = await createFighterGame(data, 12);
    state.hero.location = state.monsters.displacerBeast.location;
    hold(state, Array.from({ length: 6 }, (_, strength) => `item-${strength}#1`));
    const cells = Array.from({ length: 3 }, (_, row) => Array.from({ length: 3 }, (_, column) => `${row}:${column}`)).flat();

    for (let strength = 1; strength <= 6; strength++) {
      const item = `item-${strength - 1}#1`;
      for (const cell of cells) {
        const action: HeroAction = { kind: 'advance', monster: 'displacerBeast', item, cell };
        const expected = strength >= 4 || Number(cell[0]) === strength - 1;
        expect(getActionReason(data, state, action) === null, `${strength} at ${cell}`).toBe(expected);
        expect(getFighterView(data, state).advanceOptions.some(option => option.monster === 'displacerBeast' && option.item === item && option.cell === cell)).toBe(expected);
      }
    }

    state.displacement['0:0'] = 'item-0#2';
    state.bag = state.bag.filter(item => item !== 'item-0#2');
    for (const at of Object.keys(state.boardItems)) state.boardItems[at] = state.boardItems[at].filter(item => item !== 'item-0#2');
    rejectAtomically(data, state, { kind: 'advance', monster: 'displacerBeast', item: 'item-0#1', cell: '0:0' }, 'occupied');
    expect(getActionReason(data, state, { kind: 'advance', monster: 'displacerBeast', item: 'item-0#1', cell: '0:1' })).toBeNull();
    const result = command(data, state, { kind: 'advance', monster: 'displacerBeast', item: 'item-0#1', cell: '0:1' }, 'legal-place');
    expect(result.error).toBeNull();
    expect(result.state.displacement['0:1']).toBe('item-0#1');
    expect(result.state.hero.items).not.toContain('item-0#1');
    expect(result.state.hero.actions).toBe(state.hero.actions - 1);
    expect(state.displacement['0:1']).toBeUndefined();
  });

  it('offers only empty, strength-legal destinations after an ordinary missed strike', async () => {
    const data = fighterFixture();
    let state = await createFighterGame(data, 13);
    state.hero.location = state.monsters.displacerBeast.location;
    placeOnField(state, { '0:0': 'item-0#1', '0:1': 'item-0#2', '1:0': 'item-1#1', '1:1': 'item-1#2', '2:0': 'item-4#1' });
    hold(state, ['item-5#1', 'item-7#1']);
    nextRoll(state, 19);
    const before = structuredClone(state);
    const strike = command(data, state, { kind: 'defeat', monster: 'displacerBeast', items: ['item-5#1', 'item-7#1'] }, 'ordinary-miss');
    expect(strike.error).toBeNull();
    expect(state).toEqual(before);
    state = strike.state;
    expect(state.monsters.displacerBeast.defeated).toBe(false);
    expect(state.pending?.title).toMatch(/Relocate/);
    const actual = state.pending!.options.map(option => JSON.parse(option.id) as { from: string; to: string });
    const expected = [
      ...['0:0', '0:1'].map(from => ({ from, to: '0:2' })),
      ...['1:0', '1:1'].map(from => ({ from, to: '1:2' })),
      ...['0:2', '1:2', '2:1', '2:2'].map(to => ({ from: '2:0', to })),
    ];
    expect(actual).toEqual(expected);
    rejectAtomically(data, state, { kind: 'choose', choiceId: state.pending!.id, selected: [JSON.stringify({ from: '0:0', to: '1:2' })] }, 'illegal-relocation');
    const choice = command(data, state, { kind: 'choose', choiceId: state.pending!.id, selected: [JSON.stringify({ from: '2:0', to: '0:2' })] }, 'legal-relocation');
    expect(choice.error).toBeNull();
    expect(choice.state.displacement['2:0']).toBeUndefined();
    expect(choice.state.displacement['0:2']).toBe('item-4#1');
    expect(Object.keys(choice.state.displacement)).toHaveLength(5);
  });

  it('requires all ten eyes and at least six yellow strength before Beholder defeat', async () => {
    const data = fighterFixture();
    data.items[3].strength = 3;
    let state = await createFighterGame(data, 14);
    state.hero.location = state.monsters.beholder.location;
    hold(state, ['item-0#1', 'item-1#1', 'item-3#1', 'item-5#1']);
    const sixYellow: HeroAction = { kind: 'defeat', monster: 'beholder', items: ['item-5#1'] };
    state.damagedEyes = data.monsters.beholder.eyestalks.slice(0, 9).map(eye => eye.min);
    rejectAtomically(data, state, sixYellow, 'nine-eyes');
    state.damagedEyes.push(data.monsters.beholder.eyestalks[9].min);
    rejectAtomically(data, state, { kind: 'defeat', monster: 'beholder', items: ['item-0#1', 'item-5#1'] }, 'wrong-color');
    rejectAtomically(data, state, { kind: 'defeat', monster: 'beholder', items: ['item-1#1', 'item-3#1'] }, 'five-yellow');
    expect(getActionReason(data, state, sixYellow)).toBeNull();
    const before = structuredClone(state);
    const result = command(data, state, sixYellow, 'six-yellow');
    expect(result.error).toBeNull();
    expect(state).toEqual(before);
    expect(result.state.monsters.beholder).toEqual({ defeated: true, location: null });
    expect(result.state.hero.items).not.toContain('item-5#1');
    expect(result.state.itemDiscard).toContain('item-5#1');
    expect(result.state.hero.actions).toBe(state.hero.actions - 1);
  });

  it('requires five placed Items and seven payment strength before Displacer defeat', async () => {
    const data = fighterFixture();
    let state = await createFighterGame(data, 15);
    state.hero.location = state.monsters.displacerBeast.location;
    placeOnField(state, { '0:0': 'item-0#1', '0:1': 'item-0#2', '1:0': 'item-1#1', '1:1': 'item-1#2' });
    hold(state, ['item-5#1', 'item-6#2']);
    const seven: HeroAction = { kind: 'defeat', monster: 'displacerBeast', items: ['item-5#1', 'item-6#2'] };
    rejectAtomically(data, state, seven, 'four-placed');
    placeOnField(state, { ...state.displacement, '2:0': 'item-4#1' });
    rejectAtomically(data, state, { kind: 'defeat', monster: 'displacerBeast', items: ['item-5#1'] }, 'six-strength');
    expect(getActionReason(data, state, seven)).toBeNull();
    nextRoll(state, 20);
    const before = structuredClone(state);
    const result = command(data, state, seven, 'five-placed-seven-strength');
    expect(result.error).toBeNull();
    expect(state).toEqual(before);
    expect(result.state.monsters.displacerBeast.defeated).toBe(true);
    expect(result.state.hero.items).not.toContain('item-5#1');
    expect(result.state.hero.items).not.toContain('item-6#2');
    expect(result.state.itemDiscard).toEqual(expect.arrayContaining(['item-5#1', 'item-6#2', ...Object.values(state.displacement)]));
    expect(result.state.hero.actions).toBe(state.hero.actions);
  });
});
