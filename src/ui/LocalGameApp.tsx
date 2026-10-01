import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createFighterGame, getActionReason, getFighterView } from '../engine/horrifiedGame';
import type { HeroAction } from '../engine/horrifiedRuntime';
import { decodeGameSave, encodeGameSave, MAX_SAVE_LENGTH, validateLocalGameData } from '../session/gameSave';
import type { SavedGame } from '../session/gameSave';
import { openLocalSaveStore } from '../session/localSaveStore';
import type { LocalSaveStore, SaveSlots, StoredSave } from '../session/localSaveStore';
import { SavedSession } from '../session/savedSession';
import { FighterTable } from './FighterTable';

const HEROES = ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard'];
const message = (error: unknown) => error instanceof Error ? error.message : 'The local game could not be saved or loaded.';

export function LocalGameApp({ sample }: { sample: ReactNode }) {
  const store = useRef<LocalSaveStore | null>(null);
  const session = useRef<SavedSession | null>(null);
  const locked = useRef(false);
  const [active, setActive] = useState<SavedGame | null>(null);
  const [slots, setSlots] = useState<SaveSlots>({ current: null, previous: null });
  const [candidate, setCandidate] = useState<SavedGame | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [seed, setSeed] = useState('');
  const [hero, setHero] = useState('Fighter');

  useEffect(() => {
    let disposed = false;
    let opened: LocalSaveStore | null = null;
    void openLocalSaveStore().then(async connection => {
      opened = connection;
      if (disposed) { connection.close(); return; }
      store.current = connection;
      const initial = await connection.read();
      if (!disposed) { setSlots(initial); setReady(true); }
    }).catch(caught => { if (!disposed) setError(message(caught)); });
    return () => { disposed = true; opened?.close(); };
  }, []);

  async function run(operation: () => Promise<void>) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (caught) { setError(message(caught)); }
    finally { locked.current = false; setBusy(false); }
  }

  function install(loaded: SavedGame, saved: StoredSave) {
    session.current = new SavedSession(loaded.data, loaded.game, store.current!, saved);
    setActive(loaded); setCandidate(null);
  }

  async function start(loaded: SavedGame, expectedToken: string | null) {
    let saved: StoredSave;
    try { saved = await store.current!.write(encodeGameSave(loaded.data, loaded.game), expectedToken); }
    catch (caught) {
      // A competing tab may have saved since setup. Keep this candidate and require a new replacement decision.
      try { setSlots(await store.current!.read()); } catch { /* Preserve the original write error. */ }
      throw caught;
    }
    setSlots(current => ({ current: saved, previous: current.current }));
    install(loaded, saved);
  }

  async function loadFile(file: File | undefined, backup: boolean) {
    if (!file || !ready) return;
    await run(async () => {
      if (file.size > MAX_SAVE_LENGTH) throw new Error('This file is too large. Select a BoardBot save or prepared data file.');
      const text = await file.text();
      let loaded: SavedGame;
      if (backup) loaded = await decodeGameSave(text);
      else {
        const data = validateLocalGameData(JSON.parse(text));
        const chosenSeed = seed.trim() ? Number(seed) : crypto.getRandomValues(new Uint32Array(1))[0];
        if (!Number.isInteger(chosenSeed) || chosenSeed < 0 || chosenSeed > 0xffffffff) throw new Error('Seed must be a whole number from 0 to 4294967295.');
        loaded = { data, game: await createFighterGame(data, chosenSeed, `hero-${hero.toLowerCase()}`) };
      }
      // Keep the candidate on failures so retry never generates a new setup or roll.
      setCandidate(loaded);
      if (!slots.current) await start(loaded, null);
    });
  }

  async function resume(previous = false) {
    await run(async () => {
      const latest = await store.current!.read();
      setSlots(latest);
      const saved = previous ? latest.previous : latest.current;
      if (!saved) throw new Error('There is no saved game to resume.');
      if (saved.damaged) throw new Error('This save record is damaged. Use Recovery options to restore the previous save, or import a backup.');
      const loaded = await decodeGameSave(saved.payload);
      if (previous) await start(loaded, latest.current?.token ?? null);
      else install(loaded, saved);
    });
  }

  async function submit(action: HeroAction) {
    await run(async () => {
      const current = session.current!;
      await current.submit({ id: crypto.randomUUID(), revision: current.game.revision, actorSeatId: 'solo', action });
      setActive({ data: current.data, game: current.game });
      await new Promise(resolve => window.setTimeout(resolve, 300));
    });
  }

  async function retry() {
    await run(async () => {
      const current = session.current!;
      await current.retry();
      setActive({ data: current.data, game: current.game });
    });
  }

  function exportBackup() {
    try {
      const contents = session.current!.exportBackup();
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'boardbot-save.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError(message(caught)); }
  }

  if (active) {
    const needsSave = session.current!.needsSave;
    const saveControls = <div className="save-status" role="status" aria-live="polite">
        <span>{busy ? 'Saving…' : needsSave ? 'Saving failed. Play is paused; your last saved game is safe.' : 'Saved on this device · resumes after reload'}</span>
        <button className="quiet-button" onClick={exportBackup} disabled={busy}>Export backup</button>
        {needsSave && !busy && <><button className="confirm-button" disabled={busy} onClick={() => void retry()}>Retry saving</button>
          <button className="quiet-button" disabled={busy} onClick={() => void resume()}>Discard unsaved action and load latest save</button></>}
        {error && <p role="alert">{error}</p>}
      </div>;
    return <FighterTable saveControls={saveControls} data={active.data} game={getFighterView(active.data, active.game)} onAction={action => void submit(action)}
        reasonFor={action => getActionReason(active.data, session.current!.game, action)} busy={busy || needsSave} error={null}
        onReturnToSample={() => {
          if (locked.current || session.current?.needsSave) return;
          void run(async () => { setSlots(await store.current!.read()); setActive(null); session.current = null; });
        }} />;
  }

  return <>
    <div className="local-import">
      {(slots.current || slots.previous) && <section className="saved-game" aria-label="Saved game">
        <strong>A local game is saved on this device.</strong>
        <button className="confirm-button" disabled={busy || !slots.current} onClick={() => void resume()}>Resume saved game</button>
        {slots.previous && <details><summary>Recovery options</summary><p>The previous save may be one action behind. Recovering it replaces the current save.</p>
          <button className="quiet-button" disabled={busy} onClick={() => void resume(true)}>Recover previous save</button></details>}
      </section>}
      {error && <p role="alert">{error}</p>}
      {!ready && <p role="status">{error ? 'Local storage is unavailable. Reload to try again.' : 'Checking local saved games…'}</p>}
      <details>
        <summary>Load prepared local game data</summary>
        <div className="local-import-body">
          <label htmlFor="game-hero">Hero</label>
          <select id="game-hero" value={hero} disabled={busy} onChange={event => setHero(event.target.value)}>{HEROES.map(name => <option key={name}>{name}</option>)}</select>
          <label htmlFor="game-seed">Seed (optional, for a repeatable setup)</label>
          <input id="game-seed" type="number" min="0" max="4294967295" step="1" value={seed} onChange={event => setSeed(event.target.value)} disabled={busy} />
          <label htmlFor="game-data-file">Choose your private game-data.json file.</label>
          <input id="game-data-file" type="file" accept=".json,application/json" disabled={!ready || busy}
            onChange={event => { void loadFile(event.currentTarget.files?.[0], false); event.currentTarget.value = ''; }} />
          <p>One human Hero against Beholder and Displacer Beast. Data and progress stay on this device; each committed action is saved automatically.</p>
          <label htmlFor="game-save-file">Or import a BoardBot backup</label>
          <input id="game-save-file" type="file" accept=".json,application/json" disabled={!ready || busy}
            onChange={event => { void loadFile(event.currentTarget.files?.[0], true); event.currentTarget.value = ''; }} />
          {busy && <p role="status">Preparing the local game…</p>}
        </div>
      </details>
      {candidate && <section className="saved-game" aria-label="New game ready"><p>{slots.current ? 'A game is already saved. Replace it with this game?' : 'The game is prepared and needs to be saved before play.'}</p>
        <button className="confirm-button" disabled={busy} onClick={() => void run(() => start(candidate, slots.current?.token ?? null))}>{slots.current ? 'Replace saved game' : 'Retry saving new game'}</button>
        <button className="quiet-button" disabled={busy} onClick={() => { setCandidate(null); setError(null); }}>Cancel</button>
      </section>}
    </div>
    {sample}
  </>;
}
