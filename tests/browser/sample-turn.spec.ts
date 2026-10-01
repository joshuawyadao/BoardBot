import { expect, test, type Page } from '@playwright/test';

async function moveOnce(page: Page) {
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.locator('.map-location.reachable').first().click();
}

test('selecting Move is free; a destination commits once and locks controls until resolution', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  await expect(page.getByText('A sample, not a real game.')).toBeVisible();
  const move = page.getByRole('button', { name: 'Move Connected location' });
  await expect(page.getByRole('button', { name: /Wait/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirm action' })).toHaveCount(0);
  await move.click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  const ruins = page.getByRole('button', { name: 'Ruins', exact: true });
  await expect(ruins).toHaveAttribute('aria-disabled', 'true');
  await ruins.evaluate((button: HTMLButtonElement) => button.click());
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await page.getByRole('button', { name: 'Clear selection' }).click();
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeDisabled();
  await move.click();
  // Same-tick repeats exercise the guard before React can render the resolution lock.
  await page.getByRole('button', { name: 'Crossroads', exact: true }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
  await expect(move).toBeDisabled();
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Clear selection' })).toBeDisabled();
  await expect(page.getByRole('listitem').filter({ hasText: 'Moved from camp to crossroads.' })).toHaveCount(1);
  await page.clock.runFor(950);
  await expect(page.getByRole('heading', { name: 'Your Hero Phase', exact: true })).toBeVisible();
  await expect(move).toBeEnabled();
});

test('keyboard movement reaches zero actions without automatically ending the Hero Phase', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const move = page.getByRole('button', { name: 'Move Connected location' });
  await move.focus();
  await expect(page.getByRole('note', { name: 'Action details' })).toContainText('highlighted destination');
  for (let remaining = 2; remaining >= 0; remaining--) {
    await move.focus();
    await page.keyboard.press('Enter');
    await expect(page.locator('.map-location.reachable').first()).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('action-budget')).toHaveText(`${remaining} / 3`);
    await page.clock.runFor(950);
  }
  await expect(page.getByRole('heading', { name: 'No actions remaining' })).toBeVisible();
  await expect(move).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Start a new sample turn' })).toHaveCount(0);
  const perks = page.getByRole('button', { name: 'Perks Eligible cards' });
  await perks.focus();
  await expect(page.getByRole('note', { name: 'Action details' })).toContainText('Eligible perks will remain usable at zero actions');
  await expect(page.getByRole('note', { name: 'Action details' })).toContainText('Not implemented: the sample has no perk cards.');
  await page.getByRole('button', { name: 'End Hero Phase' }).click();
  await expect(page.getByRole('heading', { name: 'Sample turn complete' })).toBeVisible();
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(5);
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(6);
  await expect(page.getByRole('log').getByRole('listitem').filter({ hasText: 'Moved from' })).toHaveCount(3);
  await expect(page.getByRole('log').getByText('TURN 2', { exact: true })).toBeVisible();
});

test('ending early cancels uncommitted selections and records one phase boundary', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: 'End Hero Phase' }).evaluate((button: HTMLButtonElement) => { button.click(); button.click(); });
  await expect(page.getByRole('heading', { name: 'Sample turn complete' })).toBeVisible();
  await expect(page.getByTestId('action-budget')).toHaveText('0 / 3');
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(2);
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move Connected location' })).toHaveAttribute('aria-pressed', 'false');
});

test('browser runtime uses only local requests and reload starts a fresh sample', async ({ page }) => {
  const externalRequests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).hostname !== '127.0.0.1') externalRequests.push(request.url());
  });
  page.on('pageerror', error => errors.push(error.message));
  await page.route('**/*', route => new URL(route.request().url()).hostname === '127.0.0.1' ? route.continue() : route.abort());
  await page.goto('/');
  await moveOnce(page);
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
  await page.reload();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByRole('main').getByText(/Progress resets on reload/)).toBeVisible();
  expect(externalRequests).toEqual([]);
  expect(errors).toEqual([]);
});

test('the compact tray fits below the map and the event log occupies the right rail', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  const board = await page.getByRole('region', { name: 'The training grounds' }).boundingBox();
  const tray = await page.getByRole('region', { name: 'Your Hero Phase' }).boundingBox();
  const history = await page.getByRole('region', { name: 'Event log' }).boundingBox();
  expect(history!.x).toBeGreaterThan(board!.x + board!.width);
  expect(history!.width).toBeLessThanOrEqual(240);
  expect(history!.height).toBeLessThan(board!.height);
  expect(tray!.height).toBeLessThanOrEqual(230);
  for (const node of await page.locator('.map-location').all()) {
    const box = await node.boundingBox();
    expect(box!.y + box!.height).toBeLessThan(tray!.y);
  }
  const cards = await page.locator('.action-card').all();
  expect(cards).toHaveLength(8);
  expect((await cards[0].boundingBox())!.y).toBe((await cards[7].boundingBox())!.y);
});

test('the Event log hides by keyboard, preserves history, and previews new events', async ({ page }) => {
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Event log' });
  const log = page.getByRole('log', { name: 'Session history' });
  const hide = page.getByRole('button', { name: 'Hide log' });
  const bodyId = await hide.getAttribute('aria-controls');
  expect(bodyId).toBeTruthy();
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await hide.focus();
  await page.keyboard.press('Enter');
  const show = page.getByRole('button', { name: 'Show log' });
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(`#${bodyId}`)).toBeHidden();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: 'Crossroads', exact: true }).click();
  await expect(panel).toContainText('Moved from camp to crossroads.');
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(log).toBeVisible();
  await expect(log.getByRole('listitem')).toHaveCount(2);
  await expect(log.getByText('Moved from camp to crossroads.')).toBeVisible();
});

