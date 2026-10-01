import { expect, test, type Page } from './test';
import type { GameData } from '../../src/data/gameData';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

/** Synthetic labels, resources, and graph with the recognized location IDs for layout coverage. */
function layoutFixture(): GameData {
  const source = heroFixture();
  const ids = new Map(source.board.locations.map(location => [location.id, `location-${location.number}`]));
  const data: GameData = JSON.parse(JSON.stringify(source, (_key, value) => typeof value === 'string' ? ids.get(value) ?? value : value));
  const extras = [
    'location-the-yawning-portal-the-well', 'location-entry-well', 'location-castle-corkscrew',
    'location-skullport-gate', 'location-stairway-to-arcane-chambers',
    'location-teleportation-circle-arcane-chambers', 'location-teleportation-circle-dungeon-level',
    'location-teleportation-circle-skullport', 'location-teleportation-circle-wyllowwood',
  ];
  extras.forEach((id, index) => data.board.locations.push({ id, name: `Synthetic connector ${index + 1}`, kind: index < 5 ? 'unnumbered' : 'circle', ...(index >= 5 ? { region: `Synthetic region ${index}` } : {}) }));
  data.board.edges = [
    { from: 'location-1', to: 'location-2', kind: 'ordinary' },
    { from: 'location-2', to: 'location-3', kind: 'ordinary' },
    { from: extras[5], to: extras[6], kind: 'teleport' },
    { from: extras[5], to: extras[7], kind: 'teleport' },
    { from: extras[5], to: 'location-1', kind: 'ordinary' },
  ];
  return data;
}

async function load(page: Page, data: GameData, seed = 2) {
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-data-file').setInputFiles({ name: 'synthetic-layout.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

async function expectWholeBoard(page: Page) {
  const fit = await page.locator('.h-board-fit').boundingBox();
  expect(fit).not.toBeNull();
  const viewport = page.viewportSize()!;
  expect(fit!.y).toBeGreaterThanOrEqual(0);
  expect(fit!.y + fit!.height).toBeLessThanOrEqual(viewport.height);
  for (const node of await page.locator('.h-location').all()) {
    const box = (await node.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(fit!.x);
    expect(box.x + box.width).toBeLessThanOrEqual(fit!.x + fit!.width);
    expect(box.y).toBeGreaterThanOrEqual(fit!.y);
    expect(box.y + box.height).toBeLessThanOrEqual(fit!.y + fit!.height);
  }
  expect(await page.locator('.h-board-fit').evaluate(element => element.scrollWidth <= element.clientWidth && element.scrollHeight <= element.clientHeight)).toBe(true);
}

test('all 29 locations fit desktop and smaller windows with panels on either side', async ({ page }) => {
  await load(page, layoutFixture());
  await expect(page.locator('.h-location')).toHaveCount(29);
  await expect(page.locator('.game-board-region')).toHaveCount(5);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }, { width: 800, height: 800 }]) {
    await page.setViewportSize(viewport);
    await expectWholeBoard(page);
    expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(viewport.height);
    await page.getByRole('button', { name: /^Inventory/ }).click();
    await expectWholeBoard(page);
    const right = await page.locator('.h-context-panel').boundingBox();
    await page.getByRole('button', { name: 'Move panel to left' }).focus();
    await page.keyboard.press('Enter');
    await expectWholeBoard(page);
    expect((await page.locator('.h-context-panel').boundingBox())!.x).toBeLessThan(right!.x);
    await page.getByRole('button', { name: 'Move panel to right' }).click();
    await page.getByRole('button', { name: 'Close panel' }).click();
    await expect(page.locator('.h-context-panel')).toBeHidden();
    await expectWholeBoard(page);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await expectWholeBoard(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
});

test('teleport links appear only for a relevant Move and do not alter the legal graph', async ({ page }) => {
  const data = layoutFixture();
  data.heroes.find(hero => hero.id === 'hero-fighter')!.start = 'location-teleportation-circle-arcane-chambers';
  await load(page, data);
  await expect(page.locator('.game-board-route.teleport')).toHaveCount(0);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await expect(page.locator('.game-board-route.teleport')).toHaveCount(2);
  await expect(page.locator('.h-location.reachable')).toHaveCount(3);
  await page.getByRole('button', { name: /Synthetic connector 7/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await expect(page.locator('.game-board-route.teleport')).toHaveCount(0);
  await expect(page.locator('.h-location.current')).toHaveAttribute('aria-label', /Synthetic connector 7/);
});

test('special ranges and confirmation stay visible, then a saved response displays its roll without the log', async ({ page }) => {
  const data = layoutFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  data.heroes.find(hero => hero.id === 'hero-fighter')!.outcomes.forEach(outcome => {
    outcome.effect = `${outcome.effect}. ${'A long synthetic description to exercise scrolling. '.repeat(8)}`;
  });
  await page.setViewportSize({ width: 1024, height: 768 });
  await load(page, data);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  const roll = page.getByRole('button', { name: 'Roll special action', exact: true });
  await expect(roll).toBeInViewport();
  await expect(page.getByTestId('special-action-guide').getByRole('row')).toHaveCount(6);
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  const editor = page.locator('.h-action-editor');
  expect(await editor.evaluate(element => element.scrollHeight)).toBeGreaterThan(await editor.evaluate(element => element.clientHeight));
  await roll.click();
  const context = page.locator('.h-choice-panel');
  await expect(context.getByTestId('roll-status')).toHaveText('Awaiting response');
  const value = await context.getByTestId('roll-effective').innerText();
  await expect(page.getByRole('log')).toBeHidden();
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(page.getByRole('heading', { name: 'Fighter inventory' })).toBeVisible();
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await expect(page.locator('.h-pending h2')).toBeFocused();
  await expect(context.getByTestId('roll-effective')).toHaveText(value);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(context.getByTestId('roll-effective')).toHaveText(value);
  await expect(context.getByTestId('roll-status')).toHaveText('Awaiting response');
  await page.locator('.h-pending').getByRole('radio').last().check();
  await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeInViewport();
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  await expect(page.locator('.h-roll-peek [data-testid="roll-status"]')).toHaveText('Last roll');
});
