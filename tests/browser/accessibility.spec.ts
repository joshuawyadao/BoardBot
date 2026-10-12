import AxeBuilder from '@axe-core/playwright';
import { expect, setAvailableFile, test, type Page } from './test';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';

async function importGame(page: Page, hero = 'Fighter', seed = 17) {
  const data = heroFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await setAvailableFile(page.locator('#game-data-file'), {
    name: 'synthetic-accessibility.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByLabel('Hero', { exact: true }).selectOption(hero);
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

async function assertFocusedInViewport(page: Page, selector: string) {
  const target = page.locator(selector);
  await expect(target).toBeFocused();
  await expect(target).toBeInViewport({ ratio: 1 });
  const { top, bottom } = await target.evaluate(element => {
    const bounds = element.getBoundingClientRect();
    return { top: bounds.top, bottom: bounds.bottom };
  });
  expect(top).toBeGreaterThanOrEqual(0);
  expect(bottom).toBeLessThanOrEqual(page.viewportSize()!.height);
}

async function scan(page: Page, state: string) {
  const result = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  expect(result.violations.map(violation => ({
    id: violation.id,
    impact: violation.impact,
    targets: violation.nodes.map(node => node.target.join(' ')),
  })), `${state} axe violations`).toEqual([]);
  // Axe cannot determine every contrast against translucent panels or painted terrain.
  // Keep those results visible for manual review instead of silently calling them a pass.
  const contrastIncomplete = result.incomplete.filter(item => item.id === 'color-contrast');
  if (contrastIncomplete.length) {
    test.info().annotations.push({
      type: 'manual-contrast-review',
      description: `${state}: ${contrastIncomplete.flatMap(item => item.nodes.map(node => node.target.join(' '))).join(', ')}`,
    });
  }
}

test('keyboard action review returns focus and commits a named Move once', async ({ page }) => {
  await importGame(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  const move = page.getByRole('button', { name: 'Move Connected location' });
  await move.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('[data-panel="action"]')).toBeVisible();
  await page.getByRole('button', { name: 'Close Review action' }).press('Enter');
  await expect(move).toBeFocused();
  await move.press('Enter');
  await page.getByRole('button', { name: 'Clear selection' }).press('Enter');
  await expect(move).toBeFocused();
  await move.press('Enter');
  const destination = page.getByLabel('Move destination', { exact: true });
  await destination.selectOption('a');
  await page.getByRole('button', { name: 'Move to selected location' }).press('Enter');
  await expect(page.locator('.h-location.current')).toHaveAttribute('data-location-id', 'a');
  await assertFocusedInViewport(page, '[data-location-id="a"]');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
});

test('Pick Up keyboard confirmation presents its result without another commit', async ({ page }) => {
  await importGame(page);
  await page.getByRole('button', { name: 'Pick Up Items' }).press('Enter');
  await page.locator('.h-action-editor input[type="checkbox"]').first().check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).press('Enter');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await assertFocusedInViewport(page, '[data-panel="result"] h3');
  await expect(page.locator('[data-panel="inventory"]')).toBeHidden();
  await expect(page.locator('[data-panel="result"]')).toContainText('pick-up');
});

test('ending a phase without a required response retains a visible keyboard control', async ({ page }) => {
  await importGame(page);
  await page.getByRole('button', { name: 'Ready to play' }).click();
  await page.getByRole('button', { name: 'End Hero Phase', exact: true }).press('Enter');
  await expect(page.locator('.h-workspace-heading .eyebrow')).toContainText('TURN 2');
  await expect(page.locator('.h-pending')).toHaveCount(0);
  await assertFocusedInViewport(page, '.h-tray .end-button');
});

test('required choices and panel return stay visible at 320px with enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.style.fontSize = '200%';
    }, { once: true });
  });
  await importGame(page, 'Fighter', 2);
  expect(await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).fontSize))).toBe(32);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
  await assertFocusedInViewport(page, '.h-pending h2');
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await assertFocusedInViewport(page, '.h-pending h2');
  const opener = page.getByRole('button', { name: /^Inventory/ });
  await opener.click();
  await page.getByRole('button', { name: 'Close Inventory' }).click();
  await assertFocusedInViewport(page, '.h-panel-nav button:first-child');
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await assertFocusedInViewport(page, '.h-pending h2');
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await assertFocusedInViewport(page, '.h-pending h2');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('all information panels preserve a readable action and required choice at desktop size', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 1280, height: 720 });
  await importGame(page, 'Fighter', 2);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  for (const name of [/^Inventory/, /^Monsters$/, /^Event log$/, /^Locations$/, /^Decks & progress$/, /^Latest result$/]) {
    await page.getByRole('button', { name }).click();
  }
  await page.getByRole('button', { name: 'How to play' }).click();
  await page.locator('.h-location').first().click();
  await expect(page.locator('.h-context-panel:visible')).toHaveCount(9); // action + eight information panels
  const perkDetails = page.locator('[data-panel="inventory"] .h-inventory-perk');
  await perkDetails.locator('summary').click();
  await page.getByRole('button', { name: 'Review action', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Roll special action' })).toBeInViewport();
  await expect(page.locator('.h-board-fit')).toBeInViewport({ ratio: 1 });
  await page.getByRole('button', { name: /^Move Monsters panel to/ }).click();
  await expect(perkDetails).toHaveAttribute('open', '');
  await expect(page.getByRole('button', { name: 'Roll special action' })).toBeEnabled();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  const choice = page.locator('[data-panel="choice"]');
  await expect(choice).toBeVisible();
  expect(await choice.locator('.h-choice-scroll').evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(100);
  await expect(page.getByRole('radio', { name: 'Keep this result' })).toBeVisible();
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await page.getByRole('button', { name: /^Move Inventory panel to/ }).click();
  await expect(page.getByRole('radio', { name: 'Keep this result' })).toBeChecked();
  await expect(perkDetails).toHaveAttribute('open', '');
  await page.getByRole('button', { name: 'Required choice', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Confirm choice', exact: true })).toBeInViewport();
  await expect(page.locator('.h-board-fit')).toBeInViewport({ ratio: 1 });
  await expect(page.locator('.h-context-panel:visible')).toHaveCount(9);
});

test('short desktop windows and enlarged text preserve usable choice reading space', async ({ page }) => {
  await importGame(page, 'Fighter', 2);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: 'Roll special action' }).click();
  for (const [width, height, font] of [[1280, 480, 100], [1280, 720, 200], [1024, 768, 200]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(font => { document.documentElement.style.fontSize = `${font}%`; }, font);
    await page.getByRole('button', { name: 'Required choice', exact: true }).click();
    await assertFocusedInViewport(page, '.h-pending h2');
    expect(await page.locator('.h-choice-scroll').evaluate(element => element.clientHeight)).toBeGreaterThanOrEqual(100);
    await page.getByRole('radio', { name: 'Keep this result' }).check();
    const confirm = page.getByRole('button', { name: 'Confirm choice', exact: true });
    await confirm.focus();
    await expect(confirm).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  }
});

test('unavailable Share explains its reason and information scrolls by keyboard', async ({ page }) => {
  await importGame(page);
  const share = page.getByRole('button', { name: 'Share Exchange items' });
  await expect(share).toHaveAttribute('aria-disabled', 'true');
  await expect(share).toHaveAttribute('aria-describedby', /\S/);
  const description = await share.evaluate(element => {
    const id = element.getAttribute('aria-describedby');
    return id ? document.getElementById(id)?.textContent : null;
  });
  expect(description).toMatch(/another eligible hero|solo/i);
  await share.focus();
  await expect(share).toBeFocused();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  const scrollArea = page.locator('[data-panel="monsters"] .h-context-body');
  await expect(scrollArea).toHaveAttribute('tabindex', '0');
  await scrollArea.focus();
  await page.keyboard.press('End');
  await expect.poll(() => scrollArea.evaluate(element => element.scrollTop)).toBeGreaterThan(0);
});

test('home, setup, game, panels, action, choice and delete dialog have no automated axe violations', async ({ page }) => {
  test.setTimeout(120_000);
  const data = heroFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await page.goto('/');
  await expect(page.getByRole('button', { name: 'Try sample table' })).toBeEnabled();
  await scan(page, 'home');
  await page.getByText('Import game data or backup').click();
  await setAvailableFile(page.locator('#game-data-file'), {
    name: 'synthetic-accessibility.json', mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('2');
  await scan(page, 'hero setup');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  await scan(page, 'new game');
  await page.getByRole('button', { name: /^Inventory/ }).click();
  await page.getByRole('button', { name: 'Monsters', exact: true }).click();
  await page.locator('.h-location').first().click();
  await scan(page, 'information panels');
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await scan(page, 'action review');
  await page.getByRole('button', { name: 'Roll special action' }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
  await scan(page, 'required choice');
  await page.getByRole('button', { name: 'Saved games', exact: true }).click();
  await page.getByRole('button', { name: 'Delete', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await scan(page, 'delete dialog');
});
