import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { GameData } from '../data/gameData';
import { createFighterGame, gameDataForNewGame, getActionReason, getFighterView } from '../engine/horrifiedGame';
import { LEGACY_RULESET_VERSION, RULESET_VERSION } from '../engine/decisionPolicies';
import type { HeroAction } from '../engine/horrifiedRuntime';
import { decodeGameSave, encodeGameSave, MAX_SAVE_LENGTH, validateLocalGameData } from '../session/gameSave';
import type { SavedGame } from '../session/gameSave';
import { openGameLibrary } from '../session/gameLibrary';
import type { GameLibrary, LibraryGame } from '../session/gameLibrary';
import type { StoredSave } from '../session/localSaveStore';
import { SavedSession } from '../session/savedSession';
import { FighterTable } from './FighterTable';
import './gameLibrary.css';

const HEROES = ['Fighter', 'Bard', 'Cleric', 'Rogue', 'Wizard'];
const message = (error: unknown) => error instanceof Error ? error.message : 'The local game could not be saved or loaded.';
const heroId = (name: string) => `hero-${name.toLowerCase()}`;
type PreparedGame = { id: string; loaded: SavedGame };
type LocalError = { message: string; guidance: string; returnTo?: { id: string; label: string } };

function ErrorNotice({ error, busy = false, className = 'library-error' }: { error: LocalError; busy?: boolean; className?: string }) {
  const errorRef = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!busy) { errorRef.current?.focus(); errorRef.current?.scrollIntoView({ block: 'center' }); }
  }, [error, busy]);
  return <div className="local-error-recovery">
    <div className={className} role="alert" tabIndex={-1} ref={errorRef}>
      <p>{error.message}</p><p>{error.guidance}</p>
    </div>
    {error.returnTo && <button className="quiet-button" onClick={() => document.getElementById(error.returnTo!.id)?.focus()}>{error.returnTo.label}</button>}
  </div>;
}

function DeleteGameDialog({ game, busy, error, opener, onCancel, onConfirm }: {
  game: LibraryGame;
  busy: boolean;
  error: LocalError | null;
  opener: HTMLElement | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    cancelRef.current?.focus();
    return () => { dialog.close(); if (opener?.isConnected) opener.focus(); };
  }, []);
  return <dialog className="library-dialog" ref={dialogRef} aria-labelledby="delete-game-title" aria-describedby="delete-game-description"
    onCancel={event => { event.preventDefault(); if (!busy) onCancel(); }}>
    <h2 id="delete-game-title">Delete this {game.hero} game?</h2>
    <p className="library-delete-summary">Turn {game.turn}{game.savedAt ? ` · Saved ${new Date(game.savedAt).toLocaleString()}` : ' · Earlier local save'}</p>
    <p id="delete-game-description">This permanently removes this game and its previous recovery save from Saved games. Other games, base game components, and exported backups are kept.</p>
    {error && <ErrorNotice error={error} busy={busy} />}
    <div className="library-actions">
      <button className="quiet-button" ref={cancelRef} disabled={busy} onClick={onCancel}>Cancel</button>
      <button className="confirm-button library-delete-confirm" disabled={busy} onClick={onConfirm}>{busy ? 'Deleting…' : 'Delete game'}</button>
    </div>
  </dialog>;
}

async function preparedData(signal: AbortSignal): Promise<GameData | null> {
  const response = await fetch('/__boardbot/local-game-data', {
    cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.any([signal, AbortSignal.timeout(5000)]),
  });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('The prepared base game could not be loaded. Check the local data or import a prepared file.');
  const text = await response.text();
  if (new TextEncoder().encode(text).byteLength > MAX_SAVE_LENGTH) throw new Error('The prepared base game is too large.');
  return validateLocalGameData(JSON.parse(text));
}

