import { expect, test } from '@playwright/test';
import { fighterFixture } from '../../src/engine/fixtures/fighterFixture';

const adapterPage = '/src/session/gameLibrary.ts';

test('separate games share immutable base data and portable backups still replay', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave, decodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const { dataIdentity } = await import('/src/engine/horrifiedState.ts' as string);
    const library = await openGameLibrary();
    await library.setData(data);
    const base = await library.getData();
    const one = await createFighterGame(data, 11, 'hero-fighter');
    const two = await createFighterGame(data, 12, 'hero-fighter');
    const slotOne = library.game('game-one'), slotTwo = library.game('game-two');
    const savedOne = await slotOne.write(encodeGameSave(data, one), null);
    let dataWrites = 0;
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'data') dataWrites += 1;
      return originalPut.apply(this, args);
    };
    const savedTwo = await slotTwo.write(encodeGameSave(data, two), null);
    await library.setData(data);
    IDBObjectStore.prototype.put = originalPut;
    slotOne.close();
    const gameTwoStillOpen = await slotTwo.read();
    const changed = structuredClone(data);
    changed.interpretationVersion = 'synthetic-alternate-v2';
    await library.setData(changed);
    const newDefault = await library.getData();
    const oldGame = await library.game('game-one').read();
    const replay = await decodeGameSave(oldGame.current!.payload);
    const list = await library.list();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction(['data', 'games'], 'readonly');
    const dataKeys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = tx.objectStore('data').getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const rawGames = await new Promise<unknown[]>((resolve, reject) => {
      const request = tx.objectStore('games').getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close();
    slotTwo.close();
    library.close();
    return { baseIdentity: await dataIdentity(base!), newIdentity: await dataIdentity(newDefault!),
      replayIdentity: await dataIdentity(replay.data), replayHero: replay.game.hero.definitionId,
      savedOne, savedTwo, gameTwoStillOpen, list, dataKeys, rawGames, dataWrites };
  }, fighterFixture());
  expect(result.baseIdentity).not.toBe(result.newIdentity);
  expect(result.replayIdentity).toBe(result.baseIdentity);
  expect(result.replayHero).toBe('hero-fighter');
  expect(result.gameTwoStillOpen.current).toEqual(result.savedTwo);
  expect(result.list.map((game: { id: string; hero: string }) => [game.id, game.hero]).sort()).toEqual([
    ['game-one', 'Fighter'], ['game-two', 'Fighter'],
  ]);
  expect(result.dataWrites).toBe(0);
  expect(result.dataKeys).toHaveLength(2);
  for (const record of result.rawGames as { current: Record<string, unknown> }[]) {
    expect(record.current.dataRef).toBe(result.baseIdentity);
    expect(record.current.saveVersion).toBe(1);
    expect(record.current.engineVersion).toBe('solo-1');
    expect(record.current).not.toHaveProperty('data');
    expect(record.current).not.toHaveProperty('payload');
  }
});

test('same-game writers use atomic CAS while other games remain independent', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const libraryA = await openGameLibrary(), libraryB = await openGameLibrary();
    const game = await createFighterGame(data, 21);
    const payload = encodeGameSave(data, game);
    const a = libraryA.game('race'), b = libraryB.game('race');
    const initial = await a.write(payload, null);
    const race = await Promise.allSettled([a.write(payload, initial.token), b.write(payload, initial.token)]);
    const afterRace = await a.read();
    const other = await b.write(payload, null).catch((error: unknown) => String(error));
    const independent = await libraryB.game('independent').write(payload, null);
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (value, key) {
      if (key === 'race') throw new Error('Simulated storage write failure');
      return originalPut.call(this, value, key);
    };
    let failure = '';
    try { await a.write(payload, afterRace.current!.token); }
    catch (error) { failure = String(error); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const afterAbort = await a.read();
    libraryA.close(); libraryB.close();
    return { initial, race: race.map(item => item.status === 'fulfilled' ? item.status : String(item.reason)),
      afterRace, afterAbort, other, independent, failure };
  }, fighterFixture());
  expect(result.race).toContain('fulfilled');
  expect(result.race.join(' ')).toMatch(/newer save in another tab/i);
  expect(result.afterRace.previous).toEqual(result.initial);
  expect(result.afterAbort).toEqual(result.afterRace);
  expect(result.failure).toMatch(/Simulated storage write failure/);
  expect(result.other).toMatch(/newer save in another tab/i);
  expect(result.independent.token).toBeTruthy();
});

