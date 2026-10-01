import type { GameData } from '../data/gameData';
import { dataIdentity } from '../engine/horrifiedState';
import { ENGINE_VERSION, MAX_SAVE_LENGTH, SAVE_VERSION, validateLocalGameData } from './gameSave';
import { openLocalSaveStore } from './localSaveStore';
import type { LocalSaveStore, SaveSlots, StoredSave } from './localSaveStore';

const DATABASE_NAME = 'boardbot-game-library';
const GAMES = 'games';
const DATA = 'data';
const SETTINGS = 'settings';
const DEFAULT_DATA = 'default-data';
const LEGACY_MIGRATED = 'legacy-migrated';
const MAX_DAMAGED_LENGTH = 8 * 1024 * 1024;

interface CompactSave {
  token: string;
  savedAt: number;
  dataRef: string;
  saveVersion: number;
  engineVersion: string;
  state: unknown;
}
interface DamagedSave { token: string; savedAt: 0; damaged: true }
type Slot = CompactSave | DamagedSave;
interface GameRecord { id: string; current: Slot | null; previous: Slot | null }
interface PortableSave { data: GameData; state: unknown; dataRef: string; saveVersion: number; engineVersion: string }

const HERO_NAMES: Record<string, string> = {
  'hero-bard': 'Bard', 'hero-cleric': 'Cleric', 'hero-fighter': 'Fighter',
  'hero-rogue': 'Rogue', 'hero-wizard': 'Wizard',
};

export interface LibraryGame {
  id: string;
  hero: string;
  turn: number;
  phase: string;
  savedAt: number;
  hasPrevious: boolean;
  damaged?: boolean;
}
export interface GameLibrary {
  list(): Promise<LibraryGame[]>;
  getData(): Promise<GameData | null>;
  setData(data: GameData): Promise<void>;
  game(id: string): LocalSaveStore;
  close(): void;
}

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('The save contains an invalid object.');
  return value as Record<string, unknown>;
}

function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(entry => canonicalJSON(entry) ?? 'null').join(',')}]`;
  return `{${Object.entries(value).filter(([, entry]) => entry !== undefined)
    .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJSON(entry)}`).join(',')}}`;
}

/** Compare in the active IndexedDB transaction without waiting for asynchronous hashing. */
function sameVersion(stored: unknown, incoming: GameData): boolean {
  if (stored === undefined) return false;
  try { return canonicalJSON(validateLocalGameData(stored)) === canonicalJSON(incoming); }
  catch { return false; }
}

async function parsePortable(payload: string): Promise<PortableSave> {
  if (typeof payload !== 'string' || new TextEncoder().encode(payload).byteLength > MAX_SAVE_LENGTH) {
    throw new Error('The save is too large or is not text.');
  }
  let envelope: Record<string, unknown>;
  try { envelope = object(JSON.parse(payload)); }
  catch { throw new Error('The save is malformed or incompatible.'); }
  if (envelope.format !== 'boardbot-local-game' || envelope.saveVersion !== SAVE_VERSION || envelope.engineVersion !== ENGINE_VERSION) {
    throw new Error('This save uses an unsupported format or engine version.');
  }
  const state = object(envelope.state);
  const hero = object(state.hero);
  if (typeof hero.definitionId !== 'string' || !hero.definitionId || !Number.isSafeInteger(state.turn) ||
    typeof state.phase !== 'string' || !Array.isArray(state.commands)) {
    throw new Error('The save has invalid setup or command history.');
  }
  const data = validateLocalGameData(envelope.data);
  return { data, state, dataRef: await dataIdentity(data),
    saveVersion: envelope.saveVersion as number, engineVersion: envelope.engineVersion as string };
}

function damagedSlot(value: unknown): DamagedSave {
  let raw: string | undefined;
  try { raw = JSON.stringify(value); }
  catch { throw new Error('A damaged local save record cannot be compared safely.'); }
  if (raw && raw.length > MAX_DAMAGED_LENGTH) throw new Error('A damaged local save record is too large to repair safely.');
  return { token: `damaged:${raw}`, savedAt: 0, damaged: true };
}

