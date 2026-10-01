import { useEffect, useRef, useState } from 'react';
import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import type { HeroAction } from '../engine/horrifiedRuntime';
import { ActionTray } from './ActionTray';

type TrayId = 'move' | 'guide' | 'pick-up' | 'share' | 'advance' | 'defeat' | 'special' | 'perks';
type ActionReason = (action: HeroAction) => string | null;
interface Props {
  data: GameData;
  game: GameView;
  onAction: (action: HeroAction) => void;
  reasonFor: ActionReason;
  busy: boolean;
  error: string | null;
  onReturnToSample: () => void;
}

const cards: { id: TrayId; label: string; icon: string; caption: string; description: string; cost: string }[] = [
  { id: 'move', label: 'Move', icon: '↗', caption: 'Connected location', description: 'Move to a highlighted connected location. You may escort Citizens sharing your space.', cost: '1 action' },
  { id: 'guide', label: 'Guide', icon: '♧', caption: 'Citizen', description: 'Choose an eligible Citizen and destination.', cost: '1 action' },
  { id: 'pick-up', label: 'Pick Up', icon: '◇', caption: 'Items', description: 'Select the Items to collect from your location, then confirm.', cost: '1 action' },
  { id: 'share', label: 'Share', icon: '⇄', caption: 'Exchange items', description: 'Share Items with another eligible Hero.', cost: '1 action' },
  { id: 'advance', label: 'Advance', icon: '▤', caption: 'Challenge', description: 'Review the Monster, Item cost, and target before committing a roll.', cost: '1 action' },
  { id: 'defeat', label: 'Defeat', icon: '⚑', caption: 'Monster', description: 'Choose the Monster and Items to spend, then confirm.', cost: '1 action' },
  { id: 'special', label: 'Special Action', icon: '✧', caption: 'Hero ability', description: 'Review the Fighter ability and confirm before rolling.', cost: '1 action' },
  { id: 'perks', label: 'Perks', icon: '▱', caption: 'Eligible cards', description: 'Play an eligible owned Perk during its permitted timing.', cost: 'Free' },
];

const MONSTER_NAMES = { beholder: 'Beholder', displacerBeast: 'Displacer Beast' } as const;
const cellKey = (row: number, column: number) => `${row}:${column}`;

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(entry => entry !== value) : [...values, value];
}

function boardPositions(data: GameData) {
  return new Map(data.board.locations.map((location, index) => {
    if (location.kind === 'numbered') {
      const number = location.number ?? index + 1;
      return [location.id, { x: 115 + ((number - 1) % 5) * 220, y: 78 + Math.floor((number - 1) / 5) * 128 }];
    }
    if (location.kind === 'unnumbered') {
      const place = data.board.locations.filter(entry => entry.kind === 'unnumbered').findIndex(entry => entry.id === location.id);
      return [location.id, { x: 115 + place * 220, y: 590 }];
    }
    const place = data.board.locations.filter(entry => entry.kind === 'circle').findIndex(entry => entry.id === location.id);
    return [location.id, { x: 225 + place * 245, y: 708 }];
  }));
}

function PendingChoicePanel({ pending, busy, onAction }: {
  pending: NonNullable<GameView['pending']>;
  busy: boolean;
  onAction: Props['onAction'];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { headingRef.current?.focus(); }, []);
  const valid = selected.length >= pending.min && selected.length <= pending.max;
  return <section className="h-pending" aria-labelledby="pending-title">
    <p className="eyebrow">REQUIRED GAME CHOICE</p>
    <h2 id="pending-title" ref={headingRef} tabIndex={-1}>{pending.title}</h2>
    <p>Choose {pending.min === pending.max ? pending.min : `${pending.min}–${pending.max}`} option{pending.max === 1 ? '' : 's'} to continue.</p>
    <fieldset disabled={busy}>
      <legend className="sr-only">{pending.title}</legend>
      {pending.options.map(option => <label key={option.id} className="h-check-row">
        <input type={pending.max === 1 && pending.min === 1 ? 'radio' : 'checkbox'} name={`choice-${pending.id}`}
          checked={selected.includes(option.id)}
          onChange={() => setSelected(current => pending.max === 1
            ? pending.min === 0 && current.includes(option.id) ? [] : [option.id]
            : toggle(current, option.id))} />
        <span>{option.label}</span>
      </label>)}
    </fieldset>
    <button className="confirm-button" disabled={busy || !valid} onClick={() => onAction({ kind: 'choose', choiceId: pending.id, selected })}>Confirm choice</button>
  </section>;
}

