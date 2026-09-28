import { useState } from 'react';
import { connections, getActionReason, locations } from '../engine/sampleGame';
import type { Action, LocationId } from '../engine/sampleGame';
import { useSampleSession } from '../session/useSampleSession';

const nameOf = (id: LocationId) => locations.find(location => location.id === id)!.name;

export function App() {
  const { game, confirm, restart } = useSampleSession();
  const [selectedType, setSelectedType] = useState<'move' | 'wait' | null>(null);
  const [destination, setDestination] = useState<LocationId | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const locked = game.phase !== 'ready';
  const action: Action | null = selectedType === 'wait' ? { type: 'wait' }
    : selectedType === 'move' && destination ? { type: 'move', destination } : null;
  const reason = action ? getActionReason(game, action) : 'Select an action and any required destination.';
  const phaseLabel = game.phase === 'resolving' ? 'Resolving action…'
    : game.phase === 'complete' ? 'Sample turn complete' : 'Your turn';
  const clearSelection = () => { setSelectedType(null); setDestination(null); };

  function selectType(type: 'move' | 'wait') {
    if (locked) return;
    setSelectedType(type);
    setDestination(null);
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">B</span>BoardBot<span className="brand-note">THE PRACTICE TABLE</span></a>
        <button className="quiet-button" aria-expanded={showHelp} aria-controls="table-guide" onClick={() => setShowHelp(!showHelp)}>How to play <span aria-hidden="true">↗</span></button>
      </header>
      <main id="main">
        <div className="page-heading">
          <div><p className="eyebrow">SOLO LAB / 001</p><h1>A little room to explore.</h1><p className="intro">Take a seat. Try an action. Get a feel for the flow.</p></div>
          <span className="prototype-badge"><span aria-hidden="true">◈</span> Interaction prototype</span>
        </div>
        <div className="notice"><strong>A sample, not a real game.</strong> This original map, explorer, and three-action turn are synthetic. Horrified rules and monsters are not implemented. Progress resets on reload.</div>
        {showHelp && <section className="guide" id="table-guide" aria-label="How to play">
          <h2>Your first sample turn</h2><p>Select Move and a connected location, or select Wait. Review your choice, then Confirm. Selection is free; confirmation spends one sample action. Controls pause briefly while the result displays. After three actions, start a new sample turn.</p>
          <p>Hover or focus an action to read its description. All controls work with Tab, Enter, and Space. This prototype has no undo, saves, dice, or monster turns.</p>
        </section>}
        <div className="table-layout">
          <section className="board-panel" aria-labelledby="board-title">
            <div className="panel-heading"><div><p className="eyebrow">THE BOARD</p><h2 id="board-title">The training grounds</h2></div><span className="small-label">4 locations · sample map</span></div>
            <div className="map" aria-label="Sample map">
              <div className="map-compass" aria-hidden="true">N<br />↑</div>
              <svg className="map-paths" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
                {connections.map(([from, to]) => {
                  const start = locations.find(location => location.id === from)!;
                  const end = locations.find(location => location.id === to)!;
                  return <line key={`${from}-${to}`} x1={start.x} y1={start.y} x2={end.x} y2={end.y} />;
                })}
              </svg>
              {locations.map((location, index) => {
                const here = game.location === location.id;
                const unavailable = getActionReason(game, { type: 'move', destination: location.id });
                const canSelect = selectedType === 'move' && !unavailable;
                return <button key={location.id} className={`map-location ${here ? 'current' : ''} ${destination === location.id ? 'selected' : ''}`}
                  style={{ left: `${location.x}%`, top: `${location.y}%` }}
                  aria-label={`${location.name}${here ? ', explorer here' : ''}`}
                  aria-pressed={destination === location.id} aria-disabled={!canSelect}
                  title={unavailable ?? (selectedType === 'move' ? 'Select this destination' : 'Select Move first')}
                  onClick={() => { if (canSelect) setDestination(location.id); }}>
                  <span className="location-symbol" aria-hidden="true">{['⌂', '✧', '△', '▥'][index]}</span>
                  <span className="location-name">{location.name}</span>
                  <span className="location-caption">{here ? 'EXPLORER HERE' : destination === location.id ? 'DESTINATION' : `LOCATION 0${index + 1}`}</span>
                </button>;
              })}
              <span className="map-stamp" aria-hidden="true">BB / FIELD NOTES<br />PRACTICE SERIES</span>
            </div>
            <div className="map-legend"><span><i className="legend-dot" /> Explorer</span><span><i className="legend-line" /> Connected path</span><span className="map-hint">Select Move to choose a connected location.</span></div>
          </section>
          <aside className="action-panel" aria-labelledby="turn-title" aria-busy={game.phase === 'resolving'}>
            <div className="turn-heading"><span className="eyebrow">SAMPLE TURN</span><span className={`phase-dot ${game.phase}`} aria-hidden="true" /></div>
            <h2 id="turn-title" aria-live="polite">{phaseLabel}</h2>
            <div className="hero"><div className="hero-token" aria-hidden="true">E</div><div><strong>Practice explorer</strong><span>At {nameOf(game.location)}</span></div></div>
            <div className="action-budget"><span>Actions remaining</span><strong data-testid="action-budget">{game.actionsRemaining} <span>/ {game.actionAllowance}</span></strong></div>
            <div className="budget-pips" aria-hidden="true">{Array.from({ length: game.actionAllowance }, (_, index) => <span key={index} className={index < game.actionsRemaining ? 'available' : ''} />)}</div>
            <div className="actions-heading"><h3>Choose an action</h3><span>Hover or focus for details</span></div>
            <div className="action-options">
              {(['move', 'wait'] as const).map(type => <div className="action-option" key={type}>
                <button className="action-card" disabled={locked} aria-pressed={selectedType === type} aria-describedby={`${type}-description`} onClick={() => selectType(type)}>
                  <span className="action-icon" aria-hidden="true">{type === 'move' ? '↗' : '◷'}</span><span><strong>{type === 'move' ? 'Move' : 'Wait'}</strong><small>{type === 'move' ? 'Explore a connected location' : 'Stay where you are'}</small></span><span className="cost">1 action</span>
                </button>
                <p role="tooltip" className="action-description" id={`${type}-description`}>{type === 'move' ? 'Move along one path to a connected location. Choose a destination before confirming.' : 'Remain at your current location and spend one sample action.'}</p>
              </div>)}
            </div>
            {selectedType === 'move' && <div className="destination-label"><label htmlFor="destination">Destination</label>
              <select id="destination" value={destination ?? ''} disabled={locked} onChange={event => setDestination(event.target.value as LocationId || null)}>
                <option value="">Choose a connected location</option>
                {locations.map(location => <option key={location.id} value={location.id} disabled={getActionReason(game, { type: 'move', destination: location.id }) !== null}>{location.name}</option>)}
              </select>
            </div>}
            <div className="confirm-area">
              <p className="selection-summary" aria-live="polite">{game.phase === 'complete' ? 'Three actions explored. Ready for another?' : game.phase === 'resolving' ? 'Showing your result. Please wait…' : action ? `${action.type === 'move' ? `Move to ${nameOf(action.destination)}` : `Wait at ${nameOf(game.location)}`} · 1 action` : selectedType === 'move' ? 'Choose a destination on the map or from the list.' : 'Nothing selected yet. Take your time.'}</p>
              {game.phase === 'complete' ? <button className="confirm-button" onClick={() => { clearSelection(); restart(); }}>Start a new sample turn <span aria-hidden="true">↻</span></button> : <button className="confirm-button" disabled={locked || action === null || reason !== null} onClick={() => { if (action && !reason && !locked) { confirm(action); clearSelection(); } }}> {game.phase === 'resolving' ? 'Resolving…' : 'Confirm action'} <span aria-hidden="true">→</span></button>}
              <button className="clear-button" disabled={locked || selectedType === null} onClick={clearSelection}>Clear selection</button>
              <p className="fine-print">Only confirmation spends an action.</p>
            </div>
          </aside>
        </div>
        <section className="history-panel" aria-labelledby="history-title"><div><p className="eyebrow">FIELD NOTES</p><h2 id="history-title">Turn history</h2></div><ol aria-live="polite" aria-relevant="additions">{game.history.length ? game.history.map((entry, index) => <li key={index}><span className="history-number">{String(index + 1).padStart(2, '0')}</span>{entry}</li>) : <li className="history-empty">Your explorer is at camp. Confirm an action to begin.</li>}</ol></section>
        <footer><span>Built for a quieter kind of game night.</span><span>LOCAL PLAY · NO ACCOUNT · SAMPLE DATA</span></footer>
      </main>
    </div>
  );
}
