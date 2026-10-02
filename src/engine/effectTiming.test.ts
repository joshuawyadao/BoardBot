import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { createFighterGame, dispatchGame } from './horrifiedGame';
import type { FighterGame, HeroAction } from './horrifiedRuntime';
import { heroFixture } from './fixtures/heroFixture';
import { slowingFixture, SLOWING_SEED } from './fixtures/slowingFixture';
import { decodeGameSave, encodeGameSave } from '../session/gameSave';

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const result = dispatchGame(data, state, { id: `timing-${state.revision}`, revision: state.revision, actorSeatId: 'solo', action });
  expect(result.error).toBeNull();
  return result.state;
}

function choose(data: GameData, state: FighterGame, selected: string[]): FighterGame {
  expect(state.pending).not.toBeNull();
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected });
}

describe('specific component timing with synthetic components', () => {
  it('applies the Cleric critical effect to both attacks that turn, then expires it', async () => {
    const data = heroFixture();
    data.perks = [{ id: 'perk-jarlaxle-baenre', name: 'Synthetic guarantee', quantity: 1, effect: 'Synthetic effect' }];
    data.setup!.beholderLocation = 'b'; data.setup!.displacerLocation = 'b';
    data.board.monsterStarts.forEach(start => { start.location = 'b'; });
    data.items.forEach(item => { item.locations = ['b', 'b']; });
    data.monsterCards[0].activationSymbols = ['red shield', 'blue skull'];
    data.monsterCards[0].attackDice = 3;
    data.dice.monsterDice.faceCounts = { hit_starburst: 6, power_exclamation: 0, blank: 0 };

    let state = await createFighterGame(data, 3, 'hero-cleric');
    state = act(data, state, { kind: 'pick-up', items: state.boardItems.b });
    state = act(data, state, { kind: 'perk', perk: state.hero.perks[0] });
    state = act(data, state, { kind: 'special' });
    expect(state.rolls.at(-1)?.result.effectiveResult).toBe(20);
    state = act(data, state, { kind: 'end-phase' });
    for (let attack = 0; attack < 2; attack++) {
      expect(state.pending).toMatchObject({ title: 'Monster attack', resume: { amount: 1 } });
      expect(state.hero.effects.clericOneDieAttacks).toBe(1);
      const resumed = await decodeGameSave(encodeGameSave(data, state));
      expect(resumed.game).toEqual(state);
      state = choose(resumed.data, resumed.game, ['defend']);
      expect(state.pending).toMatchObject({ min: 1, max: 1 });
      state = choose(data, state, [state.hero.items[0]]);
    }
    expect(state.turn).toBe(2);
    expect(state.hero.effects.clericOneDieAttacks).toBe(0);
    state = act(data, state, { kind: 'end-phase' });
    expect(state.pending).toMatchObject({ title: 'Monster attack', resume: { amount: 3 } });
  });

  it('does not spend Jarlaxle on a Monster Phase roll or carry it into the next Hero Phase', async () => {
    const data = slowingFixture();
    data.perks = [{ id: 'perk-jarlaxle-baenre', name: 'Synthetic guarantee', quantity: 8, effect: 'Synthetic effect' }];
    const initial = await createFighterGame(data, SLOWING_SEED);
    const control = act(data, initial, { kind: 'end-phase' });
    let played = act(data, initial, { kind: 'perk', perk: initial.hero.perks[0] });
    expect(played.hero.effects.automatic20).toBe(true);
    played = act(data, played, { kind: 'end-phase' });
    expect(played.rolls.map(roll => roll.result.effectiveResult)).toEqual([8, 9]);
    expect(played.rolls).toEqual(control.rolls);
    expect(played.turn).toBe(2);
    expect(played.hero.effects.automatic20).toBe(false);
    const resumed = await decodeGameSave(encodeGameSave(data, played));
    expect(resumed.game).toEqual(played);
    const after = act(data, resumed.game, { kind: 'special' });
    const controlAfter = act(data, control, { kind: 'special' });
    expect(after.rolls.at(-1)).toEqual(controlAfter.rolls.at(-1));
    expect(after.random).toEqual(controlAfter.random);
  });
});
