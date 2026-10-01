import { expect, test, type Page } from '@playwright/test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

async function currentSave(page: Page) {
  return page.evaluate(async () => {
    const path = '/src/session/localSaveStore.ts';
    const store = await (await import(path)).openLocalSaveStore();
    const slots = await store.read(); store.close(); return JSON.parse(slots.current!.payload).state;
  });
}

for (const hero of ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard']) {
  test(`${hero} selection, ability, and recovery work with external requests blocked`, async ({ page, context }) => {
    const external: string[] = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.continue();
      external.push(route.request().url()); return route.abort('internetdisconnected');
    });
    await page.goto('/');
    await page.getByText('Load prepared local game data').click();
    await page.getByLabel('Hero', { exact: true }).selectOption(hero);
    await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
    await page.locator('#game-data-file').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(heroFixture())) });
    await expect(page.getByText(`Local ${hero} game`)).toBeVisible();
    await expect(page.getByRole('heading', { name: `${hero} inventory` })).toBeVisible();
    await expect(page.locator('.h-location.current .h-node-meta')).toContainText(hero.toUpperCase());
    await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
    await expect(page.getByRole('heading', { name: `${hero} special action` })).toBeVisible();
    await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
    await expect.poll(async () => (await currentSave(page)).revision).toBe(1);
    const committed = await currentSave(page);
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
      else {
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
