import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { createFighterGame, dispatchGame, getActionReason, getFighterView } from './horrifiedGame';
import type { FighterGame, HeroAction } from './horrifiedRuntime';
import { createRandomState, nextInt } from './gamePrimitives';
import { fighterFixture } from './fixtures/fighterFixture';

function act(data: GameData, state: FighterGame, action: HeroAction): FighterGame {
  const before = structuredClone(state);
  const result = dispatchGame(data, state, { id: `command-${state.revision}`, revision: state.revision, actorSeatId: 'solo', action });
  expect(result.error).toBeNull(); expect(state).toEqual(before);
  return result.state;
}
function choose(data: GameData, state: FighterGame, selected: string[]): FighterGame {
  return act(data, state, { kind: 'choose', choiceId: state.pending!.id, selected });
}
function rollNext(state: FighterGame, value: number) {
  for (let seed = 0; seed < 10000; seed++) {
    const random = createRandomState(seed);
    if (nextInt(random, 20).value + 1 === value) { state.random = random; return; }
  }
  throw new Error('Test random seed not found.');
}
function holdItems(state: FighterGame, ids: string[]) {
  state.bag = state.bag.filter(id => !ids.includes(id)); state.itemDiscard = state.itemDiscard.filter(id => !ids.includes(id));
  for (const [at, items] of Object.entries(state.boardItems)) state.boardItems[at] = items.filter(id => !ids.includes(id));
  state.hero.items = [...new Set([...state.hero.items, ...ids])];
}
function holdPerks(state: FighterGame, ids: string[]) {
  state.perkDeck.push(...state.hero.perks.filter(id => !ids.includes(id))); state.hero.perks = ids;
  state.perkDeck = state.perkDeck.filter(id => !ids.includes(id)); state.perkDiscard = state.perkDiscard.filter(id => !ids.includes(id));
}
function expectConserved(state: FighterGame) {
  const items = [...state.bag, ...state.itemDiscard, ...state.hero.items, ...Object.values(state.boardItems).flat(), ...Object.values(state.displacement)];
  expect(items.sort()).toEqual(Object.keys(state.items).sort());
  const cards = [...state.monsterDeck, ...state.monsterDiscard, ...(state.currentCard ? [state.currentCard] : [])];
  expect(cards.sort()).toEqual(Object.keys(state.monsterCards).sort());
  expect([...state.perkDeck, ...state.perkDiscard, ...state.hero.perks].sort()).toEqual(Object.keys(state.perks).sort());
}

