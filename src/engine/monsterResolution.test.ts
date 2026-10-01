import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import type { FighterGame, EngineContext, Task, PendingChoice } from './horrifiedRuntime';
import { createRandomState } from './gamePrimitives';
import { resolveMonsterTask } from './monsterResolution';

function fixture() {
  const card = { id: 'card-308', printedId: 308, name: 'Visitor', quantity: 1, itemsDrawn: 2,
    activationSymbols: ['black flame', 'red shield'], movement: 1, attackDice: 2, event: 'synthetic', citizenStartingLocation: 'b' };
  const data = {
    board: { locations: ['a', 'b', 'c'].map(id => ({ id })), edges: [
      { from: 'a', to: 'b', kind: 'ordinary' }, { from: 'b', to: 'c', kind: 'ordinary' },
    ] },
    monsterCards: [card], citizens: [{ id: 'visitor', name: 'Visitor', safeDestination: 'c' }],
    monsters: { beholder: { activationSymbols: ['red shield'], frenzyOrder: 4,
      rays: { front: [{ min: 1, max: 1, name: 'Fortune', effect: 'synthetic' }, { min: 2, max: 3, name: 'Call', effect: 'synthetic' }], back: [] } },
      displacerBeast: { activationSymbols: ['blue skull'], frenzyOrder: 1 } },
    dice: { monsterDice: { facesPerDie: 2, faceCounts: { hit_starburst: 1, power_exclamation: 1, blank: 0 } } },
    items: [], setup: { beholderLocation: 'a', displacerLocation: 'c' },
  } as unknown as GameData;
  const state = {
    phase: 'hero', endReason: null, random: createRandomState(0), taskSerial: 0, queue: [], pending: null, roll: null, rolls: [], attack: null,
    currentCard: null, monsterDeck: ['card-308#1'], monsterDiscard: [], boardItems: { a: [], b: [], c: [] },
    items: {}, itemDiscard: [], citizens: { visitor: { location: null, status: 'waiting' },
      rescued: { location: null, status: 'rescued' }, defeated: { location: null, status: 'defeated' } },
    hero: { location: 'b', items: [], effects: { skipMonsterPhase: false, skipMonsterCard: false, ignoreHits: 0 },
      penalties: { noMove: false, fewerActions: 0, skipTurn: false } },
    monsters: { beholder: { location: 'a', defeated: false }, displacerBeast: { location: 'c', defeated: false } },
    frenzy: 'displacerBeast', damagedEyes: [], terror: 3, lairs: {},
    monsterCards: { 'card-308#1': { id: 'card-308#1', definitionId: 'card-308' } },
  } as unknown as FighterGame;
  const calls: { asks: PendingChoice[]; rolls: Task[]; modifiers: number[]; logs: string[]; perks: number } =
    { asks: [], rolls: [], modifiers: [], logs: [], perks: 0 };
  const ctx: EngineContext = {
    data, state,
    prepend: (...tasks) => state.queue.unshift(...tasks),
    ask: (title, options, min, max, resume) => calls.asks.push({ id: 'choice', title, options, min, max, resume }),
    log: message => calls.logs.push(message),
    name: id => id,
    location: entity => entity === 'hero' ? state.hero.location :
      entity === 'beholder' || entity === 'displacerBeast' ? state.monsters[entity].location : state.citizens[entity]?.location ?? null,
    place: (entity, destination) => {
      if (entity === 'hero') state.hero.location = destination;
      else if (entity === 'beholder' || entity === 'displacerBeast') state.monsters[entity].location = destination;
      else { state.citizens[entity].location = destination; state.citizens[entity].status = 'board'; }
    },
    rollD20: (_reason, continuation, modifier = 0) => { calls.rolls.push(continuation); calls.modifiers.push(modifier); },
    changeTerror: amount => { state.terror += amount; },
    discardItems: () => {},
    drawPerk: () => { calls.perks++; },
  };
  return { ctx, state, data, calls };
}