test('hiding actions preserves the phase controls, clears a draft, and reopens by keyboard', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeEnabled();
  const tray = page.getByRole('region', { name: 'Your Hero Phase' });
  const hide = page.getByRole('button', { name: 'Hide actions' });
  const bodyId = await hide.getAttribute('aria-controls');
  expect(bodyId).toBeTruthy();
  await expect(hide).toHaveAttribute('aria-expanded', 'true');
  await hide.focus();
  await page.keyboard.press('Enter');
  const show = page.getByRole('button', { name: 'Show actions' });
  await expect(show).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator(`#${bodyId}`)).toBeHidden();
  expect((await tray.boundingBox())!.height).toBeLessThanOrEqual(85);
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await expect(page.getByRole('log').getByRole('listitem')).toHaveCount(1);
  await show.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#${bodyId}`)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Move Connected location' })).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
});

test('phase end remains available with actions hidden', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Hide actions' }).click();
  await page.getByRole('button', { name: 'End Hero Phase' }).click();
  await expect(page.getByRole('heading', { name: 'Sample turn complete' })).toBeVisible();
  await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
});

test('small screens keep the board, tray, and log within the viewport', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await page.getByRole('button', { name: 'How to play' }).click();
    await expect(page.getByRole('heading', { name: 'Your first sample turn' })).toBeVisible();
    await page.getByRole('button', { name: 'Move Connected location' }).click();
    await page.getByRole('button', { name: 'Crossroads', exact: true }).click();
    await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Hide actions' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Show actions' }).click();
    await page.getByRole('button', { name: 'Hide log' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Show log' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    const cards = await page.locator('.action-card').all();
    for (const card of cards) {
      const box = await card.boundingBox();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width);
    }
  }
});

test('unavailable cards explain themselves without shifting controls or executing actions', async ({ page }) => {
  await page.goto('/');
  const move = page.getByRole('button', { name: 'Move Connected location' });
  const guide = page.getByRole('button', { name: 'Guide Citizen' });
  const help = page.getByRole('note', { name: 'Action details' });
  await move.scrollIntoViewIfNeeded();
  const before = await move.boundingBox();
  const initialTop = await move.evaluate((element: HTMLElement) => element.offsetTop);
  await guide.hover();
  await expect(help).toContainText('Not implemented: the sample has no citizens.');
  const helpBox = await help.boundingBox();
  expect(helpBox!.y).toBeGreaterThanOrEqual(before!.y + before!.height);
  await move.hover();
  await expect(help).toContainText('move immediately');
  expect(await move.evaluate((element: HTMLElement) => element.offsetTop)).toBe(initialTop);
  for (const card of await page.locator('.action-card').all()) {
    await card.hover();
    expect(await move.evaluate((element: HTMLElement) => element.offsetTop)).toBe(initialTop);
  }
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  // aria-disabled keeps the card focusable and tappable for its explanation only.
  await guide.click({ force: true });
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeDisabled();
  await expect(page.getByTestId('action-budget')).toHaveText('3 / 3');
  await guide.focus();
  await expect(help).toContainText('no citizens');
  await page.keyboard.press('Shift+Tab');
  await expect(move).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Crossroads', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('action-budget')).toHaveText('2 / 3');
});

test('session log preserves older reading position until jumping to latest', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-01-01T00:00:00Z') });
  await page.goto('/');
  await page.clock.pauseAt(new Date('2026-01-01T01:00:00Z'));
  const log = page.getByRole('log', { name: 'Session history' });
  for (let turn = 0; turn < 3; turn++) {
    for (let action = 0; action < 3; action++) {
      await moveOnce(page);
      await page.clock.runFor(950);
    }
    await page.getByRole('button', { name: 'End Hero Phase' }).click();
    await page.getByRole('button', { name: 'Start a new sample turn' }).click();
  }
  expect(await log.evaluate(element => element.scrollHeight)).toBeGreaterThan(await log.evaluate(element => element.clientHeight));
  expect((await log.boundingBox())!.height).toBeLessThanOrEqual(240);
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  await log.focus();
  await page.keyboard.press('Home');
  await page.clock.runFor(250);
  await expect(page.getByRole('button', { name: 'Jump to latest' })).toBeEnabled();
  await expect.poll(() => log.evaluate(element => element.scrollTop)).toBe(0);
  const previousPosition = await log.evaluate(element => element.scrollTop);
  await moveOnce(page);
  await expect(log.getByRole('listitem')).toHaveCount(17);
  expect(await log.evaluate(element => element.scrollTop)).toBe(previousPosition);
  await page.clock.runFor(950);
  await page.getByRole('button', { name: 'Hide log' }).click();
  await moveOnce(page);
  await expect(page.getByRole('region', { name: 'Event log' })).toContainText('Moved from crossroads to camp.');
  await page.getByRole('button', { name: 'Show log' }).click();
  await expect(log.getByRole('listitem')).toHaveCount(18);
  expect(await log.evaluate(element => element.scrollTop)).toBe(previousPosition);
  await page.getByRole('button', { name: 'Jump to latest' }).click();
  await expect.poll(() => log.evaluate(element => element.scrollHeight - element.clientHeight - element.scrollTop)).toBeLessThan(2);
  await expect(page.getByRole('button', { name: 'Up to date' })).toBeDisabled();
});
