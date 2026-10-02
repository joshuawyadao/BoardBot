import { expect, test, type Page } from './test';
import type { GameData } from '../../src/data/gameData';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';
import { createFighterGame, dispatchGame } from '../../src/engine/horrifiedGame';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';

async function saved(page: Page): Promise<FighterGame> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    try {
      const [game] = await library.list();
      return JSON.parse((await library.game(game.id).read()).current!.payload).state;
    } finally { library.close(); }
  });
}

function fixture(perk: string) {
  const data = heroFixture();
  data.perks = data.perks.filter(card => card.id === perk);
  data.perks[0].quantity = 3;
  data.items.forEach(item => { item.locations = Array<string>(item.quantity).fill('b'); });
  data.setup!.displacerLocation = 'b';
  data.board.monsterStarts.find(start => start.number === 1)!.location = 'b';
  return data;
}

async function start(page: Page, data: GameData, seed: number) {
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption('Fighter');
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(seed));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

async function revision(page: Page, value: number) {
  await expect.poll(async () => (await saved(page)).revision).toBe(value);
  await expect(page.getByRole('button', { name: 'End Hero Phase', exact: true })).toBeEnabled();
}

async function pickUpAll(page: Page) {
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  const inputs = page.locator('.h-action-editor input[type=checkbox]');
  for (let i = 0; i < await inputs.count(); i++) await inputs.nth(i).check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await revision(page, 1);
}

// Seed discovery only arranges a natural roll. No browser state or random result is injected.
async function seedForNineteen(data: GameData) {
  for (let seed = 0; seed < 200; seed++) {
    const initial = await createFighterGame(data, seed);
    const result = dispatchGame(data, initial, { id: 'seed-check', actorSeatId: 'solo', revision: 0, action: { kind: 'special' } });
    if (result.state.roll?.result.base === 19) return seed;
  }
  throw new Error('No natural 19 found within the fixed seed bound.');
}

