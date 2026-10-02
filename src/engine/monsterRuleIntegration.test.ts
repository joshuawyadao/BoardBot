import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { createRandomState, nextInt } from './gamePrimitives';
import { fighterFixture } from './fixtures/fighterFixture';
import { createFighterGame, dispatchGame } from './horrifiedGame';
import type { FighterGame, HeroAction } from './horrifiedRuntime';

function monsterFixture(symbols: string[], dice: number): GameData {
  const data = fighterFixture();
  // Printed turn order and POW-before-HIT timing: D&D instructions pp. 7–9.
  data.monsterCards = [{ id: 'card-synthetic', printedId: 312, name: 'Synthetic activation', quantity: 2,
    itemsDrawn: 0, activationSymbols: symbols, movement: 0, attackDice: dice, event: 'Synthetic event' }];
  return data;
}

function placeMonster(data: GameData, monster: 'beholder' | 'displacerBeast', location: string): void {
  if (monster === 'beholder') data.setup!.beholderLocation = location;
  else data.setup!.displacerLocation = location;
  data.board.monsterStarts.find(start => start.number === (monster === 'beholder' ? 4 : 1))!.location = location;
}

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const original = structuredClone(state);
  const result = dispatchGame(data, state, { id: `monster-case-${state.revision}`, revision: state.revision,
    actorSeatId: 'solo', action });
  expect(result.error).toBeNull();
  expect(state).toEqual(original);
  return result.state;
}

function choose(data: GameData, state: FighterGame, option: string): FighterGame {
  expect(state.pending?.options.map(candidate => candidate.id)).toContain(option);
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected: [option] });
}

function seedForFaces(faces: number[], d20?: number): { seed: number; after: FighterGame['random'] } {
  for (let seed = 0; seed < 100_000; seed++) {
    let random = createRandomState(seed);
    if (!faces.every(face => {
      const drawn = nextInt(random, 6); random = drawn.state; return drawn.value === face;
    })) continue;
    if (d20 !== undefined) {
      const drawn = nextInt(random, 20); random = drawn.state;
      if (drawn.value + 1 !== d20) continue;
    }
    return { seed, after: random };
  }
  throw new Error('No matching deterministic seed found.');
}

function removeHeldPerks(state: FighterGame): void {
  state.perkDeck.push(...state.hero.perks);
  state.hero.perks = [];
}

describe('integrated Monster Phase rules with invented components', () => {
  it('moves the original Hero away on Beholder Fear before applying rolled HITs', async () => {
    const data = monsterFixture(['red shield'], 2);
    placeMonster(data, 'beholder', 'b');
    const initial = await createFighterGame(data, 11);
    const seed = seedForFaces([0, 3], 6); // HIT, POW, then Fear ray 6.
    initial.random = createRandomState(seed.seed);
    removeHeldPerks(initial);
    const originalTerror = initial.terror;
    let state = act(data, initial, { kind: 'end-phase' });
    expect(state.rolls.at(-1)?.result.base).toBe(6);
    expect(state.pending?.title).toMatch(/away from Beholder/);
    state = choose(data, state, 'c');
    expect(state.hero.location).toBe('c');
    expect(state.monsters.beholder.location).toBe('b');
    expect(state.terror).toBe(originalTerror);
    expect(state.itemDiscard).toEqual([]);
    expect(state.phase).toBe('hero');
    expect(state.pending).toBeNull();
    expect(state.attack).toBeNull();
    expect(state.random).toEqual(seed.after);
    expect(state.rolls.at(-1)?.result.base).toBe(6);
  });

  it('retargets a Citizen-origin Displacer attack once across two POWs and resolves one HIT on the Hero', async () => {
    const data = monsterFixture(['blue skull'], 3);
    placeMonster(data, 'displacerBeast', 'b');
    const initial = await createFighterGame(data, 12);
    initial.hero.location = 'c';
    initial.citizens['citizen-a'] = { status: 'board', location: 'b' };
    const defenseItem = initial.boardItems.b.shift() ?? initial.bag.shift();
    expect(defenseItem).toBeTruthy();
    initial.hero.items.push(defenseItem!);
    removeHeldPerks(initial);
    const seed = seedForFaces([3, 3, 0]); // POW, POW, HIT; no new attack roll.
    initial.random = createRandomState(seed.seed);
    let state = act(data, initial, { kind: 'end-phase' });
    expect(state.entries.filter(entry => entry.message.includes('Displacer Beast rolled 2 power and 1 hit results.'))).toHaveLength(1);
    expect(state.monsters.displacerBeast.location).toBe('c');
    expect(state.citizens['citizen-a']).toEqual({ status: 'board', location: 'b' });
    expect(state.pending?.options.map(option => option.id)).toEqual(['defend', 'defeat']);
    expect(state.random).toEqual(seed.after);
    state = choose(data, state, 'defend');
    expect(state.pending?.options.map(option => option.id)).toEqual([defenseItem]);
    state = choose(data, state, defenseItem!);
    expect(state.phase).toBe('hero');
    expect(state.hero.location).toBe('c');
    expect(state.citizens['citizen-a']).toEqual({ status: 'board', location: 'b' });
    expect(state.itemDiscard).toContain(defenseItem);
    expect(state.random).toEqual(seed.after);
    expect(state.attack).toBeNull();
  });

  it('stops later POWs and the next activation when the first attack reaches final Terror', async () => {
    const data = monsterFixture(['red shield', 'blue skull'], 2);
    placeMonster(data, 'beholder', 'b');
    placeMonster(data, 'displacerBeast', 'a');
    const initial = await createFighterGame(data, 13);
    initial.terror = data.board.terrorTrack.length - 2;
    removeHeldPerks(initial);
    const seed = seedForFaces([3, 3], 20); // Two POWs; first ray reaches final Terror.
    initial.random = createRandomState(seed.seed);
    const state = act(data, initial, { kind: 'end-phase' });
    expect(state.phase).toBe('lost');
    expect(state.endReason).toMatch(/Terror reached/);
    expect(state.terror).toBe(data.board.terrorTrack.length - 1);
    expect(state.roll).toBeNull();
    expect(state.attack).toBeNull();
    expect(state.queue).toEqual([]);
    expect(state.pending).toBeNull();
    expect(state.monsters.displacerBeast.location).toBe('a');
    expect(state.random).toEqual(seed.after);
    expect(state.rolls.filter(roll => roll.reason === 'Beholder eye')).toHaveLength(1);
    const rejected = dispatchGame(data, state, { id: 'after-loss', revision: state.revision,
      actorSeatId: 'solo', action: { kind: 'end-phase' } });
    expect(rejected.error).toMatch(/ended/);
    expect(rejected.state).toBe(state);
  });
});
