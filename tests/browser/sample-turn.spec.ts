import { expect, test } from '@playwright/test';

test('selection is free; confirmation commits once and locks controls until resolution', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  await expect(page.getByText('A sample, not a real game.')).toBeVisible();
  const move = page.getByRole('button', { name: 'Move Explore' });
  const wait = page.getByRole('button', { name: 'Wait Stay' });
  const confirm = page.getByRole('button', { name: 'Confirm action' });
  await expect(confirm).toBeDisabled();
  await move.click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(confirm).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Ruins', exact: true })).toHaveAttribute('aria-disabled', 'true');
  await page.getByLabel('Destination', { exact: true }).selectOption('crossroads');
  await expect(confirm).toBeEnabled();
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(confirm).toBeDisabled();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await move.click();
  await page.getByRole('button', { name: 'Crossroads', exact: true }).click();
  // Two same-tick submissions model a repeated click before React renders the lock.
  await confirm.evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
  await expect(move).toBeDisabled();
  await expect(wait).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Resolving…', exact: false })).toBeDisabled();
  await expect(page.getByRole('listitem').filter({ hasText: 'Moved from camp to crossroads.' })).toHaveCount(1);
  await page.clock.runFor(950);
  await expect(page.getByRole('heading', { name: 'Your turn' })).toBeVisible();
  await expect(move).toBeEnabled();
  await expect(confirm).toBeDisabled();
});

test('a keyboard user can read descriptions and complete then restart a sample turn', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const wait = page.getByRole('button', { name: 'Wait Stay' });
  await wait.focus();
  await expect(page.getByRole('tooltip').filter({ hasText: 'Remain at your current location' })).toBeVisible();
  for (let remaining = 2; remaining >= 0; remaining--) {
    await wait.focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('button', { name: 'Confirm action' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('action-budget')).toHaveText(`${remaining} / 3`);
    await page.clock.runFor(950);
  }
  await expect(page.getByRole('heading', { name: 'Sample turn complete' })).toBeVisible();
  await expect(wait).toBeDisabled();
  await expect(page.getByRole('listitem')).toHaveCount(3);
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByText('Your explorer is at camp. Confirm an action to begin.')).toBeVisible();
});

test('browser runtime uses only local requests and reload explicitly starts a fresh sample', async ({ page }) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await page.getByRole('button', { name: 'Wait Stay' }).click();
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
  await page.reload();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByText(/Progress resets on reload/)).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('narrow screens keep the board and controls within the viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'How to play' }).click();
  await expect(page.getByRole('heading', { name: 'Your first sample turn' })).toBeVisible();
  await page.getByRole('button', { name: 'Move Explore' }).click();
  await page.getByLabel('Destination', { exact: true }).selectOption('crossroads');
  await expect(page.getByRole('button', { name: 'Confirm action' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});