describe('Fighter commands (official rules pp. 5–10 and accepted v3 interpretations)', () => {
  it('moves escorts, rescues immediately, and rejects stale, duplicate, foreign and malformed commands atomically', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 11);
    game.citizens['citizen-a'] = { status: 'board', location: 'b' };
    const perkCount = game.hero.perks.length;
    const command = { id: 'move-1', revision: 0, actorSeatId: 'solo', action: { kind: 'move', destination: 'c', escorts: ['citizen-a'] } as HeroAction };
    game = dispatchGame(data, game, command).state;
    expect(game.hero.location).toBe('c'); expect(game.hero.actions).toBe(3);
    expect(game.citizens['citizen-a']).toEqual({ status: 'rescued', location: null });
    expect(game.hero.perks).toHaveLength(perkCount + 1);
    for (const invalid of [command, { ...command, id: 'stale' }, { ...command, id: 'foreign', revision: 1, actorSeatId: 'other' },
      { ...command, id: 'bad-move', revision: 1, action: { kind: 'move', destination: 'a', escorts: [] } as HeroAction },
      { ...command, id: 'bad-pickup', revision: 1, action: { kind: 'pick-up', items: ['missing'] } as HeroAction }]) {
      const before = structuredClone(game), result = dispatchGame(data, game, invalid);
      expect(result.error).toBeTruthy(); expect(result.state).toBe(game); expect(game).toEqual(before);
    }
    expectConserved(game);
  });

  it('keeps overflow arithmetic, rechecks remaining responses, and awards the final 20 only once', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 9);
    holdPerks(game, ['perk-ott-steeltoes#1', 'perk-ott-steeltoes#2']); rollNext(game, 19);
    game = act(data, game, { kind: 'special' });
    const response = game.pending!.options.find(option => option.id.includes('"delta":2'))!.id;
    const firstChoice = game.pending!.id;
    game = choose(data, game, [response]);
    expect(game.roll?.result).toEqual({ base: 19, modifiers: [2], adjustedTotal: 21, effectiveResult: 20 });
    expect(game.pending!.id).not.toBe(firstChoice);
    expect(game.pending!.options.filter(option => option.id.includes('perk-ott-steeltoes#1'))).toEqual([]);
    expect(game.hero.actions).toBe(3); expect(game.hero.perks).toHaveLength(1);
    game = choose(data, game, ['pass']);
    expect(game.hero.actions).toBe(5); expect(game.hero.perks).toHaveLength(2);
    expect(game.rolls).toHaveLength(1); expect(game.rolls[0].result.adjustedTotal).toBe(21);
    expect(game.roll).toBeNull(); expect(game.pending).toBeNull(); expectConserved(game);
  });

  it('accepts a Skeemo reroll as final even while another relevant Perk is owned', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 9);
    holdPerks(game, ['perk-skeemo-weirdbottle#1', 'perk-ott-steeltoes#1']); rollNext(game, 1);
    game = act(data, game, { kind: 'special' });
    const reroll = game.pending!.options.find(option => option.id.includes('reroll'))!.id;
    rollNext(game, 20); game = choose(data, game, [reroll]);
    expect(game.pending).toBeNull(); expect(game.roll).toBeNull();
    expect(game.hero.actions).toBe(5); expect(game.hero.perks).toContain('perk-ott-steeltoes#1');
    expect(game.rolls).toHaveLength(1); expect(game.rolls[0].result.base).toBe(20);
  });

  it('allows free Perks at zero actions and consumes Jarlaxle before a roll without drawing RNG', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 23);
    holdPerks(game, ['perk-drizzt-dourden#1', 'perk-jarlaxle-baenre#1']); game.hero.actions = 0;
    expect(getFighterView(data, game).actions.perks).toBeNull();
    game = act(data, game, { kind: 'perk', perk: 'perk-drizzt-dourden#1' }); expect(game.hero.actions).toBe(2);
    game = act(data, game, { kind: 'perk', perk: 'perk-jarlaxle-baenre#1' }); const random = { ...game.random };
    game = act(data, game, { kind: 'special' });
    expect(game.random).toEqual(random); expect(game.hero.actions).toBe(3);
    expect(game.hero.effects.automatic20).toBe(false); expect(game.rolls[0].result.effectiveResult).toBe(20);
  });

  it('applies Beholder critical success, restores its exact paid Item, and keeps required eye choices pending', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 3);
    holdPerks(game, []); holdItems(game, ['item-0#1']); game.hero.location = 'c'; rollNext(game, 20);
    game = act(data, game, { kind: 'advance', monster: 'beholder', item: 'item-0#1' });
    expect(game.hero.items).toContain('item-0#1'); expect(game.hero.perks).toHaveLength(1);
    expect(game.pending).toMatchObject({ min: 0, max: 3 });
    expect(getActionReason(data, game, { kind: 'end-phase' })).toMatch(/pending/);
    game = choose(data, game, ['2', '4', '20']); expect(game.damagedEyes).toEqual([2, 4, 20]); expectConserved(game);
  });

  it('continues multi-step Hero moves and offers escorts at each step, including new Citizens', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 3);
    holdPerks(game, []); game.hero.location = 'a'; game.monsters.beholder.location = 'd'; game.monsters.displacerBeast.location = 'd';
    game.citizens['citizen-a'] = { status: 'board', location: 'b' }; rollNext(game, 5);
    game = act(data, game, { kind: 'special' }); game = choose(data, game, ['beholder']);
    expect(game.hero.location).toBe('b'); expect(game.pending?.title).toMatch(/accompany/);
    game = choose(data, game, ['citizen-a']);
    expect(game.hero.location).toBe('d'); expect(game.citizens['citizen-a'].status).toBe('rescued');
    expect(game.hero.actions).toBe(3); expect(game.hero.perks).toHaveLength(1);
  });

  it('checks Mystra exact payment and leaves an invalid selection unspent', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 3);
    holdPerks(game, ['perk-mystra#1']); holdItems(game, ['item-0#1', 'item-5#1', 'item-1#1']);
    game = act(data, game, { kind: 'perk', perk: 'perk-mystra#1' });
    const bad = dispatchGame(data, game, { id: 'bad-cost', revision: game.revision, actorSeatId: 'solo', action: { kind: 'choose', choiceId: game.pending!.id, selected: ['item-5#1', 'item-1#1'] } });
    expect(bad.error).toMatch(/exactly 7/); expect(bad.state).toBe(game);
    game = choose(data, game, ['item-0#1', 'item-5#1']);
    expect(game.terror).toBe(1); expect(game.hero.items).toEqual(['item-1#1']); expect(game.hero.actions).toBe(4); expectConserved(game);
  });

  it('requires strength-legal field placement and handles critical failure separately from ordinary misses', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 3);
    holdPerks(game, []); holdItems(game, Object.keys(game.items)); game.hero.location = 'a';
    expect(getActionReason(data, game, { kind: 'advance', monster: 'displacerBeast', item: 'item-0#1', cell: '1:0' })).toBeTruthy();
    const cells = ['0:0', '0:1', '0:2', '1:0', '1:1'];
    const items = ['item-0#1', 'item-0#2', 'item-6#1', 'item-1#1', 'item-1#2'];
    cells.forEach((cell, index) => { game.displacement[cell] = items[index]; }); game.hero.items = game.hero.items.filter(id => !items.includes(id));
    rollNext(game, 19); game = act(data, game, { kind: 'defeat', monster: 'displacerBeast', items: ['item-5#1', 'item-7#1'] });
    expect(game.pending?.title).toMatch(/Relocate/);
    expect(game.pending!.options.every(option => JSON.parse(option.id).to.startsWith('1:'))).toBe(true);
    game = choose(data, game, [game.pending!.options[0].id]); expect(Object.keys(game.displacement)).toHaveLength(5);
    rollNext(game, 1); game = act(data, game, { kind: 'defeat', monster: 'displacerBeast', items: ['item-5#2', 'item-7#2'] });
    expect(game.pending?.title).toMatch(/discard/); game = choose(data, game, [game.pending!.options[0].id]);
    expect(Object.keys(game.displacement)).toHaveLength(4); expect(game.pending).toBeNull(); expectConserved(game);
  });

  it('skips both phases and consumes next-turn penalties, then ends only on a required empty draw', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 3);
    game.hero.penalties = { skipTurn: true, noMove: true, fewerActions: 1 };
    game.hero.effects.skipMonsterPhase = true;
    game.monsterDiscard.push(...game.monsterDeck); game.monsterDeck = [];
    game = act(data, game, { kind: 'end-phase' });
    expect(game.turn).toBe(3); expect(game.phase).toBe('hero'); expect(game.hero.actions).toBe(4); expect(game.noMoveThisTurn).toBe(false);
    game = act(data, game, { kind: 'end-phase' }); expect(game.phase).toBe('lost'); expect(game.endReason).toBe('The Monster deck is empty when a draw is required.'); expectConserved(game);
  });

  it('projects legal controls and observed supplies without random state, continuation payloads, or future draws', async () => {
    const data = fighterFixture(); const game = await createFighterGame(data, 3);
    const view = getFighterView(data, game);
    for (const key of ['seed', 'random', 'queue', 'commands', 'roll', 'bag', 'monsterDeck', 'perkDeck']) expect(view).not.toHaveProperty(key);
    expect(Object.keys(view.visibleItems).sort()).toEqual(Object.values(game.boardItems).flat().sort());
    expect(Object.keys(view.visiblePerks)).toEqual(game.hero.perks);
    view.hero.items.push('fake'); expect(game.hero.items).toEqual([]);
  });

  it('rejects commands against changed or unbound game data', async () => {
    const data = fighterFixture(); const game = await createFighterGame(data, 3);
    const command = { id: 'different-data', revision: 0, actorSeatId: 'solo', action: { kind: 'end-phase' } as HeroAction };
    const clone = structuredClone(data);
    expect(dispatchGame(clone, game, command).error).toMatch(/data/);
    data.board.edges = [];
    expect(dispatchGame(data, game, command).state).toBe(game);
    expect(dispatchGame(data, game, command).error).toMatch(/data/);
  });
});

