import { expect, test, type Page } from '@playwright/test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';

/** Read only the save written by the built app; production has no source-module imports. */
async function savedState(page: Page): Promise<FighterGame> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    try {
      return await new Promise<FighterGame>((resolve, reject) => {
        const tx = db.transaction('games', 'readonly');
        const request = tx.objectStore('games').getAll();
        tx.oncomplete = () => {
          if (request.result.length !== 1 || !request.result[0].current?.state) reject(new Error('Expected one saved adventure.'));
          else resolve(request.result[0].current.state);
        };
        tx.onabort = () => reject(tx.error);
        tx.onerror = () => reject(tx.error);
      });
    } finally { db.close(); }
  });
}

async function resolveChoices(page: Page) {
  for (let attempt = 0; attempt < 30; attempt++) {
    const state = await savedState(page);
    if (!state.pending) return;
    const panel = page.locator('.h-pending');
    const keep = panel.getByRole('radio', { name: /Keep this result|Keep these dice/ });
    if (await keep.count()) await keep.check();
    else if (await panel.getByLabel('Wizard destination', { exact: true }).count()) await panel.getByLabel('Wizard destination', { exact: true }).selectOption(state.pending.options[0].id);
    else for (let index = 0; index < state.pending.min; index++) await panel.locator('input').nth(index).check();
    const confirm = panel.getByRole('button', { name: 'Confirm choice', exact: true });
    await expect(confirm).toBeEnabled();
    await confirm.press('Enter');
    await expect.poll(async () => (await savedState(page)).revision).toBe(state.revision + 1);
  }
  throw new Error('Required choices did not resolve within the acceptance bound.');
}

test('the built app starts, restores a pending roll, and completes a game without external requests', async ({ page, context, baseURL }) => {
  const data = heroFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  const origin = new URL(baseURL!).origin;
  const external: string[] = [], requests: string[] = [], errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.fallback();
    external.push(route.request().url());
    return route.abort('internetdisconnected');
  });
  // Always intercept the prepared-data endpoint; no private owner file is a test input.
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'New game', exact: true }).press('Enter');
  await expect(page.getByLabel('Hero', { exact: true }).locator('option')).toHaveCount(5);
  await page.getByLabel('Hero', { exact: true }).selectOption('Fighter');
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('2');
  await page.getByRole('button', { name: 'Start game', exact: true }).press('Enter');
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  const initial = await savedState(page);
  expect(initial.revision).toBe(0);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action', exact: true }).click();
  await expect.poll(async () => (await savedState(page)).revision).toBe(1);
  const pending = await savedState(page);
  expect(pending.pending).not.toBeNull();
  expect(pending.roll).not.toBeNull();
  const value = await page.locator('.h-roll-peek [data-testid="roll-effective"]').innerText();
  // Prepared data can disappear after setup; the saved game and cached base still work.
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ status: 404, body: '' }));
  await page.reload();
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expect(page.locator('.h-roll-peek [data-testid="roll-effective"]')).toHaveText(value);
  expect(await savedState(page)).toEqual(pending);
  await resolveChoices(page);

  for (let turn = 0; turn < 16; turn++) {
    const state = await savedState(page);
    if (state.phase === 'lost') break;
    const end = page.getByRole('button', { name: 'End Hero Phase', exact: true });
    await expect(end).toBeEnabled();
    await end.press('Enter');
    await expect.poll(async () => (await savedState(page)).revision).toBe(state.revision + 1);
    await resolveChoices(page);
  }
  const finished = await savedState(page);
  expect(finished.phase).toBe('lost');
  expect(finished.endReason).toBe('The Monster deck is empty when a draw is required.');
  await expect(page.locator('.h-end')).toContainText('Defeat');
  await expect(page.getByRole('button', { name: 'End Hero Phase', exact: true })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expect(page.locator('.h-end')).toContainText('Defeat');
  expect(await savedState(page)).toEqual(finished);
  expect(requests.some(url => new URL(url).pathname.startsWith('/assets/') && url.endsWith('.js'))).toBe(true);
  expect(requests.some(url => new URL(url).pathname.startsWith('/src/'))).toBe(false);
  expect(external).toEqual([]);
  expect(errors).toEqual([]);
});
