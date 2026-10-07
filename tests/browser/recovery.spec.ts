import { expect, test, type Page } from './test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';
import AxeBuilder from '@axe-core/playwright';
import { readFile } from 'node:fs/promises';

async function expectFocusedError(page: Page) {
  const alert = page.getByRole('alert');
  await expect(alert).toBeFocused();
  await expect(alert).toBeInViewport({ ratio: 1 });
  expect(await alert.evaluate(element => element.parentElement?.closest('[role="status"]'))).toBeNull();
}

async function loadGame(page: Page, data = fighterFixture()) {
  await page.goto('/');
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-data-file').setInputFiles({ name: 'synthetic.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(data)) });
  await page.getByLabel('Seed (optional, for a repeatable setup)').fill('17');
  await page.getByRole('button', { name: 'Start game', exact: true }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
}
async function savedPayload(page: Page) {
  return page.evaluate(async () => {
    const modulePath = '/src/session/gameLibrary.ts';
    const library = await (await import(modulePath)).openGameLibrary();
    const games = await library.list();
    const saved = await library.game(games[0].id).read(); library.close(); return saved.current!.payload;
  });
}

async function allPayloads(page: Page): Promise<string[]> {
  return page.evaluate(async () => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const games = await library.list();
    const payloads = await Promise.all(games.map(async (game: { id: string }) => (await library.game(game.id).read()).current!.payload));
    library.close(); return payloads;
  });
}

async function damageCurrent(page: Page, metadata: boolean) {
  await page.evaluate(async metadata => {
    const path = '/src/session/gameLibrary.ts';
    const library = await (await import(path)).openGameLibrary();
    const [game] = await library.list();
    const store = library.game(game.id);
    const slots = await store.read();
    await store.write(slots.current!.payload, slots.current!.token);
    library.close();
    await new Promise<void>((resolve, reject) => {
      const open = indexedDB.open('boardbot-game-library', 1);
      open.onerror = () => reject(open.error);
      open.onsuccess = () => {
        const db = open.result; const tx = db.transaction('games', 'readwrite');
        const records = tx.objectStore('games'); const request = records.get(game.id);
        request.onsuccess = () => {
          const record = request.result;
          if (metadata) record.current = { payload: 'broken wrapper' };
          else record.current.dataRef = 'sha256:missing';
          records.put(record, game.id);
        };
        tx.oncomplete = () => { db.close(); resolve(); }; tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
  }, metadata);
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
  await page.getByRole('button', { name: 'Saved games' }).click();
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
  await page.getByRole('button', { name: 'Saved games' }).click();
  await page.getByText('Import game data or backup').click();
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'games') {
        IDBObjectStore.prototype.put = originalPut;
        this.transaction.abort();
        throw new Error('Simulated imported game write failure');
      }
      return originalPut.apply(this, args);
    };
  });
  await page.locator('#game-save-file').setInputFiles({ name: 'boardbot-save.json', mimeType: 'application/json', buffer: Buffer.from(before) });
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('exact imported adventure');
  await expect(page.getByRole('button', { name: 'Choose another backup', exact: true })).toHaveCount(0);
  expect(await allPayloads(page)).toEqual([later]);
  await page.getByRole('button', { name: 'Retry saving new game', exact: true }).press('Enter');
  await expect.poll(async () => (await allPayloads(page)).length).toBe(2);
  expect(await allPayloads(page)).toContain(later);
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
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('without another roll or draw');
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeDisabled();
  expect(await savedPayload(page)).toBe(original);
  await page.getByRole('button', { name: 'Retry saving', exact: true }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  const saved = JSON.parse(await savedPayload(page));
  expect(saved.state.commands).toHaveLength(1);
  expect(saved.state.hero.location).toBe('a');
  await expect(page.locator('[data-location-id="a"]')).toBeFocused();
});

test('a rejected action focuses accurate guidance and permits a legal retry without changing the save', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await page.evaluate(async () => {
    const path = '/src/session/savedSession.ts';
    const { SavedSession } = await import(path);
    const submit = SavedSession.prototype.submit;
    SavedSession.prototype.submit = function (command: { revision: number }) {
      SavedSession.prototype.submit = submit;
      // Exercise a real engine rejection, rather than a failed storage write.
      return submit.call(this, { ...command, revision: command.revision + 1 });
    };
  });
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('The action was not applied');
  await expect(page.getByRole('alert')).not.toContainText('Retry saving');
  await expect(page.getByRole('button', { name: 'Retry saving', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'End Hero Phase' })).toBeEnabled();
  await expect(page.locator('.h-tray .action-budget')).toContainText('4 / 4');
  expect(await savedPayload(page)).toBe(original);
  await page.getByRole('button', { name: 'Move Connected location' }).click();
  await page.getByRole('button', { name: /Room 1/ }).click();
  await expect(page.locator('.h-tray .action-budget')).toContainText('3 / 4');
  await expect(page.getByRole('alert')).toHaveCount(0);
  const saved = JSON.parse(await savedPayload(page));
  expect(saved.state.commands).toHaveLength(1);
  expect(saved.state.hero.location).toBe('a');
});

