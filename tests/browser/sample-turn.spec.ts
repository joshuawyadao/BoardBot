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
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Crossroads', exact: true }).click();
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
  await expect(page.getByRole('note', { name: 'Action details' }).filter({ hasText: 'Stay at your current location' })).toBeVisible();
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
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(4);
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(5);
  await expect(page.getByRole('log').getByText('Waited at camp.', { exact: true })).toHaveCount(3);
  await expect(page.getByRole('log').getByText('TURN 2', { exact: true })).toBeVisible();
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
  await expect(page.getByRole('combobox')).toHaveCount(0);
  await page.getByRole('button', { name: 'Crossroads', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm action' })).toBeEnabled();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});


test('hover details do not overlap or shift action controls and update on pointer and keyboard navigation', async ({ page }) => {
  await page.goto('/');
  const move = page.getByRole('button', { name: 'Move Explore' });
  const wait = page.getByRole('button', { name: 'Wait Stay' });
  const help = page.getByRole('note', { name: 'Action details' });
  const moveBefore = await move.boundingBox();
  const waitBefore = await wait.boundingBox();
  await wait.hover();
  await expect(help).toContainText('Stay at your current location');
  const helpBox = await help.boundingBox();
  expect(helpBox!.y).toBeGreaterThanOrEqual(waitBefore!.y + waitBefore!.height);
  await move.hover();
  await expect(help).toContainText('Choose a highlighted location on the board');
  expect(await move.boundingBox()).toEqual(moveBefore);
  expect(await wait.boundingBox()).toEqual(waitBefore);
  await wait.focus();
  await expect(help).toContainText('Stay at your current location');
  await page.keyboard.press('Shift+Tab');
  await expect(move).toBeFocused();
  await expect(help).toContainText('Choose a highlighted location on the board');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Confirm action' })).toBeEnabled();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
});

test('session log follows new entries but preserves the reading position until jumping to latest', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const log = page.getByRole('log', { name: 'Session history' });
  for (let action = 0; action < 3; action++) {
    await page.getByRole('button', { name: 'Wait Stay' }).click();
    await page.getByRole('button', { name: 'Confirm action' }).click();
    await page.clock.runFor(950);
  }
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  // Scroll using the keyboard, then leave focus at the log while the next action resolves.
  await log.focus();
  await page.keyboard.press('Home');
  await page.clock.runFor(250);
  await expect(page.getByRole('button', { name: 'Jump to latest' })).toBeEnabled();
  await expect.poll(() => log.evaluate(element => element.scrollTop)).toBe(0);
  const previousPosition = await log.evaluate(element => element.scrollTop);
  await page.getByRole('button', { name: 'Wait Stay' }).click();
  await page.getByRole('button', { name: 'Confirm action' }).click();
  await expect(log.getByRole('listitem')).toHaveCount(6);
  expect(await log.evaluate(element => element.scrollTop)).toBe(previousPosition);
  await page.getByRole('button', { name: 'Jump to latest' }).click();
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  await expect(page.getByRole('button', { name: 'Up to date' })).toBeDisabled();
});
