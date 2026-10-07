import type { GameData } from '../data/gameData';
import type { GameView } from '../engine/horrifiedGame';
import { DieArtwork, ItemArtwork, PieceArtwork } from './TabletopPieces';

type Shared = { data: GameData; game: GameView; locationName: (id: string | null | undefined) => string };

export function LocationInspector({ data, game, locationId, locationName }: Shared & { locationId: string }) {
  const location = data.board.locations.find(entry => entry.id === locationId);
  if (!location) return null;
  const items = game.boardItems[locationId] ?? [];
  const citizens = Object.entries(game.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location === locationId);
  const heroHere = game.hero.location === locationId;
  const monsters = (['beholder', 'displacerBeast'] as const).filter(id => !game.monsters[id].defeated && game.monsters[id].location === locationId);
  const lair = game.lairs[locationId];
  return <section className="h-inspector" aria-label={`${location.name} contents`}>
    <h2>{location.number ? `${location.number} · ` : ''}{location.name}</h2>
    <p className="h-inspector-count">{items.length} Item{items.length === 1 ? '' : 's'} · {citizens.length} Citizen{citizens.length === 1 ? '' : 's'}</p>
    <h3>Items ({items.length})</h3>
    {items.length ? <ul className="h-art-list">{items.map(id => {
      const item = game.visibleItems[id];
      return <li key={id}><ItemArtwork name={item?.name ?? 'Item'} color={item?.color ?? 'gray'} /><span><strong>{item?.name ?? 'Unknown Item'}</strong><small>{item ? `${item.color} · Strength ${item.strength}` : 'Details unavailable'}</small></span></li>;
    })}</ul> : <p>No Items here.</p>}
    <h3>Citizens ({citizens.length})</h3>
    {citizens.length ? <ul className="h-art-list">{citizens.map(([id]) => {
      const citizen = data.citizens.find(entry => entry.id === id);
      return <li key={id}><PieceArtwork kind="citizen" /><span><strong>{citizen?.name ?? 'Citizen'}</strong><small>Safe destination: {locationName(citizen?.safeDestination)}</small></span></li>;
    })}</ul> : <p>No Citizens here.</p>}
    <h3>Pieces</h3>
    <ul className="h-art-list">
      {heroHere && <li><PieceArtwork kind="hero" variant={game.hero.definitionId} /><span><strong>{data.heroes.find(entry => entry.id === game.hero.definitionId)?.name ?? 'Hero'}</strong><small>Your Hero</small></span></li>}
      {monsters.map(id => <li key={id}><PieceArtwork kind={id === 'beholder' ? 'beholder' : 'displacer'} /><span><strong>{id === 'beholder' ? 'Beholder' : 'Displacer Beast'}</strong><small>Monster</small></span></li>)}
      {lair && <li><PieceArtwork kind="lair" revealed={lair.revealed} /><span><strong>{lair.revealed ? 'Revealed' : 'Unrevealed'} Lair</strong></span></li>}
      {!heroHere && monsters.length === 0 && !lair && <li>No Hero, Monster, or Lair here.</li>}
    </ul>
    <p className="h-read-only">Inspecting a location does not spend an action.</p>
  </section>;
}

export function LocationsPanel({ data, inspectedLocation, onInspect }: { data: GameData; inspectedLocation: string | null; onInspect: (id: string, opener: HTMLElement) => void }) {
  return <section className="h-locations-list"><p>Select a named location to inspect its visible pieces.</p><ul>{data.board.locations.map(location => <li key={location.id}><button type="button" aria-current={inspectedLocation === location.id ? 'location' : undefined} onClick={event => onInspect(location.id, event.currentTarget)}>{location.number ? `${location.number} · ` : ''}{location.name}</button></li>)}</ul></section>;
}

export function DecksPanel({ game, locationName }: { game: GameView; locationName: Shared['locationName'] }) {
  return <section className="h-decks"><h2>Decks &amp; progress</h2><dl>
    <div><dt>Monster deck</dt><dd>{game.monsterDeckCount} remaining · {game.monsterDiscard.length} discarded</dd></div>
    <div><dt>Perk deck</dt><dd>{game.perkDeckCount} remaining · {game.perkDiscard.length} discarded</dd></div>
    <div><dt>Item bag</dt><dd>{game.bagCount} remaining · {game.itemDiscard.length} discarded</dd></div>
    <div><dt>Terror</dt><dd>{game.terror}</dd></div>
    <div><dt>Frenzy</dt><dd>{game.frenzy === 'beholder' ? 'Beholder' : 'Displacer Beast'}</dd></div>
    <div><dt>Upcoming Hero Phase</dt><dd>{game.nextHeroPhaseSkipped ? 'Skipped; penalties clear after the skipped turn.' : `${game.nextHeroPhaseAllowance} actions`}</dd></div>
  </dl>{game.currentMonsterCard && <section className="h-current-card"><h3>Current Monster card</h3><strong>{game.currentMonsterCard.name}</strong><p>Items drawn: {game.currentMonsterCard.itemsDrawn}</p><p>Activation symbols: {game.currentMonsterCard.activationSymbols.join(', ') || 'None'}</p><p>Movement: {game.currentMonsterCard.movement} · Attack dice: {game.currentMonsterCard.attackDice}</p><p>{game.currentMonsterCard.event}</p>{game.currentMonsterCard.citizenStartingLocation && <p>Citizen starts at {locationName(game.currentMonsterCard.citizenStartingLocation)}</p>}</section>}</section>;
}

export function AttackPanel({ data, game, locationName }: Shared) {
  const attack = game.currentAttack;
  if (!attack) return null;
  const target = attack.target === 'hero' || attack.target === game.hero.definitionId
    ? data.heroes.find(entry => entry.id === game.hero.definitionId)?.name ?? 'Hero'
    : data.citizens.find(entry => entry.id === attack.target)?.name ?? attack.target;
  // A previous eye roll must not be presented as this attack's ray.
  const rayRoll = game.currentRoll?.reason === 'Beholder eye' ? game.currentRoll : null;
  const result = rayRoll?.result.effectiveResult;
  const ray = attack.monster === 'beholder' ? game.pending?.ray ?? (result === undefined ? null
    : [...data.monsters.beholder.rays.front, ...data.monsters.beholder.rays.back].find(entry => result >= entry.min && result <= entry.max)) : null;
  const damaged = result !== undefined && data.monsters.beholder.eyestalks.some(eye => result >= eye.min && result <= eye.max && game.damagedEyes.includes(eye.min));
  return <section className="h-attack" aria-label="Current attack"><h3>{attack.monster === 'beholder' ? 'Beholder' : 'Displacer Beast'} attack</h3><p>Target: {target} · {locationName(attack.target === game.hero.definitionId || attack.target === 'hero' ? game.hero.location : game.citizens[attack.target]?.location)}</p>
    <div className="h-attack-dice" aria-label="Attack dice">{attack.faces.map((face, index) => <div key={index}><DieArtwork face={face} /><strong>{face === 'hit' ? 'HIT' : face === 'power' ? 'POW' : 'Blank'}</strong></div>)}</div>
    <p>Resolve POW first · {attack.remainingPowers} POW remaining · {attack.remainingHits} HIT remaining</p>
    {ray && <p>Current ray: {damaged ? 'Antimagic eye (damaged eyestalk)' : `${ray.name} (${ray.min}–${ray.max})`}</p>}
    {ray && !damaged && <p>{ray.effect}</p>}
  </section>;
}