function checkedSlot(value: unknown): Slot | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object' && !Array.isArray(value)) {
    const slot = value as Record<string, unknown>;
    if (slot.damaged === true && typeof slot.token === 'string' && slot.token && slot.savedAt === 0) {
      return { token: slot.token, savedAt: 0, damaged: true };
    }
    if (typeof slot.token === 'string' && slot.token && typeof slot.savedAt === 'number' &&
      Number.isFinite(slot.savedAt) && typeof slot.dataRef === 'string' && slot.dataRef &&
      Number.isSafeInteger(slot.saveVersion) && typeof slot.engineVersion === 'string' &&
      slot.state !== undefined && !('damaged' in slot)) {
      return slot as unknown as CompactSave;
    }
  }
  return damagedSlot(value);
}

function checkedRecord(value: unknown, id: string): GameRecord {
  if (value === undefined) return { id, current: null, previous: null };
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { id, current: damagedSlot(value), previous: null };
  }
  const raw = value as Record<string, unknown>;
  if (raw.id !== id || !('current' in raw) || !('previous' in raw)) {
    return { id, current: damagedSlot(value), previous: 'previous' in raw ? checkedSlot(raw.previous) : null };
  }
  return { id, current: checkedSlot(raw.current), previous: checkedSlot(raw.previous) };
}

function requestValue<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error('Storage request failed.'));
  });
}

function transactionDone(tx: IDBTransaction, failure?: () => unknown): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(failure?.() ?? tx.error ?? new Error('The storage transaction was aborted.'));
    tx.onerror = () => reject(failure?.() ?? tx.error ?? new Error('The storage transaction failed.'));
  });
}

function portablePayload(slot: CompactSave, data: GameData): string {
  const payload = JSON.stringify({ format: 'boardbot-local-game', saveVersion: slot.saveVersion,
    engineVersion: slot.engineVersion, data, state: slot.state });
  if (new TextEncoder().encode(payload).byteLength > MAX_SAVE_LENGTH) {
    throw new Error('A local save exceeds the supported size.');
  }
  return payload;
}

function metadata(id: string, record: GameRecord): LibraryGame {
  const current = record.current;
  const usable = current && !('damaged' in current) ? current : record.previous && !('damaged' in record.previous) ? record.previous : null;
  let hero = 'Unknown Hero', turn = 0, phase = 'Unknown phase';
  try {
    if (usable) {
      const state = object(usable.state), identity = object(state.hero);
      if (typeof identity.definitionId === 'string') hero = HERO_NAMES[identity.definitionId] ?? 'Unknown Hero';
      if (Number.isSafeInteger(state.turn) && (state.turn as number) >= 0) turn = state.turn as number;
      if (typeof state.phase === 'string') phase = state.phase;
    }
  } catch { /* A damaged game remains visible for recovery. */ }
  return { id, hero, turn, phase, savedAt: usable?.savedAt ?? 0,
    hasPrevious: record.previous !== null, ...(current && 'damaged' in current ? { damaged: true } : {}) };
}

async function compactLegacy(slot: StoredSave | null): Promise<{ slot: Slot | null; data: GameData | null }> {
  if (!slot) return { slot: null, data: null };
  if (slot.damaged) return { slot: { token: slot.token, savedAt: 0, damaged: true }, data: null };
  try {
    const portable = await parsePortable(slot.payload);
    return { slot: { token: slot.token, savedAt: slot.savedAt, dataRef: portable.dataRef,
      saveVersion: portable.saveVersion, engineVersion: portable.engineVersion, state: portable.state }, data: portable.data };
  } catch {
    return { slot: damagedSlot(slot), data: null };
  }
}

