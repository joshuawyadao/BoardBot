import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { validateLocalGameData } from '../../src/data/localGameData';
import type { GameData } from '../../src/data/gameData';
import { adjacentLocations } from '../../src/engine/gamePrimitives';
import { getFighterView } from '../../src/engine/horrifiedGame';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';

const HEROES = ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard'] as const;
const inputPath = process.env.BOARDBOT_PRIVATE_DATA || 'local-data/horrified-dnd/game-data.json';
let data: GameData;
try {
  data = validateLocalGameData(JSON.parse(readFileSync(resolve(inputPath), 'utf8')));
  if (data.contentKind !== 'owner-verified') throw new Error('Not owner-verified data');
} catch {
  throw new Error('Private acceptance requires valid owner-verified prepared data. Set BOARDBOT_PRIVATE_DATA or run npm run data:prepare; this check cannot be skipped.');
}

/** Inspect the save written by ordinary UI actions, without changing browser state. */
async function savedPayload(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, fail) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => ok(request.result);
      request.onerror = () => fail(new Error('Could not open the local game library.'));
    });
    try {
      return await new Promise<string>((ok, fail) => {
        const transaction = db.transaction('games', 'readonly');
        const request = transaction.objectStore('games').getAll();
        transaction.oncomplete = () => {
          if (request.result.length !== 1 || !request.result[0].current?.state) fail(new Error('Expected one autosaved game.'));
          else ok(JSON.stringify(request.result[0].current.state));
        };
        transaction.onerror = () => fail(new Error('Could not read the local game.'));
      });
    } finally { db.close(); }
  });
}

async function state(page: Page): Promise<FighterGame> {
  return JSON.parse(await savedPayload(page)) as FighterGame;
}

async function afterRevision(page: Page, revision: number): Promise<FighterGame> {
  await expect.poll(async () => (await state(page)).revision).toBe(revision + 1);
  return state(page);
}

