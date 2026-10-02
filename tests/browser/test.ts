import { test as base } from '@playwright/test';
export { expect } from '@playwright/test';
export type { Page } from '@playwright/test';

// Public UI tests never fetch the owner's private packet from an existing dev server.
// Individual startup cases can supply a synthetic response through a page route.
export const test = base.extend<{ syntheticDataBoundary: void }>({
  syntheticDataBoundary: [async ({ context }, use) => {
    await context.route('**/__boardbot/local-game-data', route => route.fulfill({ status: 404, body: '' }));
    await use();
  }, { auto: true }],
});
