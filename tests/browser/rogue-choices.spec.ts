import { expect, test, type Page } from './test';
import type { GameData } from '../../src/data/gameData';
import { RULESET_VERSION, STACKING_RULESET_VERSION } from '../../src/engine/decisionPolicies';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';
import { createFighterGame, dispatchGame } from '../../src/engine/horrifiedGame';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';

async function saved(page: Page): Promise<FighterGame> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    try {
      const [game] = await library.list();
      return JSON.parse((await library.game(game.id).read()).current!.payload).state;
    } finally { library.close(); }
  });
}

async function seedForBoardChoice(data: GameData): Promise<number> {
  for (let seed = 0; seed < 300; seed++) {
    const initial = await createFighterGame(data, seed, 'hero-rogue');
    const result = dispatchGame(data, initial, { id: 'seed-check', actorSeatId: 'solo', revision: 0, action: { kind: 'special' } });
    if (!result.error && result.state.pending?.resume.kind === 'rogue:location' &&
      result.state.pending.options.some(option => (result.state.boardItems[option.id] ?? []).length >= 2)) return seed;
  }
  throw new Error('No seeded Rogue board choice found.');
}

test('a new Rogue game from v4 components chooses one board Item and resumes exact choices', async ({ page }) => {
  const data = heroFixture();
  data.interpretationVersion = STACKING_RULESET_VERSION;
  data.perks = data.perks.filter(perk => perk.id === 'perk-drizzt-dourden');
  const seed = await seedForBoardChoice(data);
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption('Rogue');
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect((await saved(page)).rulesVersion).toBe(RULESET_VERSION);

  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action', exact: true }).click();
  await expect.poll(async () => (await saved(page)).pending?.resume.kind).toBe('rogue:location');
  const locationChoice = await saved(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect(await saved(page)).toEqual(locationChoice);

  const chosenLocation = locationChoice.pending!.options.find(option => locationChoice.boardItems[option.id].length >= 2)!.id;
  const locationIndex = locationChoice.pending!.options.findIndex(option => option.id === chosenLocation);
  await page.locator('.h-pending input[type=radio]').nth(locationIndex).check();
  await page.locator('.h-pending').getByRole('button', { name: 'Confirm choice' }).click();
  await expect.poll(async () => (await saved(page)).pending?.resume.kind).toBe('rogue:take-board');
  const itemChoice = await saved(page);
  expect(itemChoice.pending).toMatchObject({ min: 0, max: 2, resume: { to: chosenLocation } });
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect(await saved(page)).toEqual(itemChoice);
  await expect(page.locator('.h-pending')).toContainText('Choose 0–2 options to continue.');
  await page.locator('.h-pending input[type=checkbox]').first().check();
  await page.locator('.h-pending').getByRole('button', { name: 'Confirm choice' }).click();
  await expect.poll(async () => (await saved(page)).pending).toBeNull();
  const completed = await saved(page);
  const selected = itemChoice.pending!.options[0].id;
  expect(completed.hero.items).toEqual([selected]);
  expect(completed.boardItems[chosenLocation]).toEqual(itemChoice.boardItems[chosenLocation].filter(id => id !== selected));
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect(await saved(page)).toEqual(completed);
});