test('invalid imports retain the save and a damaged current payload can recover the previous save', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await page.getByRole('button', { name: 'Saved games' }).click();
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-save-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expect(page.getByRole('alert')).toContainText('malformed');
  await expectFocusedError(page);
  await page.getByRole('button', { name: 'Choose another backup', exact: true }).press('Enter');
  await expect(page.locator('#game-save-file')).toBeFocused();
  await page.locator('#game-save-file').setInputFiles({ name: 'still-bad.json', mimeType: 'application/json', buffer: Buffer.from('{broken') });
  await expectFocusedError(page);
  expect(await savedPayload(page)).toBe(original);
  await damageCurrent(page, false);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('alert')).toContainText('record is damaged');
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('Recovery options');
  await page.getByText('Recovery options', { exact: true }).click();
  await page.getByRole('button', { name: 'Recover previous save' }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(await savedPayload(page)).toBe(original);
  await expect(page.locator('.save-status [role="status"]')).toBeFocused();
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
  await expectFocusedError(other);
  await expect(other.getByRole('alert')).toContainText('load the latest save');
  expect(await savedPayload(other)).toBe(newer);
  await other.getByRole('button', { name: 'Discard unsaved action and load latest save' }).click();
  await expect(other.locator('.h-table .hero')).toContainText('Room 1');
  await expect(other.locator('.save-status [role="status"]')).toBeFocused();
  expect(await savedPayload(other)).toBe(newer);
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
  await damageCurrent(page, true);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game' }).click();
  await expect(page.getByRole('alert')).toContainText('record is damaged');
  await page.getByText('Recovery options', { exact: true }).click();
  await page.getByRole('button', { name: 'Recover previous save' }).click();
  await expect(page.getByText('Local game in progress.')).toBeVisible();
  expect(await savedPayload(page)).toBe(original);
});

test('failed previous-save recovery focuses guidance and preserves both recovery records for keyboard retry', async ({ page }) => {
  await loadGame(page);
  const original = await savedPayload(page);
  await damageCurrent(page, true);
  await page.reload();
  await page.getByRole('button', { name: 'Resume saved game', exact: true }).click();
  await expectFocusedError(page);
  const damaged = await savedPayload(page);
  await page.getByText('Recovery options', { exact: true }).click();
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'games') {
        IDBObjectStore.prototype.put = originalPut;
        this.transaction.abort();
        throw new Error('Simulated recovery write failure');
      }
      return originalPut.apply(this, args);
    };
  });
  const recover = page.getByRole('button', { name: 'Recover previous save', exact: true });
  await recover.press('Enter');
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('Recovery options');
  expect(await savedPayload(page)).toBe(damaged);
  await recover.press('Enter');
  await expect(page.locator('.save-status [role="status"]')).toBeFocused();
  expect(await savedPayload(page)).toBe(original);
});

test('repeated failed roll saves focus one alert and keyboard retry preserves the exact exported result', async ({ page }) => {
  const data = fighterFixture();
  data.perks = data.perks.filter(perk => perk.id === 'perk-ott-steeltoes');
  await loadGame(page, data);
  const original = await savedPayload(page);
  await page.evaluate(() => {
    const originalPut = IDBObjectStore.prototype.put;
    let failures = 2;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'games' && failures-- > 0) {
        this.transaction.abort();
        throw new Error('Simulated repeated save failure');
      }
      IDBObjectStore.prototype.put = originalPut;
      return originalPut.apply(this, args);
    };
  });
  await page.getByRole('button', { name: 'Special Action Hero ability' }).press('Enter');
  await page.getByRole('button', { name: 'Roll special action' }).press('Enter');
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('Simulated repeated save failure');
  const waitingForBackup = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export backup', exact: true }).press('Enter');
  const backupPath = await (await waitingForBackup).path();
  if (!backupPath) throw new Error('The backup download did not provide a local test file.');
  const backup = await readFile(backupPath, 'utf8');
  const pending = JSON.parse(backup);
  expect(pending.state.commands).toHaveLength(1);
  expect(await savedPayload(page)).toBe(original);
  await page.getByRole('button', { name: 'Retry saving', exact: true }).press('Enter');
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('same unsaved result');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(axe.violations.map(item => item.id)).toEqual([]);
  expect(await savedPayload(page)).toBe(original);
  await page.getByRole('button', { name: 'Retry saving', exact: true }).press('Enter');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.locator('.h-pending h2')).toBeFocused();
  expect(await savedPayload(page)).toBe(backup);
});

test('invalid base-data import focuses its guidance and returns to the file control at narrow enlarged text', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/');
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
  await page.getByText('Import game data or backup').click();
  await page.locator('#game-data-file').setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') });
  await expectFocusedError(page);
  await expect(page.getByRole('alert')).toContainText('existing games and base components are kept');
  const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']).analyze();
  expect(axe.violations.map(item => item.id)).toEqual([]);
  await page.getByRole('button', { name: 'Choose another base game file', exact: true }).press('Enter');
  await expect(page.locator('#game-data-file')).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  expect(await allPayloads(page)).toEqual([]);
});
