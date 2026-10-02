import type { GameData } from '../data/gameData';
import { validateGameData } from '../data/gameData.ts';
import { isSupportedRuleset } from './decisionPolicies.ts';
import { createRandomState, shuffle } from './gamePrimitives.ts';
import type { RandomState } from './gamePrimitives';

export const SESSION_SCHEMA_VERSION = 1 as const;
export const SOLO_SEAT = 'solo' as const;
export type MonsterId = 'beholder' | 'displacerBeast';
export interface ItemInstance { id: string; definitionId: string; destination: string }
export interface CardInstance { id: string; definitionId: string }
export interface GameEntry { id: number; turn: number; kind: 'setup' | 'action' | 'phase' | 'effect' | 'roll' | 'end'; message: string }

/** Complete internal state. Controllers receive projectGame(), never this object. */
export interface HorrifiedState {
  schemaVersion: typeof SESSION_SCHEMA_VERSION;
  rulesVersion: string;
  dataIdentity: string;
  seed: number;
  random: RandomState;
  revision: number;
  turn: number;
  phase: 'hero' | 'monster' | 'won' | 'lost';
  endReason: string | null;
  terror: number;
  frenzy: MonsterId;
  hero: {
    seatId: typeof SOLO_SEAT; definitionId: string; location: string | null;
    items: string[]; perks: string[]; actions: number; allowance: number;
    effects: { ignoreHits: number; skipMonsterCard: boolean; skipMonsterPhase: boolean; automatic20: boolean;
      clericRerollOne: number; clericRerollAll: number; clericRescue: number; clericOneDieAttacks: number };
    penalties: { noMove: boolean; fewerActions: number; skipTurn: boolean };
  };
  monsters: Record<MonsterId, { location: string | null; defeated: boolean }>;
  damagedEyes: number[];
  displacement: Record<string, string>;
  citizens: Record<string, { location: string | null; status: 'waiting' | 'board' | 'rescued' | 'defeated' }>;
  items: Record<string, ItemInstance>;
  perks: Record<string, CardInstance>;
  monsterCards: Record<string, CardInstance>;
  boardItems: Record<string, string[]>;
  bag: string[];
  itemDiscard: string[];
  perkDeck: string[];
  perkDiscard: string[];
  monsterDeck: string[];
  monsterDiscard: string[];
  lairs: Record<string, { definitionId: string; revealed: boolean }>;
  entries: GameEntry[];
}

function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(entry => canonicalJSON(entry) ?? 'null').join(',')}]`;
  return `{${Object.entries(value).filter(([, entry]) => entry !== undefined).sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJSON(entry)}`).join(',')}}`;
}