export async function openGameLibrary(): Promise<GameLibrary> {
  const database = await new Promise<IDBDatabase>((resolve, reject) => {
    let blocked = false;
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(GAMES)) db.createObjectStore(GAMES);
      if (!db.objectStoreNames.contains(DATA)) db.createObjectStore(DATA);
      if (!db.objectStoreNames.contains(SETTINGS)) db.createObjectStore(SETTINGS);
    };
    request.onblocked = () => { blocked = true; reject(new Error('Game library storage is blocked by another tab.')); };
    request.onerror = () => reject(new Error(`Could not open game library: ${request.error?.message ?? 'unknown error'}`));
    request.onsuccess = () => { if (blocked) request.result.close(); else resolve(request.result); };
  });

  let closed = false, outdated = false;
  database.onversionchange = () => { outdated = true; database.close(); };
  const begin = (names: string | string[], mode: IDBTransactionMode): IDBTransaction => {
    if (outdated) throw new Error('Game library storage changed in another tab. Reload before saving again.');
    if (closed) throw new Error('Game library storage is closed.');
    return database.transaction(names, mode);
  };

  // A completed migration never needs to open the old database again.
  try {
    const statusTx = begin(SETTINGS, 'readonly'), statusDone = transactionDone(statusTx);
    const migrated = await requestValue(statusTx.objectStore(SETTINGS).get(LEGACY_MIGRATED));
    await statusDone;
    if (!migrated) {
      // Read the old database without modifying it, then commit both slots and the marker together.
      const legacy = await openLocalSaveStore();
      let oldSlots: SaveSlots;
      try { oldSlots = await legacy.read(); }
      finally { legacy.close(); }
      const current = await compactLegacy(oldSlots.current);
      const previous = await compactLegacy(oldSlots.previous);
      const tx = begin([GAMES, DATA, SETTINGS], 'readwrite');
      let failure: unknown = null;
      const done = transactionDone(tx, () => failure);
      const marker = tx.objectStore(SETTINGS).get(LEGACY_MIGRATED);
      marker.onsuccess = () => {
        if (marker.result) return;
        try {
          const games = tx.objectStore(GAMES), dataStore = tx.objectStore(DATA), settings = tx.objectStore(SETTINGS);
          if (oldSlots.current || oldSlots.previous) {
            games.put({ id: 'legacy', current: current.slot, previous: previous.slot }, 'legacy');
            const versions = new Map<string, GameData>();
            for (const item of [current, previous]) {
              if (item.data && item.slot && !('damaged' in item.slot)) versions.set(item.slot.dataRef, item.data);
            }
            for (const [ref, data] of versions) {
              const existing = dataStore.get(ref);
              existing.onsuccess = () => {
                try { if (!sameVersion(existing.result, data)) dataStore.put(data, ref); }
                catch (error) { failure = error; try { tx.abort(); } catch { /* Transaction already failed. */ } }
              };
            }
            const defaultSlot = current.data ? current : previous.data ? previous : null;
            if (defaultSlot?.slot && !('damaged' in defaultSlot.slot)) settings.put(defaultSlot.slot.dataRef, DEFAULT_DATA);
          }
          settings.put(true, LEGACY_MIGRATED);
        } catch (error) { failure = error; try { tx.abort(); } catch { /* Transaction already failed. */ } }
      };
      await done;
    }
  } catch (error) {
    database.close();
    throw error;
  }

  async function hydrate(slot: Slot | null, dataStore: IDBObjectStore): Promise<StoredSave | null> {
    if (!slot) return null;
    if ('damaged' in slot) return { token: slot.token, savedAt: 0, payload: '', damaged: true };
    try {
      const data = await requestValue(dataStore.get(slot.dataRef));
      if (!data) return { token: damagedSlot(slot).token, savedAt: 0, payload: '', damaged: true };
      const validated = validateLocalGameData(data);
      if (await dataIdentity(validated) !== slot.dataRef) throw new Error('Game data reference is damaged.');
      return { token: slot.token, savedAt: slot.savedAt, payload: portablePayload(slot, validated) };
    } catch {
      return { token: damagedSlot(slot).token, savedAt: 0, payload: '', damaged: true };
    }
  }

  async function readGame(id: string): Promise<SaveSlots> {
    const tx = begin([GAMES, DATA], 'readonly');
    const done = transactionDone(tx);
    const raw = await requestValue(tx.objectStore(GAMES).get(id));
    const record = checkedRecord(raw, id);
    // Both data lookups must be scheduled while the same read transaction is active.
    const dataStore = tx.objectStore(DATA);
    const values = await Promise.all([hydrate(record.current, dataStore), hydrate(record.previous, dataStore)]);
    await done;
    return { current: values[0], previous: values[1] };
  }

  async function writeGame(id: string, payload: string, expectedToken: string | null): Promise<StoredSave> {
    const portable = await parsePortable(payload);
    const tx = begin([GAMES, DATA], 'readwrite');
    let saved: CompactSave | null = null, failure: unknown = null;
    const result = new Promise<StoredSave>((resolve, reject) => {
      tx.oncomplete = () => saved
        ? resolve({ token: saved.token, savedAt: saved.savedAt, payload })
        : reject(new Error('The game save transaction completed without writing.'));
      tx.onabort = () => reject(failure ?? tx.error ?? new Error('Could not write game save.'));
      tx.onerror = () => reject(failure ?? tx.error ?? new Error('Could not write game save.'));
    });
    const current = tx.objectStore(GAMES).get(id);
    current.onsuccess = () => {
      try {
        const record = checkedRecord(current.result, id);
        const active = record.current;
        const activeToken = active?.token ?? null;
        const damagedReferenceToken = active && !('damaged' in active) ? damagedSlot(active).token : null;
        if (activeToken !== expectedToken && damagedReferenceToken !== expectedToken) {
          throw new Error('This game has a newer save in another tab. Reload it before saving again.');
        }
        saved = { token: crypto.randomUUID(), savedAt: Date.now(), dataRef: portable.dataRef,
          saveVersion: portable.saveVersion, engineVersion: portable.engineVersion, state: portable.state };
        const dataStore = tx.objectStore(DATA), existing = dataStore.get(portable.dataRef);
        existing.onsuccess = () => {
          try {
            // A damaged reference is repaired by the portable payload; a matching version stays immutable.
            if (!sameVersion(existing.result, portable.data)) dataStore.put(portable.data, portable.dataRef);
            tx.objectStore(GAMES).put({ id, current: saved,
              previous: active && !('damaged' in active) && expectedToken !== damagedReferenceToken ? active : record.previous }, id);
          } catch (error) {
            failure = error;
            try { tx.abort(); } catch { /* Transaction already failed. */ }
          }
        };
      } catch (error) {
        failure = error;
        try { tx.abort(); } catch { /* Transaction already failed. */ }
      }
    };
    return result;
  }

  return {
    list: async () => {
      const tx = begin(GAMES, 'readonly'), done = transactionDone(tx);
      const store = tx.objectStore(GAMES);
      const [keys, raw] = await Promise.all([requestValue(store.getAllKeys()), requestValue(store.getAll())]);
      await done;
      const games = raw.map((value, index) => ({ id: keys[index], value }))
        .filter(entry => typeof entry.id === 'string' && entry.id)
        .map(entry => metadata(entry.id as string, checkedRecord(entry.value, entry.id as string)));
      for (const game of games) {
        const slots = await readGame(game.id);
        if (slots.current?.damaged) game.damaged = true;
      }
      return games.sort((left, right) => right.savedAt - left.savedAt || left.id.localeCompare(right.id));
    },
    getData: async () => {
      const tx = begin([SETTINGS, DATA], 'readonly'), done = transactionDone(tx);
      const ref = await requestValue(tx.objectStore(SETTINGS).get(DEFAULT_DATA));
      const raw = typeof ref === 'string' ? await requestValue(tx.objectStore(DATA).get(ref)) : null;
      await done;
      if (!raw) return null;
      const data = validateLocalGameData(raw);
      if (await dataIdentity(data) !== ref) throw new Error('Cached game data is damaged. Load it again.');
      return data;
    },
    setData: async input => {
      const data = structuredClone(validateLocalGameData(input)), ref = await dataIdentity(data);
      const tx = begin([SETTINGS, DATA], 'readwrite');
      let failure: unknown = null;
      const done = transactionDone(tx, () => failure);
      const dataStore = tx.objectStore(DATA), existing = dataStore.get(ref);
      existing.onsuccess = () => {
        try {
          if (!sameVersion(existing.result, data)) dataStore.put(data, ref);
          tx.objectStore(SETTINGS).put(ref, DEFAULT_DATA);
        } catch (error) { failure = error; try { tx.abort(); } catch { /* Transaction already failed. */ } }
      };
      await done;
    },
    game: id => {
      if (typeof id !== 'string' || !id || id.length > 128) throw new Error('Invalid game ID.');
      let adapterClosed = false;
      const check = () => { if (adapterClosed) throw new Error('This game store is closed.'); };
      return {
        read: () => { check(); return readGame(id); },
        write: (payload, expectedToken) => { check(); return writeGame(id, payload, expectedToken); },
        close: () => { adapterClosed = true; },
      };
    },
    close: () => { closed = true; database.close(); },
  };
}