test('Ott overflow resolves as 20 once, spends its Perk, and does not reopen for the new reward', async ({ page }) => {
  // Rules-Reference: owner-approved d20 bounds, event closure, and saved Fighter effects.
  const data = fixture('perk-ott-steeltoes');
  await start(page, data, await seedForNineteen(data));
  const initial = await saved(page);
  expect(initial.hero.actions).toBe(4);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  expect(await saved(page)).toEqual(initial);
  await page.getByRole('button', { name: 'Roll special action', exact: true }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
  const pending = await saved(page);
  expect(pending.roll?.result.base).toBe(19);
  expect(pending.hero.actions).toBe(3);
  expect(pending.hero.perks).toEqual(initial.hero.perks);
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
  await page.locator('.h-pending').getByRole('radio', { name: /\+2$/ }).check();
  const confirm = page.locator('.h-pending').getByRole('button', { name: 'Confirm choice' });
  await expect(confirm).toBeEnabled();
  // Two clicks in one event loop must still commit one response.
  await confirm.evaluate(button => { (button as HTMLButtonElement).click(); (button as HTMLButtonElement).click(); });
  await revision(page, 2);
  const finished = await saved(page);
  expect(finished.rolls).toHaveLength(1);
  expect(finished.rolls[0].result).toEqual({ base: 19, modifiers: [2], adjustedTotal: 21, effectiveResult: 20 });
  expect(finished.hero.actions).toBe(5);
  expect(finished.perkDiscard).toEqual(initial.hero.perks);
  expect(finished.hero.perks).toHaveLength(1);
  expect(finished.hero.perks[0]).not.toBe(initial.hero.perks[0]);
  expect(finished.perkDeck).toHaveLength(initial.perkDeck.length - 1);
  expect(finished.pending).toBeNull();
  expect(finished.roll).toBeNull();
  await expect(page.locator('.h-roll-peek [data-testid=roll-effective]')).toHaveText('20');
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  expect(await saved(page)).toEqual(finished);
  await expect(page.locator('.h-pending')).toHaveCount(0);
});

test('Mystra requires exactly seven strength before confirmation and spends no Hero action', async ({ page }) => {
  // Verified Perk requirement: exact cost, free Perk, Terror decreases by two.
  const data = fixture('perk-mystra');
  await start(page, data, 0);
  const initial = await saved(page);
  await page.getByRole('button', { name: 'Pick Up Items' }).click();
  await page.locator('.h-action-editor input[type=checkbox]').first().check();
  await page.getByRole('button', { name: 'Clear selection' }).click();
  expect(await saved(page)).toEqual(initial);
  await pickUpAll(page);
  const held = await saved(page);
  const itemWith = (strength: number) => held.hero.items.find(id => data.items.find(item => item.id === held.items[id].definitionId)!.strength === strength)!;
  const one = itemWith(1), two = itemWith(2), six = itemWith(6);
  expect([one, two, six].every(Boolean)).toBe(true);
  await page.getByRole('button', { name: 'Perks Eligible cards' }).click();
  await page.locator('.h-action-editor input[name=perk-option]').first().check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
  const awaiting = await saved(page);
  expect(awaiting.hero.actions).toBe(3);
  expect(awaiting.terror).toBe(3);
  const panel = page.locator('.h-pending');
  const option = (id: string) => panel.locator('input').nth(awaiting.pending!.options.findIndex(option => option.id === id));
  await option(two).check(); await option(six).check();
  await expect(panel.getByRole('button', { name: 'Confirm choice' })).toBeDisabled();
  await expect(panel).toContainText('Mystra requires exactly 7 strength.');
  expect(await saved(page)).toEqual(awaiting);
  await option(two).uncheck(); await option(one).check();
  await expect(panel.getByRole('button', { name: 'Confirm choice' })).toBeEnabled();
  await panel.getByRole('button', { name: 'Confirm choice' }).click();
  await revision(page, 3);
  const paid = await saved(page);
  expect(paid.terror).toBe(1);
  expect(paid.hero.actions).toBe(3);
  expect(paid.itemDiscard.slice().sort()).toEqual([one, six].sort());
  expect(paid.hero.items.slice().sort()).toEqual(held.hero.items.filter(id => id !== one && id !== six).sort());
  expect(paid.perkDiscard).toEqual(initial.hero.perks);
  expect(paid.pending).toBeNull();
});

test('Displacer placement offers the printed strength exceptions and commits its Item to the field', async ({ page }) => {
  // Published D&D instructions p.10: strengths 1/2/3 match cells; 4/5/6 fit any cell.
  const data = fixture('perk-the-blackstaff');
  await start(page, data, 0);
  await pickUpAll(page);
  const held = await saved(page);
  await page.getByRole('button', { name: 'Advance Challenge' }).click();
  const options = page.locator('.h-action-editor input[name=advance-option]');
  const labels = await options.evaluateAll(inputs => inputs.map(input => input.parentElement!.textContent!));
  for (const id of held.hero.items) {
    const item = data.items.find(item => item.id === held.items[id].definitionId)!;
    const matching = labels.filter(label => label.includes(item.name));
    // Copies have identical labels, so compare count per physical copy of this definition.
    const copies = held.hero.items.filter(heldId => held.items[heldId].definitionId === item.id).length;
    expect(matching).toHaveLength(copies * (item.strength >= 4 ? 9 : 3));
  }
  const high = held.hero.items.find(id => data.items.find(item => item.id === held.items[id].definitionId)!.strength === 4)!;
  expect(high).toBeTruthy();
  const highName = data.items.find(item => item.id === held.items[high].definitionId)!.name;
  const index = labels.findIndex(label => label.includes(highName) && label.endsWith('cell 2:2'));
  expect(index).toBeGreaterThanOrEqual(0);
  await options.nth(index).check();
  await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
  await revision(page, 2);
  const placed = await saved(page);
  const committed = placed.displacement['2:2'];
  expect(held.items[committed].definitionId).toBe(held.items[high].definitionId);
  expect(placed.hero.actions).toBe(2);
  expect(placed.hero.items).not.toContain(committed);
  expect(placed.itemDiscard).not.toContain(committed);
  expect(placed.displacement).toEqual({ '2:2': committed });
  expect(placed.bag).toEqual(held.bag);
});