describe('complete deterministic synthetic games', () => {
  it('plays from setup through both Monster victories and reproduces every committed command', async () => {
    const data = fighterFixture();
    data.setup!.beholderLocation = 'b'; data.setup!.displacerLocation = 'b';
    data.board.monsterStarts = [{ number: 4, location: 'b' }, { number: 1, location: 'b' }];
    data.monsterCards[0].itemsDrawn = 3; data.monsterCards[0].quantity = 30;
    data.perks = [{ id: 'perk-drizzt-dourden', name: 'Synthetic extra actions', quantity: 3, effect: 'Synthetic effect' }];
    data.items.forEach(item => { item.quantity = 10; item.locations = Array<string>(10).fill('b'); });
    let game = await createFighterGame(data, 730);
    for (let step = 0; step < 300 && game.phase !== 'won' && game.phase !== 'lost'; step++) {
      const view = getFighterView(data, game);
      if (game.pending) { game = choose(data, game, game.pending.options.slice(0, game.pending.max).map(option => option.id)); }
      else if (!view.actions['pick-up']) game = act(data, game, { kind: 'pick-up', items: [...game.boardItems.b] });
      else if (!game.hero.actions) game = act(data, game, { kind: 'end-phase' });
      else if (!game.monsters.beholder.defeated) {
        const cost = game.hero.items.filter(id => data.items.find(item => item.id === game.items[id].definitionId)?.color === 'yellow');
        if (!getActionReason(data, game, { kind: 'defeat', monster: 'beholder', items: cost })) game = act(data, game, { kind: 'defeat', monster: 'beholder', items: cost });
        else {
          const advance = view.advanceOptions.find(option => option.monster === 'beholder');
          game = act(data, game, advance ?? { kind: 'end-phase' });
        }
      } else {
        const cost: string[] = []; let strength = 0;
        for (const id of game.hero.items) { cost.push(id); strength += data.items.find(item => item.id === game.items[id].definitionId)!.strength; if (strength >= 7) break; }
        if (!getActionReason(data, game, { kind: 'defeat', monster: 'displacerBeast', items: cost })) game = act(data, game, { kind: 'defeat', monster: 'displacerBeast', items: cost });
        else game = act(data, game, view.advanceOptions.find(option => option.monster === 'displacerBeast') ?? { kind: 'end-phase' });
      }
      expectConserved(game);
    }
    expect(game.phase).toBe('won'); expect(game.monsters.beholder.defeated).toBe(true); expect(game.monsters.displacerBeast.defeated).toBe(true);
    let replay = await createFighterGame(data, 730);
    for (const command of game.commands) { const result = dispatchGame(data, replay, command); expect(result.error).toBeNull(); replay = result.state; }
    expect(replay).toEqual(game); expect(game.turn).toBeGreaterThan(1);
  });

  it('runs complete Monster turns to deck exhaustion without stale choices or dropped cards', async () => {
    const data = fighterFixture(); let game = await createFighterGame(data, 1);
    for (let turn = 0; turn <= 8; turn++) game = act(data, game, { kind: 'end-phase' });
    expect(game.phase).toBe('lost'); expect(game.monsterDiscard).toHaveLength(8); expect(game.pending).toBeNull(); expectConserved(game);
  });
});
