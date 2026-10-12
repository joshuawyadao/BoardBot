import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { expect, test, type Page } from '@playwright/test';
import { validateLocalGameData } from '../../src/data/localGameData';
import type { GameData } from '../../src/data/gameData';
import { createFighterGame, dispatchGame, gameDataForNewGame, getFighterView } from '../../src/engine/horrifiedGame';
import type { FighterGame, HeroAction } from '../../src/engine/horrifiedRuntime';
import { planVictory, PREPARED_VICTORY_SEED } from './victory-policy';

let prepared: GameData;
try {
  prepared = validateLocalGameData(JSON.parse(readFileSync(resolve(
    process.env.BOARDBOT_PRIVATE_DATA || 'local-data/horrified-dnd/game-data.json',
  ), 'utf8')));
  if (prepared.contentKind !== 'owner-verified') throw new Error('Not owner-verified data');
} catch {
  throw new Error('Private acceptance requires valid owner-verified prepared data. Set BOARDBOT_PRIVATE_DATA or run npm run data:prepare; this check cannot be skipped.');
}

/** Read only the autosave produced by normal UI actions; never inject game state. */
async function savedState(page: Page): Promise<FighterGame> {
  return page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((ok, fail) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => ok(request.result);
      request.onerror = () => fail(new Error('Could not open the local game library.'));
    });
    try {
      return await new Promise<FighterGame>((ok, fail) => {
        const transaction = db.transaction('games', 'readonly');
        const request = transaction.objectStore('games').getAll();
        transaction.oncomplete = () => {
          if (request.result.length !== 1 || !request.result[0].current?.state) fail(new Error('Expected one autosaved game.'));
          else ok(request.result[0].current.state);
        };
        transaction.onerror = () => fail(new Error('Could not read the local game.'));
      });
    } finally { db.close(); }
  });
}

// Boolean comparisons keep private component text and full histories out of reports.
function same(actual: unknown, expected: unknown, message: string) {
  // Autosaves use JSON, which omits optional undefined fields in continuations.
  expect(isDeepStrictEqual(actual, JSON.parse(JSON.stringify(expected))), message).toBe(true);
}

async function resume(page: Page, expected: FighterGame) {
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  same(await savedState(page), expected, 'reload must preserve the complete state exactly');
}

function conserveItems(state: FighterGame) {
  const placed = [...state.bag, ...state.itemDiscard, ...state.hero.items,
    ...Object.values(state.boardItems).flat(), ...Object.values(state.displacement)];
  same(placed.toSorted(), Object.keys(state.items).toSorted(), 'every Item must exist in exactly one place');
}

async function perform(page: Page, data: GameData, state: FighterGame, action: HeroAction) {
  if (action.kind === 'choose') {
    const inputs = page.locator('.h-pending input');
    const destination = page.locator('.h-pending').getByLabel('Wizard destination', { exact: true });
    if (await destination.count()) await expect(destination).toBeEnabled();
    else await expect(inputs.first()).toBeEnabled();
    for (const id of action.selected) {
      const index = state.pending!.options.findIndex(option => option.id === id);
      expect(index, 'the planned choice must be offered').toBeGreaterThanOrEqual(0);
      if (await destination.count()) await destination.selectOption(id);
      else await inputs.nth(index).check();
    }
    await page.locator('.h-pending').getByRole('button', { name: 'Confirm choice', exact: true }).click();
    return;
  }
  await expect(page.getByRole('button', { name: 'End Hero Phase', exact: true })).toBeEnabled();
  const confirm = page.getByRole('button', { name: 'Confirm action', exact: true });
  const items = page.locator('.h-action-editor input[type=checkbox]');
  switch (action.kind) {
    case 'move': {
      await page.getByRole('button', { name: 'Move Connected location' }).click();
      const companions = Object.entries(state.citizens).filter(([, citizen]) =>
        citizen.status === 'board' && citizen.location === state.hero.location);
      for (const id of action.escorts) await items.nth(companions.findIndex(([candidate]) => candidate === id)).check();
      const destination = data.board.locations.findIndex(location => location.id === action.destination);
      await expect(page.locator('.h-location').nth(destination)).toHaveAttribute('aria-disabled', 'false');
      await page.locator('.h-location').nth(destination).click();
      break;
    }
    case 'pick-up':
      await page.getByRole('button', { name: 'Pick Up Items' }).click();
      for (const id of action.items) await items.nth(state.boardItems[state.hero.location!].indexOf(id)).check();
      await confirm.click();
      break;
    case 'advance': {
      await page.getByRole('button', { name: 'Advance Challenge' }).click();
      const index = getFighterView(data, state).advanceOptions.findIndex(option =>
        option.monster === action.monster && option.item === action.item && option.cell === action.cell);
      expect(index, 'the planned Advance must be offered').toBeGreaterThanOrEqual(0);
      await page.locator('.h-action-editor input[name=advance-option]').nth(index).check();
      await confirm.click();
      break;
    }
    case 'defeat':
      await page.getByRole('button', { name: 'Defeat Monster' }).click();
      await page.locator('.h-action-editor input[name=defeat-monster]').nth(action.monster === 'beholder' ? 0 : 1).check();
      for (const id of action.items) await items.nth(state.hero.items.indexOf(id)).check();
      await confirm.click();
      break;
    case 'special':
      await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
      await page.getByRole('button', { name: 'Roll special action', exact: true }).click();
      break;
    case 'end-phase':
      await page.getByRole('button', { name: 'End Hero Phase', exact: true }).click();
      break;
    default:
      throw new Error(`The victory UI adapter needs support for ${action.kind}.`);
  }
}