/** Fingerprint actual contents, not a caller's claimed source fingerprint. */
export async function dataIdentity(data: GameData): Promise<string> {
  const bytes = new TextEncoder().encode(canonicalJSON(data));
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${Array.from(new Uint8Array(hash), byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

export function logEntry(state: HorrifiedState, kind: GameEntry['kind'], message: string): void {
  state.entries.push({ id: state.entries.length, turn: state.turn, kind, message });
}

function expandCards(definitions: { id: string; quantity: number }[]): Record<string, CardInstance> {
  return Object.fromEntries(definitions.flatMap(definition => Array.from({ length: definition.quantity }, (_, index) => {
    const id = `${definition.id}#${index + 1}`;
    return [id, { id, definitionId: definition.id }];
  })));
}

/** Draws from the bag, refilling only from discarded Items (rules p. 7). */
export function drawItem(state: HorrifiedState): string | null {
  if (state.bag.length === 0 && state.itemDiscard.length > 0) {
    const refill = shuffle(state.itemDiscard, state.random);
    state.bag = [...refill.items]; state.random = refill.state; state.itemDiscard = [];
  }
  return state.bag.shift() ?? null;
}

export function drawBoardItems(state: HorrifiedState, count: number): number {
  let drawn = 0;
  for (let index = 0; index < count; index++) {
    const id = drawItem(state);
    if (!id) break;
    state.boardItems[state.items[id].destination].push(id); drawn++;
  }
  return drawn;
}

/** Perks do not reshuffle under the accepted v2 policy. */
export function gainPerk(state: HorrifiedState): string | null {
  const id = state.perkDeck.shift() ?? null;
  if (id) state.hero.perks.push(id);
  return id;
}

/** Rulebook p. 4 plus separately verified monster setup. No UI or storage effects. */
export async function createHorrifiedGame(input: unknown, seed: number, heroId = 'hero-fighter'): Promise<HorrifiedState> {
  const data = structuredClone(validateGameData(input));
  if (!isSupportedRuleset(data.interpretationVersion)) throw new Error('Unsupported rules interpretation. Prepare the current game data.');
  if (!data.setup || !data.capabilities.setupVerified) throw new Error('Verified monster setup is required.');
  if (!['hero-bard', 'hero-cleric', 'hero-fighter', 'hero-rogue', 'hero-wizard'].includes(heroId)) throw new Error('Unsupported Hero.');
  const hero = data.heroes.find(candidate => candidate.id === heroId);
  if (!hero) throw new Error('The selected Hero is missing from the data.');
  if (!Number.isSafeInteger(data.board.soloLabelAt) || data.board.soloLabelAt < 0 || data.board.soloLabelAt >= data.board.terrorTrack.length - 1) {
    throw new Error('Solo Terror must start below the end of the track.');
  }
  if (data.citizens.some(citizen => citizen.quantity !== 1)) throw new Error('Each Citizen must have one standee.');
  if (data.monsters.beholder.frenzyOrder === data.monsters.displacerBeast.frenzyOrder) throw new Error('Monster Frenzy order must be distinct.');
  const items = Object.fromEntries(data.items.flatMap(definition => definition.locations.map((destination, index) => {
    const id = `${definition.id}#${index + 1}`;
    return [id, { id, definitionId: definition.id, destination }];
  })));
  let random = createRandomState(seed);
  const randomize = (ids: string[]) => { const result = shuffle(ids, random); random = result.state; return [...result.items]; };
  const monsterCards = expandCards(data.monsterCards);
  const perks = expandCards(data.perks);
  const monsterDeck = randomize(Object.keys(monsterCards));
  const perkDeck = randomize(Object.keys(perks));
  const bag = randomize(Object.keys(items));
  const lairFaces = data.lairTokens.faces.flatMap(face => Array<string>(face.quantity).fill(face.id));
  if (lairFaces.length !== data.board.lairLocations.length) throw new Error('Lair quantity does not match the board.');
  const lairs = randomize(lairFaces);
  const frenzy: MonsterId = data.monsters.beholder.frenzyOrder < data.monsters.displacerBeast.frenzyOrder ? 'beholder' : 'displacerBeast';
  const state: HorrifiedState = {
    schemaVersion: SESSION_SCHEMA_VERSION, rulesVersion: data.interpretationVersion, dataIdentity: await dataIdentity(data),
    seed, random, revision: 0, turn: 1, phase: 'hero', endReason: null, terror: data.board.soloLabelAt, frenzy,
    hero: { seatId: SOLO_SEAT, definitionId: hero.id, location: hero.start, items: [], perks: [], actions: hero.actions, allowance: hero.actions,
      effects: { ignoreHits: 0, skipMonsterCard: false, skipMonsterPhase: false, automatic20: false,
        clericRerollOne: 0, clericRerollAll: 0, clericRescue: 0, clericOneDieAttacks: 0 },
      penalties: { noMove: false, fewerActions: 0, skipTurn: false } },
    monsters: { beholder: { location: data.setup.beholderLocation, defeated: false }, displacerBeast: { location: data.setup.displacerLocation, defeated: false } },
    damagedEyes: [], displacement: {},
    citizens: Object.fromEntries(data.citizens.map(citizen => [citizen.id, { location: null, status: 'waiting' }])),
    items, perks, monsterCards, boardItems: Object.fromEntries(data.board.locations.map(location => [location.id, []])),
    bag, itemDiscard: [], perkDeck, perkDiscard: [], monsterDeck, monsterDiscard: [],
    lairs: Object.fromEntries(data.board.lairLocations.map((location, index) => [location, { definitionId: lairs[index], revealed: false }])),
    entries: [],
  };
  if (drawBoardItems(state, 12) !== 12 || !gainPerk(state)) throw new Error('The setup requires twelve Items and one Perk.');
  logEntry(state, 'setup', `Solo game prepared with ${hero.name}. Twelve Items placed; one Perk dealt.`);
  return state;
}

/** Explicit projection: hides future draws, random state, and unrevealed Lair identities. */
export function projectGame(state: HorrifiedState) {
  return structuredClone({
    revision: state.revision, turn: state.turn, phase: state.phase, endReason: state.endReason,
    terror: state.terror, frenzy: state.frenzy,
    // Remaining actions are usable only in the Hero Phase. Keep replay snapshots unchanged.
    hero: { ...state.hero, actions: state.phase === 'hero' ? state.hero.actions : 0 },
    monsters: state.monsters,
    damagedEyes: state.damagedEyes, displacement: state.displacement, citizens: state.citizens,
    boardItems: state.boardItems, itemDiscard: state.itemDiscard, perkDiscard: state.perkDiscard,
    monsterDiscard: state.monsterDiscard, bagCount: state.bag.length, perkDeckCount: state.perkDeck.length,
    monsterDeckCount: state.monsterDeck.length,
    lairs: Object.fromEntries(Object.entries(state.lairs).map(([location, lair]) => [location, lair.revealed ? lair : { revealed: false }])),
    entries: state.entries,
  });
}
