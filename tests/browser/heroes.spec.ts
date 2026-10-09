import { expect, setAvailableFile, test, type Page } from './test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

async function currentSave(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const games = await library.list();
    const slots = await library.game(games[0].id).read(); library.close(); return JSON.parse(slots.current!.payload).state;
  });
}

for (const hero of ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard']) {
  test(`${hero} selection, ability, and recovery work with external requests blocked`, async ({ page, context }) => {
    const external: string[] = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.fallback();
      external.push(route.request().url()); return route.abort('internetdisconnected');
    });
    await page.goto('/');
    await page.getByText('Import game data or backup').click();
    await setAvailableFile(page.locator('#game-data-file'), { name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(heroFixture())) });
    await page.getByLabel('Hero', { exact: true }).selectOption(hero);
    await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page.getByText(`Local ${hero} game`)).toBeVisible();
    await page.getByRole('button', { name: /^Inventory/ }).click();
    await expect(page.getByRole('heading', { name: `${hero} inventory` })).toBeVisible();
    await expect(page.locator('.h-location.current .piece-hero')).toBeVisible();
    await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
    await expect(page.getByRole('heading', { name: `${hero} special action` })).toBeVisible();
    await expect(page.getByTestId('special-action-guide').getByRole('row')).toHaveCount(6);
    await expect(page.getByTestId('special-action-guide')).toContainText('2–8');
    await expect(page.getByTestId('special-action-guide')).toContainText('Synthetic critical');
    await page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ }).click();
    await expect.poll(async () => (await currentSave(page)).revision).toBe(1);
    const committed = await currentSave(page);
    await expect(page.locator('.h-roll-peek')).toContainText(`${hero} special action`);
    expect(committed.hero.definitionId).toBe(`hero-${hero.toLowerCase()}`);
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(page.getByText(`Local ${hero} game`)).toBeVisible();
    expect(await currentSave(page)).toEqual(committed);
    // Finish the persisted choice through ordinary controls, never by injecting game state.
    for (let step = 0; step < 30; step++) {
      const state = await currentSave(page);
      if (!state.pending) break;
      const panel = page.locator('.h-pending');
      const keep = panel.getByRole('radio', { name: /Keep this result|Keep these dice/ });
      if (await keep.count()) await keep.check();
      else if (await panel.getByLabel('Wizard destination', { exact: true }).count()) {
        await panel.getByLabel('Wizard destination', { exact: true }).selectOption(state.pending.options[0].id);
      } else {
        const inputs = panel.locator('input');
        for (let index = 0; index < state.pending.min; index++) await inputs.nth(index).check();
      }
      await panel.getByRole('button', { name: 'Confirm choice', exact: true }).click();
      await expect.poll(async () => (await currentSave(page)).revision).toBe(state.revision + 1);
    }
    expect((await currentSave(page)).pending).toBeNull();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(external).toEqual([]);
  });
}
