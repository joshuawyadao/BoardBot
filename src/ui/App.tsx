import { useRef, useState } from 'react';
import { connections, getActionReason, getEndPhaseReason, locations } from '../engine/sampleGame';
import type { Action, LocationId } from '../engine/sampleGame';
import { useSampleSession } from '../session/useSampleSession';
import { SessionLog } from './SessionLog';
import { trayActions } from './actionCatalog';
import type { TrayActionId } from './actionCatalog';
import { LocalGameApp } from './LocalGameApp';
import { ActionTray } from './ActionTray';
import './horrified.css';

const nameOf = (id: LocationId) => locations.find(location => location.id === id)!.name;

function SampleApp() {
  const { game, confirm, endHeroPhase, restart, entries, turnNumber } = useSampleSession();
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const [selectedType, setSelectedType] = useState<'move' | null>(null);
  const [inspectedAction, setInspectedAction] = useState<TrayActionId | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<TrayActionId | null>(null);
  const [focusedAction, setFocusedAction] = useState<TrayActionId | null>(null);
  const mapButtons = useRef(new Map<LocationId, HTMLButtonElement>());
  const locked = game.phase !== 'ready';
  const moveReason = locations.some(({ id }) => getActionReason(game, { type: 'move', destination: id }) === null)
    ? null : getActionReason(game, { type: 'move', destination: game.location });
  const endReason = getEndPhaseReason(game);
  const describedId = hoveredAction ?? focusedAction ?? inspectedAction ?? selectedType;
  const described = trayActions.find(action => action.id === describedId);
  const availabilityReason = (id: TrayActionId) => id === 'move' ? moveReason
    : trayActions.find(action => action.id === id)?.unavailable ?? null;
  const phaseLabel = game.phase === 'resolving' ? 'Resolving action…'
    : game.phase === 'complete' ? 'Sample turn complete'
    : game.actionsRemaining === 0 ? 'No actions remaining' : 'Your Hero Phase';

  function clearSelection() { setSelectedType(null); setInspectedAction(null); }

  function selectAction(id: TrayActionId) {
    if (locked) return;
    setInspectedAction(id);
    setSelectedType(null);
    if (availabilityReason(id)) return;
    if (id === 'move') {
      setSelectedType('move');
      const first = locations.find(location => !getActionReason(game, { type: 'move', destination: location.id }));
      if (first) mapButtons.current.get(first.id)?.focus();
    }
  }

  function commit(action: Action) {
    if (getActionReason(game, action) !== null) return;
    confirm(action);
    clearSelection();
  }

  const inspectionEvents = (id: TrayActionId) => ({
    onMouseEnter: () => setHoveredAction(id), onMouseLeave: () => setHoveredAction(null),
    onFocus: () => { setFocusedAction(id); setHoveredAction(null); }, onBlur: () => setFocusedAction(null),
  });

  return (
    <div className={`app-shell ${actionsCollapsed ? 'actions-collapsed' : ''}`}>
      <header className="app-header">
        <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">B</span>BoardBot<span className="brand-note">THE PRACTICE TABLE</span></a>
        <div className="header-tools"><span className="prototype-badge">Interaction prototype</span><button className="quiet-button" aria-expanded={showHelp} aria-controls="table-guide" onClick={() => setShowHelp(!showHelp)}>How to play <span aria-hidden="true">↗</span></button></div>
      </header>
      <main id="main">
        <h1 className="sr-only">BoardBot practice table</h1>
        <div className="notice"><strong>A sample, not a real game.</strong> This map, explorer, and three-action turn are synthetic. Planned game actions are unavailable. Horrified rules and monsters are not implemented. Progress resets on reload.</div>
        {showHelp && <section className="guide" id="table-guide" aria-label="How to play">
          <h2>Your first sample turn</h2><p>Select Move, then click or activate a highlighted destination to move immediately. Each move costs one sample action and pauses controls while the result displays.</p>
          <p>Choose End Hero Phase when ready to forfeit any unused actions, even before all three actions are spent. Zero actions does not end the phase automatically. Then start a new sample turn; earlier turns remain in the log. Planned cards explain their unavailable state on hover, keyboard focus, or tap. Perks and monster turns are not implemented.</p>
          <p>Use Tab, Enter, and Space to operate the controls. There is no undo or saved progress.</p>
        </section>}
        <div className="table-layout">
          <section className="board-panel" aria-labelledby="board-title">
            <div className="panel-heading"><div><p className="eyebrow">SAMPLE TURN {turnNumber}</p><h2 id="board-title">The training grounds</h2></div><div className="hero"><strong>Practice explorer</strong><span>At {nameOf(game.location)}</span></div></div>
            <div className="board-surface">
              <div className="map" aria-label="Sample map">
                <svg className="map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                  {connections.map(([from, to]) => {
                    const start = locations.find(location => location.id === from)!;
                    const end = locations.find(location => location.id === to)!;
                    return <line className={selectedType === 'move' && !locked && (from === game.location || to === game.location) ? 'reachable-path' : ''} key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
                  })}
                </svg>
                {locations.map((location, index) => {
                  const here = game.location === location.id;
                  const unavailable = getActionReason(game, { type: 'move', destination: location.id });
                  const canMove = selectedType === 'move' && !unavailable;
                  return <button key={location.id} className={`map-location ${here ? 'current' : ''} ${canMove ? 'reachable' : ''}`}
                    ref={element => { if (element) mapButtons.current.set(location.id, element); else mapButtons.current.delete(location.id); }}
                    style={{ left: `${location.x}%`, top: `${location.y}%` }}
                    aria-label={`${location.name}${here ? ', explorer here' : ''}`} aria-disabled={!canMove}
                    title={unavailable ?? (selectedType === 'move' ? 'Move here immediately' : 'Select Move first')}
                    onClick={() => { if (canMove) commit({ type: 'move', destination: location.id }); }}>
                    <span className="location-symbol" aria-hidden="true">{['⌂', '✧', '△', '▥'][index]}</span>
                    <span className="location-name">{location.name}</span><span className="location-caption">{here ? 'EXPLORER HERE' : canMove ? 'MOVE HERE' : `LOCATION 0${index + 1}`}</span>
                  </button>;
                })}
              </div>
              <ActionTray title={phaseLabel} titleId="turn-title" busy={game.phase === 'resolving'} collapsed={actionsCollapsed}
                onToggle={() => { setActionsCollapsed(value => !value); clearSelection(); setHoveredAction(null); setFocusedAction(null); }}
                budget={<div className="action-budget"><span>Actions</span><strong data-testid="action-budget">{game.actionsRemaining} <span>/ {game.actionAllowance}</span></strong></div>}
                phaseControl={game.phase === 'complete'
                  ? <button className="confirm-button" onClick={() => { clearSelection(); restart(); }}>Start a new sample turn</button>
                  : <button className="end-button" title={endReason ?? 'End the Hero Phase and forfeit any unused actions.'} aria-description="Forfeits any unused actions." disabled={!!endReason} onClick={() => { if (!endReason) { clearSelection(); endHeroPhase(); } }}>End Hero Phase</button>}>
                <div className="action-options">
                  {trayActions.map(action => <div className="action-option" key={action.id}>
                    <button className={`action-card ${action.id === 'perks' ? 'free-action' : ''}`} aria-disabled={locked || !!availabilityReason(action.id)} aria-pressed={selectedType === action.id}
                      aria-describedby={`${action.id}-description`} {...inspectionEvents(action.id)} onClick={() => selectAction(action.id)}>
                      <span className="card-top"><span className="action-icon" aria-hidden="true">{action.icon}</span><span className="cost">{action.cost}</span></span>
                      <strong>{action.label}</strong><small>{action.caption}</small>
                    </button>
                    <p className="sr-only" id={`${action.id}-description`}>{action.description} {availabilityReason(action.id)}</p>
                  </div>)}
                </div>
                <div className="action-help" role="note" aria-label="Action details">
                  <strong>{described?.label ?? 'Choose an action'}</strong>
                  <p>{described?.description ?? 'Move directly on the map. End Hero Phase forfeits any unused actions. Inspect a planned card to see what is still to come.'}</p>
                  <p className="unavailable-reason">{describedId ? availabilityReason(describedId) ?? 'Available now.' : 'Planned cards stay in place as a preview of the full tray.'}</p>
                </div>
                <div className="confirm-area">
                  {(selectedType || game.phase !== 'ready' || game.actionsRemaining === 0) && <p className="selection-summary" aria-live="polite">{game.phase === 'complete' ? 'Hero Phase ended. Start another sample turn when ready.' : game.phase === 'resolving' ? 'Showing your result. Please wait…' : game.actionsRemaining === 0 ? 'No paid actions remain. End Hero Phase when ready; perks are not implemented in this sample.' : selectedType === 'move' ? 'Click a highlighted location to move immediately.' : 'Select an action or end your Hero Phase.'}</p>}
                  <div className="tray-controls">
                    <button className="clear-button" disabled={locked || selectedType === null} onClick={clearSelection}>Clear selection</button>
                  </div>
                </div>
              </ActionTray>
            </div>
          </section>
          <SessionLog entries={entries} />
        </div>
        <footer className="app-footer"><span>Built for a quieter kind of game night.</span><span>LOCAL PLAY · NO ACCOUNT · SAMPLE DATA</span></footer>
      </main>
    </div>
  );
}

/** The synthetic table remains the default; private games require an explicit local import or resume. */
export function App() { return <LocalGameApp sample={<SampleApp />} />; }
