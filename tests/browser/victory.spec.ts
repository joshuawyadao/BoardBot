import { expect, setAvailableFile, test, type Page } from './test';
import type { GameData } from '../../src/data/gameData';
import { heroFixture } from '../../src/engine/fixtures/heroFixture';
import { getActionReason, getFighterView } from '../../src/engine/horrifiedGame';
import type { FighterGame, HeroAction } from '../../src/engine/horrifiedRuntime';

/** A generous supply keeps this test about legal UI play, rather than card scarcity. */
function victoryFixture(): GameData {
  const data = heroFixture();
  data.setup!.beholderLocation = 'b';
  data.setup!.displacerLocation = 'b';
  data.board.monsterStarts = [{ number: 4, location: 'b' }, { number: 1, location: 'b' }];
  data.monsterCards[0].itemsDrawn = 3;
  data.monsterCards[0].quantity = 30;
  data.perks = [{ id: 'perk-drizzt-dourden', name: 'Synthetic extra actions', quantity: 3, effect: 'Synthetic effect' }];
  data.items.forEach(item => { item.quantity = 10; item.locations = Array<string>(10).fill('b'); });
  return data;
}

async function savedPayload(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const [game] = await library.list();
    const saved = await library.game(game.id).read();
    library.close();
    return saved.current!.payload;
  });
}

async function saveAfter(page: Page, revision: number): Promise<FighterGame> {
  await expect.poll(async () => JSON.parse(await savedPayload(page)).state.revision).toBe(revision + 1);
  return JSON.parse(await savedPayload(page)).state;
}

async function load(page: Page, data: GameData, hero: string): Promise<void> {
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await setAvailableFile(page.locator('#game-data-file'), {
    name: 'synthetic-victory.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)),
  });
  await page.getByLabel('Hero', { exact: true }).selectOption(hero);
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('730');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

function defeatCost(data: GameData, state: FighterGame, monster: 'beholder' | 'displacerBeast'): string[] {
  if (monster === 'beholder') return state.hero.items.filter(id =>
    data.items.find(item => item.id === state.items[id].definitionId)?.color === 'yellow');
  const cost: string[] = [];
  let strength = 0;
  for (const id of state.hero.items) {
    cost.push(id);
    strength += data.items.find(item => item.id === state.items[id].definitionId)!.strength;
    if (strength >= 7) break;
  }
  return cost;
}

for (const hero of ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard']) {
  test(`${hero} completes both Monster challenges and retains victory after reload`, async ({ page }) => {
    // Complete legal games involve many UI decisions; allow both browser engines to finish.
    test.setTimeout(180_000);
    const data = victoryFixture();
    await load(page, data, hero);
    let reloadedChallenge = false;
    let usedPickup = false;
    let usedAdvance = false;
    let usedDefeat = false;
    let usedEndPhase = false;

    for (let step = 0; step < 300; step++) {
      const beforePayload = await savedPayload(page);
      const state: FighterGame = JSON.parse(beforePayload).state;
      if (state.phase === 'won' || state.phase === 'lost') break;
      const revision = state.revision;

      if (state.pending) {
        await expect(page.locator('.h-pending input').first()).toBeEnabled();
        if (!reloadedChallenge && usedAdvance) {
          await page.reload();
          await page.getByRole('button', { name: 'Resume saved game' }).click();
          expect(await savedPayload(page)).toBe(beforePayload);
          await expect(page.locator('.h-pending')).toBeVisible();
          reloadedChallenge = true;
        }
        const inputs = page.locator('.h-pending input');
        for (let index = 0; index < state.pending.max; index++) await inputs.nth(index).check();
        await page.locator('.h-pending').getByRole('button', { name: 'Confirm choice' }).click();
      } else {
        await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeEnabled();
        const view = getFighterView(data, state);
        if (!view.actions['pick-up']) {
          usedPickup = true;
          await page.getByRole('button', { name: 'Pick Up Items' }).click();
          const inputs = page.locator('.h-action-editor input[type=checkbox]');
          const count = await inputs.count();
          expect(count).toBeGreaterThan(0);
          for (let index = 0; index < count; index++) await inputs.nth(index).check();
          await page.getByRole('button', { name: 'Confirm action' }).click();
        } else if (!state.hero.actions) {
          usedEndPhase = true;
          await page.getByRole('button', { name: 'End Hero Phase' }).click();
        } else {
          const monster = state.monsters.beholder.defeated ? 'displacerBeast' : 'beholder';
          const cost = defeatCost(data, state, monster);
          const defeat: HeroAction = { kind: 'defeat', monster, items: cost };
          if (!getActionReason(data, state, defeat)) {
            usedDefeat = true;
            await page.getByRole('button', { name: 'Defeat Monster' }).click();
            await page.locator('.h-action-editor input[name=defeat-monster]').nth(monster === 'beholder' ? 0 : 1).check();
            const inputs = page.locator('.h-action-editor input[type=checkbox]');
            for (const id of cost) await inputs.nth(state.hero.items.indexOf(id)).check();
            await page.getByRole('button', { name: 'Confirm action' }).click();
          } else {
            const index = view.advanceOptions.findIndex(option => option.monster === monster);
            if (index >= 0) {
              usedAdvance = true;
              await page.getByRole('button', { name: 'Advance Challenge' }).click();
              await page.locator('.h-action-editor input[name=advance-option]').nth(index).check();
              await page.getByRole('button', { name: 'Confirm action' }).click();
            } else {
              usedEndPhase = true;
              await page.getByRole('button', { name: 'End Hero Phase' }).click();
            }
          }
        }
      }
      await saveAfter(page, revision);
    }

    const wonPayload = await savedPayload(page);
    const won: FighterGame = JSON.parse(wonPayload).state;
    expect(won.phase, `${hero} did not reach victory within 300 legal UI decisions`).toBe('won');
    expect(won.monsters.beholder.defeated).toBe(true);
    expect(won.monsters.displacerBeast.defeated).toBe(true);
    expect({ usedPickup, usedAdvance, usedDefeat, usedEndPhase, reloadedChallenge }).toEqual({
      usedPickup: true, usedAdvance: true, usedDefeat: true, usedEndPhase: true, reloadedChallenge: true,
    });
    await expect(page.locator('.h-end')).toContainText('Victory');
    await page.reload();
    await page.getByRole('button', { name: 'Resume saved game' }).click();
    await expect(page.locator('.h-end')).toContainText('Victory');
    expect(await savedPayload(page)).toBe(wonPayload);
    await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Pick Up Items' })).toHaveAttribute('aria-disabled', 'true');
    await expect(page.getByRole('button', { name: 'Defeat Monster' })).toHaveAttribute('aria-disabled', 'true');
    expect(await savedPayload(page)).toBe(wonPayload);
  });
}
