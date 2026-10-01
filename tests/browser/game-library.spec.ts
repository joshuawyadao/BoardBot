import { expect, test, type Page } from './test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

async function records(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const games = await library.list();
    const saved = await Promise.all(games.map(async (game: { id: string }) => ({
      id: game.id, payload: (await library.game(game.id).read()).current!.payload,
    })));
    library.close(); return saved;
  });
}
async function start(page: Page, hero: string) {
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption(hero);
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText(`Local ${hero} game`)).toBeVisible();
}

test('prepared base game starts after Hero selection and preserves independent adventures', async ({ page }) => {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: heroFixture() }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  expect(await records(page)).toEqual([]);
  await expect(page.getByRole('region', { name: 'The training grounds' })).toBeHidden();
  await start(page, 'Fighter');
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  const [first] = await records(page);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await start(page, 'Wizard');
  const both = await records(page);
  expect(both).toHaveLength(2);
  expect(both.find(game => game.id === first.id)).toEqual(first);
  const wizard = JSON.parse(both.find(game => game.id !== first.id)!.payload).state;
  expect(wizard.hero.definitionId).toBe('hero-wizard');
  expect(wizard.commands).toEqual([]);
  expect(wizard.turn).toBe(1);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(2);
  await page.getByRole('article', { name: 'Fighter saved game', exact: true }).getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await expect(page.locator('.h-table .hero')).toContainText('Room 1');
  expect((await records(page)).find(game => game.id === first.id)).toEqual(first);
});

test('cached base data stays ready without the prepared file and cancelled setup creates no save', async ({ page }) => {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: heroFixture() }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption('Cleric');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  expect(await records(page)).toEqual([]);
  await page.unroute('**/__boardbot/local-game-data');
  await page.reload();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await start(page, 'Rogue');
  expect(JSON.parse((await records(page))[0].payload).state.hero.definitionId).toBe('hero-rogue');
});

test('a fresh clone offers one-time import and a sample, then remembers the base game', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Import the prepared base game once.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Try sample table' }).click();
  await expect(page.getByRole('region', { name: 'The training grounds' })).toBeVisible();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await page.getByText('Import game data or backup', { exact: true }).click();
  await page.locator('#game-data-file').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(heroFixture())) });
  await expect(page.getByRole('heading', { name: 'Choose your Hero' })).toBeVisible();
  expect(await records(page)).toEqual([]);
  await page.reload();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByRole('button', { name: 'Start game', exact: true }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(JSON.parse((await records(page))[0].payload).state.hero.definitionId).toBe('hero-fighter');
});

test('invalid prepared data cannot replace cached components or an existing save', async ({ page }) => {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: heroFixture() }));
  await page.goto('/');
  await start(page, 'Bard');
  const before = await records(page);
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: { invalid: true } }));
  await page.reload();
  await expect(page.getByText('Using the saved base game data.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  expect(await records(page)).toEqual(before);
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByText('Local Bard game')).toBeVisible();
});

test('a failed initial save retries the same setup once without creating a second game', async ({ page }) => {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: heroFixture() }));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption('Cleric');
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'games') {
        IDBObjectStore.prototype.put = original;
        this.transaction.abort();
        throw new Error('Simulated initial write failure');
      }
      return original.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Retry saving new game' })).toBeVisible();
  expect(await records(page)).toEqual([]);
  await page.getByRole('button', { name: 'Retry saving new game' }).click();
  await expect(page.getByText('Local Cleric game')).toBeVisible();
  const saved = await records(page);
  expect(saved).toHaveLength(1);
  expect(JSON.parse(saved[0].payload).state.seed).toBe(17);
  expect(JSON.parse(saved[0].payload).state.commands).toEqual([]);
});

test('the earlier single save appears automatically and seeds New Game without an import', async ({ page }) => {
  await page.goto('/src/session/localSaveStore.ts');
  const original = await page.evaluate(async data => {
    const oldPath = '/src/session/localSaveStore.ts';
    const enginePath = '/src/engine/horrifiedGame.ts';
    const codecPath = '/src/session/gameSave.ts';
    const { createFighterGame, dispatchGame } = await import(enginePath);
    const { encodeGameSave } = await import(codecPath);
    const store = await (await import(oldPath)).openLocalSaveStore();
    const game = await createFighterGame(data, 17, 'hero-cleric');
    const first = await store.write(encodeGameSave(data, game), null);
    const moved = dispatchGame(data, game, { id: 'legacy-move', revision: 0, actorSeatId: 'solo', action: { kind: 'move', destination: 'a', escorts: [] } });
    if (moved.error) throw new Error(moved.error);
    const payload = encodeGameSave(data, moved.state);
    await store.write(payload, first.token); store.close(); return payload;
  }, heroFixture());
  await page.goto('/');
  await expect(page.getByRole('article', { name: 'Cleric saved game', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByText('Local Cleric game')).toBeVisible();
  expect(await records(page)).toEqual([{ id: 'legacy', payload: original }]);
});
