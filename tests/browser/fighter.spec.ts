import { expect, test, type Page } from '@playwright/test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';

async function loadSyntheticFighter(page: Page, seed = 17) {
  await page.goto('/');
  await page.getByText('Load prepared local game data').click();
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.locator('#game-data-file').setInputFiles({
    name: 'synthetic-game-data.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(fighterFixture())),
  });
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

test('local import opens a Fighter table with visible map, resources, and no hidden deck order', async ({ page }) => {
  await loadSyntheticFighter(page);
  await expect(page.getByRole('heading', { name: 'The city and dungeon' })).toBeVisible();
  await expect(page.locator('.h-location')).toHaveCount(4);
  await expect(page.locator('.h-map-paths line')).toHaveCount(3);
  await expect(page.locator('.h-tray .action-card')).toHaveCount(8);
  await expect(page.getByText('Monster progress')).toBeVisible();
  await expect(page.getByText('Fighter inventory')).toBeVisible();
  await expect(page.getByText('Perks discarded:')).toBeVisible();
  const text = await page.locator('.h-table').innerText();
  expect(text).not.toContain('monsterDeck:');
  expect(text).not.toContain('random:');
  expect(text).not.toContain('dataIdentity:');
});

test('keyboard Move targets a destination and same-tick clicks commit once', async ({ page }) => {
  await loadSyntheticFighter(page);
  const move = page.getByRole('button', { name: 'Move Connected location' });
  await move.focus();
  await page.keyboard.press('Enter');
  const destination = page.getByRole('button', { name: /Room 1/ });
  await expect(destination).toBeFocused();
  await destination.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.locator('.h-table .hero span')).toHaveText('At Room 1');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await expect(move).toHaveAttribute('aria-disabled', 'true');
  await page.waitForTimeout(340);
  await expect(move).toHaveAttribute('aria-disabled', 'false');
});

test('confirmed special action and Monster Phase run with local requests only', async ({ page }) => {
  const externalRequests: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await loadSyntheticFighter(page);
  const special = page.getByRole('button', { name: 'Special Action Hero ability' });
  await special.focus();
  await page.keyboard.press('Enter');
  const confirm = page.getByRole('button', { name: 'Confirm action' });
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('log', { name: 'Game history' })).toContainText('rolled');
  await page.waitForTimeout(340);
  for (let step = 0; step < 10; step++) {
    const choice = page.getByRole('button', { name: 'Confirm choice' });
    if (await choice.isVisible().catch(() => false)) {
      if (await choice.isDisabled()) await page.locator('.h-pending input').first().check();
      await choice.click();
      await page.waitForTimeout(340);
      continue;
    }
    break;
  }
  const end = page.getByRole('button', { name: 'End Hero Phase' });
  await expect(end).toBeEnabled();
  await end.click();
  await page.waitForTimeout(340);
  for (let step = 0; step < 10; step++) {
    const choice = page.getByRole('button', { name: 'Confirm choice' });
    if (!(await choice.isVisible().catch(() => false))) break;
    if (await choice.isDisabled()) await page.locator('.h-pending input').first().check();
    await choice.click();
    await page.waitForTimeout(340);
  }
  await expect(page.getByRole('log', { name: 'Game history' })).toContainText('Monster Phase');
  await expect(page.getByText('TURN 2 · HERO PHASE', { exact: true })).toBeVisible();
  expect(externalRequests).toEqual([]);
});

test('a whole synthetic game reaches defeat and locks actions after the last required draw', async ({ page }) => {
  await loadSyntheticFighter(page);
  const end = page.getByRole('button', { name: 'End Hero Phase' });
  for (let turn = 0; turn < 9; turn++) {
    await expect(end).toBeEnabled();
    await end.focus(); await page.keyboard.press('Enter');
  }
  await expect(page.locator('.h-end')).toContainText('Defeat');
  await expect(page.locator('.h-end')).toContainText('The Monster deck is empty when a draw is required.');
  await expect(end).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Special Action Hero ability' })).toHaveAttribute('aria-disabled', 'true');
});
