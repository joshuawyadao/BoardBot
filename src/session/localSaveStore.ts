const DATABASE_NAME = 'boardbot-local-game';
const STORE_NAME = 'saves';

export interface StoredSave {
  token: string;
  savedAt: number;
  payload: string;
  /** Transient marker for a damaged record. It is never persisted as a save. */
  damaged?: true;
}

export interface SaveSlots {
  current: StoredSave | null;
  previous: StoredSave | null;
}

export interface LocalSaveStore {
  read(): Promise<SaveSlots>;
  write(payload: string, expectedToken: string | null): Promise<StoredSave>;
  close(): void;
}

function checkedSave(value: unknown, exists: boolean): StoredSave | null {
  if (!exists) return null;
  if (
    typeof value === 'object' && value !== null &&
    'token' in value && typeof value.token === 'string' && value.token &&
    'savedAt' in value && typeof value.savedAt === 'number' && Number.isFinite(value.savedAt) &&
    'payload' in value && typeof value.payload === 'string' && !('damaged' in value)
  ) return { token: value.token, savedAt: value.savedAt, payload: value.payload };

  let raw: string | undefined;
  try { raw = JSON.stringify(value); }
  catch { throw new Error('A damaged local save record cannot be compared safely.'); }
  if (raw && raw.length > 8 * 1024 * 1024) throw new Error('A damaged local save record is too large to repair safely.');
  return { token: `damaged:${raw}`, savedAt: 0, payload: '', damaged: true };
}

export async function openLocalSaveStore(): Promise<LocalSaveStore> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onblocked = () => {
      blocked = true;
      reject(new Error('Local save storage is blocked by another open tab. Close other BoardBot tabs and try again.'));
    };
    request.onerror = () => reject(new Error(`Could not open local save storage: ${request.error?.message ?? 'unknown error'}`));
    request.onsuccess = () => {
      if (blocked) request.result.close();
      else resolve(request.result);
    };
  });

  let closed = false;
  let outdated = false;
  database.onversionchange = () => {
    outdated = true;
    database.close();
  };

  function transaction(mode: IDBTransactionMode): IDBTransaction {
    if (outdated) throw new Error('Local save storage changed in another tab. Reload before saving again.');
    if (closed) throw new Error('Local save storage is closed.');
    return database.transaction(STORE_NAME, mode);
  }

  return {
    read: () => new Promise<SaveSlots>((resolve, reject) => {
      let tx: IDBTransaction;
      try { tx = transaction('readonly'); }
      catch (error) { reject(error); return; }
      const store = tx.objectStore(STORE_NAME);
      const current = store.get('current');
      const previous = store.get('previous');
      const currentKey = store.getKey('current');
      const previousKey = store.getKey('previous');
      tx.oncomplete = () => {
        try {
          resolve({ current: checkedSave(current.result, currentKey.result !== undefined),
            previous: checkedSave(previous.result, previousKey.result !== undefined) });
        } catch (error) { reject(error); }
      };
      tx.onabort = () => reject(new Error(`Could not read local saves: ${tx.error?.message ?? 'transaction aborted'}`));
      tx.onerror = () => reject(new Error(`Could not read local saves: ${tx.error?.message ?? 'storage error'}`));
    }),

    write: (payload, expectedToken) => new Promise<StoredSave>((resolve, reject) => {
      if (typeof payload !== 'string') { reject(new TypeError('Save payload must be a string.')); return; }
      let tx: IDBTransaction;
      try { tx = transaction('readwrite'); }
      catch (error) { reject(error); return; }
      const store = tx.objectStore(STORE_NAME);
      let saved: StoredSave | null = null;
      let failure: unknown = null;
      const current = store.get('current');
      const currentKey = store.getKey('current');
      currentKey.onsuccess = () => {
        try {
          const active = checkedSave(current.result, currentKey.result !== undefined);
          if ((active?.token ?? null) !== expectedToken) {
            throw new Error('This game has a newer save in another tab. Reload it before saving again.');
          }
          saved = { token: crypto.randomUUID(), savedAt: Date.now(), payload };
          if (active && !active.damaged) store.put(active, 'previous');
          store.put(saved, 'current');
        } catch (error) {
          failure = error;
          try { tx.abort(); } catch { reject(failure); }
        }
      };
      tx.oncomplete = () => {
        if (saved) resolve(saved);
        else reject(new Error('The local save transaction completed without writing a save.'));
      };
      tx.onabort = () => reject(failure ?? new Error(`Could not write local save: ${tx.error?.message ?? 'transaction aborted'}`));
    }),

    close: () => {
      closed = true;
      database.close();
    },
  };
}