test('prepared components: legal victory through both challenges and exact recovery', async ({ page, context, baseURL }) => {
  test.setTimeout(180_000);
  const data = gameDataForNewGame(prepared);
  const planned = await planVictory(data, PREPARED_VICTORY_SEED);
  let expected = await createFighterGame(data, PREPARED_VICTORY_SEED);
  const originalData = JSON.stringify(data);
  const origin = new URL(baseURL!).origin;
  let externalRequests = 0;
  let browserErrors = 0;
  page.on('pageerror', () => { browserErrors++; });
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.fallback();
    externalRequests++;
    return route.abort('internetdisconnected');
  });
  await page.route('**/__boardbot/local-game-data', route => route.fulfill({ json: prepared }));
  await page.goto('/');
  await page.getByRole('button', { name: 'New game', exact: true }).click();
  await page.getByLabel('Hero', { exact: true }).selectOption('Fighter');
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(PREPARED_VICTORY_SEED));
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  same(await savedState(page), expected, 'the browser must start from unmodified prepared setup');
  conserveItems(expected);

  let challengeReloaded = false;
  const advanced = new Set<string>();
  const defeated = new Set<string>();
  for (const { action } of planned.commands) {
    if (!challengeReloaded && expected.pending && advanced.size) {
      await resume(page, expected);
      await expect(page.locator('.h-pending')).toBeVisible();
      challengeReloaded = true;
    }
    await perform(page, data, expected, action);
    await expect.poll(async () => (await savedState(page)).revision).toBe(expected.revision + 1);
    const actual = await savedState(page);
    const committed = actual.commands.at(-1)!;
    same(committed.action, action, `the UI must commit the selected action at revision ${actual.revision}`);
    // Replay independently using the UI's UUID; all other command/state fields must match.
    const result = dispatchGame(data, expected, {
      id: committed.id, revision: expected.revision, actorSeatId: 'solo', action,
    });
    expect(result.error === null, `replay rejected revision ${actual.revision}`).toBe(true);
    expected = result.state;
    same(actual, expected, `complete browser state must match replay at revision ${actual.revision}`);
    conserveItems(actual);
    if (action.kind === 'advance') advanced.add(action.monster);
    if (action.kind === 'defeat') defeated.add(action.monster);
  }

  expect(expected.phase).toBe('won');
  expect(expected.monsters.beholder.defeated && expected.monsters.displacerBeast.defeated).toBe(true);
  expect(advanced.size).toBe(2);
  expect(defeated.size).toBe(2);
  expect(challengeReloaded).toBe(true);
  await expect(page.locator('.h-end')).toContainText('Victory');
  await resume(page, expected);
  await expect(page.locator('.h-end')).toContainText('Victory');
  await expect(page.getByRole('button', { name: 'End Hero Phase', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Pick Up Items' })).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'Defeat Monster' })).toHaveAttribute('aria-disabled', 'true');
  expect(JSON.stringify(data) === originalData, 'component data must remain unchanged').toBe(true);
  expect(externalRequests).toBe(0);
  expect(browserErrors).toBe(0);
  console.info(`Fighter: won, seed ${PREPARED_VICTORY_SEED}, turn ${expected.turn}, ${expected.revision} legal decisions; both challenges, Item conservation, exact replay, pending and victory recovery passed.`);
});
