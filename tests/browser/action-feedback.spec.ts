import { expect, readSavedState, startSyntheticGame, test } from './test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

async function start(page: import('@playwright/test').Page) {
  const data = heroFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await startSyntheticGame(page, data, { fileName: 'synthetic-action-feedback.json', hero: 'Fighter', seed: 17 });
}

test('committed Move is explained beside the map and marks its public destination without stealing focus', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  const update = page.getByRole('region', { name: 'Action update' });
  await expect(update).toBeVisible();
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByLabel('Move destination', { exact: true }).selectOption('a');
  await page.getByRole('button', { name: 'Move to selected location' }).click();
  await expect(page.locator('.h-location.current')).toHaveAttribute('data-location-id', 'a');
  await expect(update).toContainText(/Event 1 of \d+/);
  await expect(update).toContainText(/move|Room/i);
  await expect(page.locator('[data-location-id="a"]')).toBeFocused();
  await expect(page.locator('.game-board-recent-ring')).not.toHaveCount(0);
  const before = (await readSavedState(page)).revision;
  await update.getByRole('button', { name: 'Full result details' }).click();
  await expect(page.locator('[data-panel="result"]')).toBeVisible();
  expect((await readSavedState(page)).revision).toBe(before);
});

test('manual event steps explain a Monster Phase without spending an action', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'End Hero Phase', exact: true }).click();
  const update = page.getByRole('region', { name: 'Action update' });
  await expect(update).toContainText(/Event 1 of \d+/);
  const next = update.getByRole('button', { name: 'Next event' });
  const previous = update.getByRole('button', { name: 'Previous event' });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();
  const before = (await readSavedState(page)).revision;
  await next.click();
  await expect(update).toContainText(/Event 2 of \d+/);
  expect((await readSavedState(page)).revision).toBe(before);
  await previous.click();
  await expect(update).toContainText(/Event 1 of \d+/);
  if (await page.locator('.h-pending').isVisible()) {
    await page.getByRole('button', { name: 'Required choice', exact: true }).click();
    await expect(page.locator('.h-pending')).toBeVisible();
  }
});

test('action update fits a narrow screen without hiding the board', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await start(page);
  await expect(page.getByRole('region', { name: 'Action update' })).toBeVisible();
  await expect(page.locator('.game-board-svg')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('action update waits for the save result before showing changed floors', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.evaluate(async () => {
    const path = '/src/session/savedSession.ts';
    const { SavedSession } = await import(path);
    const submit = SavedSession.prototype.submit;
    const held = new Promise<void>(resolve => Object.defineProperty(window, 'releaseActionFeedbackSave', { value: resolve, configurable: true }));
    SavedSession.prototype.submit = async function (...args: unknown[]) {
      SavedSession.prototype.submit = submit;
      await submit.apply(this, args);
      await held;
    };
  });
  const update = page.getByRole('region', { name: 'Action update' });
  const before = await readSavedState(page);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByLabel('Move destination', { exact: true }).selectOption('a');
  await page.getByRole('button', { name: 'Move to selected location' }).click();
  await expect.poll(async () => (await readSavedState(page)).revision).toBe(before.revision + 1);
  await expect(update).toContainText('Saving action');
  await expect(update).not.toContainText('location changed this action');
  await expect(page.locator('.game-board-recent-ring')).toHaveCount(0);
  await page.evaluate(() => { Reflect.get(window, 'releaseActionFeedbackSave')(); Reflect.deleteProperty(window, 'releaseActionFeedbackSave'); });
  await expect(update).toContainText(/Event 1 of \d+/);
  await expect(page.locator('.game-board-recent-ring')).not.toHaveCount(0);
});

test('Pick Up tells the player which visible Item was gained', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  await page.locator('.h-action-editor input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  const update = page.getByRole('region', { name: 'Action update' });
  await expect(update).toContainText(/Picked up 1 Item:/);
  await expect(update).not.toContainText('Used pick-up.');
  const state = await readSavedState(page);
  expect(state.hero.items).toHaveLength(1);
});

test('pending special response stays operable while reviewing committed events', async ({ page }) => {
  const data = heroFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await startSyntheticGame(page, data, { fileName: 'synthetic-pending-feedback.json', hero: 'Fighter', seed: 2 });
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  const choice = page.locator('.h-pending');
  await expect(choice).toBeVisible();
  const update = page.getByRole('region', { name: 'Action update' });
  await expect(update).toContainText('Your choice:');
  const next = update.getByRole('button', { name: 'Next event' });
  if (await next.isEnabled()) await next.click();
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await expect(choice.locator('h2')).toBeFocused();
  const keep = choice.getByRole('radio', { name: /Keep this result|Keep these dice/ });
  if (await keep.count()) await keep.check();
  else await choice.locator('input').first().check();
  await choice.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  await expect(choice).toBeHidden();
});

test('resumed game opens its newest saved event, then reviews earlier ones without replay', async ({ page }) => {
  await start(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'End Hero Phase', exact: true }).click();
  const saved = await readSavedState(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  const update = page.getByRole('region', { name: 'Action update' });
  await expect(update).toContainText(saved.entries.at(-1)!.message);
  const count = Math.min(8, saved.entries.length);
  await expect(update).toContainText(`Event ${count} of ${count}`);
  await expect(update.getByRole('button', { name: 'Next event' })).toBeDisabled();
  await update.getByRole('button', { name: 'Previous event' }).click();
  await expect(update).toContainText(`Event ${count - 1} of ${count}`);
  expect((await readSavedState(page)).revision).toBe(saved.revision);
});
