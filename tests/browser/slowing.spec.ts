import { expect, test, type Page } from './test';
import { slowingFixture, SLOWING_SEED } from '../../src/engine/fixtures/slowingFixture';
import { LEGACY_RULESET_VERSION, RULESET_VERSION } from '../../src/engine/decisionPolicies';
import { createFighterGame } from '../../src/engine/horrifiedGame';
import { encodeGameSave } from '../../src/session/gameSave';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';

async function saves(page: Page): Promise<{ id: string; state: FighterGame; version: string }[]> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    try {
      return await Promise.all((await library.list()).map(async (entry: { id: string }) => {
        const saved = JSON.parse((await library.game(entry.id).read()).current!.payload);
        return { id: entry.id, state: saved.state, version: saved.data.interpretationVersion };
      }));
    } finally { library.close(); }
  });
}
async function state(page: Page) { return (await saves(page))[0].state; }
async function start(page: Page, fromHome = true) {
  if (fromHome) await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(SLOWING_SEED));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}
async function acceptPenalty(page: Page, revision: number) {
  const panel = page.locator('.h-pending');
  await panel.getByRole('radio', { name: 'Accept the penalty' }).check();
  await panel.getByRole('button', { name: 'Confirm choice' }).click();
  await expect.poll(async () => (await state(page)).revision).toBe(revision + 1);
}

test('two Slowing penalties reduce the new turn by two and survive a pending reload', async ({ page }) => {
  const oldData = slowingFixture(LEGACY_RULESET_VERSION);
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: oldData }));
  await page.goto('/');
  await start(page);
  expect((await saves(page))[0].version).toBe(RULESET_VERSION);
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  await page.locator('.h-action-editor input[type=checkbox]').first().check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeEnabled();
  await page.getByRole('button', { name: 'End Hero Phase' }).click();
  await expect(page.locator('.h-attack')).toContainText('Resolve POW first');
  await expect(page.locator('.h-slowing-detail')).toContainText('Discard an Item: next Hero Phase 4 actions. Accept a penalty: next Hero Phase 3 actions');
  await acceptPenalty(page, 2);
  const pending = await state(page);
  expect(pending.hero.penalties.fewerActions).toBe(1);
  expect(pending.phase).toBe('monster');
  expect(pending.pending).not.toBeNull();
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect(await state(page)).toEqual(pending);
  await expect(page.locator('.h-slowing-detail')).toContainText('existing next-phase penalties: 1');
  await expect(page.locator('.h-slowing-detail')).toContainText('Discard an Item: next Hero Phase 3 actions. Accept a penalty: next Hero Phase 2 actions');
  await acceptPenalty(page, 3);
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeEnabled();
  const next = await state(page);
  expect(next.rulesVersion).toBe(RULESET_VERSION);
  expect(next.turn).toBe(2);
  expect(next.hero.actions).toBe(2);
  expect(next.hero.penalties.fewerActions).toBe(0);
  expect(next.hero.items).toEqual(pending.hero.items);
  await expect(page.locator('.h-tray .action-budget')).toContainText('2 / 2');
  await expect(page.getByText('Earlier rules', { exact: true })).toHaveCount(0);
});

for (const source of ['cached', 'imported']) {
  test(`new games adopt stacking from ${source} older components`, async ({ page }) => {
    const data = slowingFixture(LEGACY_RULESET_VERSION);
    if (source === 'cached') {
      await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
      await page.goto('/');
      await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
      await page.route('**/__boardbot/local-game-data', route => route.fulfill({ status: 404 }));
      await page.reload();
    } else {
      await page.goto('/');
      await page.getByText('Import game data or backup').click();
      await page.locator('#game-data-file').setInputFiles({ name: 'old-components.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
    }
    await start(page, source === 'cached');
    const [game] = await saves(page);
    expect(game.state.rulesVersion).toBe(RULESET_VERSION);
    expect(game.version).toBe(RULESET_VERSION);
    const cachedVersion = await page.evaluate(async () => {
      const path = '/src/session/gameLibrary.ts';
      const library = await (await import(path)).openGameLibrary();
      try { return (await library.getData()).interpretationVersion; } finally { library.close(); }
    });
    expect(cachedVersion).toBe(LEGACY_RULESET_VERSION);
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    expect((await saves(page))[0]).toEqual(game);
  });
}

test('an older backup keeps capped penalties while a new adventure from its components stacks', async ({ page }) => {
  const data = slowingFixture(LEGACY_RULESET_VERSION);
  const initial = await createFighterGame(data, SLOWING_SEED);
  const backup = encodeGameSave(data, initial);
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-save-file').setInputFiles({ name: 'old-game.json', mimeType: 'application/json', buffer: Buffer.from(backup) });
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(await state(page)).toEqual(initial);
  await page.getByText('Earlier rules', { exact: true }).click();
  await expect(page.locator('.save-status')).toContainText('maximum Slowing Ray penalty of one action');
  await page.getByRole('button', { name: 'End Hero Phase' }).click();
  await expect.poll(async () => (await state(page)).turn).toBe(2);
  const [legacy] = await saves(page);
  expect(legacy.state.hero.actions).toBe(3);
  expect(legacy.version).toBe(LEGACY_RULESET_VERSION);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect((await saves(page))[0]).toEqual(legacy);
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await start(page);
  const all = await saves(page);
  expect(all).toHaveLength(2);
  expect(all.find(game => game.id === legacy.id)).toEqual(legacy);
  expect(all.find(game => game.id !== legacy.id)?.version).toBe(RULESET_VERSION);
  await expect(page.getByText('Earlier rules', { exact: true })).toHaveCount(0);
});