export function FighterTable({ data, game, onAction, reasonFor, busy, error, onReturnToSample }: Props) {
  const [actionsCollapsed, setActionsCollapsed] = useState(false);
  const [selected, setSelected] = useState<TrayId | null>(null);
  const [inspected, setInspected] = useState<TrayId | null>(null);
  const [hovered, setHovered] = useState<TrayId | null>(null);
  const [focused, setFocused] = useState<TrayId | null>(null);
  const [escorts, setEscorts] = useState<string[]>([]);
  const [pickedItems, setPickedItems] = useState<string[]>([]);
  const [spentItems, setSpentItems] = useState<string[]>([]);
  const [revealItems, setRevealItems] = useState<string[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<number | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<'beholder' | 'displacerBeast'>('beholder');
  const [selectedPerk, setSelectedPerk] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const mapButtons = useRef(new Map<string, HTMLButtonElement>());
  const positions = boardPositions(data);
  const boardHeight = data.board.locations.length < 10 ? 250 : 790;
  const locationName = (id: string | null | undefined) => data.board.locations.find(location => location.id === id)?.name ?? 'off board';
  const itemName = (id: string) => game.visibleItems[id]?.name ?? 'Unknown Item';
  const itemSummary = (id: string) => {
    const item = game.visibleItems[id];
    return item ? `${item.name} · ${item.color} ${item.strength}` : 'Unknown Item';
  };
  const unavailable = (id: TrayId) => game.actions[id] ?? null;
  const inspectedCard = cards.find(card => card.id === (hovered ?? focused ?? inspected ?? selected));
  const at = game.hero.location;
  const boardItems = at ? game.boardItems[at] ?? [] : [];
  const companions = Object.entries(game.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location === at);
  const moveTargets = new Set(game.moveDestinations);
  const ownedItems = game.hero.items;
  const inventoryStrength = spentItems.reduce((total, id) => total + (game.visibleItems[id]?.strength ?? 0), 0);
  const selectedGuideOption = selectedGuide === null ? null : game.guideOptions[selectedGuide] ?? null;
  const selectedAdvanceOption = selectedAdvance === null ? null : game.advanceOptions[selectedAdvance] ?? null;
  const selectedPerkOption = game.perkOptions.find(option => option.id === selectedPerk);
  const pending = game.pending;
  const terminal = game.phase === 'won' || game.phase === 'lost';
  const selectionLocked = busy || !!pending || terminal;

  function chooseCard(id: TrayId) {
    setInspected(id);
    if (selectionLocked || unavailable(id)) return;
    setSelected(id);
    setEscorts([]);
    setPickedItems([]);
    setSpentItems([]);
    setSelectedGuide(null);
    setSelectedAdvance(null);
    setSelectedPerk(null);
    if (id === 'move') {
      const first = data.board.locations.find(location => moveTargets.has(location.id));
      if (first) mapButtons.current.get(first.id)?.focus();
    }
  }

  function commit(action: HeroAction) {
    if (selectionLocked || reasonFor(action)) return;
    onAction(action);
    setSelected(null);
  }

  const inspectionEvents = (id: TrayId) => ({
    onMouseEnter: () => setHovered(id), onMouseLeave: () => setHovered(null),
    onFocus: () => { setFocused(id); setHovered(null); }, onBlur: () => setFocused(null),
  });

  const moveAction = (destination: string): HeroAction => ({ kind: 'move', destination, escorts });
  const guideAction = selectedGuideOption ? { kind: 'guide', citizen: selectedGuideOption.citizen, destination: selectedGuideOption.destination } as const : null;
  const advanceAction = selectedAdvanceOption ?? null;
  const defeatAction: HeroAction = { kind: 'defeat', monster: selectedMonster, items: spentItems };
  const pickupAction: HeroAction = { kind: 'pick-up', items: pickedItems };
  const revealAction: HeroAction = { kind: 'reveal', items: revealItems };
  const specialAction: HeroAction = { kind: 'special' };
  const endAction: HeroAction = { kind: 'end-phase' };
  const currentAction: HeroAction | null = selected === 'guide' ? guideAction
    : selected === 'pick-up' ? pickupAction : selected === 'advance' ? advanceAction
    : selected === 'defeat' ? defeatAction : selected === 'special' ? specialAction
    : selected === 'perks' && selectedPerkOption ? { kind: 'perk', perk: selectedPerkOption.id } : null;
  const currentReason = currentAction ? reasonFor(currentAction) : null;
  const canConfirm = !!currentAction && !currentReason && !selectionLocked;
  const hero = data.heroes.find(candidate => candidate.id === game.hero.definitionId);

  return <div className={`app-shell h-table ${actionsCollapsed ? 'actions-collapsed' : ''}`}>
    <header className="app-header">
      <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">B</span>BoardBot<span className="brand-note">THE PRACTICE TABLE</span></a>
      <div className="header-tools"><span className="prototype-badge">Local Fighter game</span><button className="quiet-button" onClick={() => setShowHelp(value => !value)} aria-expanded={showHelp}>How to play <span aria-hidden="true">↗</span></button><button className="quiet-button" onClick={onReturnToSample} disabled={busy}>Sample table</button></div>
    </header>
    <main id="main">
      <h1 className="sr-only">Horrified Fighter table</h1>
      <div className="notice"><strong>Local game in progress.</strong> This first playable path supports one human Fighter. Game data stays in memory. Reloading resets this game; save and resume are still in development.</div>
      {showHelp && <section className="guide"><h2>Playing the Fighter table</h2><p>Select an action card. Move highlights destinations and commits when you choose one. Item spending and rolls have a separate confirmation. The game pauses for required choices; use the choice panel to continue.</p><p>Tab, Enter, and Space operate controls. Ordinary actions stay locked during resolution. End the Hero Phase when you are ready, including when actions reach zero.</p></section>}
      {error && <p className="h-error" role="alert">{error}</p>}
      {terminal && <div className="h-end" role="status"><strong>{game.phase === 'won' ? 'Victory' : 'Defeat'}</strong><span>{game.endReason}</span></div>}
      <div className="h-layout">
        <div className="h-main-column">
          <section className="board-panel" aria-labelledby="h-board-title">
            <div className="panel-heading"><div><p className="eyebrow">TURN {game.turn} · {game.phase.toUpperCase()} PHASE</p><h2 id="h-board-title">The city and dungeon</h2></div><div className="hero"><strong>{hero?.name ?? 'Fighter'}</strong><span>At {locationName(at)}</span></div></div>
            <div className="h-status"><span>Terror <strong>{game.terror}</strong></span><span>Frenzy <strong>{MONSTER_NAMES[game.frenzy]}</strong></span><span>Items in bag <strong>{game.bagCount}</strong></span><span>Monster deck <strong>{game.monsterDeckCount}</strong></span></div>
            <div className="h-map-scroll"><div className="h-map" style={{ height: boardHeight }} role="group" aria-label="Game board with ordinary, passage, and teleport connections">
              <svg className="h-map-paths" width="1220" height={boardHeight} viewBox={`0 0 1220 ${boardHeight}`} aria-hidden="true">
                {data.board.edges.map((edge, index) => {
                  const from = positions.get(edge.from)!; const to = positions.get(edge.to)!;
                  return <line key={`${edge.kind}-${index}`} className={`h-edge-${edge.kind}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} />;
                })}
              </svg>
              {data.board.locations.map(location => {
                const point = positions.get(location.id)!;
                const here = at === location.id;
                const canMove = selected === 'move' && !selectionLocked && moveTargets.has(location.id) && !reasonFor(moveAction(location.id));
                const monstersHere = (Object.entries(game.monsters) as [keyof typeof MONSTER_NAMES, { location: string | null; defeated: boolean }][]) .filter(([, monster]) => !monster.defeated && monster.location === location.id).map(([id]) => MONSTER_NAMES[id]);
                const citizensHere = Object.values(game.citizens).filter(citizen => citizen.status === 'board' && citizen.location === location.id).length;
                const itemsHere = game.boardItems[location.id]?.length ?? 0;
                return <button key={location.id} ref={element => { if (element) mapButtons.current.set(location.id, element); else mapButtons.current.delete(location.id); }}
                  type="button" className={`h-location ${location.kind} ${here ? 'current' : ''} ${canMove ? 'reachable' : ''}`}
                  style={{ left: point.x, top: point.y }} aria-label={`${location.name}${here ? ', Fighter here' : ''}${monstersHere.length ? `, ${monstersHere.join(' and ')}` : ''}`}
                  aria-disabled={!canMove} title={canMove ? `Move to ${location.name}` : 'Select Move to see legal destinations'}
                  onClick={() => { if (canMove) commit(moveAction(location.id)); }}>
                  <span className="h-node-name">{location.name}</span>
                  <span className="h-node-meta">{here ? 'FIGHTER · ' : ''}{monstersHere.length ? `${monstersHere.join(', ')} · ` : ''}{itemsHere} item{itemsHere === 1 ? '' : 's'}{citizensHere ? ` · ${citizensHere} citizen${citizensHere === 1 ? '' : 's'}` : ''}</span>
                </button>;
              })}
            </div></div>
            <div className="h-map-key"><span>— Ordinary</span><span>┄ Passage</span><span>┈ Teleport circles</span><span>● Fighter</span></div>
          </section>
          {pending && <PendingChoicePanel key={pending.id} pending={pending} busy={busy} onAction={onAction} />}
          <ActionTray className="h-tray" title={busy ? 'Resolving…' : pending ? 'Choice required' : terminal ? 'Game complete' : game.phase === 'monster' ? 'Monster Phase' : 'Your Hero Phase'}
            titleId="h-turn-title" busy={busy} collapsed={actionsCollapsed}
            onToggle={() => { setActionsCollapsed(value => !value); setSelected(null); setInspected(null); setHovered(null); setFocused(null); }}
            budget={<div className="action-budget"><span>Actions</span><strong>{game.hero.actions} <span>/ {game.hero.allowance}</span></strong></div>}
            phaseControl={<button className="end-button" disabled={selectionLocked || !!reasonFor(endAction)} title={reasonFor(endAction) ?? undefined} onClick={() => commit(endAction)}>End Hero Phase</button>}>
            <div className="action-options">{cards.map(card => <div className="action-option" key={card.id}><button type="button" className={`action-card ${card.id === 'perks' ? 'free-action' : ''}`}
              aria-disabled={selectionLocked || !!unavailable(card.id)} aria-pressed={selected === card.id}
              {...inspectionEvents(card.id)} onClick={() => chooseCard(card.id)}>
              <span className="card-top"><span className="action-icon" aria-hidden="true">{card.icon}</span><span className="cost">{card.cost}</span></span><strong>{card.label}</strong><small>{card.caption}</small>
            </button></div>)}</div>
            <div className="action-help" role="note" aria-label="Action details"><strong>{inspectedCard?.label ?? 'Choose an action'}</strong><p>{inspectedCard?.description ?? 'Inspect a card, then choose a legal action. Move executes at its destination; consequential actions have confirmation.'}</p><p className="unavailable-reason">{inspectedCard ? unavailable(inspectedCard.id) ?? 'Available now.' : 'Perks remain available at zero actions when their timing allows.'}</p></div>
            {selected && <div className="h-action-editor" aria-live="polite">
              {selected === 'move' && <div><h3>Move from {locationName(at)}</h3><p>Select a highlighted destination on the board. Movement commits when you choose it.</p>{companions.length > 0 && <fieldset disabled={selectionLocked}><legend>Escort Citizens</legend>{companions.map(([id]) => <label className="h-check-row" key={id}><input type="checkbox" checked={escorts.includes(id)} onChange={() => setEscorts(current => toggle(current, id))} />{data.citizens.find(citizen => citizen.id === id)?.name ?? 'Citizen'}</label>)}</fieldset>}</div>}
              {selected === 'guide' && <div><h3>Guide a Citizen</h3>{game.guideOptions.length ? <fieldset disabled={selectionLocked}><legend>Available destinations</legend>{game.guideOptions.map((option, index) => <label className="h-check-row" key={`${option.citizen}-${option.destination}`}><input type="radio" name="guide-option" checked={selectedGuide === index} onChange={() => setSelectedGuide(index)} />{data.citizens.find(citizen => citizen.id === option.citizen)?.name ?? 'Citizen'} → {locationName(option.destination)}</label>)}</fieldset> : <p>No eligible guidance at this location.</p>}</div>}
              {selected === 'pick-up' && <div><h3>Pick Up Items</h3>{boardItems.length ? <fieldset disabled={selectionLocked}><legend>At {locationName(at)}</legend>{boardItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={pickedItems.includes(id)} onChange={() => setPickedItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset> : <p>There are no Items here.</p>}</div>}
              {selected === 'share' && <p>{unavailable('share') ?? 'Choose another Hero to share with.'}</p>}
              {selected === 'advance' && <div><h3>Advance a Monster</h3>{game.advanceOptions.length ? <fieldset disabled={selectionLocked}><legend>Eligible costs and targets</legend>{game.advanceOptions.map((option, index) => <label className="h-check-row" key={`${option.monster}-${option.item}-${option.cell ?? index}`}><input type="radio" name="advance-option" checked={selectedAdvance === index} onChange={() => setSelectedAdvance(index)} />{MONSTER_NAMES[option.monster]} · {itemSummary(option.item)}{option.cell ? ` · cell ${option.cell}` : ''}</label>)}</fieldset> : <p>No advance attempt is available now.</p>}</div>}
              {selected === 'defeat' && <div><h3>Defeat a Monster</h3><fieldset disabled={selectionLocked}><legend>Target</legend>{(Object.keys(MONSTER_NAMES) as (keyof typeof MONSTER_NAMES)[]).map(monster => <label className="h-check-row" key={monster}><input type="radio" name="defeat-monster" checked={selectedMonster === monster} onChange={() => setSelectedMonster(monster)} />{MONSTER_NAMES[monster]}{game.monsters[monster].defeated ? ' · defeated' : ''}</label>)}</fieldset><fieldset disabled={selectionLocked}><legend>Items to spend · {inventoryStrength} Strength selected</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={spentItems.includes(id)} onChange={() => setSpentItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(defeatAction) ?? 'Ready to confirm the selected cost.'}</p></div>}
              {selected === 'special' && <div><h3>Fighter special action</h3><p>{hero?.specialAction ?? 'Fighter ability'}</p><p>{reasonFor(specialAction) ?? 'Confirm to roll and resolve this ability.'}</p></div>}
              {selected === 'perks' && <div><h3>Your Perks</h3>{game.perkOptions.length ? <fieldset disabled={selectionLocked}><legend>Owned cards</legend>{game.perkOptions.map(option => <label className="h-check-row" key={option.id}><input type="radio" name="perk-option" checked={selectedPerk === option.id} onChange={() => setSelectedPerk(option.id)} />{game.visiblePerks[option.id]?.name ?? 'Perk'}{option.reason ? ` · ${option.reason}` : ''}</label>)}</fieldset> : <p>No Perks in hand.</p>}{selectedPerkOption && <p>{game.visiblePerks[selectedPerkOption.id]?.effect}</p>}</div>}
              {selected && selected !== 'move' && selected !== 'share' && <p className="h-preview">{currentReason ?? (currentAction ? 'Review your selection, then confirm.' : 'Choose an option to continue.')}</p>}
            </div>}
            <div className="tray-controls h-controls"><button className="clear-button" disabled={selectionLocked || !selected} onClick={() => setSelected(null)}>Clear selection</button><button className="confirm-button" disabled={!canConfirm} onClick={() => { if (currentAction) commit(currentAction); }}>Confirm action</button></div>
          </ActionTray>
          <details className="h-reveal"><summary>Reveal a Lair <span>1 action · choose Items</span></summary><div className="h-reveal-body"><div><strong>Reveal a Lair</strong><p>At a Lair location, choose Items to spend. Confirming commits the reveal.</p><fieldset disabled={selectionLocked}><legend>Items to spend</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={revealItems.includes(id)} onChange={() => setRevealItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(revealAction) ?? 'Ready to reveal this Lair.'}</p><button type="button" className="clear-button" disabled={selectionLocked || revealItems.length === 0} onClick={() => setRevealItems([])}>Clear reveal selection</button></div><button type="button" className="end-button" disabled={selectionLocked || !!reasonFor(revealAction)} title={reasonFor(revealAction) ?? undefined} onClick={() => { commit(revealAction); setRevealItems([]); }}>Confirm reveal</button></div></details>
        </div>
        <aside className="h-sidebar">
          <section className="h-info-card"><h2>Fighter inventory</h2>{ownedItems.length ? <ul>{ownedItems.map(id => <li key={id}>{itemSummary(id)}</li>)}</ul> : <p>No Items held.</p>}<h3>Perks</h3>{game.hero.perks.length ? <ul>{game.hero.perks.map(id => <li key={id}>{game.visiblePerks[id]?.name ?? 'Perk'}</li>)}</ul> : <p>No Perks held.</p>}</section>
          <section className="h-info-card"><h2>Monster progress</h2><h3>Beholder</h3><p>{game.monsters.beholder.defeated ? 'Defeated' : `At ${locationName(game.monsters.beholder.location)}`}</p><p>{game.damagedEyes.length} of {data.monsters.beholder.eyestalks.length} eyestalks damaged</p><ol className="h-eyes">{data.monsters.beholder.eyestalks.map(eye => <li key={`${eye.min}-${eye.max}`} className={game.damagedEyes.includes(eye.min) ? 'done' : ''}>{eye.name} · {eye.min}–{eye.max}</li>)}</ol><h3>Displacer Beast</h3><p>{game.monsters.displacerBeast.defeated ? 'Defeated' : `At ${locationName(game.monsters.displacerBeast.location)}`}</p><div className="h-displacement-grid">{data.monsters.displacerBeast.advance.grid.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
            const key = cellKey(rowIndex, columnIndex); const item = game.displacement[key];
            return <div key={key} className={item ? 'filled' : ''}><span>{cell.join(', ')}</span><small>{item ? itemName(item) : 'Open'}</small></div>;
          }))}</div></section>
          <section className="h-info-card"><h2>Public supplies</h2><p>Items discarded: {game.itemDiscard.length} · Perks discarded: {game.perkDiscard.length} · Monster cards discarded: {game.monsterDiscard.length}</p><p>Unrevealed Lairs: {Object.values(game.lairs).filter(lair => !lair.revealed).length}</p></section>
          <section className="h-info-card h-history" aria-labelledby="h-event-title"><h2 id="h-event-title">Event log</h2><ol role="log" aria-label="Game history">{game.entries.map(entry => <li key={entry.id}><small>TURN {entry.turn} · {entry.kind.toUpperCase()}</small><p>{entry.message}</p></li>)}</ol></section>
        </aside>
      </div>
      <footer className="app-footer"><span>Built for a quieter kind of game night.</span><span>LOCAL PLAY · NO ACCOUNT · PRIVATE GAME DATA</span></footer>
    </main>
  </div>;
}