describe('monster phase resolver with synthetic data', () => {
  it('draws once, then orders Items, event, printed symbols, and finish', () => {
    const { ctx, state } = fixture();
    expect(resolveMonsterTask({ kind: 'not-monster' }, ctx)).toBe(false);
    expect(resolveMonsterTask({ kind: 'monster:start' }, ctx)).toBe(true);
    expect(state.currentCard).toBe('card-308#1');
    expect(state.monsterDeck).toEqual([]);
    expect(state.queue.map(task => task.kind)).toEqual([
      'monster:items', 'monster:event', 'monster:symbol', 'monster:symbol', 'monster:finish',
    ]);
    expect(state.queue.filter(task => task.kind === 'monster:symbol').map(task => task.symbol))
      .toEqual(['black flame', 'red shield']);
    resolveMonsterTask({ kind: 'monster:finish' }, ctx);
    expect(state.monsterDiscard).toEqual(['card-308#1']);
    expect(state.queue[0].kind).toBe('turn:start');
  });

  it('loses only on a required draw from an exhausted deck', () => {
    const { ctx, state } = fixture();
    state.monsterDeck = [];
    resolveMonsterTask({ kind: 'monster:start' }, ctx);
    expect(state).toMatchObject({ phase: 'lost', endReason: 'The Monster deck is empty when a draw is required.' });
    expect(state.queue).toEqual([]);
    const skipped = fixture();
    skipped.state.monsterDeck = [];
    skipped.state.hero.effects.skipMonsterCard = true;
    resolveMonsterTask({ kind: 'monster:start' }, skipped.ctx);
    expect(skipped.state.phase).toBe('monster');
    expect(skipped.state.queue[0].kind).toBe('turn:start');
  });

  it('uses current Frenzy and resolves dice powers before hits', () => {
    const { ctx, state, calls } = fixture();
    resolveMonsterTask({ kind: 'monster:symbol', symbol: 'black flame', movement: 1, dice: 2 }, ctx);
    expect(state.queue.shift()).toMatchObject({ kind: 'monster:activate', monster: 'displacerBeast' });
    state.monsters.beholder.location = 'b';
    state.queue = [];
    resolveMonsterTask({ kind: 'monster:attack-start', monster: 'beholder', dice: 2 }, ctx);
    expect(state.attack).toMatchObject({ target: 'hero', hits: 1, powers: 1 });
    const startPower = state.queue.shift()!;
    resolveMonsterTask(startPower, ctx);
    expect(calls.rolls).toEqual([{ kind: 'monster:beholder-ray', attackId: state.attack!.id }]);
    expect(state.attack!.powers).toBe(0);
    expect(state.queue).toEqual([]);
  });

  it('offers both matching Monsters in player-chosen order and suppresses only the crossed Frenzy icon', () => {
    const { ctx, state, data, calls } = fixture();
    data.monsters.beholder.activationSymbols.push('shared');
    data.monsters.displacerBeast.activationSymbols.push('shared');
    resolveMonsterTask({ kind: 'monster:symbol', symbol: 'shared', movement: 1, dice: 1 }, ctx);
    expect(calls.asks.at(-1)?.options.map(option => option.id)).toEqual(['beholder', 'displacerBeast']);
    resolveMonsterTask({ kind: 'monster:symbol', symbol: 'shared', movement: 1, dice: 1, selected: ['beholder'] }, ctx);
    expect(state.queue.map(task => [task.kind, task.monster])).toEqual([
      ['monster:activate', 'beholder'], ['monster:symbol', undefined],
    ]);
    state.queue = [];
    resolveMonsterTask({ kind: 'monster:symbol', symbol: 'crossed black symbol', movement: 1, dice: 1 }, ctx);
    expect(state.queue).toEqual([]);
    resolveMonsterTask({ kind: 'monster:symbol', symbol: 'red shield', movement: 1, dice: 1 }, ctx);
    expect(state.queue[0]).toMatchObject({ kind: 'monster:activate', monster: 'beholder' });
  });

  it('lets a lucky ray cancel accompanying hits and filters Charm candidates', () => {
    const { ctx, state, calls } = fixture();
    state.attack = { id: 1, monster: 'beholder', target: 'hero', hits: 2, powers: 0, cancelled: false };
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 1, result: 1 }, ctx);
    expect(state.attack.cancelled).toBe(true);
    resolveMonsterTask({ kind: 'monster:attack-power', attackId: 1 }, ctx);
    expect(state.attack).toBeNull();
    expect(state.queue).toEqual([]);

    state.attack = { id: 2, monster: 'beholder', target: 'hero', hits: 0, powers: 0, cancelled: false };
    state.citizens.other = { location: null, status: 'waiting' };
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 2, result: 2 }, ctx);
    expect(calls.asks.at(-1)?.options.map(option => option.id)).toEqual(['visitor', 'other']);
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 2, result: 2, selected: ['visitor'] }, ctx);
    expect(state.citizens.visitor).toEqual({ location: 'a', status: 'board' });
  });

  it('uses a damaged eyestalk range for antimagic and has no Charm effect with no eligible Citizen', () => {
    const { ctx, state, data, calls } = fixture();
    data.monsters.beholder.eyestalks = [{ min: 2, max: 3, name: 'Synthetic eye' }];
    state.damagedEyes = [2];
    state.hero.items = ['item-a'];
    state.attack = { id: 3, monster: 'beholder', target: 'hero', hits: 0, powers: 0, cancelled: false };
    resolveMonsterTask({ kind: 'monster:beholder-ray', attackId: 3, result: 3 }, ctx);
    expect(state.queue.map(task => task.kind)).toEqual(['discard', 'monster:attack-power']);
    state.queue = [];
    state.citizens.visitor.status = 'rescued';
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 3, result: 2 }, ctx);
    expect(calls.asks).toEqual([]);
    expect(state.citizens.visitor.location).toBeNull();
  });

  it('does not apply Hero-directed ray attacks to an off-board Hero', () => {
    const { ctx, state } = fixture();
    state.hero.location = null;
    state.hero.items = ['item-a'];
    state.attack = { id: 4, monster: 'beholder', target: 'visitor', hits: 0, powers: 0, cancelled: false };
    state.damagedEyes = [2];
    ctx.data.monsters.beholder.eyestalks = [{ min: 2, max: 3, name: 'Synthetic eye' }];
    resolveMonsterTask({ kind: 'monster:beholder-ray', attackId: 4, result: 3 }, ctx);
    expect(state.queue.map(task => task.kind)).toEqual(['monster:attack-power']);
    state.queue = [];
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 4, result: 4 }, ctx);
    expect(state.hero.penalties.noMove).toBe(false);
    expect(state.queue).toEqual([]);
  });

  it('offers Hero escorts on a Fear step and does not move an escorted Citizen twice', () => {
    const { ctx, state, data } = fixture();
    data.board.edges[1].kind = 'teleport';
    state.citizens.visitor = { location: 'b', status: 'board' };
    state.attack = { id: 5, monster: 'beholder', target: 'hero', hits: 0, powers: 0, cancelled: false };
    resolveMonsterTask({ kind: 'monster:ray-effect', attackId: 5, result: 6 }, ctx);
    expect(state.queue.map(task => [task.kind, task.entity, task.target])).toEqual([
      ['monster:fear', 'hero', 'b'], ['monster:fear', 'visitor', 'b'],
    ]);

    resolveMonsterTask(state.queue.shift()!, ctx);
    expect(state.queue[0]).toMatchObject({ kind: 'relocate', entity: 'hero', to: 'c', mode: 'move' });
    // Core relocate asks for escorts and moves the chosen Citizen with the Hero.
    state.queue.shift();
    state.hero.location = 'c';
    state.citizens.visitor.location = 'c';
    resolveMonsterTask(state.queue.shift()!, ctx);
    expect(state.citizens.visitor.location).toBe('c');
    expect(state.queue).toEqual([]);
  });

  it('leaves a Hero in place on card 315 critical failure or while off board', () => {
    const { ctx, state, data } = fixture();
    data.board.locations[0].number = 1;
    data.board.locations[1].number = 2;
    resolveMonsterTask({ kind: 'monster:event-315', result: 1 }, ctx);
    expect(state.hero.location).toBe('b');
    expect(state.frenzy).toBe('beholder');

    state.hero.location = null;
    state.frenzy = 'displacerBeast';
    resolveMonsterTask({ kind: 'monster:event-315', result: 2 }, ctx);
    expect(state.hero.location).toBeNull();
    expect(state.frenzy).toBe('beholder');
  });

  it('leaves the Displacer Beast in place on card 307 critical failure', () => {
    const { ctx, state, data } = fixture();
    data.board.locations[0].number = 1;
    data.board.locations[1].number = 2;
    resolveMonsterTask({ kind: 'monster:event-307', result: 1 }, ctx);
    expect(state.monsters.displacerBeast.location).toBe('c');
    resolveMonsterTask({ kind: 'monster:event-307', result: 2 }, ctx);
    expect(state.monsters.displacerBeast.location).toBe('b');
  });

  it('places a named Citizen using the card location without inventing another piece', () => {
    const { ctx, state } = fixture();
    resolveMonsterTask({ kind: 'monster:event-citizen', card: 'card-308' }, ctx);
    expect(state.citizens.visitor).toEqual({ location: 'b', status: 'board' });
    state.citizens.visitor = { location: null, status: 'rescued' };
    resolveMonsterTask({ kind: 'monster:event-citizen', card: 'card-308' }, ctx);
    expect(state.citizens.visitor).toEqual({ location: null, status: 'rescued' });
  });

  it('executes card 312 reward and advances Frenzy among surviving Monsters', () => {
    const { ctx, state, data, calls } = fixture();
    data.monsterCards.push({ ...data.monsterCards[0], id: 'card-312', printedId: 312, citizenStartingLocation: undefined });
    state.currentCard = 'card-312#1';
    state.monsterCards['card-312#1'] = { id: 'card-312#1', definitionId: 'card-312' };
    resolveMonsterTask({ kind: 'monster:event' }, ctx);
    expect(calls.perks).toBe(1);
    expect(state.frenzy).toBe('beholder');
  });

  it('retains the paid Trial modifier through a potential d20 reroll', () => {
    const { ctx, state, data, calls } = fixture();
    data.items.push({ id: 'supply-a', name: 'Synthetic token', color: 'blue', strength: 4, quantity: 1, locations: ['b'] });
    state.items['supply-a#1'] = { id: 'supply-a#1', definitionId: 'supply-a', destination: 'b' };
    state.hero.items = ['supply-a#1'];
    resolveMonsterTask({ kind: 'monster:event-314', selected: ['supply-a#1'] }, ctx);
    expect(calls.modifiers).toEqual([4]);
    expect(calls.rolls).toEqual([{ kind: 'monster:event-314-result', modifier: 4 }]);
  });
});
