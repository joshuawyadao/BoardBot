import { expect, test, type Page } from './test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';
import { TABLE_PREFERENCES_KEY } from '../../src/ui/tablePreferences';

async function start(page: Page, hero = 'Fighter', seed = 17) {
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption(hero);
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

async function ready(page: Page, data = heroFixture()) {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
}

test('layout follows the browser through the game library, reload and a second adventure', async ({ page }) => {
  await ready(page);
  await start(page);
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  await page.getByRole('button', { name: 'Move Inventory panel to left' }).click();
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Move Review action panel to left' }).click();
  await page.locator('.h-location').first().click();
  await page.getByRole('button', { name: 'Move Location inspector panel to left' }).click();
  await page.getByRole('button', { name: 'Hide actions' }).click();
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), TABLE_PREFERENCES_KEY);
  expect(saved).toMatchObject({ version: 1, open: ['inventory', 'log'], sides: { inventory: 'left', inspector: 'left' }, contextSide: 'left', actionsCollapsed: true });
  expect(saved.open).not.toContain('inspector');

  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await page.reload();
  await page.getByRole('article', { name: 'Fighter saved game', exact: true }).getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('[data-panel="inventory"]')).toBeVisible();
  await expect(page.locator('[data-panel="log"]')).toBeVisible();
  await expect(page.locator('[data-panel="inspector"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show actions' })).toBeVisible();
  const board = (await page.locator('.h-board-fit').boundingBox())!;
  expect((await page.locator('[data-panel="inventory"]').boundingBox())!.x).toBeLessThan(board.x);
  await page.getByRole('button', { name: 'Close Inventory' }).click();
  await expect(page.getByRole('button', { name: /^Inventory/ })).toBeFocused();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await start(page, 'Wizard');
  await expect(page.locator('[data-panel="log"]')).toBeVisible();
  await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show actions' })).toBeVisible();
  expect((await page.locator('[data-panel="setup"]').boundingBox())!.x).toBeLessThan((await page.locator('.h-board-fit').boundingBox())!.x);
});

test('reset only changes presentation while retaining an action draft, pending choice and saved game', async ({ page }) => {
  await ready(page, fighterFixture());
  await start(page, 'Fighter', 2);
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByLabel('Move destination', { exact: true }).selectOption({ index: 1 });
  const destination = await page.getByLabel('Move destination', { exact: true }).inputValue();
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect(page.locator('.h-layout-status')).toHaveText('Table layout reset.');
  await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
  await expect(page.locator('[data-panel="action"]')).toBeVisible();
  await expect(page.getByLabel('Move destination', { exact: true })).toHaveValue(destination);
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  const pending = page.locator('.h-pending');
  await expect(pending).toBeVisible();
  await pending.locator('input').first().check();
  const checked = await pending.locator('input:checked').count();
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect(pending.locator('input:checked')).toHaveCount(checked);
  await expect(pending.getByRole('button', { name: 'Confirm choice' })).toBeEnabled();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await expect(page.getByRole('article', { name: 'Fighter saved game', exact: true })).toHaveCount(1);
  await page.getByRole('article', { name: 'Fighter saved game', exact: true }).getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
});

test('invalid or blocked local storage falls back to a usable table', async ({ page }) => {
  await ready(page, fighterFixture());
  await page.evaluate(key => localStorage.setItem(key, '{invalid'), TABLE_PREFERENCES_KEY);
  await start(page);
  await expect(page.getByRole('button', { name: 'Hide actions' })).toBeVisible();
  await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await page.addInitScript(() => Object.defineProperty(window, 'localStorage', { configurable: true, get: () => { throw new Error('Storage unavailable'); } }));
  await page.reload();
  await page.getByRole('article', { name: 'Fighter saved game', exact: true }).getByRole('button', { name: 'Resume saved game' }).click();
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(page.locator('[data-panel="inventory"]')).toBeVisible();
  await page.getByRole('button', { name: 'Reset layout' }).click();
  await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeEnabled();
});
