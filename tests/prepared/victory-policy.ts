import type { GameData } from '../../src/data/gameData';
import { adjacentLocations } from '../../src/engine/gamePrimitives';
import { createFighterGame, dispatchGame, gameDataForNewGame, getActionReason, getFighterView } from '../../src/engine/horrifiedGame';
import type { FighterGame, HeroAction } from '../../src/engine/horrifiedRuntime';

// An acceptance-test controller. It selects from the current board, hand and
// offered choices; it never reads the shuffled decks, random state or future cards.
type Item = { id: string; color: string; strength: number };
const MONSTERS = ['beholder', 'displacerBeast'] as const;
export const PREPARED_VICTORY_SEED = 8;

function hand(data: GameData, state: FighterGame): Item[] {
  return state.hero.items.map(id => {
    const definition = data.items.find(item => item.id === state.items[id].definitionId)!;
    return { id, color: definition.color, strength: definition.strength };
  });
}

function cheapestCost(items: Item[], minimum: number): string[] | null {
  let best: Item[] | null = null;
  const search = (index: number, selected: Item[], strength: number) => {
    if (strength >= minimum) {
      if (!best || strength < best.reduce((sum, item) => sum + item.strength, 0) ||
        (strength === best.reduce((sum, item) => sum + item.strength, 0) && selected.length < best.length)) best = [...selected];
      return;
    }
    if (index >= items.length || selected.length >= 7) return;
    search(index + 1, [...selected, items[index]], strength + items[index].strength);
    search(index + 1, selected, strength);
  };
  search(0, [], 0);
  return (best as Item[] | null)?.map(item => item.id) ?? null;
}

function route(data: GameData, from: string, target: string): string[] | null {
  const seen = new Set([from]);
  const queue: string[][] = [[from]];
  for (const path of queue) {
    const at = path.at(-1)!;
    if (at === target) return path;
    for (const next of adjacentLocations(data.board, at, 'hero')) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push([...path, next]);
    }
  }
  return null;
}

function choice(state: FighterGame): HeroAction {
  const pending = state.pending!;
  const options = pending.options.map(option => option.id);
  let selected: string[];
  if (options.includes('pass')) selected = ['pass'];
  else if (options.includes('defend') && state.hero.items.length >= 8) selected = ['defend'];
  else if (options.includes('defeat')) selected = ['defeat'];
  else if (options.includes('stop')) selected = ['stop'];
  else selected = options.slice(0, pending.max);
  if (selected.length < pending.min) selected = options.slice(0, pending.min);
  return { kind: 'choose', choiceId: pending.id, selected };
}

function action(data: GameData, state: FighterGame): HeroAction {
  if (state.pending) return choice(state);
  const view = getFighterView(data, state);
  if (state.hero.actions === 0 || !state.hero.location) return { kind: 'end-phase' };
  const items = hand(data, state);
  const beholder = state.monsters.beholder;
  const displacer = state.monsters.displacerBeast;
  const eyesLeft = data.monsters.beholder.eyestalks.length - state.damagedEyes.length;
  const cellsLeft = data.monsters.displacerBeast.advance.minimumItems - Object.keys(state.displacement).length;
  const yellow = items.filter(item => item.color === 'yellow');
  const yellowCost = cheapestCost(yellow, 6);
  const fieldCost = cheapestCost(items, 7);
  const current = state.hero.location;

  if (!beholder.defeated && beholder.location === current && eyesLeft === 0 && yellowCost) {
    return { kind: 'defeat', monster: 'beholder', items: yellowCost };
  }
  if (!displacer.defeated && displacer.location === current && cellsLeft <= 0 && fieldCost) {
    return { kind: 'defeat', monster: 'displacerBeast', items: fieldCost };
  }
  if (!beholder.defeated && beholder.location === current && eyesLeft > 0) {
    const strike = view.advanceOptions.filter(option => option.monster === 'beholder').sort((left, right) => {
      const l = items.find(item => item.id === left.item)!;
      const r = items.find(item => item.id === right.item)!;
      return Number(l.color === 'yellow') - Number(r.color === 'yellow') || l.strength - r.strength;
    })[0];
    if (strike && (strike.item !== yellowCost?.[0] || !yellowCost || items.length > eyesLeft + yellowCost.length)) return strike;
  }
  if (!displacer.defeated && displacer.location === current && cellsLeft > 0) {
    const advance = view.advanceOptions.filter(option => option.monster === 'displacerBeast').sort((left, right) => {
      const l = items.find(item => item.id === left.item)!;
      const r = items.find(item => item.id === right.item)!;
      return l.strength - r.strength;
    })[0];
    if (advance && items.length > cellsLeft + 2) return advance;
  }
  if (!view.actions['pick-up']) return { kind: 'pick-up', items: [...state.boardItems[current]] };

  const target: { location: string; score: number }[] = [];
  for (const [location, at] of Object.entries(state.boardItems)) {
    if (!at.length || location === current) continue;
    const path = route(data, current, location);
    if (!path) continue;
    target.push({ location, score: at.length * 3 / (path.length + 1) + (items.length < 5 ? 3 : items.length < 12 ? 1 : 0) });
  }
  for (const monster of MONSTERS) {
    const entry = state.monsters[monster];
    if (entry.defeated || !entry.location || entry.location === current) continue;
    const path = route(data, current, entry.location);
    if (!path) continue;
    const ready = monster === 'beholder' ? eyesLeft === 0 ? !!yellowCost : items.length > (yellowCost?.length ?? 2) + 1
      : cellsLeft <= 0 ? !!fieldCost : items.length > cellsLeft + 2;
    if (ready) target.push({ location: entry.location, score: (monster === 'beholder' ? 11 : 8) / path.length });
  }
  target.sort((left, right) => right.score - left.score);
  for (const candidate of target) {
    const path = route(data, current, candidate.location)!;
    if (path.length > 1 && !view.actions.move && view.moveDestinations.includes(path[1]))
      return { kind: 'move', destination: path[1], escorts: [] };
  }
  if (!view.actions.special) return { kind: 'special' };
  return { kind: 'end-phase' };
}

/** Returns every legal command for a reproducible completed win, or throws. */
export async function planVictory(data: GameData, seed: number): Promise<FighterGame> {
  const currentData = gameDataForNewGame(data);
  let state = await createFighterGame(currentData, seed);
  for (let decision = 0; decision < 400 && state.phase !== 'won' && state.phase !== 'lost'; decision++) {
    const proposed = action(currentData, state);
    const reason = getActionReason(currentData, state, proposed);
    if (reason) throw new Error(`Seed ${seed}, revision ${state.revision}: ${proposed.kind}: ${reason}`);
    const result = dispatchGame(currentData, state, { id: `victory-${seed}-${decision}`, revision: state.revision, actorSeatId: 'solo', action: proposed });
    if (result.error) throw new Error(`Seed ${seed}, revision ${state.revision}: ${result.error}`);
    state = result.state;
    if (state.phase === 'won') return state;
    if (state.phase === 'lost') break;
  }
  throw new Error(`Seed ${seed}: ${state.phase} after ${state.revision} commands; eyes ${state.damagedEyes.length}/${currentData.monsters.beholder.eyestalks.length}, field ${Object.keys(state.displacement).length}/${currentData.monsters.displacerBeast.advance.minimumItems}, defeated ${MONSTERS.filter(monster => state.monsters[monster].defeated).length}/2.`);
}
