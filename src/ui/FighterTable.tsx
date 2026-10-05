import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import type { HeroAction } from '../engine/horrifiedRuntime';
import { ActionTray } from './ActionTray';
import { SessionLog } from './SessionLog';
import { GameBoard } from './GameBoard';
import { RollResult, SpecialActionGuide } from './RollResult';
import './tableWorkspace.css';

type InfoPanel = 'inventory' | 'monsters' | 'log' | 'result' | 'help';
type ContextPanel = 'choice' | 'action' | 'setup';
type PanelId = InfoPanel | ContextPanel;
type Side = 'left' | 'right';

type TrayId = 'move' | 'guide' | 'pick-up' | 'share' | 'advance' | 'defeat' | 'special' | 'perks';
type ActionReason = (action: HeroAction) => string | null;
interface Props {
  data: GameData;
  game: GameView;
  onAction: (action: HeroAction) => void;
  reasonFor: ActionReason;
  busy: boolean;
  error: string | null;
  onReturnToGames: () => void;
  saveControls?: ReactNode;
}

const cards: { id: TrayId; label: string; icon: string; caption: string; description: string; cost: string }[] = [
  { id: 'move', label: 'Move', icon: '↗', caption: 'Connected location', description: 'Move to a highlighted connected location. You may escort Citizens sharing your space.', cost: '1 action' },
  { id: 'guide', label: 'Guide', icon: '♧', caption: 'Citizen', description: 'Choose an eligible Citizen and destination.', cost: '1 action' },
  { id: 'pick-up', label: 'Pick Up', icon: '◇', caption: 'Items', description: 'Select the Items to collect from your location, then confirm.', cost: '1 action' },
  { id: 'share', label: 'Share', icon: '⇄', caption: 'Exchange items', description: 'Share Items with another eligible Hero.', cost: '1 action' },
  { id: 'advance', label: 'Advance', icon: '▤', caption: 'Challenge', description: 'Review the Monster, Item cost, and target before committing a roll.', cost: '1 action' },
  { id: 'defeat', label: 'Defeat', icon: '⚑', caption: 'Monster', description: 'Choose the Monster and Items to spend, then confirm.', cost: '1 action' },
  { id: 'special', label: 'Special Action', icon: '✧', caption: 'Hero ability', description: 'Review your Hero ability and confirm before rolling.', cost: '1 action' },
  { id: 'perks', label: 'Perks', icon: '▱', caption: 'Eligible cards', description: 'Play an eligible owned Perk during its permitted timing.', cost: 'Free' },
];

const MONSTER_NAMES = { beholder: 'Beholder', displacerBeast: 'Displacer Beast' } as const;
const cellKey = (row: number, column: number) => `${row}:${column}`;

function toggle(values: string[], value: string): string[] {
  return values.includes(value) ? values.filter(entry => entry !== value) : [...values, value];
}

function PendingChoicePanel({ pending, busy, onAction, reasonFor, visible, focusRequest }: {
  pending: NonNullable<GameView['pending']>;
  visible: boolean;
  focusRequest: number;
  busy: boolean;
  onAction: Props['onAction'];
  reasonFor: Props['reasonFor'];
}) {
  const [selected, setSelected] = useState<string[]>([]);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (visible) headingRef.current?.focus({ preventScroll: true }); }, [visible, focusRequest]);
  const reason = reasonFor({ kind: 'choose', choiceId: pending.id, selected });
  return <section className="h-pending" aria-labelledby="pending-title">
    <div className="h-choice-scroll">
    <h2 id="pending-title" ref={headingRef} tabIndex={-1}>{pending.title}</h2>
    {pending.description && <p className="h-choice-description">{pending.description}</p>}
    <p>Choose {pending.min === pending.max ? pending.min : `${pending.min}–${pending.max}`} option{pending.max === 1 ? '' : 's'} to continue.</p>
    <div className="h-choice-options"><fieldset disabled={busy}>
      <legend className="sr-only">{pending.title}</legend>
      {pending.options.map(option => <label key={option.id} className="h-check-row">
        <input type={pending.max === 1 && pending.min === 1 ? 'radio' : 'checkbox'} name={`choice-${pending.id}`}
          checked={selected.includes(option.id)}
          onChange={() => setSelected(current => pending.max === 1
            ? pending.min === 0 && current.includes(option.id) ? [] : [option.id]
            : toggle(current, option.id))} />
        <span>{option.label}</span>
      </label>)}
    </fieldset></div>
    {selected.length > 0 && reason && <p id="pending-choice-reason" aria-live="polite">{reason}</p>}
    </div>
    <button className="confirm-button" disabled={busy || !!reason} aria-describedby={selected.length > 0 && reason ? 'pending-choice-reason' : undefined} onClick={() => onAction({ kind: 'choose', choiceId: pending.id, selected })}>Confirm choice</button>
  </section>;
}

