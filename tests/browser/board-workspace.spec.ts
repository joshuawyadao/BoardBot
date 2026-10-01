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

async function load(page: Page, data: GameData, seed = 2, hero = 'Fighter') {
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-data-file').setInputFiles({ name: 'synthetic-layout.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByLabel('Hero', { exact: true }).selectOption(hero);
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
    const right = await page.locator('[data-panel="inventory"]').boundingBox();
    await page.getByRole('button', { name: 'Move Inventory panel to left' }).focus();
    await page.keyboard.press('Enter');
    await expectWholeBoard(page);
    expect((await page.locator('[data-panel="inventory"]').boundingBox())!.x).toBeLessThan(right!.x);
    await page.getByRole('button', { name: 'Move Inventory panel to right' }).click();
    await page.getByRole('button', { name: 'Close Inventory' }).click();
    await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
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
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(page.getByRole('heading', { name: 'Fighter inventory' })).toBeVisible();
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await expect(page.locator('.h-pending h2')).toBeFocused();
  const summary = page.locator('.h-roll-peek');
  await expect(summary.getByTestId('roll-effective')).toHaveText(value);
  await expect(summary.getByTestId('roll-status')).toHaveText('Awaiting response');
  await expect(summary).toBeInViewport();
  await expect(page.getByRole('radio', { name: 'Keep this result' })).toBeChecked();
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


test('four information panels stay open independently without hiding the board or clearing an action', async ({ page }) => {
  const data = layoutFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await page.setViewportSize({ width: 1440, height: 900 });
  await load(page, data);
  for (const name of [/^Inventory/, /^Monsters$/, /^Event log$/, /^Latest result$/]) {
    await page.getByRole('button', { name }).click();
  }
  await expect(page.locator('.h-context-panel:visible')).toHaveCount(4);
  await expectWholeBoard(page);
  const inventory = page.locator('[data-panel="inventory"]');
  const perk = inventory.locator('.h-inventory-perk');
  await perk.locator('summary').click();
  await expect(perk).toContainText(data.perks[0].effect);
  const details = inventory.locator('.h-context-body');
  await details.evaluate(element => { element.scrollTop = 12; });
  const scroll = await details.evaluate(element => element.scrollTop);
  await page.getByRole('button', { name: 'Move Inventory panel to left' }).click();
  await expect(perk).toHaveAttribute('open', '');
  expect(await details.evaluate(element => element.scrollTop)).toBe(scroll);
  await page.getByRole('button', { name: 'Close Monsters', exact: true }).click();
  await expect(page.locator('[data-panel="monsters"]')).toBeHidden();
  await expect(inventory).toBeVisible();
  await expect(page.locator('[data-panel="log"]')).toBeVisible();
  await expect(page.locator('[data-panel="result"]')).toBeVisible();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  const roll = page.getByRole('button', { name: 'Roll special action', exact: true });
  await expect(roll).toBeInViewport();
  await page.getByRole('button', { name: 'Close Inventory', exact: true }).click();
  await expect(roll).toBeEnabled();
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(perk).toHaveAttribute('open', '');
  await expect(page.locator('.h-context-panel:visible')).toHaveCount(5);
  await expectWholeBoard(page);
  await roll.click();
  await expect(page.locator('.h-pending')).toBeVisible();
  await expect(page.locator('[data-panel="inventory"]')).toBeVisible();
  await expect(page.locator('[data-panel="monsters"]')).toBeVisible();
  await expect(page.locator('[data-panel="log"]')).toBeVisible();
  await expect(page.locator('[data-panel="result"]')).toBeVisible();
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeInViewport();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  await expect(page.locator('.h-location')).toHaveCount(29);
});

test('new games visibly contain setup pieces before the first action', async ({ page }) => {
  const data = layoutFixture();
  await load(page, data);
  const setup = page.locator('[data-panel="setup"]');
  await expect(setup).toContainText('12 Items');
  await expect(setup).toContainText('Beholder');
  await expect(setup).toContainText('Displacer Beast');
  await expect(page.locator('.h-location .piece-beholder')).toHaveCount(1);
  await expect(page.locator('.h-location .piece-displacer')).toHaveCount(1);
  await expect(page.locator('.h-location .piece-hero')).toHaveCount(1);
  await expect(page.locator('.h-location .piece-lair')).toHaveCount(data.board.lairLocations.length);
  const items = await page.locator('.h-location .piece-item').allTextContents();
  expect(items.reduce((sum, text) => sum + Number(text.slice(1)), 0)).toBe(12);
  const revisionBefore = await page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const [game] = await library.list();
    const save = (await library.game(game.id).read()).current!.payload;
    library.close(); return JSON.parse(save).state.revision;
  });
  expect(revisionBefore).toBe(0);
  await page.getByRole('button', { name: 'Ready to play', exact: true }).click();
  await expect(setup).toBeHidden();
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
});

test('Wizard destination 17 explains relocating a Monster already on the board and survives reload', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await load(page, heroFixture(), 105, 'Wizard');
  await expect(page.getByRole('button', { name: /^Room 1\. Displacer Beast/ })).toBeVisible();
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  for (const result of ['5', '17']) {
    await expect(page.locator('.h-choice-panel [data-testid="roll-effective"]')).toHaveText(result);
    await page.getByRole('radio', { name: 'Keep this result' }).check();
    await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  }
  const choice = page.locator('.h-pending');
  await expect(choice).toContainText('Move an existing Monster to #17');
  await expect(choice).toContainText('initial roll 5');
  await expect(choice).toContainText('destination roll 17');
  await expect(page.locator('.h-location.wizard-destination')).toHaveAttribute('aria-label', /Test room 17/);
  await expect(page.locator('.h-location.wizard-destination')).toHaveAttribute('aria-disabled', 'true');
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(choice).toContainText('initial roll 5');
  await page.setViewportSize({ width: 1024, height: 768 });
  for (const name of [/^Inventory/, /^Monsters$/, /^Event log$/, /^Latest result$/]) await page.getByRole('button', { name }).click();
  await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeInViewport();
  await page.getByRole('radio', { name: /Displacer Beast: move from #1 · Room 1 to #17 · Test room 17/ }).check();
  await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  await expect(page.getByRole('button', { name: /^Test room 17\. Displacer Beast/ })).toBeVisible();
  await expect(page.locator('.h-location .piece-displacer')).toHaveCount(1);
});
