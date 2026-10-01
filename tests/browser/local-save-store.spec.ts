import { expect, test } from '@playwright/test';

// This module URL gives the test an app origin without mounting a game session.
const adapterPage = '/src/session/localSaveStore.ts';

test('local saves survive reopening and retain the previous committed snapshot', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async () => {
    const modulePath = '/src/session/localSaveStore.ts';
    const { openLocalSaveStore } = await import(modulePath);
    const first = await openLocalSaveStore();
    const initially = await first.read();
    const firstSave = await first.write('first synthetic snapshot', null);
    const secondSave = await first.write('second synthetic snapshot', firstSave.token);
    first.close();
    const reopened = await openLocalSaveStore();
    const slots = await reopened.read();
    reopened.close();
    return { initially, firstSave, secondSave, slots };
  });
  expect(result.initially).toEqual({ current: null, previous: null });
  expect(result.firstSave.token).not.toBe(result.secondSave.token);
  expect(result.firstSave.savedAt).toBeGreaterThan(0);
  expect(result.slots).toEqual({ current: result.secondSave, previous: result.firstSave });
});

test('concurrent writers cannot replace a newer save, and an aborted write changes neither slot', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async () => {
    const modulePath = '/src/session/localSaveStore.ts';
    const { openLocalSaveStore } = await import(modulePath);
    const left = await openLocalSaveStore();
    const right = await openLocalSaveStore();
    const original = await left.write('original', null);
    const competing = await Promise.allSettled([
      left.write('left winner', original.token),
      right.write('right winner', original.token),
    ]);
    const afterRace = await left.read();
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === 'current') throw new Error('Simulated storage write failure');
      return originalPut.call(this, value, key);
    };
    let failure = '';
    try {
      await left.write('must not appear', afterRace.current!.token);
    } catch (error) {
      failure = String(error);
    } finally {
      IDBObjectStore.prototype.put = originalPut;
    }
    const afterAbort = await left.read();
    left.close();
    right.close();
    return {
      competing: competing.map(outcome => outcome.status === 'fulfilled'
        ? { status: outcome.status, save: outcome.value }
        : { status: outcome.status, reason: String(outcome.reason) }),
      afterRace, afterAbort, failure, original,
    };
  });
  expect(result.competing.map(result => result.status).sort()).toEqual(['fulfilled', 'rejected']);
  expect(result.competing.find(result => result.status === 'rejected')?.reason).toMatch(/newer save in another tab/i);
  expect(result.afterRace.previous).toEqual(result.original);
  expect(result.afterRace.current?.payload).toMatch(/winner/);
  expect(result.failure).toMatch(/Simulated storage write failure/);
  expect(result.afterAbort).toEqual(result.afterRace);
});

test('a damaged current record keeps the previous save recoverable and guards repair writes', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async () => {
    const modulePath = '/src/session/localSaveStore.ts';
    const { openLocalSaveStore } = await import(modulePath);
    const store = await openLocalSaveStore();
    const previous = await store.write('safe previous snapshot', null);
    const current = await store.write('soon to be damaged', previous.token);
    store.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('boardbot-local-game', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put({ payload: 'no token' }, 'current');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const reopened = await openLocalSaveStore();
    const damaged = await reopened.read();
    const repaired = await reopened.write('repaired snapshot', damaged.current!.token);
    const afterRepair = await reopened.read();
    let stale = '';
    try { await reopened.write('stale overwrite', damaged.current!.token); }
    catch (error) { stale = String(error); }
    const afterStale = await reopened.read();
    reopened.close();
    return { previous, current, damaged, repaired, afterRepair, afterStale, stale };
  });
  expect(result.damaged.current).toEqual({ token: 'damaged:{"payload":"no token"}', savedAt: 0, payload: '', damaged: true });
  expect(result.damaged.previous).toEqual(result.previous);
  expect(result.afterRepair).toEqual({ current: result.repaired, previous: result.previous });
  expect(result.afterStale).toEqual(result.afterRepair);
  expect(result.stale).toMatch(/newer save in another tab/i);
  expect(result.repaired.token).not.toBe(result.current.token);
});
