import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { LEGACY_RULESET_VERSION, RULESET_VERSION, STACKING_RULESET_VERSION } from '../engine/decisionPolicies';
import { slowingFixture, SLOWING_SEED } from '../engine/fixtures/slowingFixture';
import { createFighterGame, dispatchGame, gameDataForNewGame, getActionReason } from '../engine/horrifiedGame';
import type { FighterGame, HeroAction } from '../engine/horrifiedRuntime';
import { decodeGameSave, encodeGameSave } from './gameSave';

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const before = structuredClone(state);
  const result = dispatchGame(data, state, {
    id: `slowing-${state.revision}`, revision: state.revision, actorSeatId: 'solo', action,
  });
  expect(result.error).toBeNull();
  expect(state).toEqual(before);
  return result.state;
}

function choose(data: GameData, state: FighterGame, option: string): FighterGame {
  expect(state.pending?.options.map(candidate => candidate.id)).toContain(option);
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected: [option] });
}

function expectTwoRays(state: FighterGame, expected: number[]): void {
  expect(state.rolls.filter(roll => roll.reason === 'Beholder eye')
    .map(roll => roll.result.effectiveResult)).toEqual(expected);
}

describe('Slowing Ray rules and saved interpretations', () => {
  it('stacks two forced penalties in v4/v5 and preserves the v3 cap', async () => {
    for (const [version, actions] of [[RULESET_VERSION, 2], [STACKING_RULESET_VERSION, 2], [LEGACY_RULESET_VERSION, 3]] as const) {
      const data = slowingFixture(version);
      let state = await createFighterGame(data, SLOWING_SEED);
      expect(state.hero.items).toEqual([]);
      expect(state.rulesVersion).toBe(version);
      state = act(data, state, { kind: 'end-phase' });
      expectTwoRays(state, [8, 9]);
      expect(state.turn).toBe(2);
      expect(state.phase).toBe('hero');
      expect(state.hero.allowance).toBe(actions);
      expect(state.hero.actions).toBe(actions);
      expect(state.hero.penalties.fewerActions).toBe(0);
    }
  });

  it('adds each accepted penalty, while discarding avoids that increment', async () => {
    const data = slowingFixture();
    let state = await createFighterGame(data, SLOWING_SEED);
    state = act(data, state, { kind: 'pick-up', items: state.boardItems.b.slice(0, 2) });
    state = act(data, state, { kind: 'end-phase' });
    state = choose(data, state, 'take-penalty');
    expect(state.hero.penalties.fewerActions).toBe(1);
    state = choose(data, state, 'take-penalty');
    expect(state.phase).toBe('hero');
    expect(state.hero.allowance).toBe(2);
    expect(state.hero.items).toHaveLength(2);

    let discarded = await createFighterGame(data, SLOWING_SEED);
    discarded = act(data, discarded, { kind: 'pick-up', items: discarded.boardItems.b.slice(0, 2) });
    discarded = act(data, discarded, { kind: 'end-phase' });
    discarded = choose(data, discarded, 'discard');
    expect(discarded.hero.penalties.fewerActions).toBe(0);
    discarded = choose(data, discarded, discarded.hero.items[0]);
    expect(discarded.hero.items).toHaveLength(1);
    discarded = choose(data, discarded, 'take-penalty');
    expect(discarded.hero.allowance).toBe(3);
    expect(discarded.itemDiscard).toHaveLength(1);
  });

  it('floors the next allowance at zero and clears the penalty after that turn', async () => {
    for (const allowance of [1, 2]) {
      const data = slowingFixture();
      data.heroes[0].actions = allowance;
      let state = await createFighterGame(data, SLOWING_SEED);
      state = act(data, state, { kind: 'end-phase' });
      expectTwoRays(state, [8, 9]);
      expect(state.hero.allowance).toBe(0);
      expect(state.hero.actions).toBe(0);
      expect(state.hero.penalties.fewerActions).toBe(0);
      expect(getActionReason(data, state, { kind: 'pick-up', items: state.boardItems.b.slice(0, 1) }))
        .toMatch(/No ordinary actions/i);
      state = act(data, state, { kind: 'perk', perk: state.hero.perks[0] });
      state = act(data, state, { kind: 'end-phase' });
      expect(state.turn).toBe(3);
      expect(state.hero.allowance).toBe(allowance);
    }
  });

  it('clears accrued penalties when a later HIT defeats the Hero', async () => {
    const data = slowingFixture();
    data.dice.monsterDice.quantity = 3;
    data.dice.monsterDice.faceCounts = { hit_starburst: 2, power_exclamation: 4, blank: 0 };
    data.monsterCards[0].attackDice = 3;
    let state = await createFighterGame(data, SLOWING_SEED);
    state = act(data, state, { kind: 'end-phase' });
    expectTwoRays(state, [9, 9]);
    expect(state.hero.penalties.fewerActions).toBe(2);
    expect(state.pending?.title).toMatch(/Monster attack/i);
    state = choose(data, state, 'defeat');
    expect(state.hero.penalties.fewerActions).toBe(0);
    expect(state.turn).toBe(2);
    expect(state.hero.allowance).toBe(4);
    expect(state.hero.location).toBe(data.board.hospital);
  });

  it('replays pending and completed v3/v4/v5 choices exactly and continues each version', async () => {
    for (const [version, actions] of [[RULESET_VERSION, 2], [STACKING_RULESET_VERSION, 2], [LEGACY_RULESET_VERSION, 3]] as const) {
      const data = slowingFixture(version);
      let state = await createFighterGame(data, SLOWING_SEED);
      state = act(data, state, { kind: 'pick-up', items: state.boardItems.b.slice(0, 2) });
      state = act(data, state, { kind: 'end-phase' });
      expect(state.pending?.title).toMatch(/ray/i);
      const savedPending = await decodeGameSave(encodeGameSave(data, state));
      expect(savedPending.game).toEqual(state);
      expect(savedPending.data).toEqual(data);
      const directFirst = choose(data, state, 'take-penalty');
      const resumedFirst = choose(savedPending.data, savedPending.game, 'take-penalty');
      expect(resumedFirst).toEqual(directFirst);
      const savedSecond = await decodeGameSave(encodeGameSave(savedPending.data, resumedFirst));
      expect(savedSecond.game).toEqual(resumedFirst);
      const directLast = choose(data, directFirst, 'take-penalty');
      const resumedLast = choose(savedSecond.data, savedSecond.game, 'take-penalty');
      expect(resumedLast).toEqual(directLast);
      expect(resumedLast.rulesVersion).toBe(version);
      expect(resumedLast.hero.allowance).toBe(actions);
      const savedCompleted = await decodeGameSave(encodeGameSave(savedSecond.data, resumedLast));
      expect(savedCompleted.game).toEqual(resumedLast);
      expect(savedCompleted.game.random).toEqual(directLast.random);
    }
  });

  it('rejects version tampering and clones legacy data for a new current-rules game', async () => {
    const currentData = slowingFixture();
    const current = act(currentData, await createFighterGame(currentData, SLOWING_SEED), { kind: 'end-phase' });
    const payload = JSON.parse(encodeGameSave(currentData, current));
    const modified = (change: (value: typeof payload) => void) => {
      const value = structuredClone(payload); change(value); return JSON.stringify(value);
    };
    await expect(decodeGameSave(modified(value => { value.state.rulesVersion = LEGACY_RULESET_VERSION; })))
      .rejects.toThrow();
    await expect(decodeGameSave(modified(value => { value.data.interpretationVersion = LEGACY_RULESET_VERSION; })))
      .rejects.toThrow();

    const legacy = slowingFixture(LEGACY_RULESET_VERSION);
    const snapshot = structuredClone(legacy);
    const upgraded = gameDataForNewGame(legacy);
    expect(upgraded).not.toBe(legacy);
    expect(upgraded.interpretationVersion).toBe(RULESET_VERSION);
    expect(legacy).toEqual(snapshot);
    const fresh = await createFighterGame(upgraded, SLOWING_SEED);
    expect(fresh.rulesVersion).toBe(RULESET_VERSION);
    const old = act(legacy, await createFighterGame(legacy, SLOWING_SEED), { kind: 'end-phase' });
    const oldPayload = JSON.parse(encodeGameSave(legacy, old));
    oldPayload.state.rulesVersion = RULESET_VERSION;
    await expect(decodeGameSave(JSON.stringify(oldPayload))).rejects.toThrow();
    const unknown = structuredClone(legacy);
    unknown.interpretationVersion = 'unknown-interpretation';
    expect(() => gameDataForNewGame(unknown)).toThrow(/unsupported|interpretation/i);
  });
});
