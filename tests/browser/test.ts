import { expect, test as base, type Locator, type Page } from '@playwright/test';
import type { GameData } from '../../src/data/gameData';
import type { FighterGame } from '../../src/engine/horrifiedRuntime';
export { expect };
export type { Page } from '@playwright/test';

/** Upload through a file control, with the same startup availability as native interaction. */
export async function setAvailableFile(input: Locator, files: Parameters<Locator['setInputFiles']>[0]) {
  // setInputFiles bypasses disabled controls; preserve the app's native startup/busy boundary.
  await expect(input).toBeEnabled();
  await input.setInputFiles(files);
}

/** Start a game using synthetic components through the same controls as a player. */
export async function startSyntheticGame(
  page: Page,
  data: GameData,
  options: { fileName: string; seed?: number; hero?: string },
): Promise<void> {
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await setAvailableFile(page.locator('#game-data-file'), {
    name: options.fileName,
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(data)),
  });
  if (options.hero) await page.getByLabel('Hero', { exact: true }).selectOption(options.hero);
  if (options.seed !== undefined) {
    await page.getByLabel('Seed (optional, for a repeatable setup)').fill(String(options.seed));
  }
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}

/** Read the first synthetic game's committed save through the public library API. */
export async function savedPayload(page: Page): Promise<string> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    try {
      const [game] = await library.list();
      return (await library.game(game.id).read()).current!.payload;
    } finally { library.close(); }
  });
}

export async function readSavedState(page: Page): Promise<FighterGame> {
  return (JSON.parse(await savedPayload(page)) as { state: FighterGame }).state;
}

// Public UI tests never fetch the owner's private packet from an existing dev server.
// Individual startup cases can supply a synthetic response through a page route.
export const test = base.extend<{ syntheticDataBoundary: void }>({
  syntheticDataBoundary: [async ({ context }, use) => {
    await context.route('**/__boardbot/local-game-data', route => route.fulfill({ status: 404, body: '' }));
    await use();
  }, { auto: true }],
});
