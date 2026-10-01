import { expect, test, type Page } from '@playwright/test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';

async function loadGame(page: Page, data = fighterFixture()) {
  await page.goto('/');
  await page.getByText('Load prepared local game data').click();
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
  await page.locator('#game-data-file').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}
async function savedPayload(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/src/session/localSaveStore.ts';
    const module = await import(modulePath);
    const store = await module.openLocalSaveStore();
    const saved = await store.read(); store.close(); return saved.current!.payload;
  });
}

test('autosaves movement and resumes after reload without replaying another action', async ({ page }) => {
  await loadGame(page);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  const before = await savedPayload(page);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await expect(page.locator('.h-table .hero')).toContainText('Room 1');
  expect(await savedPayload(page)).toBe(before);
  await page.getByRole('button', { name: 'Sample table' }).click();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
});

test('restores the exact pending d20 response and exports a locally usable backup', async ({ page }) => {
  const data = fighterFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await loadGame(page, data);
  await page.getByRole('button', { name: 'Special Action Hero ability' }).click();
  await page.getByRole('button', { name: /^(Confirm action|Roll special action)$/ }).click();
  await expect(page.locator('.h-pending')).toBeVisible();
  const pending = await page.locator('.h-pending').innerText();
  const before = await savedPayload(page);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup' }).click();
  expect((await download).suggestedFilename()).toBe('boardbot-save.json');
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.locator('.h-pending')).toHaveText(pending, { useInnerText: true });
  expect(await savedPayload(page)).toBe(before);
  await page.getByRole('radio', { name: 'Keep this result' }).check();
  await page.getByRole('button', { name: 'Confirm choice', exact: true }).click();
  await expect.poll(async () => JSON.parse(await savedPayload(page)).state.revision).toBe(2);
  const later = await savedPayload(page);
  await page.getByRole('button', { name: 'Sample table' }).click();
  await page.getByText('Load prepared local game data').click();
  await page.locator('#game-save-file').setInputFiles({ name: 'boardbot-save.json', mimeType: 'application/json', buffer: Buffer.from(before) });
  await expect(page.getByRole('button', { name: 'Replace saved game', exact: true })).toBeVisible();
  expect(await savedPayload(page)).toBe(later);
  await page.getByRole('button', { name: 'Replace saved game', exact: true }).click();
  await expect(page.locator('.h-pending')).toHaveText(pending, { useInnerText: true });
  expect(await savedPayload(page)).toBe(before);
});

test('failed writes pause gameplay and retry commits the already resolved action once', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await page.evaluate(() => {
    const put = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      IDBObjectStore.prototype.put = put;
      const request = put.apply(this, args); this.transaction.abort(); return request;
    };
  });
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toBeVisible();
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
  expect(await savedPayload(page)).toBe(original);
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  const saved = JSON.parse(await savedPayload(page));
  expect(saved.state.commands).toHaveLength(1);
  expect(saved.state.hero.location).toBe('a');
});

test('invalid imports retain the save and a damaged current payload can recover the previous save', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await page.getByRole('button', { name: 'Sample table' }).click();
  await page.getByText('Load prepared local game data').click();
  await page.locator('#game-save-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('malformed');
  expect(await savedPayload(page)).toBe(original);
  await page.evaluate(async () => {
    const modulePath = '/src/session/localSaveStore.ts';
    const module = await import(modulePath);
    const store = await module.openLocalSaveStore();
    const slots = await store.read(); await store.write('{broken', slots.current!.token); store.close();
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('alert')).toContainText('malformed');
  await page.getByText('Recovery options', { exact: true }).click();
  await page.getByRole('button', { name: 'Recover previous save' }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(await savedPayload(page)).toBe(original);
});

test('a stale tab cannot overwrite newer progress and can load the latest save', async ({ page, context }) => {
  await loadGame(page);
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(other.getByText('Local game in progress.')).toBeVisible();
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  const newer = await savedPayload(page);
  await other.getByRole('button', { name: 'Move Connected location' }).click();
  await other.getByRole('button', { name: /Room 3/ }).click();
  await expect(other.getByRole('alert')).toContainText('newer save');
  expect(await savedPayload(other)).toBe(newer);
  await other.getByRole('button', { name: 'Discard unsaved action and load latest save' }).click();
  await expect(other.locator('.h-table .hero')).toContainText('Room 1');
});

test('an interruption immediately after storage commit resumes the committed move', async ({ page }) => {
  await loadGame(page);
  await page.evaluate(() => {
    const transaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args: Parameters<IDBDatabase['transaction']>) {
      const tx = transaction.apply(this, args);
      if (args[1] === 'readwrite') {
        IDBDatabase.prototype.transaction = transaction;
        // Registered before the adapter's completion handler, before it can publish the result.
        tx.addEventListener('complete', () => location.reload(), { once: true });
      }
      return tx;
    };
  });
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  const resume = page.getByRole('button', { name: 'Resume saved game' });
  await expect(resume).toBeVisible();
  await resume.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  expect(JSON.parse(await savedPayload(page)).state.commands).toHaveLength(1);
});

test('damaged current metadata still exposes previous-save recovery in the app', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await page.evaluate(async () => {
    const path = '/src/session/localSaveStore.ts';
    const store = await (await import(path)).openLocalSaveStore();
    const slots = await store.read(); await store.write(slots.current!.payload, slots.current!.token); store.close();
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('boardbot-local-game', 1);
      open.onsuccess = () => {
        const db = open.result; const tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put({ payload: 'broken wrapper' }, 'current');
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => reject(tx.error);
      };
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('alert')).toContainText('record is damaged');
  await page.getByText('Recovery options', { exact: true }).click();
  await page.getByRole('button', { name: 'Recover previous save' }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(await savedPayload(page)).toBe(original);
});
