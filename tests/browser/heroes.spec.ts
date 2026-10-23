import { expect, readSavedState, startSyntheticGame, test } from './test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

for (const hero of ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard']) {
  test(`${hero} selection, ability, and recovery work with external requests blocked`, async ({ page, context }) => {
    const external: string[] = [];
    await context.route('**/*', route => {
      if (new URL(route.request().url()).hostname === '127.0.0.1') return route.fallback();
      external.push(route.request().url()); return route.abort('internetdisconnected');
    });
    await startSyntheticGame(page, heroFixture(), { fileName: 'synthetic.json', hero, seed: 17 });
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
    await expect.poll(async () => (await readSavedState(page)).revision).toBe(1);
    const committed = await readSavedState(page);
    await expect(page.locator('.h-roll-peek')).toContainText(`${hero} special action`);
    expect(committed.hero.definitionId).toBe(`hero-${hero.toLowerCase()}`);
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(page.getByText(`Local ${hero} game`)).toBeVisible();
    expect(await readSavedState(page)).toEqual(committed);
    // Finish the persisted choice through ordinary controls, never by injecting game state.
    for (let step = 0; step < 30; step++) {
      const state = await readSavedState(page);
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
      await expect.poll(async () => (await readSavedState(page)).revision).toBe(state.revision + 1);
    }
    expect((await readSavedState(page)).pending).toBeNull();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
    expect(external).toEqual([]);
  });
}
