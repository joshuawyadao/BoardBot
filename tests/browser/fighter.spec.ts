import { expect, test, type Page } from '@playwright/test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';

async function loadSyntheticFighter(page: Page, seed = 17, data = fighterFixture()) {
  await page.goto('/');
  await page.getByText('Load prepared local game data').click();
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await expect(page.locator('#game-data-file')).toBeEnabled();
  const replacing = await page.getByRole('button', { name: 'Resume saved game' }).isVisible();
  await page.locator('#game-data-file').setInputFiles({
    name: 'synthetic-game-data.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  if (replacing) await page.getByRole('button', { name: 'Replace saved game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

test('local import opens a Fighter table with visible map, resources, and no hidden deck order', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await loadSyntheticFighter(page);
  await expect(page.getByRole('heading', { name: 'The city and dungeon' })).toBeVisible();
  await expect(page.locator('.h-location')).toHaveCount(4);
  await expect(page.locator('.game-board-route .route-line')).toHaveCount(3);
  await expect(page.locator('.h-tray .action-card')).toHaveCount(8);
  await expect(page.getByRole('button', { name: /Wait/ })).toHaveCount(0);
  await expect(page.getByText('Monster progress')).toBeHidden();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  await expect(page.getByText('Monster progress')).toBeVisible();
  await expect(page.getByText('Perks discarded:')).toBeVisible();
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(page.getByText('Fighter inventory')).toBeVisible();
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Event log' });
  const panelBox = await panel.boundingBox();
  const boardBox = await page.getByRole('region', { name: 'The city and dungeon' }).boundingBox();
  expect(panelBox!.width).toBeLessThanOrEqual(330);
  expect(panelBox!.height).toBeLessThan(boardBox!.height);
  await expect(page.getByRole('log', { name: 'Game history' })).toBeVisible();
  const text = await page.locator('.h-table').innerText();
  expect(text).not.toContain('monsterDeck:');
  expect(text).not.toContain('random:');
  expect(text).not.toContain('dataIdentity:');
});

test('the Fighter log previews a new event while hidden and retains full history', async ({ page }) => {
  await loadSyntheticFighter(page);
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Event log' });
  const hide = page.getByRole('button', { name: 'Hide log' });
  const bodyId = await hide.getAttribute('aria-controls');
  expect(bodyId).toBeTruthy();
  await hide.click();
  await expect(page.locator(`#${bodyId}`)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show log' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  await expect(panel).toContainText('Room 1');
  await page.getByRole('button', { name: 'Show log' }).focus();
  await page.keyboard.press('Enter');
  const log = page.getByRole('log', { name: 'Game history' });
  await expect(log).toBeVisible();
  await expect(log.getByRole('listitem')).toHaveCount(3);
  await expect(log).toContainText('Used move.');
  await expect(log).toContainText('Room 1');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
});

test('compact Fighter actions collapse without spending resources and leave choices visible', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  const data = fighterFixture();
  for (let number = 5; number <= 12; number++) {
    data.board.locations.push({ id: `extra-${number}`, number, kind: 'numbered', name: `Extra room ${number}` });
    data.board.edges.push({ from: number === 5 ? 'd' : `extra-${number - 1}`, to: `extra-${number}`, kind: 'ordinary' });
  }
  await loadSyntheticFighter(page, 17, data);
  const tray = page.getByRole('region', { name: 'Your Hero Phase' });
  expect((await tray.boundingBox())!.height).toBeLessThanOrEqual(230);
  const cards = await tray.locator('.action-card').all();
  expect(cards).toHaveLength(8);
  expect((await cards[0].boundingBox())!.y).toBe((await cards[7].boundingBox())!.y);
  const map = page.locator('.h-board-fit');
  const expandedMapHeight = (await map.boundingBox())!.height;
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await expect(page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ })).toBeEnabled();
  const hide = page.getByRole('button', { name: 'Hide actions' });
  const bodyId = await hide.getAttribute('aria-controls');
  expect(bodyId).toBeTruthy();
  await hide.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#${bodyId}`)).toBeHidden();
  await expect(page.getByRole('button', { name: 'Show actions' })).toHaveAttribute('aria-expanded', 'false');
  expect((await tray.boundingBox())!.height).toBeLessThanOrEqual(85);
  expect((await map.boundingBox())!.height).toBeGreaterThan(expandedMapHeight + 60);
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  await expect(page.locator('.h-history')).not.toContainText('rolled');
  await page.getByRole('button', { name: 'Show actions' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator(`#${bodyId}`)).toBeVisible();
  await expect(page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Special Action Hero ability' })).toHaveAttribute('aria-pressed', 'false');
});

test('a pending Fighter choice stays operable while actions are collapsed', async ({ page }) => {
  // Seed 2 deals Ott's relevant roll response, so the special-action roll pauses for a choice.
  await loadSyntheticFighter(page, 2);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ }).click();
  const pending = page.locator('.h-pending');
  await expect(pending).toBeVisible();
  await expect(pending.locator('h2')).toBeFocused();
  await page.getByRole('button', { name: 'Hide actions' }).click();
  await expect(pending).toBeVisible();
  const choiceBox = await pending.boundingBox();
  const trayBox = await page.locator('.h-tray').boundingBox();
  expect(choiceBox!.y + choiceBox!.height).toBeLessThan(trayBox!.y);
  await expect(pending.getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await pending.locator('input').first().check();
  await pending.getByRole('button', { name: 'Confirm choice' }).click();
  await expect(page.getByRole('button', { name: 'Show actions' })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('.h-roll-peek')).toContainText('Last roll');
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
  const confirm = page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ });
  await confirm.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('.h-roll-peek')).toContainText('Fighter special action');
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
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
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
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  const log = page.getByRole('log', { name: 'Game history' });
  expect(await log.evaluate(element => element.scrollHeight)).toBeGreaterThan(await log.evaluate(element => element.clientHeight));
  await log.evaluate(element => { element.scrollTop = 10; element.dispatchEvent(new Event('scroll')); });
  await expect(page.getByRole('button', { name: 'Jump to latest' })).toBeEnabled();
  await page.getByRole('button', { name: 'Close panel' }).click();
  await page.getByRole('button', { name: 'Event log', exact: true }).click();
  await expect.poll(() => log.evaluate(element => element.scrollTop)).toBe(10);
  await expect(end).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Special Action Hero ability' })).toHaveAttribute('aria-disabled', 'true');
});

test('narrow Fighter layout has no document overflow with actions shown or hidden', async ({ page }) => {
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await loadSyntheticFighter(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Hide actions' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Show actions' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Event log', exact: true }).click();
    await page.getByRole('button', { name: 'Hide log' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Show log' }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});


test('ending early forfeits remaining actions through a saved Monster Phase choice', async ({ page }) => {
  const data = fighterFixture();
  data.monsterCards[0].printedId = 314;
  data.monsterCards[0].name = 'Synthetic item trial';
  data.items.forEach(item => { item.locations = ['b', 'b']; });
  await loadSyntheticFighter(page, 41, data);
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  for (const item of await page.locator('.h-action-editor input[type="checkbox"]').all()) await item.check();
  await page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await page.getByRole('button', { name: 'End Hero Phase' }).click();
  await expect(page.getByRole('heading', { name: /Items for the trial/ })).toBeVisible();
  await expect(page.locator('.h-tray .action-budget')).toContainText('0 / 4');
  await expect(page.getByRole('button', { name: 'Move Connected location' })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('0 / 4');
  await page.getByRole('button', { name: 'Confirm choice' }).click();
  await expect(page.getByRole('heading', { name: 'Your Hero Phase' })).toBeVisible();
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
});