export function LocalGameApp({ sample }: { sample: ReactNode }) {
  const library = useRef<GameLibrary | null>(null);
  const session = useRef<SavedSession | null>(null);
  const locked = useRef(false);
  const [active, setActive] = useState<SavedGame | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [sessionGeneration, setSessionGeneration] = useState(0);
  const [games, setGames] = useState<LibraryGame[]>([]);
  const [data, setData] = useState<GameData | null>(null);
  const [candidate, setCandidate] = useState<PreparedGame | null>(null);
  const [screen, setScreen] = useState<'home' | 'setup' | 'sample'>('home');
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<LocalError | null>(null);
  const [dataNotice, setDataNotice] = useState<string | null>(null);
  const [seed, setSeed] = useState('');
  const [hero, setHero] = useState('Fighter');
  const [deleteTarget, setDeleteTarget] = useState<LibraryGame | null>(null);
  const [deleteNotice, setDeleteNotice] = useState<string | null>(null);
  const savedHeading = useRef<HTMLHeadingElement>(null);
  const deleteOpener = useRef<HTMLButtonElement>(null);
  const savedStatus = useRef<HTMLSpanElement>(null);
  const [recoveryFocus, setRecoveryFocus] = useState(0);

  useEffect(() => { if (deleteNotice) savedHeading.current?.focus(); }, [deleteNotice]);
  useEffect(() => {
    if (recoveryFocus && active && !getFighterView(active.data, active.game).pending) savedStatus.current?.focus();
  }, [recoveryFocus]);

  useEffect(() => {
    let disposed = false;
    let opened: GameLibrary | null = null;
    const abort = new AbortController();
    void (async () => {
      const connection = await openGameLibrary();
      opened = connection;
      if (disposed) { connection.close(); return; }
      library.current = connection;
      const initial = await connection.list();
      let cached: GameData | null = null;
      let notice: string | null = null;
      try { cached = await connection.getData(); }
      catch { notice = 'Saved base game data needs to be imported again. Your games are still listed below.'; }
      try {
        const prepared = await preparedData(abort.signal);
        if (prepared) { await connection.setData(prepared); cached = prepared; notice = null; }
      } catch (caught) {
        if (disposed) return;
        notice = cached ? 'Using the saved base game data. The local prepared file is currently unavailable.' : message(caught);
      }
      if (!disposed) { setGames(initial); setData(cached); setDataNotice(notice); setReady(true); }
    })().catch(caught => { if (!disposed) setError({ message: message(caught), guidance: 'Local storage is unavailable. Reload to try again, or use Try sample table.' }); });
    return () => { disposed = true; abort.abort(); opened?.close(); };
  }, []);

  async function run(operation: () => Promise<void>, guidance: string | (() => string) = 'Your saved games are kept. Try again or reload this page.', returnTo?: LocalError['returnTo'] | (() => LocalError['returnTo'])) {
    if (locked.current) return;
    locked.current = true; setBusy(true); setError(null);
    try { await operation(); }
    catch (caught) { setError({ message: message(caught), guidance: typeof guidance === 'function' ? guidance() : guidance, returnTo: typeof returnTo === 'function' ? returnTo() : returnTo }); }
    finally { locked.current = false; setBusy(false); }
  }

  function install(id: string, loaded: SavedGame, saved: StoredSave) {
    session.current = new SavedSession(loaded.data, loaded.game, library.current!.game(id), saved);
    setActiveId(id); setActive(loaded); setCandidate(null);
    setSessionGeneration(value => value + 1);
  }

  async function start(prepared: PreparedGame, expectedToken: string | null = null) {
    const { id, loaded } = prepared;
    const saved = await library.current!.game(id).write(encodeGameSave(loaded.data, loaded.game), expectedToken);
    install(id, loaded, saved);
  }

  function chooseNewGame(base = data) {
    if (!base) return;
    setCandidate(null); setError(null); setDeleteNotice(null); setSeed('');
    setHero(HEROES.find(name => base.heroes.some(entry => entry.id === heroId(name))) ?? 'Fighter');
    setScreen('setup');
  }

  async function newGame() {
    if (!data) return;
    let setupPrepared = false;
    await run(async () => {
      const chosenSeed = seed.trim() ? Number(seed) : crypto.getRandomValues(new Uint32Array(1))[0];
      if (!Number.isInteger(chosenSeed) || chosenSeed < 0 || chosenSeed > 0xffffffff) throw new Error('Seed must be a whole number from 0 to 4294967295.');
      const currentData = gameDataForNewGame(data);
      const prepared = { id: crypto.randomUUID(), loaded: { data: currentData, game: await createFighterGame(currentData, chosenSeed, heroId(hero)) } };
      // A failed initial write retains this setup and ID for an exact retry.
      setCandidate(prepared);
      setupPrepared = true;
      await start(prepared);
    }, () => setupPrepared ? 'Use Retry saving new game to save this exact setup, or Cancel. Your other games are kept.' : 'Review your Hero and seed, then start again. Your other games are kept.');
  }

  async function loadFile(file: File | undefined, backup: boolean) {
    if (!file || !ready) return;
    let backupPrepared = false;
    await run(async () => {
      if (file.size > MAX_SAVE_LENGTH) throw new Error('This file is too large. Select a BoardBot save or prepared data file.');
      const text = await file.text();
      if (backup) {
        const loaded = await decodeGameSave(text);
        if (!data) { await library.current!.setData(loaded.data); setData(loaded.data); setDataNotice(null); }
        const prepared = { id: crypto.randomUUID(), loaded };
        setCandidate(prepared);
        backupPrepared = true;
        await start(prepared);
      } else {
        const imported = validateLocalGameData(JSON.parse(text));
        await library.current!.setData(imported);
        setData(imported); setDataNotice(null); chooseNewGame(imported);
      }
    }, () => backupPrepared ? 'Use Retry saving new game to save this exact imported adventure, or Cancel. Your existing games are kept.'
      : backup ? 'Your existing games are kept. Select a valid BoardBot backup to import it as a separate game.' : 'Your existing games and base components are kept. Select a valid prepared base game file.',
    () => backupPrepared ? undefined : { id: backup ? 'game-save-file' : 'game-data-file', label: backup ? 'Choose another backup' : 'Choose another base game file' });
  }

  async function resume(id: string, previous = false) {
    await run(async () => {
      const latest = await library.current!.game(id).read();
      const saved = previous ? latest.previous : latest.current;
      if (!saved) throw new Error('There is no saved game to resume.');
      if (saved.damaged) throw new Error('This save record is damaged. Use Recovery options to restore the previous save, or import a backup.');
      const loaded = await decodeGameSave(saved.payload);
      if (previous) await start({ id, loaded }, latest.current?.token ?? null);
      else install(id, loaded, saved);
      setRecoveryFocus(value => value + 1);
    }, active ? 'The unsaved result is still available to export as a backup. Try loading the latest save again; no progress has been overwritten.' : 'Your saved games are kept. Review Recovery options for this game, or import a valid backup.');
  }

  async function submit(action: HeroAction) {
    await run(async () => {
      const current = session.current!;
      await current.submit({ id: crypto.randomUUID(), revision: current.game.revision, actorSeatId: 'solo', action });
      setActive({ data: current.data, game: current.game });
      await new Promise(resolve => window.setTimeout(resolve, 300));
    }, () => session.current!.needsSave
      ? 'Play is paused on the last saved board. Retry saving keeps this exact result without another roll or draw. You can also export a backup, or discard the unsaved action and load the latest save.'
      : 'The action was not applied. Review the current board and your selection, then try again. Your saved progress has not changed.');
  }

  async function retry() {
    await run(async () => {
      const current = session.current!;
      await current.retry();
      setActive({ data: current.data, game: current.game });
    }, 'The same unsaved result is still waiting. Retry saving, export a backup, or discard the unsaved action and load the latest save. A newer save cannot be overwritten.');
  }

  async function returnToGames() {
    if (locked.current || session.current?.needsSave) return;
    await run(async () => {
      setGames(await library.current!.list());
      setActive(null); setActiveId(null); session.current = null; setScreen('home');
    }, 'Your game remains open. Try Saved games again; your progress has not been changed.');
  }

  async function deleteSavedGame() {
    const target = deleteTarget;
    if (!target) return;
    await run(async () => {
      try { await library.current!.deleteGame(target.id, target.version); }
      catch (caught) {
        // Refresh stale rows without silently approving deletion of a changed save.
        try { setGames(await library.current!.list()); } catch { /* Keep the original deletion error. */ }
        throw caught;
      }
      setGames(current => current.filter(game => game.id !== target.id));
      setDeleteTarget(null);
      setDeleteNotice(`${target.hero} saved game deleted.`);
    }, 'Cancel to review the refreshed saved-game list before trying again. No other games or base components have been removed.');
  }

  function exportBackup() {
    try {
      const contents = session.current!.exportBackup();
      const url = URL.createObjectURL(new Blob([contents], { type: 'application/json' }));
      const link = document.createElement('a'); link.href = url; link.download = 'boardbot-save.json'; link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (caught) { setError({ message: message(caught), guidance: 'The game is still available on this page. Retry the export, or retry saving if play is paused.' }); }
  }

  if (active) {
    const needsSave = session.current!.needsSave;
    const saveControls = <div className="save-status">
      <span role="status" aria-live="polite" aria-atomic="true" tabIndex={-1} ref={savedStatus}>{busy ? 'Saving…' : error || needsSave ? '' : 'Saved on this device · resumes after reload'}</span>
      {needsSave && !busy && <strong>Saving failed. Play is paused.</strong>}
      {error && <ErrorNotice error={error} busy={busy} className="save-error" />}
      <button className="quiet-button" onClick={exportBackup} disabled={busy}>Export backup</button>
      {active.game.rulesVersion !== RULESET_VERSION && <details><summary>Earlier rules</summary>
        {active.game.rulesVersion === LEGACY_RULESET_VERSION && <p>This saved game keeps a maximum Slowing Ray penalty of one action. New games use stacking penalties.</p>}
        <p>This saved game keeps the earlier Rogue board-Item rule: take two when available. New games let you choose up to two from the selected location.</p>
      </details>}
      {needsSave && !busy && <><button className="confirm-button" onClick={() => void retry()}>Retry saving</button>
        <button className="quiet-button" onClick={() => void resume(activeId!)}>Discard unsaved action and load latest save</button></>}
    </div>;
    return <FighterTable key={`${activeId}:${sessionGeneration}`} saveControls={saveControls} data={active.data} game={getFighterView(active.data, active.game)} onAction={action => void submit(action)}
      reasonFor={action => getActionReason(active.data, session.current!.game, action)} busy={busy || needsSave} error={null}
      onReturnToGames={() => void returnToGames()} />;
  }

  if (screen === 'sample') return <><div className="sample-navigation"><button className="quiet-button" onClick={() => setScreen('home')}>Saved games</button></div>{sample}</>;

  const chosenHero = data?.heroes.find(entry => entry.id === heroId(hero));
  return <main className="game-library">
    <header className="library-header"><a className="library-brand" href="/">BoardBot</a><span>Solo tabletop</span></header>
    <div className="library-intro"><p className="library-eyebrow">HORRIFIED · DUNGEONS &amp; DRAGONS</p>
      <h1>{screen === 'setup' ? 'Choose your Hero' : 'Your next adventure'}</h1>
      <p>{screen === 'setup' ? 'The board, Items, Perks, and Monsters will be set up for your Hero when you start.' : 'Start a new game or return to an adventure in progress.'}</p>
    </div>
    {error && !deleteTarget && <ErrorNotice error={error} busy={busy} />}
    {screen === 'home' && deleteNotice && <p className="library-notice" role="status">{deleteNotice}</p>}
    {!ready && !error && <p role="status">Loading your base game and saved games…</p>}
    {dataNotice && <p className="library-notice" role="status">{dataNotice}</p>}
    {candidate ? <section className="library-card" aria-label="New game ready"><h2>Your game is ready to save</h2>
      <p>The setup is prepared. Retry to save this exact game and begin playing.</p>
      <button className="confirm-button" disabled={busy} onClick={() => void run(() => start(candidate), 'The same setup is still ready. Retry saving new game, or Cancel to return without changing your other games.')}>Retry saving new game</button>
      <button className="quiet-button" disabled={busy} onClick={() => { setCandidate(null); setError(null); }}>Cancel</button>
    </section> : screen === 'setup' && data ? <form className="library-card hero-setup" onSubmit={event => { event.preventDefault(); void newGame(); }}>
      <label htmlFor="game-hero">Hero</label>
      <select id="game-hero" value={hero} disabled={busy} onChange={event => setHero(event.target.value)}>
        {HEROES.filter(name => data.heroes.some(entry => entry.id === heroId(name))).map(name => <option key={name}>{name}</option>)}
      </select>
      {chosenHero && <p className="hero-setup-detail">{chosenHero.actions} actions per Hero Phase · Starts at {data.board.locations.find(location => location.id === chosenHero.start)?.name}</p>}
      <p>One Hero against Beholder and Displacer Beast. Your other saved games stay available.</p>
      <label htmlFor="game-seed">Seed (optional, for a repeatable setup)</label>
      <input id="game-seed" type="number" min="0" max="4294967295" step="1" value={seed} onChange={event => setSeed(event.target.value)} disabled={busy} />
      <div className="library-actions"><button className="confirm-button" type="submit" disabled={!ready || busy}>{busy ? 'Setting up…' : 'Start game'}</button>
        <button className="quiet-button" type="button" disabled={busy} onClick={() => { setScreen('home'); setError(null); }}>Cancel</button></div>
    </form> : <section className="library-card new-game-card" aria-label="New game">
      <div><h2>New game</h2><p>{data ? 'Base game components and rules are ready. Choose a Hero to begin.' : ready ? 'Import the prepared base game once. It will be ready here for future games.' : 'Preparing your local game library…'}</p></div>
      <button className="confirm-button" disabled={!ready || busy || !data} onClick={() => chooseNewGame()}>New game</button>
    </section>}
    {screen === 'home' && <section className="saved-games-list" aria-label="Saved games"><h2 ref={savedHeading} tabIndex={-1}>Saved games <span>{games.length}</span></h2>
      {!games.length && ready && <p className="library-empty">Your adventures will appear here as you play. Progress saves automatically.</p>}
      {games.map(game => <article className="library-card saved-game-card" key={game.id} data-game-id={game.id} aria-label={`${game.hero} saved game`}>
        <div className="saved-game-summary"><h3>{game.hero}</h3><p>{game.damaged ? 'Needs recovery' : `Turn ${game.turn} · ${game.phase === 'hero' ? 'Hero Phase' : game.phase === 'monster' ? 'Monster Phase' : game.phase === 'won' ? 'Victory' : game.phase === 'lost' ? 'Defeat' : game.phase}`}</p>
          <small>{game.savedAt ? `Saved ${new Date(game.savedAt).toLocaleString()}` : 'Imported from your earlier local save'}</small></div>
        <div className="saved-game-actions"><button className="confirm-button" disabled={busy} onClick={() => void resume(game.id)}>Resume saved game</button>
          <button className="quiet-button library-delete-button" disabled={busy} onClick={event => { deleteOpener.current = event.currentTarget; setDeleteTarget(game); setDeleteNotice(null); setError(null); }}>Delete</button></div>
        {game.hasPrevious && <details><summary>Recovery options</summary><p>The previous save may be one action behind. Recovering it replaces only this game’s current save.</p>
          <button className="quiet-button" disabled={busy} onClick={() => void resume(game.id, true)}>Recover previous save</button></details>}
      </article>)}
    </section>}
    <details className="library-import"><summary>Import game data or backup</summary><div className="local-import-body">
      <label htmlFor="game-data-file">Base game data (game-data.json)</label>
      <input id="game-data-file" type="file" accept=".json,application/json" disabled={!ready || busy || !!candidate}
        onChange={event => { void loadFile(event.currentTarget.files?.[0], false); event.currentTarget.value = ''; }} />
      <p>Import once to use these components for new games. Existing games keep the data they started with.</p>
      <label htmlFor="game-save-file">Import a BoardBot backup as a separate game</label>
      <input id="game-save-file" type="file" accept=".json,application/json" disabled={!ready || busy || !!candidate}
        onChange={event => { void loadFile(event.currentTarget.files?.[0], true); event.currentTarget.value = ''; }} />
    </div></details>
    <footer className="library-footer"><p>Components and progress stay on this device.</p><button className="quiet-button" disabled={busy} onClick={() => { setScreen('sample'); setCandidate(null); setError(null); }}>Try sample table</button></footer>
    {deleteTarget && <DeleteGameDialog game={deleteTarget} busy={busy} error={error} opener={deleteOpener.current}
      onCancel={() => { setDeleteTarget(null); setError(null); }} onConfirm={() => void deleteSavedGame()} />}
  </main>;
}