test('legacy current and previous migrate once without changing the old database', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openLocalSaveStore } = await import('/src/session/localSaveStore.ts' as string);
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave, decodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const game = await createFighterGame(data, 31);
    const payload = encodeGameSave(data, game);
    const legacy = await openLocalSaveStore();
    const first = await legacy.write(payload, null);
    const second = await legacy.write(payload, first.token);
    legacy.close();
    const library = await openGameLibrary();
    const migrated = await library.game('legacy').read();
    const defaultData = await library.getData();
    const restored = await decodeGameSave(migrated.current!.payload);
    library.close();
    const old = await openLocalSaveStore();
    const oldSlots = await old.read();
    await old.write(payload, second.token);
    old.close();
    const originalOpen = IDBFactory.prototype.open;
    IDBFactory.prototype.open = function (...args: Parameters<IDBFactory['open']>) {
      if (args[0] === 'boardbot-local-game') throw new Error('Legacy storage should not be reopened');
      return originalOpen.apply(this, args);
    };
    let reopened;
    try { reopened = await openGameLibrary(); }
    finally { IDBFactory.prototype.open = originalOpen; }
    const reopenedSlots = await reopened.game('legacy').read();
    reopened.close();
    return { first, second, migrated, oldSlots, reopenedSlots,
      defaultVersion: defaultData?.interpretationVersion, restoredHero: restored.game.hero.definitionId };
  }, fighterFixture());
  expect(result.migrated.current?.token).toBe(result.second.token);
  expect(result.migrated.previous?.token).toBe(result.first.token);
  expect(result.restoredHero).toBe('hero-fighter');
  expect(result.defaultVersion).toBe('boardbot-dnd-2026-09-30-v3');
  expect(result.oldSlots).toEqual({ current: result.second, previous: result.first });
  expect(result.reopenedSlots).toEqual(result.migrated);
});

test('an invalid legacy current payload does not hide a valid previous game', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openLocalSaveStore } = await import('/src/session/localSaveStore.ts' as string);
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const game = await createFighterGame(data, 37), payload = encodeGameSave(data, game);
    const legacy = await openLocalSaveStore();
    const previous = await legacy.write(payload, null);
    await legacy.write('{"format":"boardbot-local-game","state":"broken"}', previous.token);
    legacy.close();
    const library = await openGameLibrary();
    const slots = await library.game('legacy').read();
    const entries = await library.list();
    library.close();
    return { previous, slots, entries };
  }, fighterFixture());
  expect(result.slots.current?.damaged).toBe(true);
  expect(result.slots.previous?.token).toBe(result.previous.token);
  expect(result.entries[0]).toMatchObject({ id: 'legacy', damaged: true, hasPrevious: true });
});

test('a damaged legacy current still exposes the previous save and can be repaired', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openLocalSaveStore } = await import('/src/session/localSaveStore.ts' as string);
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const game = await createFighterGame(data, 41), payload = encodeGameSave(data, game);
    const old = await openLocalSaveStore();
    const first = await old.write(payload, null);
    await old.write(payload, first.token);
    old.close();
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open('boardbot-local-game', 1);
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result, tx = db.transaction('saves', 'readwrite');
        tx.objectStore('saves').put({ payload: 'malformed current' }, 'current');
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      };
    });
    const library = await openGameLibrary();
    const before = await library.game('legacy').read();
    const list = await library.list();
    const defaultData = await library.getData();
    const repaired = await library.game('legacy').write(before.previous!.payload, before.current!.token);
    const after = await library.game('legacy').read();
    library.close();
    return { first, before, list, defaultData, repaired, after };
  }, fighterFixture());
  expect(result.before.current?.damaged).toBe(true);
  expect(result.before.previous?.token).toBe(result.first.token);
  expect(result.list[0]).toMatchObject({ id: 'legacy', damaged: true, hasPrevious: true });
  expect(result.defaultData).not.toBeNull();
  expect(result.after.current).toEqual(result.repaired);
  expect(result.after.previous).toEqual(result.before.previous);
});

