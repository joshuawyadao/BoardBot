import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { createFighterGame, dispatchGame, getActionReason, getFighterView } from './horrifiedGame';
import type { FighterGame, HeroAction } from './horrifiedRuntime';
import { createRandomState, nextInt } from './gamePrimitives';
import { heroFixture } from './fixtures/heroFixture';

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const before = structuredClone(state);
  const applied = dispatchGame(data, state, { id: `hero-${state.revision}`, revision: state.revision, actorSeatId: 'solo', action });
  expect(applied.error).toBeNull();
  expect(state).toEqual(before);
  return applied.state;
}

function choose(data: GameData, state: FighterGame, selected: string[]): FighterGame {
  expect(state.pending).not.toBeNull();
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected });
}

function nextRoll(state: FighterGame, value: number): void {
  for (let seed = 0; seed < 10000; seed++) {
    const random = createRandomState(seed);
    if (nextInt(random, 20).value + 1 === value) { state.random = random; return; }
  }
  throw new Error('No synthetic roll seed found.');
}

function holdOtt(state: FighterGame): void {
  state.perkDeck.push(...state.hero.perks.filter(id => id !== 'perk-ott-steeltoes#1'));
  state.hero.perks = ['perk-ott-steeltoes#1'];
  state.perkDeck = state.perkDeck.filter(id => id !== 'perk-ott-steeltoes#1');
}

async function hero(role: string, roll: number): Promise<{ data: GameData; game: FighterGame }> {
  const data = heroFixture();
  let game = await createFighterGame(data, 43, `hero-${role}`);
  game.perkDeck.push(...game.hero.perks); game.hero.perks = [];
  nextRoll(game, roll);
  game = act(data, game, { kind: 'special' });
  return { data, game };
}

