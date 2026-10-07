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

/** Accepted topology with invented component text; no private packet is needed. */
function illustratedFixture(): GameData {
  const data = layoutFixture();
  const pairs = [
    ['1', '3'], ['3', '5'], ['5', '6'], ['3', '2'], ['2', '4'], ['5', '4'], ['4', '7'],
    ['4', 'castle-corkscrew'], ['7', '8'], ['8', 'the-yawning-portal-the-well'],
    ['14', '13'], ['14', 'teleportation-circle-arcane-chambers'], ['13', 'teleportation-circle-arcane-chambers'],
    ['13', '11'], ['11', '12'], ['11', 'stairway-to-arcane-chambers'],
    ['stairway-to-arcane-chambers', 'teleportation-circle-dungeon-level'],
    ['stairway-to-arcane-chambers', 'entry-well'], ['10', 'entry-well'], ['entry-well', '9'],
    ['15', '16'], ['15', 'skullport-gate'], ['15', 'teleportation-circle-skullport'],
    ['skullport-gate', '17'], ['17', 'teleportation-circle-skullport'],
    ['18', '19'], ['19', '20'], ['19', 'teleportation-circle-wyllowwood'],
  ];
  data.board.edges = pairs.map(([from, to]) => ({ from: `location-${from}`, to: `location-${to}`, kind: 'ordinary' }));
  data.board.edges.push(
    { from: 'location-castle-corkscrew', to: 'location-skullport-gate', kind: 'passage' },
    { from: 'location-the-yawning-portal-the-well', to: 'location-entry-well', kind: 'passage' },
  );
  const circles = data.board.locations.filter(location => location.kind === 'circle').map(location => location.id);
  circles.forEach((from, index) => circles.slice(index + 1).forEach(to => data.board.edges.push({ from, to, kind: 'teleport' })));
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
  await expect(page.locator('.game-board-art')).toHaveCount(0); // painted roads would misrepresent this invented graph
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

test('illustrated floors, portals and passage pairs retain keyboard movement and recovery', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await load(page, illustratedFixture());
  const board = page.locator('.h-game-board.illustrated');
  await expect(board).toBeVisible();
  const art = board.locator('.game-board-art');
  await expect(art).toHaveCount(1);
  const loaded = await art.evaluate(async element => {
    const image = new Image();
    image.src = element.getAttribute('href')!;
    await image.decode();
    return image.naturalWidth > 500 && image.naturalHeight > 500;
  });
  expect(loaded).toBe(true);
  await expect(board.locator('.game-board-route.ordinary')).toHaveCount(28);
  await expect(board.locator('.game-board-route.passage, .game-board-route.teleport')).toHaveCount(0);
  await expect(board.locator('.game-board-portal-runes')).toHaveCount(4);
  expect((await board.locator('.game-board-passage-badge').allTextContents()).sort()).toEqual(['A', 'A', 'B', 'B']);
  const floorStyles = await board.locator('.h-location').evaluateAll(elements => elements.map(element => {
    const style = getComputedStyle(element);
    return { background: style.backgroundColor, border: style.borderTopWidth, shadow: style.boxShadow };
  }));
  expect(floorStyles.every(style => style.background === 'rgba(0, 0, 0, 0)' && style.border === '0px' && style.shadow === 'none')).toBe(true);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await expect(board.locator('.h-location.reachable')).toHaveCount(2);
  const target = board.locator('[data-location-id="location-3"]');
  await target.focus();
  await expect(target).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(board.locator('.h-location.current')).toHaveAttribute('data-location-id', 'location-3');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  for (const name of [/^Inventory/, /^Latest result$/]) await page.getByRole('button', { name }).click();
  await expectWholeBoard(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expect(board.locator('.h-location.current')).toHaveAttribute('data-location-id', 'location-3');
  await expect(art).toHaveCount(1);
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
});

for (const [at, label] of [
  ['location-2', 'Twilight Watchtower'],
  ['location-stairway-to-arcane-chambers', 'Stairway to Arcane Chambers'],
] as const) test(`crowded pieces and the complete ${label} name fit their integrated location`, async ({ page }) => {
  const data = illustratedFixture();
  data.heroes.find(hero => hero.id === 'hero-fighter')!.start = at;
  data.board.locations.find(location => location.id === at)!.name = label;
  data.board.lairLocations[0] = at;
  data.setup!.beholderLocation = at;
  data.setup!.displacerLocation = at;
  data.board.monsterStarts.forEach(start => { start.location = at; });
  data.items.forEach(item => { item.locations = Array.from({ length: item.quantity }, () => at); });
  await load(page, data);
  const floor = page.locator(`[data-location-id="${at}"]`);
  await expect(floor.locator('.piece')).toHaveCount(5); // Hero, both Monsters, 12 Items and unrevealed Lair
  await expect(floor).toHaveAttribute('aria-label', /Beholder, Displacer Beast, 12 Items.*Unrevealed Lair/);
  for (const viewport of [{ width: 1440, height: 900 }, { width: 1024, height: 768 }]) {
    await page.setViewportSize(viewport);
    const bounds = (await floor.boundingBox())!;
    const name = page.locator(`[data-caption-for="${at}"] .h-node-name`);
    await expect(name).toHaveText(label);
    const nameBounds = (await name.boundingBox())!;
    const boardBounds = (await page.locator('.game-board-svg').boundingBox())!;
    expect(nameBounds.y, 'caption sits on the lower rim outside the pieces').toBeGreaterThan(bounds.y + bounds.height / 2);
    expect(nameBounds.x).toBeGreaterThanOrEqual(boardBounds.x);
    expect(nameBounds.x + nameBounds.width).toBeLessThanOrEqual(boardBounds.x + boardBounds.width);
    expect(nameBounds.y + nameBounds.height).toBeLessThanOrEqual(boardBounds.y + boardBounds.height);
    for (const piece of await floor.locator('.piece').all()) {
      await expect(piece).toBeVisible();
      const box = (await piece.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(bounds.x - 1);
      expect(box.y).toBeGreaterThanOrEqual(bounds.y - 1);
      expect(box.x + box.width).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
      expect(box.y + box.height).toBeLessThanOrEqual(bounds.y + bounds.height + 1);
    }
  }
});

test('paired passages show only the relevant trace and move to their matching endpoint', async ({ page }) => {
  const data = illustratedFixture();
  data.heroes.find(hero => hero.id === 'hero-fighter')!.start = 'location-castle-corkscrew';
  await load(page, data);
  const start = page.locator('[data-location-id="location-castle-corkscrew"]');
  const destination = page.locator('[data-location-id="location-skullport-gate"]');
  for (const endpoint of [start, destination]) {
    await expect(endpoint).toHaveAttribute('data-passage-label', 'A');
    await expect(endpoint.locator('.game-board-passage-badge')).toBeVisible();
    await expect(endpoint).toHaveAttribute('aria-label', /Secret passage A/);
  }
  await expect(page.locator('.game-board-route.passage')).toHaveCount(0);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await expect(page.locator('.game-board-route.passage.highlighted')).toHaveCount(1);
  await expect(page.locator('.h-location.reachable')).toHaveCount(2);
  await destination.click();
  await expect(destination).toHaveClass(/current/);
  await expect(page.locator('.game-board-route.passage')).toHaveCount(0);
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
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
  await expect(page.locator('.h-location.wizard-destination')).toHaveAttribute('data-move-enabled', 'false');
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

async function readSavedState(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    try {
      const [entry] = await library.list();
      return JSON.parse((await library.game(entry.id).read()).current!.payload).state;
    } finally { library.close(); }
  });
}

test('inspection preserves a Pick Up draft, shows Strength, and restores keyboard focus', async ({ page }) => {
  const data = illustratedFixture();
  data.items.forEach(item => { item.locations = Array.from({ length: item.quantity }, () => 'location-2'); });
  await load(page, data);
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  const item = page.locator('.h-action-editor input[type=checkbox]').first();
  await item.check();
  const before = await readSavedState(page);
  const floor = page.locator('[data-location-id="location-2"]');
  await floor.focus();
  await page.keyboard.press('Enter');
  const inspector = page.locator('[data-panel="inspector"]');
  await expect(inspector).toContainText('12 Items');
  await expect(inspector).toContainText('Strength');
  await expect(inspector).toContainText('does not spend an action');
  await expect(item).toBeChecked();
  expect(await readSavedState(page)).toEqual(before);
  await page.getByRole('button', { name: 'Move Location inspector panel to left' }).click();
  await expect(item).toBeChecked();
  await page.getByRole('button', { name: 'Close Location inspector', exact: true }).click();
  await expect(floor).toBeFocused();
  await expect(item).toBeChecked();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect.poll(async () => (await readSavedState(page)).revision).toBe(before.revision + 1);
  expect((await readSavedState(page)).hero.items).toHaveLength(1);
});

test('named locations and supplies are independent, readable, and accessible in narrow layouts', async ({ page }) => {
  const data = illustratedFixture();
  await load(page, data);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  const before = await readSavedState(page);
  const locationsToggle = page.getByRole('button', { name: 'Locations', exact: true });
  await locationsToggle.click();
  const locations = page.locator('[data-panel="locations"]');
  const rows = locations.locator('.h-locations-list button');
  await expect(rows).toHaveCount(29);
  const sizes = await rows.evaluateAll(elements => elements.map(element => ({ height: element.getBoundingClientRect().height, font: parseFloat(getComputedStyle(element).fontSize) })));
  expect(sizes.every(size => size.height >= 44 && size.font >= 16)).toBe(true);
  await rows.nth(1).press('Enter');
  await expect(page.locator('[data-panel="inspector"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close Location inspector', exact: true }).click();
  await expect(rows.nth(1)).toBeFocused();
  const decksToggle = page.getByRole('button', { name: 'Decks & progress', exact: true });
  await decksToggle.click();
  await expect(page.locator('[data-panel="decks"]')).toContainText('Upcoming Hero Phase');
  await expect(locations).toBeVisible();
  await page.getByRole('button', { name: 'Close Decks & progress', exact: true }).click();
  await expect(decksToggle).toBeFocused();
  await page.getByRole('button', { name: 'Close Locations', exact: true }).click();
  await expect(locationsToggle).toBeFocused();
  for (const viewport of [{ width: 640, height: 480 }, { width: 320, height: 740 }]) {
    await page.setViewportSize(viewport);
    await locationsToggle.click();
    await rows.last().press('Enter');
    await expect(page.locator('[data-panel="inspector"]')).toContainText(data.board.locations.at(-1)!.name);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await page.getByRole('button', { name: 'Close Location inspector', exact: true }).click();
    await expect(rows.last()).toBeFocused();
    await page.getByRole('button', { name: 'Close Locations', exact: true }).click();
  }
  expect(await readSavedState(page)).toEqual(before);
});

test('Wizard map and named selection share a draft and require confirmation after recovery', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await load(page, heroFixture(), 65, 'Wizard');
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  const before = await readSavedState(page);
  expect(before.hero.location).toBe('b');
  const select = page.getByLabel('Wizard destination', { exact: true });
  await expect(select).toBeEnabled();
  const confirm = page.getByRole('button', { name: 'Confirm choice', exact: true });
  await expect(confirm).toBeDisabled();
  const target = page.locator('[data-location-id="room-17"]');
  await target.press('Enter');
  await expect(select).toHaveValue('room-17');
  await expect(confirm).toBeFocused();
  await expect(target).toHaveAttribute('aria-label', /Selected destination, awaiting confirmation/);
  await expect(confirm).toBeEnabled();
  expect(await readSavedState(page)).toEqual(before);
  await select.selectOption('room-18');
  await expect(page.locator('[data-location-id="room-18"]')).toHaveAttribute('aria-label', /Selected destination/);
  await expect(target).not.toHaveAttribute('aria-label', /Selected destination/);
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await expect(select).toHaveValue('room-18');
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  expect(await readSavedState(page)).toEqual(before);
  await expect(select).toHaveValue('');
  await select.selectOption('room-17');
  await confirm.click();
  await expect.poll(async () => (await readSavedState(page)).revision).toBe(before.revision + 1);
  expect((await readSavedState(page)).hero.location).toBe('room-17');
  await expect(page.locator('[data-panel="result"] h3')).toBeFocused();
  await expect(page.locator('.h-location.current')).toHaveAttribute('data-location-id', 'room-17');
});


test('named Move controls and enlarged panel text work without relying on tiny map targets', async ({ page }) => {
  await load(page, illustratedFixture());
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  const before = await readSavedState(page);
  const destination = page.getByLabel('Move destination', { exact: true });
  await destination.selectOption('location-3');
  expect(await readSavedState(page)).toEqual(before);
  await page.getByRole('button', { name: 'Move to selected location', exact: true }).press('Enter');
  await expect.poll(async () => (await readSavedState(page)).revision).toBe(before.revision + 1);
  expect((await readSavedState(page)).hero.location).toBe('location-3');
  await page.setViewportSize({ width: 640, height: 480 });
  await page.addStyleTag({ content: ':root { font-size: 200%; }' });
  await page.getByRole('button', { name: 'Locations', exact: true }).click();
  const row = page.locator('.h-locations-list button').last();
  expect(await row.evaluate(element => parseFloat(getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(32);
  await row.press('Enter');
  await expect(page.locator('[data-panel="inspector"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close Location inspector' }).press('Enter');
  await expect(row).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(640);
});