test('missing data references fail safely while a valid previous save stays available', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const game = await createFighterGame(data, 51), payload = encodeGameSave(data, game);
    const library = await openGameLibrary(), store = library.game('missing-reference');
    const previous = await store.write(payload, null);
    await store.write(payload, previous.token);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('games', 'readwrite'), bucket = tx.objectStore('games');
      const request = bucket.get('missing-reference');
      request.onsuccess = () => { const record = request.result; record.current.dataRef = 'sha256:missing'; bucket.put(record, 'missing-reference'); };
      tx.oncomplete = () => resolve(); tx.onabort = () => reject(tx.error);
    });
    db.close();
    const damaged = await store.read();
    const repaired = await store.write(damaged.previous!.payload, damaged.current!.token);
    const after = await store.read();
    library.close();
    return { previous, damaged, repaired, after };
  }, fighterFixture());
  expect(result.damaged.current?.damaged).toBe(true);
  expect(result.damaged.previous?.token).toBe(result.previous.token);
  expect(result.after.current).toEqual(result.repaired);
  expect(result.after.previous).toEqual(result.damaged.previous);
});

test('corrupted shared data is restored from the exact incoming version before success', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { createFighterGame } = await import('/src/engine/horrifiedGame.ts' as string);
    const { encodeGameSave, decodeGameSave } = await import('/src/session/gameSave.ts' as string);
    const { dataIdentity } = await import('/src/engine/horrifiedState.ts' as string);
    const library = await openGameLibrary();
    await library.setData(data);
    const game = await createFighterGame(data, 61), payload = encodeGameSave(data, game);
    const store = library.game('repair-data');
    const first = await store.write(payload, null);
    const ref = await dataIdentity(data);
    const corrupt = async () => {
      const db = await new Promise<IDBDatabase>((resolve, reject) => {
        const request = indexedDB.open('boardbot-game-library', 1);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction('data', 'readwrite');
        tx.objectStore('data').put({ ...data, interpretationVersion: 'corrupted but otherwise valid' }, ref);
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onabort = () => { db.close(); reject(tx.error); };
      });
    };
    await corrupt();
    const unreadable = await store.read();
    await library.setData(data);
    const afterSetData = await store.read();
    await decodeGameSave(afterSetData.current!.payload);
    await corrupt();
    const second = await store.write(payload, first.token);
    const afterWrite = await store.read();
    await decodeGameSave(afterWrite.current!.payload);
    const restoredData = await library.getData();
    library.close();
    return { unreadable: unreadable.current?.damaged, firstToken: first.token,
      afterSetDataToken: afterSetData.current?.token, secondToken: second.token,
      afterWriteToken: afterWrite.current?.token, restoredIdentity: await dataIdentity(restoredData!), ref };
  }, fighterFixture());
  expect(result.unreadable).toBe(true);
  expect(result.afterSetDataToken).toBe(result.firstToken);
  expect(result.afterWriteToken).toBe(result.secondToken);
  expect(result.restoredIdentity).toBe(result.ref);
});

test('a failed data-cache update aborts without changing the default version', async ({ page }) => {
  await page.goto(adapterPage);
  const result = await page.evaluate(async data => {
    const { openGameLibrary } = await import('/src/session/gameLibrary.ts' as string);
    const { dataIdentity } = await import('/src/engine/horrifiedState.ts' as string);
    const library = await openGameLibrary();
    await library.setData(data);
    const changed = structuredClone(data);
    changed.interpretationVersion = 'synthetic-v2';
    const changedRef = await dataIdentity(changed);
    const originalPut = IDBObjectStore.prototype.put;
    IDBObjectStore.prototype.put = function (...args: Parameters<IDBObjectStore['put']>) {
      if (this.name === 'settings' && args[1] === 'default-data') throw new Error('Simulated default update failure');
      return originalPut.apply(this, args);
    };
    let failure = '';
    try { await library.setData(changed); }
    catch (error) { failure = String(error); }
    finally { IDBObjectStore.prototype.put = originalPut; }
    const defaultData = await library.getData();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open('boardbot-game-library', 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction('data', 'readonly');
    const failedVersion = await new Promise<unknown>((resolve, reject) => {
      const request = tx.objectStore('data').get(changedRef);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    db.close(); library.close();
    return { failure, defaultVersion: defaultData?.interpretationVersion, failedVersion };
  }, fighterFixture());
  expect(result.failure).toMatch(/Simulated default update failure/);
  expect(result.defaultVersion).toBe('boardbot-dnd-2026-09-30-v3');
  expect(result.failedVersion).toBeUndefined();
});
