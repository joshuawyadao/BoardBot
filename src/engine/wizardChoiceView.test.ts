import { expect, it } from 'vitest';
import { createFighterGame, dispatchGame, getFighterView } from './horrifiedGame';
import { heroFixture } from './fixtures/heroFixture';

it('reproduces the Wizard follow-up prompt from an ordinary setup and legal rolls', async () => {
  const data = heroFixture();
  let game = await createFighterGame(data, 105, 'hero-wizard');
  const first = dispatchGame(data, game, { id: 'special', revision: game.revision, actorSeatId: 'solo', action: { kind: 'special' } });
  game = first.state;
  expect(game.roll?.result.effectiveResult).toBe(5);
  game = dispatchGame(data, game, { id: 'keep-activation', revision: game.revision, actorSeatId: 'solo', action: { kind: 'choose', choiceId: game.pending!.id, selected: ['pass'] } }).state;
  expect(game.roll?.result.effectiveResult).toBe(17);
  game = dispatchGame(data, game, { id: 'keep-destination', revision: game.revision, actorSeatId: 'solo', action: { kind: 'choose', choiceId: game.pending!.id, selected: ['pass'] } }).state;
  const savedSnapshot = structuredClone(game);
  const view = getFighterView(data, game);
  expect(game).toEqual(savedSnapshot);
  expect(game.monsters).toMatchObject({ beholder: { location: 'c', defeated: false }, displacerBeast: { location: 'a', defeated: false } });
  expect(Object.values(game.boardItems).flat()).toHaveLength(12);
  expect(game.rolls.map(roll => [roll.reason, roll.result.effectiveResult])).toEqual([['Wizard special action', 5], ['Wizard destination', 17]]);
  expect(view.pending?.options.map(option => option.id)).toContain('displacerBeast');
  expect(view.pending?.title).toMatch(/Move an existing Monster/);
  expect(view.pending?.description).toMatch(/initial roll 5.*destination roll 17/i);
  expect(view.pending?.description).toMatch(/already on the board/i);
  expect(view.pending?.destination).toBe('room-17');
  expect(view.pending?.kind).toBe('wizard-monster-target');
  expect(view.pending?.options.find(option => option.id === 'displacerBeast')?.label).toMatch(/Displacer Beast.*from #1 · Room 1.*to #17 · Test room 17/i);
  expect(view.pending).not.toHaveProperty('resume');
  const moved = dispatchGame(data, game, { id: 'move-displacer', revision: game.revision, actorSeatId: 'solo',
    action: { kind: 'choose', choiceId: view.pending!.id, selected: ['displacerBeast'] } });
  expect(moved.error).toBeNull();
  expect(moved.state.monsters.displacerBeast.location).toBe('room-17');
  expect(moved.state.monsters.beholder.location).toBe('c');
  expect(game).toEqual(savedSnapshot);
});

it('shows a direct Wizard result of 17 as a Hero destination choice', async () => {
  const data = heroFixture();
  let game = await createFighterGame(data, 65, 'hero-wizard');
  game = dispatchGame(data, game, { id: 'special', revision: game.revision, actorSeatId: 'solo', action: { kind: 'special' } }).state;
  expect(game.roll?.result.effectiveResult).toBe(17);
  game = dispatchGame(data, game, { id: 'keep-activation', revision: game.revision, actorSeatId: 'solo', action: { kind: 'choose', choiceId: game.pending!.id, selected: ['pass'] } }).state;
  const view = getFighterView(data, game);
  expect(view.pending?.title).toBe('Choose where the Wizard moves');
  expect(view.pending?.description).toMatch(/Wizard special action result 17.*currently at #2 · Room 2/i);
  expect(view.pending?.destination).toBeNull();
  expect(view.pending?.kind).toBe('wizard-hero-destination');
  expect(view.pending?.options.find(option => option.id === 'room-17')?.label).toBe('#17 · Test room 17');
});
