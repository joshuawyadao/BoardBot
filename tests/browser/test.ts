import { expect, test as base, type Locator } from '@playwright/test';
export { expect };
export type { Page } from '@playwright/test';

/** Upload through a file control, with the same startup availability as native interaction. */
export async function setAvailableFile(input: Locator, files: Parameters<Locator['setInputFiles']>[0]) {
  // setInputFiles bypasses disabled controls; preserve the app's native startup/busy boundary.
  await expect(input).toBeEnabled();
  await input.setInputFiles(files);
}

// Public UI tests never fetch the owner's private packet from an existing dev server.
// Individual startup cases can supply a synthetic response through a page route.
export const test = base.extend<{ syntheticDataBoundary: void }>({
  syntheticDataBoundary: [async ({ context }, use) => {
    await context.route('**/__boardbot/local-game-data', route => route.fulfill({ status: 404, body: '' }));
    await use();
  }, { auto: true }],
});