export function FighterTable({ data, game, onAction, reasonFor, busy, error, onReturnToGames, saveControls }: Props) {
  const heroClass = game.hero.definitionId.replace('hero-', '').replace(/^./, letter => letter.toUpperCase());
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
  const [panels, setPanels] = useState<{ open: InfoPanel[]; sides: Partial<Record<InfoPanel, Side>> }>({ open: [], sides: {} });
  const [contextSide, setContextSide] = useState<Side>('right');
  const [setupOpen, setSetupOpen] = useState(game.revision === 0);
  const [choiceFocus, setChoiceFocus] = useState(0);
  const [feedbackStart, setFeedbackStart] = useState<number | null>(null);
  const mapButtons = useRef(new Map<string, HTMLButtonElement>());
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
    setSetupOpen(false);
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
    setFeedbackStart(game.entries.length);
    onAction(action);
    setSelected(null);
    if (action.kind !== 'move' && action.kind !== 'end-phase') showPanel('result');
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

  const previousChoice = useRef<string | null>(null);
  useEffect(() => {
    if (!pending && previousChoice.current) showPanel('result');
    previousChoice.current = pending?.id ?? null;
  }, [pending?.id]);
  const context: ContextPanel | null = pending ? 'choice'
    : selected && (selected !== 'move' || companions.length > 0) ? 'action'
    : setupOpen && game.revision === 0 ? 'setup' : null;
  const panelTitles: Record<PanelId, string> = { choice: 'Required choice', action: 'Review action', setup: 'Board ready', inventory: 'Inventory', monsters: 'Monsters', log: 'Event log', result: 'Latest result', help: 'Table guide' };
  const recentStart = feedbackStart ?? Math.max(0, game.entries.length - 8);
  const recentEvents = game.entries.slice(recentStart);
  const awaitingSavedResult = busy && feedbackStart === game.entries.length;
  function showPanel(next: InfoPanel, toggleOpen = false) {
    setPanels(current => {
      if (current.open.includes(next)) return toggleOpen ? { ...current, open: current.open.filter(id => id !== next) } : current;
      const left = current.open.filter(id => current.sides[id] === 'left').length;
      const right = current.open.length - left;
      return { open: [...current.open, next], sides: { ...current.sides, [next]: current.sides[next] ?? (right > left ? 'left' : 'right') } };
    });
  }
  function openPanel(next: InfoPanel) { setSetupOpen(false); showPanel(next, true); }
  function closePanel(id: PanelId) {
    if (id === 'action') setSelected(null);
    else if (id === 'setup') setSetupOpen(false);
    else if (id !== 'choice') setPanels(current => ({ ...current, open: current.open.filter(panel => panel !== id) }));
  }
  function sideFor(id: PanelId): Side {
    return id === 'choice' || id === 'action' || id === 'setup' ? contextSide : panels.sides[id] ?? 'right';
  }
  function movePanel(id: PanelId) {
    if (id === 'choice' || id === 'action' || id === 'setup') setContextSide(side => side === 'left' ? 'right' : 'left');
    else setPanels(current => ({ ...current, sides: { ...current.sides, [id]: current.sides[id] === 'left' ? 'right' : 'left' } }));
  }
  const visiblePanels: PanelId[] = [...(context ? [context] : []), ...panels.open];
  const panelStyles: Partial<Record<PanelId, CSSProperties>> = {};
  for (const side of ['left', 'right'] as const) {
    const ids = visiblePanels.filter(id => sideFor(id) === side);
    const weight = (id: PanelId) => id === 'choice' || id === 'action' ? 2 : 1;
    const total = ids.reduce((sum, id) => sum + weight(id), 0);
    let offset = 0;
    ids.forEach((id, index) => {
      const first = Math.round(offset / total * 60) + 1;
      offset += weight(id);
      panelStyles[id] = { gridColumn: side === 'left' ? 1 : 3, gridRow: `${first} / ${index === ids.length - 1 ? 61 : Math.round(offset / total * 60) + 1}` };
    });
  }

  const panelContents: Record<PanelId, ReactNode> = {
    choice: (<div className="h-choice-panel">{pending && <>{visiblePanels.length <= 2 && <RollResult game={game} data={data} compact={!game.currentRoll} />}<PendingChoicePanel key={pending.id} pending={pending} busy={busy} onAction={onAction} reasonFor={reasonFor} visible={context === 'choice'} focusRequest={choiceFocus} /></>}</div>),
    action: (<div className="h-action-panel">            {selected && <div className="h-action-editor" aria-live="polite">
              {selected === 'move' && <div><h3>Move from {locationName(at)}</h3><p>Select a highlighted destination on the board. Movement commits when you choose it.</p>{companions.length > 0 && <fieldset disabled={selectionLocked}><legend>Escort Citizens</legend>{companions.map(([id]) => <label className="h-check-row" key={id}><input type="checkbox" checked={escorts.includes(id)} onChange={() => setEscorts(current => toggle(current, id))} />{data.citizens.find(citizen => citizen.id === id)?.name ?? 'Citizen'}</label>)}</fieldset>}</div>}
              {selected === 'guide' && <div><h3>Guide a Citizen</h3>{game.guideOptions.length ? <fieldset disabled={selectionLocked}><legend>Available destinations</legend>{game.guideOptions.map((option, index) => <label className="h-check-row" key={`${option.citizen}-${option.destination}`}><input type="radio" name="guide-option" checked={selectedGuide === index} onChange={() => setSelectedGuide(index)} />{data.citizens.find(citizen => citizen.id === option.citizen)?.name ?? 'Citizen'} → {locationName(option.destination)}</label>)}</fieldset> : <p>No eligible guidance at this location.</p>}</div>}
              {selected === 'pick-up' && <div><h3>Pick Up Items</h3>{boardItems.length ? <fieldset disabled={selectionLocked}><legend>At {locationName(at)}</legend>{boardItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={pickedItems.includes(id)} onChange={() => setPickedItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset> : <p>There are no Items here.</p>}</div>}
              {selected === 'share' && <p>{unavailable('share') ?? 'Choose another Hero to share with.'}</p>}
              {selected === 'advance' && <div><h3>Advance a Monster</h3>{game.advanceOptions.length ? <fieldset disabled={selectionLocked}><legend>Eligible costs and targets</legend>{game.advanceOptions.map((option, index) => <label className="h-check-row" key={`${option.monster}-${option.item}-${option.cell ?? index}`}><input type="radio" name="advance-option" checked={selectedAdvance === index} onChange={() => setSelectedAdvance(index)} />{MONSTER_NAMES[option.monster]} · {itemSummary(option.item)}{option.cell ? ` · cell ${option.cell}` : ''}</label>)}</fieldset> : <p>No advance attempt is available now.</p>}</div>}
              {selected === 'defeat' && <div><h3>Defeat a Monster</h3><fieldset disabled={selectionLocked}><legend>Target</legend>{(Object.keys(MONSTER_NAMES) as (keyof typeof MONSTER_NAMES)[]).map(monster => <label className="h-check-row" key={monster}><input type="radio" name="defeat-monster" checked={selectedMonster === monster} onChange={() => setSelectedMonster(monster)} />{MONSTER_NAMES[monster]}{game.monsters[monster].defeated ? ' · defeated' : ''}</label>)}</fieldset><fieldset disabled={selectionLocked}><legend>Items to spend · {inventoryStrength} Strength selected</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={spentItems.includes(id)} onChange={() => setSpentItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(defeatAction) ?? 'Ready to confirm the selected cost.'}</p></div>}
              {selected === 'special' && <div><h3>{heroClass} special action</h3>{hero && <SpecialActionGuide hero={hero} />}<p>{reasonFor(specialAction) ?? 'Confirm to roll and resolve this ability.'}</p></div>}
              {selected === 'perks' && <div><h3>Your Perks</h3>{game.perkOptions.length ? <fieldset disabled={selectionLocked}><legend>Owned cards</legend>{game.perkOptions.map(option => <label className="h-check-row" key={option.id}><input type="radio" name="perk-option" checked={selectedPerk === option.id} onChange={() => setSelectedPerk(option.id)} />{game.visiblePerks[option.id]?.name ?? 'Perk'}{option.reason ? ` · ${option.reason}` : ''}</label>)}</fieldset> : <p>No Perks in hand.</p>}{selectedPerkOption && <p>{game.visiblePerks[selectedPerkOption.id]?.effect}</p>}</div>}
              {selected && selected !== 'move' && selected !== 'share' && <p className="h-preview">{currentReason ?? (currentAction ? 'Review your selection, then confirm.' : 'Choose an option to continue.')}</p>}
            </div>}
            <p className="h-cost-review">{selected ? `${cards.find(card => card.id === selected)?.label} · ${cards.find(card => card.id === selected)?.cost}` : ''}</p><div className="tray-controls h-controls"><button className="clear-button" disabled={selectionLocked || !selected} onClick={() => setSelected(null)}>Clear selection</button><button className="confirm-button" disabled={!canConfirm} onClick={() => { if (currentAction) commit(currentAction); }}>{selected === 'special' ? 'Roll special action' : 'Confirm action'}</button></div>
</div>),
    inventory: (<div>          <section className="h-info-card"><h2>{heroClass} inventory</h2>{ownedItems.length ? <ul>{ownedItems.map(id => <li key={id}>{itemSummary(id)}</li>)}</ul> : <p>No Items held.</p>}<h3>Perks</h3>{game.hero.perks.length ? <ul>{game.hero.perks.map(id => <li key={id}><details className="h-inventory-perk"><summary>{game.visiblePerks[id]?.name ?? 'Perk'}</summary><p>{game.visiblePerks[id]?.effect ?? 'No description available.'}</p></details></li>)}</ul> : <p>No Perks held.</p>}</section>
          <details className="h-reveal"><summary>Reveal a Lair <span>1 action · choose Items</span></summary><div className="h-reveal-body"><div><strong>Reveal a Lair</strong><p>At a Lair location, choose Items to spend. Confirming commits the reveal.</p><fieldset disabled={selectionLocked}><legend>Items to spend</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={revealItems.includes(id)} onChange={() => setRevealItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(revealAction) ?? 'Ready to reveal this Lair.'}</p><button type="button" className="clear-button" disabled={selectionLocked || revealItems.length === 0} onClick={() => setRevealItems([])}>Clear reveal selection</button></div><button type="button" className="end-button" disabled={selectionLocked || !!reasonFor(revealAction)} title={reasonFor(revealAction) ?? undefined} onClick={() => { commit(revealAction); setRevealItems([]); }}>Confirm reveal</button></div></details></div>),
    monsters: (<div>          <section className="h-info-card"><h2>Monster progress</h2><h3>Beholder</h3><p>{game.monsters.beholder.defeated ? 'Defeated' : `At ${locationName(game.monsters.beholder.location)}`}</p><p>{game.damagedEyes.length} of {data.monsters.beholder.eyestalks.length} eyestalks damaged</p><ol className="h-eyes">{data.monsters.beholder.eyestalks.map(eye => <li key={`${eye.min}-${eye.max}`} className={game.damagedEyes.includes(eye.min) ? 'done' : ''}>{eye.name} · {eye.min}–{eye.max}</li>)}</ol><h3>Displacer Beast</h3><p>{game.monsters.displacerBeast.defeated ? 'Defeated' : `At ${locationName(game.monsters.displacerBeast.location)}`}</p><div className="h-displacement-grid">{data.monsters.displacerBeast.advance.grid.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
            const key = cellKey(rowIndex, columnIndex); const item = game.displacement[key];
            return <div key={key} className={item ? 'filled' : ''}><span>{cell.join(', ')}</span><small>{item ? itemName(item) : 'Open'}</small></div>;
          }))}</div></section>
          <section className="h-info-card"><h2>Public supplies</h2><p>Items discarded: {game.itemDiscard.length} · Perks discarded: {game.perkDiscard.length} · Monster cards discarded: {game.monsterDiscard.length}</p><p>Unrevealed Lairs: {Object.values(game.lairs).filter(lair => !lair.revealed).length}</p></section>
</div>),
    log: (<div><SessionLog entries={game.entries} label="Game history" className="h-history" visible={panels.open.includes('log')} /></div>),
    result: (<section className="h-result-details" aria-label="Action result">
                {awaitingSavedResult ? <p role="status">Saving your action…</p> : <><RollResult game={game} data={data} /><h3>{feedbackStart === null ? 'Recent events' : 'What happened'}</h3><ol>{recentEvents.map(entry => <li key={entry.id}>{entry.message}</li>)}</ol></>}
              </section>),
    help: (<section className="h-table-guide"><h3>Playing the {heroClass} table</h3><p>The whole board fits the table. Roads connect locations; amber letters pair secret passages and violet portals mark the teleport network. Special route traces appear during a relevant Move. Select Move to highlight legal destinations.</p><p>Select another action to review its targets, costs, and roll ranges here. Confirming spends the action. Dice results stay visible beside the panel buttons; Latest result shows the details.</p><p>Inventory, Monsters, Event log, and Latest result can stay open together. Toggle each independently, close it, or move it to the other side with ⇄. Opening information keeps your action selection. Required choices stay open until resolved; Required choice moves keyboard focus back to the decision. Expand a Perk in Inventory to read its effect.</p><p>Use Tab, Enter, and Space to operate controls. End Hero Phase forfeits unused actions; eligible free Perks remain available at zero actions until then.</p></section>),
    setup: (<section className="h-setup-summary"><h3>Everything is set up</h3><p>Your Hero, both Monsters, the starting Items, and unrevealed Lairs are already placed. Inspect the board, then choose your first action.</p><ul>
        <li><strong>{heroClass}</strong> · {locationName(at)}</li>
        {(Object.keys(MONSTER_NAMES) as (keyof typeof MONSTER_NAMES)[]).map(id => <li key={id}><strong>{MONSTER_NAMES[id]}</strong> · {locationName(game.monsters[id].location)}</li>)}
        <li><strong>{Object.values(game.boardItems).flat().length} Items</strong> on the board · {game.hero.perks.length} Perk in Inventory</li>
        <li><strong>{Object.keys(game.lairs).length} Lairs</strong> ready to reveal</li>
      </ul><p>Other Items, cards, and waiting Citizens remain in their supplies until needed.</p><button className="confirm-button" onClick={() => setSetupOpen(false)}>Ready to play</button></section>)
  };

  return <div className={`app-shell h-table h-workspace-table ${actionsCollapsed ? 'actions-collapsed' : ''}`}>
    <header className="app-header">
      <a className="brand" href="#main"><span className="brand-mark" aria-hidden="true">B</span>BoardBot</a>
      <div className="h-workspace-heading">
        <div><p className="eyebrow">TURN {game.turn} · {game.phase.toUpperCase()} PHASE</p><h2 id="h-board-title" className="sr-only">The city and dungeon</h2></div>
        <div className="hero"><strong>Local {heroClass} game</strong><span>At {locationName(at)}</span></div>
        <div className="h-status"><span>Terror <strong>{game.terror}</strong></span><span>Frenzy <strong>{MONSTER_NAMES[game.frenzy]}</strong></span><span>Monster deck <strong>{game.monsterDeckCount}</strong></span></div>
      </div>
      <div className="header-tools"><button className="quiet-button" onClick={() => openPanel('help')} aria-expanded={panels.open.includes('help')}>How to play</button><button className="quiet-button" onClick={onReturnToGames} disabled={busy}>Saved games</button></div>
    </header>
    <main id="main">
      <h1 className="sr-only">Horrified {heroClass} table</h1>
      <div className="notice"><strong>Local game in progress.</strong>{saveControls}</div>
      {error && <p className="h-error" role="alert">{error}</p>}
      {terminal && <div className="h-end" role="status"><strong>{game.phase === 'won' ? 'Victory' : 'Defeat'}</strong><span>{game.endReason}</span></div>}
      <section className={`h-workspace board-panel ${visiblePanels.some(id => sideFor(id) === 'left') ? 'has-left-panel' : ''} ${visiblePanels.some(id => sideFor(id) === 'right') ? 'has-right-panel' : ''}`} aria-labelledby="h-board-title">
        <nav className="h-panel-nav" aria-label="Table panels">
          <button onClick={() => openPanel('inventory')} aria-expanded={panels.open.includes('inventory')}>Inventory <span>{ownedItems.length} Items · {game.hero.perks.length} Perks</span></button>
          <button onClick={() => openPanel('monsters')} aria-expanded={panels.open.includes('monsters')}>Monsters</button>
          <button onClick={() => openPanel('log')} aria-expanded={panels.open.includes('log')}>Event log</button>
          <button onClick={() => openPanel('result')} aria-expanded={panels.open.includes('result')}>Latest result</button>
          {pending && <button className="h-choice-return" onClick={() => setChoiceFocus(value => value + 1)} aria-expanded={context === 'choice'}>Required choice</button>}
          {(game.currentRoll || game.rolls.length > 0) && <div className="h-roll-peek"><RollResult data={data} game={game} compact /></div>}
        </nav>
        <div className="h-play-area">
          <div className="h-board-fit"><GameBoard data={data} game={game} moving={selected === 'move'} locked={selectionLocked} onMove={destination => commit(moveAction(destination))} buttonRefs={mapButtons} /></div>
          {(Object.keys(panelContents) as PanelId[]).map(id => <aside key={id} data-panel={id} className={`h-context-panel h-panel-${id}`} hidden={!visiblePanels.includes(id)} style={panelStyles[id]} aria-label={`${panelTitles[id]} panel`}>
            <div className="h-context-heading"><h2>{panelTitles[id]}</h2><div>
              <button className="quiet-button" onClick={() => movePanel(id)} aria-label={`Move ${panelTitles[id]} panel to ${sideFor(id) === 'right' ? 'left' : 'right'}`} title="Move this panel to the other side">⇄</button>
              {id !== 'choice' && <button className="quiet-button" onClick={() => closePanel(id)} aria-label={`Close ${panelTitles[id]}`}>×</button>}
            </div></div>
            <div className="h-context-body">{panelContents[id]}</div>
          </aside>)}
        </div>
        <ActionTray className="h-tray" title={busy ? 'Resolving…' : pending ? 'Choice required' : terminal ? 'Game complete' : game.phase === 'monster' ? 'Monster Phase' : 'Your Hero Phase'}
          titleId="h-turn-title" busy={busy} collapsed={actionsCollapsed}
          onToggle={() => { setActionsCollapsed(value => !value); setSelected(null); setInspected(null); setHovered(null); setFocused(null); }}
          budget={<div className="action-budget"><span>Actions</span><strong>{game.hero.actions} <span>/ {game.hero.allowance}</span></strong></div>}
          phaseControl={<>{selected === 'move' && <button className="clear-button" onClick={() => setSelected(null)}>Cancel move</button>}<button className="end-button" disabled={selectionLocked || !!reasonFor(endAction)} title={reasonFor(endAction) ?? 'Forfeit any unused actions and begin the Monster Phase.'} aria-description="Forfeits any unused actions and begins the Monster Phase." onClick={() => commit(endAction)}>End Hero Phase</button></>}>
          <div className="action-options">{cards.map(card => <div className="action-option" key={card.id}><button type="button" className={`action-card ${card.id === 'perks' ? 'free-action' : ''}`}
            aria-disabled={selectionLocked || !!unavailable(card.id)} aria-pressed={selected === card.id}
            {...inspectionEvents(card.id)} onClick={() => chooseCard(card.id)}>
            <span className="card-top"><span className="action-icon" aria-hidden="true">{card.icon}</span><span className="cost">{card.cost}</span></span><strong>{card.label}</strong><small>{card.caption}</small>
          </button></div>)}</div>
          <div className="action-help" role="note" aria-label="Action details"><strong>{inspectedCard?.label ?? 'Choose an action'}</strong><p>{inspectedCard?.description ?? 'Select an action below the board. Details open when you need them.'}</p><p className="unavailable-reason">{inspectedCard ? unavailable(inspectedCard.id) ?? (selected === 'move' ? 'Choose a highlighted destination on the board.' : 'Available now.') : 'End Hero Phase forfeits unused actions. Eligible Perks remain available until then.'}</p></div>
        </ActionTray>
      </section>
    </main>
  </div>;
}