describe('remaining base Heroes with synthetic components and accepted v3 interpretations', () => {
  it('initializes every supported Hero at its own start and rejects unknown IDs', async () => {
    const data = heroFixture();
    for (const role of ['bard', 'cleric', 'fighter', 'rogue', 'wizard']) {
      const state = await createFighterGame(data, 3, `hero-${role}`);
      expect(state.hero).toMatchObject({ definitionId: `hero-${role}`, location: 'b', actions: 4 });
    }
    await expect(createFighterGame(data, 3, 'hero-unknown')).rejects.toThrow(/Unsupported Hero/);
  });

  it('Bard handles failure, ordered Citizen movement, solo Hero no-op, away movement, and the critical placement', async () => {
    const lowData = heroFixture();
    lowData.citizens.push({ id: 'citizen-b', name: 'Second visitor', quantity: 1, safeDestination: 'room-20' });
    let low = await createFighterGame(lowData, 4, 'hero-bard');
    low.hero.perks = []; low.citizens['citizen-a'] = { status: 'board', location: 'a' };
    low.citizens['citizen-b'] = { status: 'board', location: 'c' };
    nextRoll(low, 5); low = act(lowData, low, { kind: 'special' });
    expect(low.pending?.options.map(option => option.id)).toEqual(['citizen-a', 'citizen-b']);
    low = choose(lowData, low, ['citizen-a']);
    expect(low.pending?.title).toMatch(/Move/);
    low = choose(lowData, low, ['b']);
    expect(low.citizens['citizen-a'].location).toBe('b');
    expect(low.pending?.options.map(option => option.id)).toContain('stop');
    low = choose(lowData, low, ['stop']);
    expect(low.citizens['citizen-b'].location).toBe('c');
    while (low.pending) low = choose(lowData, low, [low.pending.options.find(option => option.id === 'stop')?.id ?? low.pending.options[0].id]);

    const failed = await hero('bard', 1);
    expect(failed.game.pending).toBeNull(); expect(failed.game.hero.actions).toBe(3);
    const middle = await hero('bard', 12);
    expect(middle.game.hero.location).toBe('b'); expect(middle.game.pending).toBeNull();
    const highData = heroFixture(); let high = await createFighterGame(highData, 3, 'hero-bard');
    high.monsters.beholder.location = 'b'; high.monsters.displacerBeast.location = 'b';
    nextRoll(high, 17); high = act(highData, high, { kind: 'special' });
    expect(high.pending?.options.map(option => option.id)).toEqual(['beholder', 'displacerBeast']);
    high = choose(highData, high, ['beholder']);
    expect(high.pending?.options.map(option => option.id)).not.toContain('stop');
    high = choose(highData, high, ['a']);
    expect(high.monsters.beholder.location).toBe('a');
    high = choose(highData, high, ['c']);
    expect(high.monsters.displacerBeast.location).toBe('d');

    const criticalData = heroFixture(); let critical = await createFighterGame(criticalData, 3, 'hero-bard');
    critical.citizens['citizen-a'] = { status: 'board', location: 'a' };
    nextRoll(critical, 20); critical = act(criticalData, critical, { kind: 'special' });
    expect(critical.hero.perks).toHaveLength(2);
    critical = choose(criticalData, critical, ['citizen-a']);
    expect(critical.citizens['citizen-a'].location).toBe('b');
  });

  it('Cleric saves every roll band, accumulates and expires effects, and can rescue herself', async () => {
    expect((await hero('cleric', 1)).game.hero.effects.clericRerollOne).toBe(0);
    expect((await hero('cleric', 5)).game.hero.effects.clericRerollOne).toBe(1);
    expect((await hero('cleric', 12)).game.hero.effects.clericRerollAll).toBe(1);
    expect((await hero('cleric', 17)).game.hero.effects.clericRescue).toBe(1);
    const critical = await hero('cleric', 20);
    expect(critical.game.hero.effects.clericOneDieAttacks).toBe(1);
    expect(critical.game.hero.perks).toHaveLength(1);
    let game = critical.game;
    nextRoll(game, 20); game = act(critical.data, game, { kind: 'special' });
    expect(game.hero.effects.clericOneDieAttacks).toBe(2);
    game.hero.effects.clericRescue = 1;
    game.hero.penalties = { noMove: true, fewerActions: 1, skipTurn: true };
    game.queue = [{ kind: 'damage', entity: 'hero', amount: 1, reason: 'Synthetic attack' }];
    // The next command resumes a pending serialized effect through the ordinary queue.
    game.pending = { id: 'synthetic-rescue', title: 'Synthetic damage', options: [{ id: 'defeat', label: 'Defeat' }], min: 1, max: 1,
      resume: { kind: 'damage:choice', entity: 'hero' } };
    game.queue = [];
    game.phase = 'monster';
    game = choose(critical.data, game, ['defeat']);
    expect(game.pending?.title).toMatch(/Cleric rescue/);
    game = choose(critical.data, game, ['rescue']);
    expect(game.hero.location).toBe('b'); expect(game.hero.effects.clericRescue).toBe(0);
    expect(game.hero.penalties).toEqual({ noMove: false, fewerActions: 0, skipTurn: false });

    const repeated = await hero('cleric', 5);
    nextRoll(repeated.game, 5);
    const twice = act(repeated.data, repeated.game, { kind: 'special' });
    expect(twice.hero.effects.clericRerollOne).toBe(2);
    const nextTurn = act(repeated.data, twice, { kind: 'end-phase' });
    expect(nextTurn.turn).toBe(2);
    expect(nextTurn.hero.effects.clericRerollOne).toBe(0);
  });

  it('does not treat a defeated Cleric saved from Terror as a card-event survivor', async () => {
    const data = heroFixture();
    data.setup!.beholderLocation = 'b';
    data.board.monsterStarts = [{ number: 4, location: 'b' }, { number: 1, location: 'a' }];
    data.monsters.beholder.activationSymbols.push('green flask');
    data.monsterCards = [{ id: 'card-blast', printedId: 303, name: 'Synthetic blast', quantity: 1,
      itemsDrawn: 0, activationSymbols: [], movement: 0, attackDice: 0, event: 'Synthetic effect' }];

    let rescued = await createFighterGame(data, 3, 'hero-cleric');
    rescued.hero.effects.clericRescue = 1;
    const startingTerror = rescued.terror;
    rescued = act(data, rescued, { kind: 'end-phase' });
    expect(rescued.pending?.title).toBe('Monster event');
    rescued = choose(data, rescued, ['defeat']);
    expect(rescued.pending?.title).toMatch(/Cleric rescue/);
    rescued = choose(data, rescued, ['rescue']);
    expect(rescued.pending).toBeNull();
    expect(rescued.hero.location).toBe('b');
    expect(rescued.terror).toBe(startingTerror);
    expect(rescued.damageOutcomes).toEqual({});
    expect(rescued.entries.some(entry => entry.message.includes('survivor destination'))).toBe(false);

    let defended = await createFighterGame(data, 3, 'hero-cleric');
    const item = Object.values(defended.boardItems).flat()[0];
    for (const ids of Object.values(defended.boardItems)) { const index = ids.indexOf(item); if (index >= 0) ids.splice(index, 1); }
    defended.hero.items.push(item);
    defended = act(data, defended, { kind: 'end-phase' });
    defended = choose(data, defended, ['defend']);
    defended = choose(data, defended, [item]);
    expect(defended.pending?.title).toBe('Choose a survivor destination');
    defended = choose(data, defended, ['a']);
    expect(defended.hero.location).toBe('a');
    expect(defended.damageOutcomes).toEqual({});
  });

  it('Rogue handles solo share, nearest one-location choice, partial discard, and random bag Items', async () => {
    expect((await hero('rogue', 1)).game.hero.items).toHaveLength(0);
    expect((await hero('rogue', 5)).game.hero.items).toHaveLength(0);
    const data = heroFixture(); let game = await createFighterGame(data, 7, 'hero-rogue');
    for (const id of Object.keys(game.boardItems)) game.boardItems[id] = [];
    game.boardItems.a = ['item-0#1']; game.boardItems.c = ['item-1#1'];
    game.bag = game.bag.filter(id => !['item-0#1', 'item-1#1'].includes(id));
    nextRoll(game, 12); game = act(data, game, { kind: 'special' });
    expect(game.pending?.options.map(option => option.id)).toEqual(['a', 'c']);
    game = choose(data, game, ['a']);
    expect(game.pending?.options.map(option => option.id)).toEqual(['item-0#1']);
    game = choose(data, game, ['item-0#1']);
    expect(game.hero.items).toContain('item-0#1'); expect(game.boardItems.c).toEqual(['item-1#1']);

    const discardData = heroFixture(); let discard = await createFighterGame(discardData, 7, 'hero-rogue');
    discard.itemDiscard = ['item-0#1'];
    discard.bag = discard.bag.filter(id => id !== 'item-0#1');
    for (const ids of Object.values(discard.boardItems)) { const index = ids.indexOf('item-0#1'); if (index >= 0) ids.splice(index, 1); }
    nextRoll(discard, 17); discard = act(discardData, discard, { kind: 'special' });
    expect(discard.pending?.max).toBe(1);
    discard = choose(discardData, discard, ['item-0#1']);
    expect(discard.hero.items).toContain('item-0#1');

    const bagData = heroFixture(); let bag = await createFighterGame(bagData, 7, 'hero-rogue');
    bag.bag = bag.bag.slice(0, 2); bag.itemDiscard = [];
    nextRoll(bag, 20); bag = act(bagData, bag, { kind: 'special' });
    expect(bag.hero.items).toHaveLength(2); expect(bag.hero.perks).toHaveLength(2);
  });

  it('Wizard uses independent destination rolls and offers escorts on Hero moves', async () => {
    expect((await hero('wizard', 1)).game.hero.location).toBe('b');
    const data = heroFixture(); let game = await createFighterGame(data, 9, 'hero-wizard');
    holdOtt(game); game.citizens['citizen-a'] = { status: 'board', location: 'b' };
    nextRoll(game, 5); game = act(data, game, { kind: 'special' });
    expect(game.pending?.title).toMatch(/Wizard special action/);
    nextRoll(game, 1); game = choose(data, game, ['pass']);
    expect(game.roll?.reason).toBe('Wizard destination');
    game = choose(data, game, ['pass']);
    expect(game.pending?.options.map(option => option.id)).toContain('beholder');
    game = choose(data, game, ['beholder']);
    expect(game.monsters.beholder.location).toBe('a');
    expect(game.citizens['citizen-a'].location).toBe('b');
    expect(game.rolls.map(roll => roll.result.effectiveResult)).toEqual([5, 1]);

    const destinationTwenty = heroFixture(); let rewarded = await createFighterGame(destinationTwenty, 9, 'hero-wizard');
    holdOtt(rewarded);
    nextRoll(rewarded, 5); rewarded = act(destinationTwenty, rewarded, { kind: 'special' });
    nextRoll(rewarded, 20); rewarded = choose(destinationTwenty, rewarded, ['pass']);
    rewarded = choose(destinationTwenty, rewarded, ['pass']);
    expect(rewarded.rolls.map(roll => roll.result.effectiveResult)).toEqual([5, 20]);
    expect(rewarded.hero.perks).toHaveLength(2);
    expect(rewarded.pending?.options.map(option => option.id)).toContain('beholder');

    const middleData = heroFixture(); let middle = await createFighterGame(middleData, 9, 'hero-wizard');
    holdOtt(middle); middle.citizens['citizen-a'] = { status: 'board', location: 'b' };
    nextRoll(middle, 12); middle = act(middleData, middle, { kind: 'special' });
    nextRoll(middle, 3); middle = choose(middleData, middle, ['pass']);
    middle = choose(middleData, middle, ['pass']);
    expect(middle.pending?.title).toMatch(/accompany/);
    middle = choose(middleData, middle, []);
    expect(middle.hero.location).toBe('c'); expect(middle.citizens['citizen-a'].location).toBe('b');

    const high = await hero('wizard', 17);
    expect(high.game.pending?.options).toHaveLength(20);
    const moved = choose(high.data, high.game, ['room-20']);
    expect(moved.hero.location).toBe('room-20');

    const criticalData = heroFixture(); let critical = await createFighterGame(criticalData, 9, 'hero-wizard');
    critical.citizens['citizen-a'] = { status: 'board', location: 'b' };
    nextRoll(critical, 20); critical = act(criticalData, critical, { kind: 'special' });
    expect(critical.hero.perks).toHaveLength(2);
    critical = choose(criticalData, critical, ['c']);
    expect(critical.pending?.title).toMatch(/accompany/);
    critical = choose(criticalData, critical, ['citizen-a']);
    expect(critical.hero.location).toBe('c'); expect(critical.citizens['citizen-a'].status).toBe('rescued');
  });

  it('completes and replays a legal deck-exhaustion game for every Hero without state mutation', async () => {
    const data = heroFixture();
    for (const role of ['bard', 'cleric', 'fighter', 'rogue', 'wizard']) {
      let game = await createFighterGame(data, 5, `hero-${role}`);
      for (let turn = 0; turn <= 8 && game.phase !== 'lost'; turn++) {
        expect(game.pending).toBeNull();
        game = act(data, game, { kind: 'end-phase' });
      }
      expect(game.phase).toBe('lost');
      expect(game.endReason).toBe('The Monster deck is empty when a draw is required.');
      let replay = await createFighterGame(data, 5, `hero-${role}`);
      for (const command of game.commands) {
        const applied = dispatchGame(data, replay, command);
        expect(applied.error).toBeNull();
        replay = applied.state;
      }
      expect(replay).toEqual(game);
    }
  });

  it('plays and replays a synthetic victory with both Monsters for every Hero', async () => {
    const data = heroFixture();
    data.setup!.beholderLocation = 'b'; data.setup!.displacerLocation = 'b';
    data.board.monsterStarts = [{ number: 4, location: 'b' }, { number: 1, location: 'b' }];
    data.monsterCards[0].itemsDrawn = 3; data.monsterCards[0].quantity = 30;
    data.perks = [{ id: 'perk-drizzt-dourden', name: 'Synthetic extra actions', quantity: 3, effect: 'Synthetic effect' }];
    data.items.forEach(item => { item.quantity = 10; item.locations = Array<string>(10).fill('b'); });
    for (const role of ['bard', 'cleric', 'fighter', 'rogue', 'wizard']) {
      let game = await createFighterGame(data, 730, `hero-${role}`);
      for (let step = 0; step < 300 && game.phase !== 'won' && game.phase !== 'lost'; step++) {
        const view = getFighterView(data, game);
        if (game.pending) game = choose(data, game, game.pending.options.slice(0, game.pending.max).map(option => option.id));
        else if (!view.actions['pick-up']) game = act(data, game, { kind: 'pick-up', items: [...game.boardItems.b] });
        else if (!game.hero.actions) game = act(data, game, { kind: 'end-phase' });
        else if (!game.monsters.beholder.defeated) {
          const cost = game.hero.items.filter(id => data.items.find(item => item.id === game.items[id].definitionId)?.color === 'yellow');
          const defeat: HeroAction = { kind: 'defeat', monster: 'beholder', items: cost };
          game = act(data, game, !getActionReason(data, game, defeat) ? defeat
            : view.advanceOptions.find(option => option.monster === 'beholder') ?? { kind: 'end-phase' });
        } else {
          const cost: string[] = []; let strength = 0;
          for (const id of game.hero.items) {
            cost.push(id);
            strength += data.items.find(item => item.id === game.items[id].definitionId)!.strength;
            if (strength >= 7) break;
          }
          const defeat: HeroAction = { kind: 'defeat', monster: 'displacerBeast', items: cost };
          game = act(data, game, !getActionReason(data, game, defeat) ? defeat
            : view.advanceOptions.find(option => option.monster === 'displacerBeast') ?? { kind: 'end-phase' });
        }
      }
      expect(game.phase).toBe('won');
      expect(game.monsters.beholder.defeated).toBe(true);
      expect(game.monsters.displacerBeast.defeated).toBe(true);
      let replay = await createFighterGame(data, 730, `hero-${role}`);
      for (const command of game.commands) {
        const applied = dispatchGame(data, replay, command);
        expect(applied.error).toBeNull(); replay = applied.state;
      }
      expect(replay).toEqual(game);
    }
  });
});