async function resume(page: Page, expected: string) {
  await page.reload();
  await expect(page.getByRole('button', { name: 'Resume saved game', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect((await savedPayload(page)) === expected, 'reload must preserve the exact saved state').toBe(true);
}

async function resolveChoice(page: Page, current: FighterGame) {
  const panel = page.locator('.h-pending');
  await expect(panel).toBeVisible();
  const choices = panel.locator('input');
  const destination = panel.getByLabel('Wizard destination', { exact: true });
  if (await destination.count()) await expect(destination).toBeEnabled({ timeout: 10_000 });
  else await expect(choices.first()).toBeEnabled({ timeout: 10_000 });
  const keep = panel.getByRole('radio', { name: /Keep this result|Keep these dice/ });
  if (await keep.count()) await keep.check();
  else if (await destination.count()) await destination.selectOption(current.pending!.options[0].id);
  else for (let index = 0; index < current.pending!.min; index++) await choices.nth(index).check();
  const confirm = panel.getByRole('button', { name: 'Confirm choice', exact: true });
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await afterRevision(page, current.revision);
}

function nearestItemStep(current: FighterGame): string | null {
  if (!current.hero.location) return null;
  const visited = new Set([current.hero.location]);
  const queue: { at: string; first: string | null }[] = [{ at: current.hero.location, first: null }];
  for (const node of queue) {
    if (current.boardItems[node.at]?.length) return node.first;
    for (const next of adjacentLocations(data.board, node.at, 'hero')) {
      if (visited.has(next)) continue;
      visited.add(next);
      queue.push({ at: next, first: node.first ?? next });
    }
  }
  return null;
}

for (const heroName of HEROES) {
  test(`${heroName}: prepared setup, legal controls, pending recovery, and complete outcome`, async ({ page, context, baseURL }) => {
    const origin = new URL(baseURL!).origin;
    let externalRequests = 0;
    let browserErrors = 0;
    page.on('pageerror', () => { browserErrors++; });
    await context.route('**/*', route => {
      if (new URL(route.request().url()).origin === origin) return route.fallback();
      externalRequests++;
      return route.abort('internetdisconnected');
    });
    await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: data }));
    await page.goto('/');
    await expect(page.getByRole('button', { name: 'New game', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'New game', exact: true }).click();
    await expect(page.getByLabel('Hero', { exact: true }).locator('option')).toHaveCount(5);
    await page.getByLabel('Hero', { exact: true }).selectOption(heroName);
    await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
    await page.getByRole('button', { name: 'Start game', exact: true }).click();
    await expect(page.getByText('Local game in progress.')).toBeVisible();
    const initial = await state(page);
    const hero = data.heroes.find(candidate => candidate.name === heroName)!;
    expect(initial.revision).toBe(0);
    expect(initial.hero.definitionId).toBe(hero.id);
    expect(initial.hero.location).toBe(hero.start);
    expect(initial.hero.actions).toBe(hero.actions);
    expect(initial.monsters.beholder.location).toBe(data.setup!.beholderLocation);
    expect(initial.monsters.displacerBeast.location).toBe(data.setup!.displacerLocation);
    expect(Object.values(initial.boardItems).flat().length).toBe(12);
    expect(initial.hero.perks.length).toBe(1);
    expect(Object.keys(initial.lairs).length).toBe(4);
    await expect(page.locator('.h-setup-summary')).toContainText('12 Items');
    await expect(page.locator('.h-setup-summary')).toContainText('4 Lairs');
    await expect(page.locator('.game-board .piece-beholder')).toHaveCount(2); // board + key
    await expect(page.locator('.game-board .piece-displacer')).toHaveCount(2);
    const visible = await page.locator('body').innerText();
    expect(visible.includes(data.provenance.recordSha256), 'private provenance must not appear on the table').toBe(false);
    expect(visible.includes(initial.random.value.toString()), 'random state must not appear on the table').toBe(false);

    let moved = false;
    let picked = false;
    let special = false;
    let pendingReloaded = false;
    let phaseEnded = false;
    for (let decision = 0; decision < 160; decision++) {
      const current = await state(page);
      if (current.phase === 'won' || current.phase === 'lost') break;
      if (current.pending) {
        if (!pendingReloaded) {
          const exact = await savedPayload(page);
          await resume(page, exact);
          pendingReloaded = true;
        }
        await resolveChoice(page, current);
        continue;
      }
      const end = page.getByRole('button', { name: 'End Hero Phase', exact: true });
      await expect(end).toBeEnabled();
      const view = getFighterView(data, current);
      if (!picked && !view.actions['pick-up']) {
        await page.getByRole('button', { name: 'Pick Up Items' }).click();
        await page.locator('.h-action-editor input[type=checkbox]').first().check();
        await page.getByRole('button', { name: 'Confirm action', exact: true }).click();
        picked = true;
      } else if (!moved && !view.actions.move && view.moveDestinations.length) {
        const destination = nearestItemStep(current) ?? view.moveDestinations[0];
        expect(view.moveDestinations.includes(destination), 'the selected step must be a legal Move').toBe(true);
        await page.locator('.action-card').first().click();
        const index = data.board.locations.findIndex(location => location.id === destination);
        await expect(page.locator('.h-location').nth(index)).toHaveAttribute('aria-disabled', 'false');
        await page.locator('.h-location').nth(index).click();
        moved = true;
      } else if (!special && !view.actions.special) {
        await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
        await page.getByRole('button', { name: 'Roll special action', exact: true }).click();
        special = true;
      } else {
        await end.click();
        phaseEnded = true;
      }
      await afterRevision(page, current.revision);
    }
    const finished = await state(page);
    expect(finished.phase === 'won' || finished.phase === 'lost', `${heroName} must reach a legal end within the decision bound`).toBe(true);
    expect({ moved, picked, special, pendingReloaded, phaseEnded }).toEqual({ moved: true, picked: true, special: true, pendingReloaded: true, phaseEnded: true });
    expect(finished.endReason !== null).toBe(true);
    const finalPayload = await savedPayload(page);
    await resume(page, finalPayload);
    await expect(page.getByRole('button', { name: 'End Hero Phase', exact: true })).toBeDisabled();
    expect((await savedPayload(page)) === finalPayload, 'terminal save must survive reload unchanged').toBe(true);
    expect(externalRequests).toBe(0);
    expect(browserErrors).toBe(0);
    console.info(`${heroName}: ${finished.phase}, turn ${finished.turn}, ${finished.revision} legal decisions; pending and terminal saves restored exactly.`);
  });
}
