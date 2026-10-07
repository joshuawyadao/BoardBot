import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, Dispatch, ReactNode, RefObject, SetStateAction } from 'react';
import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import type { HeroAction } from '../engine/horrifiedRuntime';
import { ActionTray } from './ActionTray';
import { SessionLog } from './SessionLog';
import { GameBoard } from './GameBoard';
import { RollResult, SpecialActionGuide } from './RollResult';
import { AttackPanel, DecksPanel, LocationInspector, LocationsPanel } from './TabletopPanels';
import { ItemArtwork, PieceArtwork } from './TabletopPieces';
import { defaultTablePreferences, readTablePreferences, writeTablePreferences } from './tablePreferences';
import type { PersistentPanel, TableSide } from './tablePreferences';
import './tableWorkspace.css';

type InfoPanel = 'inventory' | 'monsters' | 'log' | 'result' | 'help' | 'locations' | 'decks' | 'inspector';
type ContextPanel = 'choice' | 'action' | 'setup';
type PanelId = InfoPanel | ContextPanel;
type Side = TableSide;

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

function PendingChoicePanel({ pending, busy, onAction, reasonFor, visible, focusRequest, selected, setSelected, confirmRef }: {
  pending: NonNullable<GameView['pending']>;
  visible: boolean;
  focusRequest: number;
  busy: boolean;
  onAction: Props['onAction'];
  reasonFor: Props['reasonFor'];
  selected: string[];
  setSelected: Dispatch<SetStateAction<string[]>>;
  confirmRef: RefObject<HTMLButtonElement | null>;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => { if (visible) headingRef.current?.focus(); }, [visible, focusRequest, pending.id]);
  const reason = reasonFor({ kind: 'choose', choiceId: pending.id, selected });
  return <section className="h-pending" aria-labelledby="pending-title">
    <div className="h-choice-scroll" tabIndex={0} role="group" aria-label="Required choice options">
    <h2 id="pending-title" ref={headingRef} tabIndex={-1}>{pending.title}</h2>
    {pending.description && <p className="h-choice-description">{pending.description}</p>}
    {pending.kind === 'slowing-response' && pending.slowing && <div className="h-slowing-detail"><p>{pending.slowing.ownerName}'s existing next-phase penalties: {pending.slowing.existingPenalties}.</p>{pending.slowing.skipped ? <p>The upcoming Hero Phase is already skipped. Both choices leave that skip in place; its penalties clear when the skipped turn ends.</p> : <p>Discard an Item: next Hero Phase {pending.slowing.discardAllowance} actions. Accept a penalty: next Hero Phase {pending.slowing.acceptAllowance} actions ({pending.slowing.acceptPenalties} penalties total).</p>}</div>}
    <p>Choose {pending.min === pending.max ? pending.min : `${pending.min}–${pending.max}`} option{pending.max === 1 ? '' : 's'} to continue.</p>
    {(pending.kind === 'wizard-hero-destination' || pending.kind === 'wizard-monster-target') && <label className="h-choice-select-label">{pending.kind === 'wizard-hero-destination' ? 'Wizard destination' : 'Monster to move'}<select aria-label={pending.kind === 'wizard-hero-destination' ? 'Wizard destination' : 'Monster to move'} value={selected[0] ?? ''} disabled={busy} onChange={event => setSelected(event.target.value ? [event.target.value] : [])}><option value="">Choose an option</option>{pending.options.map(option => <option value={option.id} key={option.id}>{option.label}</option>)}</select></label>}
    {pending.kind !== 'wizard-hero-destination' && <div className="h-choice-options"><fieldset disabled={busy}>
      <legend className="sr-only">{pending.title}</legend>
      {pending.options.map(option => <label key={option.id} className="h-check-row">
        <input type={pending.max === 1 && pending.min === 1 ? 'radio' : 'checkbox'} name={`choice-${pending.id}`}
          checked={selected.includes(option.id)}
          onChange={() => setSelected(current => pending.max === 1
            ? pending.min === 0 && current.includes(option.id) ? [] : [option.id]
            : toggle(current, option.id))} />
        <span>{option.label}</span>
      </label>)}
    </fieldset></div>}
    {selected.length > 0 && reason && <p id="pending-choice-reason" aria-live="polite">{reason}</p>}
    </div>
    <button ref={confirmRef} className="confirm-button" disabled={busy || !!reason} aria-label="Confirm choice" aria-describedby={selected.length > 0 && reason ? 'pending-choice-reason' : undefined} onClick={() => onAction({ kind: 'choose', choiceId: pending.id, selected })}>Confirm choice</button>
  </section>;
}

export function FighterTable({ data, game, onAction, reasonFor, busy, error, onReturnToGames, saveControls }: Props) {
  const heroClass = game.hero.definitionId.replace('hero-', '').replace(/^./, letter => letter.toUpperCase());
  const [initialLayout] = useState(readTablePreferences);
  const [actionsCollapsed, setActionsCollapsed] = useState(initialLayout.actionsCollapsed);
  const [selected, setSelected] = useState<TrayId | null>(null);
  const [inspected, setInspected] = useState<TrayId | null>(null);
  const [hovered, setHovered] = useState<TrayId | null>(null);
  const [focused, setFocused] = useState<TrayId | null>(null);
  const [escorts, setEscorts] = useState<string[]>([]);
  const [moveDestination, setMoveDestination] = useState('');
  const [pickedItems, setPickedItems] = useState<string[]>([]);
  const [spentItems, setSpentItems] = useState<string[]>([]);
  const [revealItems, setRevealItems] = useState<string[]>([]);
  const [selectedGuide, setSelectedGuide] = useState<number | null>(null);
  const [selectedAdvance, setSelectedAdvance] = useState<number | null>(null);
  const [selectedMonster, setSelectedMonster] = useState<'beholder' | 'displacerBeast'>('beholder');
  const [selectedPerk, setSelectedPerk] = useState<string | null>(null);
  const [pendingSelected, setPendingSelected] = useState<string[]>([]);
  const [inspectedLocation, setInspectedLocation] = useState<string | null>(null);
  const [panels, setPanels] = useState<{ open: InfoPanel[]; sides: Partial<Record<InfoPanel, Side>> }>({ open: initialLayout.open, sides: initialLayout.sides });
  const panelOpeners = useRef(new Map<InfoPanel, HTMLElement>());
  const panelButtons = useRef(new Map<InfoPanel, HTMLButtonElement>());
  const inspectorOpener = useRef<HTMLElement | null>(null);
  const choiceConfirmRef = useRef<HTMLButtonElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const actionEditorRef = useRef<HTMLDivElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const endPhaseRef = useRef<HTMLButtonElement>(null);
  const terminalRef = useRef<HTMLDivElement>(null);
  const actionButtons = useRef(new Map<TrayId, HTMLButtonElement>());
  const actionFocus = useRef<{ revision: number; kind: HeroAction['kind']; destination?: string } | null>(null);
  const focusConfirmAfterMap = useRef(false);
  const focusResultAfterChoice = useRef(false);
  const [contextSide, setContextSide] = useState<Side>(initialLayout.contextSide);
  const [layoutStatus, setLayoutStatus] = useState('');
  const [setupOpen, setSetupOpen] = useState(game.revision === 0);
  const [choiceFocus, setChoiceFocus] = useState(0);
  const [feedbackStart, setFeedbackStart] = useState<number | null>(null);
  const mapButtons = useRef(new Map<string, HTMLButtonElement>());
  const locationName = (id: string | null | undefined) => data.board.locations.find(location => location.id === id)?.name ?? 'off board';
  const itemName = (id: string) => game.visibleItems[id]?.name ?? 'Unknown Item';
  const itemSummary = (id: string) => {
    const item = game.visibleItems[id];
    return item ? `${item.name} · ${item.color} · Strength ${item.strength}` : 'Unknown Item';
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

  useEffect(() => {
    writeTablePreferences({ version: 1, open: panels.open.filter((id): id is PersistentPanel => id !== 'inspector'),
      sides: panels.sides, contextSide, actionsCollapsed });
  }, [panels, contextSide, actionsCollapsed]);

  function chooseCard(id: TrayId) {
    setInspected(id);
    if (selectionLocked || unavailable(id)) return;
    setSelected(id);
    setSetupOpen(false);
    setEscorts([]);
    setMoveDestination('');
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
    actionFocus.current = { revision: game.revision, kind: action.kind, ...(action.kind === 'move' ? { destination: action.destination } : {}) };
    setFeedbackStart(game.entries.length);
    onAction(action);
    setSelected(null);
    if (action.kind !== 'move' && action.kind !== 'end-phase') showPanel('result');
  }

  function cancelAction() {
    if (selected) actionButtons.current.get(selected)?.focus();
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

  const previousChoice = useRef<string | null>(null);
  useEffect(() => {
    setPendingSelected([]);
    if (!pending && previousChoice.current) { focusResultAfterChoice.current = true; showPanel('result'); }
    previousChoice.current = pending?.id ?? null;
  }, [pending?.id]);
  useEffect(() => {
    if (focusConfirmAfterMap.current && pendingSelected.length && !busy) {
      focusConfirmAfterMap.current = false;
      choiceConfirmRef.current?.focus();
    }
  }, [pendingSelected, busy]);
  useEffect(() => {
    if (focusResultAfterChoice.current && !pending && panels.open.includes('result')) {
      focusResultAfterChoice.current = false;
      resultHeadingRef.current?.focus();
    }
  }, [panels.open, pending]);
  useEffect(() => {
    const target = actionFocus.current;
    if (!target || busy) return;
    if (error) { actionFocus.current = null; errorRef.current?.focus(); return; }
    if (game.revision === target.revision) return;
    actionFocus.current = null;
    if (pending) return; // The required-choice panel owns focus until its response resolves.
    if (terminal) terminalRef.current?.focus();
    else if (target.destination) mapButtons.current.get(target.destination)?.focus();
    else if (target.kind === 'end-phase') endPhaseRef.current?.focus();
    else if (panels.open.includes('result')) resultHeadingRef.current?.focus();
  }, [busy, error, game.revision, pending, panels.open, terminal]);
  const context: ContextPanel | null = pending ? 'choice'
    : selected ? 'action'
    : setupOpen && game.revision === 0 ? 'setup' : null;
  const panelTitles: Record<PanelId, string> = { choice: 'Required choice', action: 'Review action', setup: 'Board ready', inventory: 'Inventory', monsters: 'Monsters', log: 'Event log', result: 'Latest result', help: 'Table guide', locations: 'Locations', decks: 'Decks & progress', inspector: 'Location inspector' };
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
  function openPanel(next: InfoPanel, opener?: HTMLElement) { if (opener) panelOpeners.current.set(next, opener); setSetupOpen(false); setLayoutStatus(''); showPanel(next, true); }
  function inspectLocation(id: string, opener?: HTMLElement) {
    if (opener) inspectorOpener.current = opener;
    setInspectedLocation(id);
    showPanel('inspector');
  }
  function closePanel(id: PanelId) {
    if (id === 'action') cancelAction();
    else if (id === 'setup') setSetupOpen(false);
    else if (id !== 'choice') {
      setPanels(current => ({ ...current, open: current.open.filter(panel => panel !== id) }));
      const opener = id === 'inspector' ? inspectorOpener.current : panelOpeners.current.get(id);
      const fallback = id === 'inspector' ? mapButtons.current.get(inspectedLocation ?? '') ?? panelButtons.current.get('locations') : panelButtons.current.get(id);
      (opener?.isConnected && opener.getClientRects().length ? opener : fallback)?.focus();
    }
  }
  function resetLayout() {
    const defaults = defaultTablePreferences();
    setPanels({ open: defaults.open, sides: defaults.sides });
    setContextSide(defaults.contextSide);
    setActionsCollapsed(defaults.actionsCollapsed);
    setInspectedLocation(null);
    setLayoutStatus('Table layout reset.');
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
  let panelRows = 0;
  for (const side of ['left', 'right'] as const) {
    const ids = visiblePanels.filter(id => sideFor(id) === side);
    panelRows = Math.max(panelRows, ids.length);
    ids.forEach((id, index) => {
      panelStyles[id] = { gridColumn: side === 'left' ? 1 : 3, gridRow: index + 1 };
    });
  }
  const panelLayerStyle: CSSProperties = { gridTemplateRows: Array.from({ length: panelRows }, (_, index) =>
    `minmax(min(${index === 0 && context === 'choice' ? 440 : index === 0 && context === 'action' ? 360 : 240}px, 100%), 1fr)`).join(' ') };

  const panelContents: Record<PanelId, ReactNode> = {
    choice: (<div className="h-choice-panel">{pending && <>{game.currentAttack && <AttackPanel data={data} game={game} locationName={locationName} />}{visiblePanels.length <= 2 && <RollResult game={game} data={data} compact={!game.currentRoll} />}<PendingChoicePanel pending={pending} busy={busy} onAction={onAction} reasonFor={reasonFor} visible={context === 'choice'} focusRequest={choiceFocus} selected={pendingSelected} setSelected={setPendingSelected} confirmRef={choiceConfirmRef} /></>}</div>),
    action: (<div className="h-action-panel">            {selected && <div className="h-action-editor" ref={actionEditorRef} tabIndex={0} role="group" aria-label="Review action details" aria-live="polite">
              {selected === 'move' && <div><h3>Move from {locationName(at)}</h3><p>Select a highlighted board destination to move immediately, or choose a named destination below and confirm.</p><label className="h-choice-select-label">Move destination<select aria-label="Move destination" value={moveDestination} disabled={selectionLocked} onChange={event => setMoveDestination(event.target.value)}><option value="">Choose a destination</option>{data.board.locations.filter(location => moveTargets.has(location.id)).map(location => <option key={location.id} value={location.id}>{location.number ? `${location.number} · ` : ''}{location.name}</option>)}</select></label><button className="confirm-button" disabled={!moveDestination || selectionLocked || !!reasonFor(moveAction(moveDestination))} onClick={() => commit(moveAction(moveDestination))}>Move to selected location</button>{companions.length > 0 && <fieldset disabled={selectionLocked}><legend>Escort Citizens</legend>{companions.map(([id]) => <label className="h-check-row" key={id}><input type="checkbox" checked={escorts.includes(id)} onChange={() => setEscorts(current => toggle(current, id))} />{data.citizens.find(citizen => citizen.id === id)?.name ?? 'Citizen'}</label>)}</fieldset>}</div>}
              {selected === 'guide' && <div><h3>Guide a Citizen</h3>{game.guideOptions.length ? <fieldset disabled={selectionLocked}><legend>Available destinations</legend>{game.guideOptions.map((option, index) => <label className="h-check-row" key={`${option.citizen}-${option.destination}`}><input type="radio" name="guide-option" checked={selectedGuide === index} onChange={() => setSelectedGuide(index)} />{data.citizens.find(citizen => citizen.id === option.citizen)?.name ?? 'Citizen'} → {locationName(option.destination)}</label>)}</fieldset> : <p>No eligible guidance at this location.</p>}</div>}
              {selected === 'pick-up' && <div><h3>Pick Up Items</h3>{boardItems.length ? <fieldset disabled={selectionLocked}><legend>At {locationName(at)}</legend>{boardItems.map(id => <label className="h-check-row h-art-choice" key={id}><input type="checkbox" checked={pickedItems.includes(id)} onChange={() => setPickedItems(current => toggle(current, id))} /><ItemArtwork name={game.visibleItems[id]?.name ?? 'Item'} color={game.visibleItems[id]?.color ?? 'gray'} /><span>{itemSummary(id)}</span></label>)}</fieldset> : <p>There are no Items here.</p>}</div>}
              {selected === 'share' && <p>{unavailable('share') ?? 'Choose another Hero to share with.'}</p>}
              {selected === 'advance' && <div><h3>Advance a Monster</h3>{game.advanceOptions.length ? <fieldset disabled={selectionLocked}><legend>Eligible costs and targets</legend>{game.advanceOptions.map((option, index) => <label className="h-check-row" key={`${option.monster}-${option.item}-${option.cell ?? index}`}><input type="radio" name="advance-option" checked={selectedAdvance === index} onChange={() => setSelectedAdvance(index)} />{MONSTER_NAMES[option.monster]} · {itemSummary(option.item)}{option.cell ? ` · cell ${option.cell}` : ''}</label>)}</fieldset> : <p>No advance attempt is available now.</p>}</div>}
              {selected === 'defeat' && <div><h3>Defeat a Monster</h3><fieldset disabled={selectionLocked}><legend>Target</legend>{(Object.keys(MONSTER_NAMES) as (keyof typeof MONSTER_NAMES)[]).map(monster => <label className="h-check-row" key={monster}><input type="radio" name="defeat-monster" checked={selectedMonster === monster} onChange={() => setSelectedMonster(monster)} />{MONSTER_NAMES[monster]}{game.monsters[monster].defeated ? ' · defeated' : ''}</label>)}</fieldset><fieldset disabled={selectionLocked}><legend>Items to spend · {inventoryStrength} Strength selected</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={spentItems.includes(id)} onChange={() => setSpentItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(defeatAction) ?? 'Ready to confirm the selected cost.'}</p></div>}
              {selected === 'special' && <div><h3>{heroClass} special action</h3><div className="h-special-card"><PieceArtwork kind="hero" variant={game.hero.definitionId} />{hero && <SpecialActionGuide hero={hero} />}</div><p>{reasonFor(specialAction) ?? 'Confirm to roll and resolve this ability.'}</p></div>}
              {selected === 'perks' && <div><h3>Your Perks</h3>{game.perkOptions.length ? <fieldset disabled={selectionLocked}><legend>Owned cards</legend>{game.perkOptions.map(option => <label className="h-check-row h-art-choice" key={option.id}><input type="radio" name="perk-option" checked={selectedPerk === option.id} onChange={() => setSelectedPerk(option.id)} /><PieceArtwork kind="perk" /><span>{game.visiblePerks[option.id]?.name ?? 'Perk'}{option.reason ? ` · ${option.reason}` : ''}</span></label>)}</fieldset> : <p>No Perks in hand.</p>}{selectedPerkOption && <p>{game.visiblePerks[selectedPerkOption.id]?.effect}</p>}</div>}
              {selected && selected !== 'move' && selected !== 'share' && <p className="h-preview">{currentReason ?? (currentAction ? 'Review your selection, then confirm.' : 'Choose an option to continue.')}</p>}
            </div>}
            <p className="h-cost-review">{selected ? `${cards.find(card => card.id === selected)?.label} · ${cards.find(card => card.id === selected)?.cost}` : ''}</p><div className="tray-controls h-controls"><button className="clear-button" disabled={selectionLocked || !selected} onClick={cancelAction}>Clear selection</button><button className="confirm-button" disabled={!canConfirm} onClick={() => { if (currentAction) commit(currentAction); }}>{selected === 'special' ? 'Roll special action' : 'Confirm action'}</button></div>
</div>),
    inventory: (<div>          <section className="h-info-card"><h2>{heroClass} inventory</h2>{ownedItems.length ? <ul className="h-art-list">{ownedItems.map(id => <li key={id}><ItemArtwork name={game.visibleItems[id]?.name ?? 'Item'} color={game.visibleItems[id]?.color ?? 'gray'} /><span>{itemSummary(id)}</span></li>)}</ul> : <p>No Items held.</p>}<h3>Perks</h3>{game.hero.perks.length ? <ul>{game.hero.perks.map(id => <li key={id}><details className="h-inventory-perk"><summary><PieceArtwork kind="perk" />{game.visiblePerks[id]?.name ?? 'Perk'}</summary><p>{game.visiblePerks[id]?.effect ?? 'No description available.'}</p></details></li>)}</ul> : <p>No Perks held.</p>}</section>
          <details className="h-reveal"><summary>Reveal a Lair <span>1 action · choose Items</span></summary><div className="h-reveal-body"><div><strong>Reveal a Lair</strong><p>At a Lair location, choose Items to spend. Confirming commits the reveal.</p><fieldset disabled={selectionLocked}><legend>Items to spend</legend>{ownedItems.map(id => <label className="h-check-row" key={id}><input type="checkbox" checked={revealItems.includes(id)} onChange={() => setRevealItems(current => toggle(current, id))} />{itemSummary(id)}</label>)}</fieldset><p>{reasonFor(revealAction) ?? 'Ready to reveal this Lair.'}</p><button type="button" className="clear-button" disabled={selectionLocked || revealItems.length === 0} onClick={() => setRevealItems([])}>Clear reveal selection</button></div><button type="button" className="end-button" disabled={selectionLocked || !!reasonFor(revealAction)} title={reasonFor(revealAction) ?? undefined} onClick={() => { commit(revealAction); setRevealItems([]); }}>Confirm reveal</button></div></details></div>),
    monsters: (<div>          <section className="h-info-card"><h2>Monster progress</h2><h3>Beholder</h3><p>{game.monsters.beholder.defeated ? 'Defeated' : `At ${locationName(game.monsters.beholder.location)}`}</p><p>{game.damagedEyes.length} of {data.monsters.beholder.eyestalks.length} eyestalks damaged</p><ol className="h-eyes">{data.monsters.beholder.eyestalks.map(eye => <li key={`${eye.min}-${eye.max}`} className={game.damagedEyes.includes(eye.min) ? 'done' : ''}>{eye.name} · {eye.min}–{eye.max} {game.damagedEyes.includes(eye.min) ? '✕ Damaged' : 'Intact'}</li>)}</ol><h3>Eye rays</h3><ol className="h-rays">{[...data.monsters.beholder.rays.front, ...data.monsters.beholder.rays.back].map(ray => <li key={`${ray.min}-${ray.max}`}><strong>{ray.min}–{ray.max} · {ray.name}</strong><p>{ray.effect}</p></li>)}</ol><h3>Displacer Beast</h3><p>{game.monsters.displacerBeast.defeated ? 'Defeated' : `At ${locationName(game.monsters.displacerBeast.location)}`}</p><div className="h-displacement-grid">{data.monsters.displacerBeast.advance.grid.flatMap((row, rowIndex) => row.map((cell, columnIndex) => {
            const key = cellKey(rowIndex, columnIndex); const item = game.displacement[key];
            return <div key={key} className={item ? 'filled' : ''}><span>{cell.join(', ')}</span><small>{item ? itemName(item) : 'Open'}</small></div>;
          }))}</div></section>
          <section className="h-info-card"><h2>Public supplies</h2><p>Items discarded: {game.itemDiscard.length} · Perks discarded: {game.perkDiscard.length} · Monster cards discarded: {game.monsterDiscard.length}</p><p>Unrevealed Lairs: {Object.values(game.lairs).filter(lair => !lair.revealed).length}</p></section>
</div>),
    log: (<div><SessionLog entries={game.entries} label="Game history" className="h-history" visible={panels.open.includes('log')} /></div>),
    result: (<section className="h-result-details" aria-label="Action result">
                {awaitingSavedResult ? <p role="status">Saving your action…</p> : <><RollResult game={game} data={data} /><h3 ref={resultHeadingRef} tabIndex={-1}>{feedbackStart === null ? 'Recent events' : 'What happened'}</h3><ol>{recentEvents.map(entry => <li key={entry.id}>{entry.message}</li>)}</ol></>}
              </section>),
    help: (<section className="h-table-guide"><h3>Playing the {heroClass} table</h3><p>The whole board fits the table. Roads connect locations; amber letters pair secret passages and violet portals mark the teleport network. Special route traces appear during a relevant Move. Select Move to highlight legal destinations.</p><p>Select another action to review its targets, costs, and roll ranges here. Confirming spends the action. Dice results stay visible beside the panel buttons; Latest result shows the details.</p><p>Inventory, Monsters, Event log, Locations, Decks &amp; progress, and Latest result can stay open together. Toggle each independently, close it, or move it to the other side with ⇄. Opening information keeps your action selection. Required choices stay open until resolved; Required choice moves keyboard focus back to the decision. Expand a Perk in Inventory to read its effect.</p><p>Use Tab, Enter, and Space to operate controls. End Hero Phase forfeits unused actions; eligible free Perks remain available at zero actions until then.</p></section>),
    locations: <LocationsPanel data={data} inspectedLocation={inspectedLocation} onInspect={(id, opener) => inspectLocation(id, opener)} />,
    decks: <DecksPanel game={game} locationName={locationName} />,
    inspector: inspectedLocation ? <LocationInspector data={data} game={game} locationId={inspectedLocation} locationName={locationName} /> : null,
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
      <div className="header-tools"><button className="quiet-button" ref={element => { if (element) panelButtons.current.set('help', element); else panelButtons.current.delete('help'); }} onClick={event => openPanel('help', event.currentTarget)} aria-expanded={panels.open.includes('help')}>How to play</button><button className="quiet-button" onClick={onReturnToGames} disabled={busy}>Saved games</button></div>
    </header>
    <main id="main">
      <h1 className="sr-only">Horrified {heroClass} table</h1>
      <div className="notice"><strong>Local game in progress.</strong>{saveControls}</div>
      {error && <p className="h-error" role="alert" ref={errorRef} tabIndex={-1}>{error}</p>}
      {terminal && <div className="h-end" role="status" ref={terminalRef} tabIndex={-1}><strong>{game.phase === 'won' ? 'Victory' : 'Defeat'}</strong><span>{game.endReason}</span></div>}
      <section className={`h-workspace board-panel ${visiblePanels.some(id => sideFor(id) === 'left') ? 'has-left-panel' : ''} ${visiblePanels.some(id => sideFor(id) === 'right') ? 'has-right-panel' : ''}`} aria-labelledby="h-board-title">
        <nav className="h-panel-nav" aria-label="Table panels">
          <button ref={element => { if (element) panelButtons.current.set('inventory', element); else panelButtons.current.delete('inventory'); }} onClick={event => openPanel('inventory', event.currentTarget)} aria-expanded={panels.open.includes('inventory')}>Inventory <span>{ownedItems.length} Items · {game.hero.perks.length} Perks</span></button>
          <button ref={element => { if (element) panelButtons.current.set('monsters', element); else panelButtons.current.delete('monsters'); }} onClick={event => openPanel('monsters', event.currentTarget)} aria-expanded={panels.open.includes('monsters')}>Monsters</button>
          <button ref={element => { if (element) panelButtons.current.set('log', element); else panelButtons.current.delete('log'); }} onClick={event => openPanel('log', event.currentTarget)} aria-expanded={panels.open.includes('log')}>Event log</button>
          <button ref={element => { if (element) panelButtons.current.set('locations', element); else panelButtons.current.delete('locations'); }} onClick={event => openPanel('locations', event.currentTarget)} aria-expanded={panels.open.includes('locations')}>Locations</button>
          <button ref={element => { if (element) panelButtons.current.set('decks', element); else panelButtons.current.delete('decks'); }} onClick={event => openPanel('decks', event.currentTarget)} aria-expanded={panels.open.includes('decks')}>Decks &amp; progress</button>
          <button ref={element => { if (element) panelButtons.current.set('result', element); else panelButtons.current.delete('result'); }} onClick={event => openPanel('result', event.currentTarget)} aria-expanded={panels.open.includes('result')}>Latest result</button>
          <button type="button" onClick={resetLayout}>Reset layout</button><span className="h-layout-status" role="status">{layoutStatus}</span>
          {selected && !pending && <button onClick={() => actionEditorRef.current?.focus()} aria-expanded={context === 'action'}>Review action</button>}
          {pending && <button className="h-choice-return" onClick={() => setChoiceFocus(value => value + 1)} aria-expanded={context === 'choice'}>Required choice</button>}
          {(game.currentRoll || game.rolls.length > 0) && <div className="h-roll-peek"><RollResult data={data} game={game} compact /></div>}
        </nav>
        <div className="h-play-area">
          <div className="h-board-fit"><GameBoard data={data} game={game} moving={selected === 'move' && !pending} locked={busy || terminal} onMove={destination => commit(moveAction(destination))} buttonRefs={mapButtons}
            onInspect={(id: string) => inspectLocation(id, mapButtons.current.get(id))} inspectedLocation={inspectedLocation}
            choiceDestinations={pending?.kind === 'wizard-hero-destination' ? pending.options.map(option => option.id) : []}
            chosenDestination={pending?.kind === 'wizard-hero-destination' ? pendingSelected[0] ?? null : null}
            onChooseDestination={(id: string) => { focusConfirmAfterMap.current = true; setPendingSelected([id]); }} /></div>
          <div className="h-panel-layer" hidden={visiblePanels.length === 0} style={panelLayerStyle} tabIndex={0} role="group" aria-label="Open table panels">
          {(Object.keys(panelContents) as PanelId[]).map(id => <aside key={id} data-panel={id} className={`h-context-panel h-panel-${id}`} hidden={!visiblePanels.includes(id)} style={panelStyles[id]} aria-label={`${panelTitles[id]} panel`}>
            <div className="h-context-heading"><h2>{panelTitles[id]}</h2><div>
              <button className="quiet-button" onClick={() => movePanel(id)} aria-label={`Move ${panelTitles[id]} panel to ${sideFor(id) === 'right' ? 'left' : 'right'}`} title="Move this panel to the other side">⇄</button>
              {id !== 'choice' && <button className="quiet-button" onClick={() => closePanel(id)} aria-label={`Close ${panelTitles[id]}`}>×</button>}
            </div></div>
            <div className="h-context-body" tabIndex={0} role="group" aria-label={`${panelTitles[id]} contents`}>{panelContents[id]}</div>
          </aside>)}
          </div>
        </div>
        <ActionTray className="h-tray" title={busy ? 'Resolving…' : pending ? 'Choice required' : terminal ? 'Game complete' : game.phase === 'monster' ? 'Monster Phase' : 'Your Hero Phase'}
          titleId="h-turn-title" busy={busy} collapsed={actionsCollapsed}
          onToggle={() => { setActionsCollapsed(value => !value); setSelected(null); setInspected(null); setHovered(null); setFocused(null); }}
          budget={<div className="action-budget"><span>Actions remaining</span><strong>{game.hero.actions} <span>/ {game.hero.allowance}</span></strong></div>}
          phaseControl={<>{selected === 'move' && <button className="clear-button" onClick={cancelAction}>Cancel move</button>}<button className="end-button" ref={endPhaseRef} disabled={selectionLocked || !!reasonFor(endAction)} title={reasonFor(endAction) ?? 'Forfeit any unused actions and begin the Monster Phase.'} aria-description="Forfeits any unused actions and begins the Monster Phase." onClick={() => commit(endAction)}>End Hero Phase</button></>}>
          <div className="action-options">{cards.map(card => <div className="action-option" key={card.id}><button type="button" className={`action-card ${card.id === 'perks' ? 'free-action' : ''}`}
            ref={element => { if (element) actionButtons.current.set(card.id, element); else actionButtons.current.delete(card.id); }}
            aria-disabled={selectionLocked || !!unavailable(card.id)} aria-pressed={selected === card.id} aria-describedby={`h-action-${card.id}-description`}
            {...inspectionEvents(card.id)} onClick={() => chooseCard(card.id)}>
            <span className="card-top"><span className="action-icon" aria-hidden="true">{card.icon}</span><span className="cost">{card.cost}</span></span><strong>{card.label}</strong><small>{card.caption}</small>
          </button><span className="sr-only" id={`h-action-${card.id}-description`}>{card.description} {unavailable(card.id) ?? (selectionLocked ? 'Finish the required choice before taking another action.' : 'Available now.')}</span></div>)}</div>
          <div className="action-help" tabIndex={0} role="note" aria-label="Action details"><strong>{inspectedCard?.label ?? 'Choose an action'}</strong><p>{inspectedCard?.description ?? 'Select an action below the board. Details open when you need them.'}</p><p className="unavailable-reason">{inspectedCard ? unavailable(inspectedCard.id) ?? (selected === 'move' ? 'Choose a highlighted destination on the board.' : 'Available now.') : 'End Hero Phase forfeits unused actions. Eligible Perks remain available until then.'}</p></div>
        </ActionTray>
      </section>
    </main>
  </div>;
}
