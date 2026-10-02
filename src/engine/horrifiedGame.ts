import type { GameData } from '../data/gameData';
import { adjacentLocations, awaySteps, nextInt, shortestRouteSteps } from './gamePrimitives.ts';
import { closeResponseWindow, createResponseWindow, passResponse, resolveD20, selectResponse, isSupportedRuleset, RULESET_VERSION } from './decisionPolicies.ts';
import { createHorrifiedGame, drawBoardItems, gainPerk, logEntry, projectGame, SOLO_SEAT } from './horrifiedState.ts';
import type { MonsterId } from './horrifiedState';
import type { ChoiceOption, EngineContext, FighterGame, GameCommand, HeroAction, Task } from './horrifiedRuntime';
import { resolveMonsterTask } from './monsterResolution.ts';
import { resolveOtherHeroTask } from './heroResolution.ts';

const monsterIds: MonsterId[] = ['beholder', 'displacerBeast'];
// Bind a caller's reference to the exact validated snapshot used at initialization.
// Saves will rebind after asynchronous identity validation; commands stay synchronous.
const registeredData = new WeakMap<GameData, { identity: string; serialized: string }>();
const distinct = (ids: string[]) => new Set(ids).size === ids.length;
const itemDefinition = (data: GameData, state: FighterGame, id: string) => data.items.find(item => item.id === state.items[id]?.definitionId);
const perkDefinition = (data: GameData, state: FighterGame, id: string) => data.perks.find(perk => perk.id === state.perks[id]?.definitionId);
const totalStrength = (data: GameData, state: FighterGame, ids: string[]) => ids.reduce((sum, id) => sum + (itemDefinition(data, state, id)?.strength ?? 0), 0);
const ownedItems = (state: FighterGame, ids: string[]) => distinct(ids) && ids.every(id => state.hero.items.includes(id));
const cellEntries = (data: GameData) => data.monsters.displacerBeast.advance.grid.flatMap((row, r) => row.map((values, c) => ({ id: `${r}:${c}`, values })));
const cellFits = (data: GameData, state: FighterGame, item: string, cell: string) => {
  const strength = itemDefinition(data, state, item)?.strength;
  const spot = cellEntries(data).find(candidate => candidate.id === cell);
  return !!spot && !!strength && (strength >= 4 || strength === spot.values.length);
};

/** Only new adventures adopt current rules; replay keeps its original data unchanged. */
export function gameDataForNewGame(data: GameData): GameData {
  if (!isSupportedRuleset(data.interpretationVersion)) throw new Error('Unsupported rules interpretation. Prepare the current game data.');
  return { ...structuredClone(data), interpretationVersion: RULESET_VERSION };
}

export async function createFighterGame(data: GameData, seed: number, heroId = 'hero-fighter'): Promise<FighterGame> {
  const snapshot = structuredClone(data);
  const base = await createHorrifiedGame(snapshot, seed, heroId);
  registeredData.set(data, { identity: base.dataIdentity, serialized: JSON.stringify(snapshot) });
  return { ...base, taskSerial: 0, queue: [], pending: null, roll: null, attack: null, currentCard: null,
    damageOutcomes: {},
    noMoveThisTurn: false, commandIds: [], commands: [], rolls: [] };
}

function location(state: FighterGame, entity: string): string | null {
  if (entity === 'hero') return state.hero.location;
  if (monsterIds.includes(entity as MonsterId)) return state.monsters[entity as MonsterId].location;
  return state.citizens[entity]?.location ?? null;
}
function entityName(data: GameData, state: FighterGame, entity: string): string {
  if (entity === 'hero') return data.heroes.find(hero => hero.id === state.hero.definitionId)?.name ?? 'Hero';
  if (entity === 'beholder') return 'Beholder';
  if (entity === 'displacerBeast') return 'Displacer Beast';
  return data.citizens.find(citizen => citizen.id === entity)?.name ?? data.board.locations.find(place => place.id === entity)?.name ?? entity;
}
function isCharacterAt(state: FighterGame, at: string | null): boolean {
  return at !== null && (state.hero.location === at || Object.values(state.citizens).some(citizen => citizen.status === 'board' && citizen.location === at));
}
function finish(ctx: EngineContext, task: Task) { ctx.prepend(...(task.after ?? [])); }
function finishGame(ctx: EngineContext, phase: 'won' | 'lost', reason: string) {
  ctx.state.phase = phase; ctx.state.endReason = reason; ctx.state.queue = []; ctx.state.pending = null;
  ctx.state.roll = null; ctx.state.attack = null; ctx.log(reason, 'end');
}
function nextFrenzy(ctx: EngineContext) {
  const ordered = monsterIds.filter(id => !ctx.state.monsters[id].defeated).sort((a, b) => ctx.data.monsters[a].frenzyOrder - ctx.data.monsters[b].frenzyOrder);
  const current = ctx.data.monsters[ctx.state.frenzy].frenzyOrder;
  ctx.state.frenzy = ordered.find(id => ctx.data.monsters[id].frenzyOrder > current) ?? ordered[0] ?? ctx.state.frenzy;
}
function defeatMonster(ctx: EngineContext, id: MonsterId) {
  ctx.state.monsters[id] = { defeated: true, location: null };
  if (id === 'displacerBeast') { ctx.state.itemDiscard.push(...Object.values(ctx.state.displacement)); ctx.state.displacement = {}; }
  ctx.changeTerror(-1); ctx.log(`${ctx.name(id)} defeated.`);
  if (ctx.state.frenzy === id) nextFrenzy(ctx);
  if (monsterIds.every(monster => ctx.state.monsters[monster].defeated)) finishGame(ctx, 'won', 'Both Monsters defeated. You win!');
}

function context(data: GameData, state: FighterGame): EngineContext {
  const ctx: EngineContext = {
    data, state,
    prepend: (...tasks) => { if (state.phase !== 'won' && state.phase !== 'lost') state.queue.unshift(...tasks); },
    ask: (title, options, min, max, resume) => {
      if (state.phase === 'won' || state.phase === 'lost') return;
      if (options.length === 0) { ctx.log(`${title}: no eligible options.`); ctx.prepend({ ...resume, selected: [] }); return; }
      state.pending = { id: `choice-${++state.taskSerial}`, title, options, min: Math.min(min, options.length), max: Math.min(max, options.length), resume };
    },
    log: (message, kind = 'effect') => logEntry(state, kind, message),
    name: entity => entityName(data, state, entity),
    location: entity => location(state, entity),
    place: (entity, destination, escorts = []) => {
      const previous = location(state, entity);
      if (entity === 'hero') {
        state.hero.location = destination;
        for (const id of escorts) {
          const citizen = state.citizens[id];
          if (citizen?.status === 'board' && citizen.location === previous) ctx.place(id, destination);
        }
      } else if (monsterIds.includes(entity as MonsterId)) {
        const monster = state.monsters[entity as MonsterId]; if (monster.defeated) return;
        monster.location = destination;
      } else {
        const citizen = state.citizens[entity];
        if (!citizen || citizen.status === 'rescued' || citizen.status === 'defeated') return;
        citizen.location = destination; citizen.status = 'board';
        if (data.citizens.find(definition => definition.id === entity)?.safeDestination === destination) {
          citizen.location = null; citizen.status = 'rescued'; ctx.drawPerk(); ctx.log(`${ctx.name(entity)} reached safety.`); return;
        }
      }
      ctx.log(`${ctx.name(entity)} → ${ctx.name(destination)}.`);
    },
    rollD20: (reason, continuation, modifier = 0) => {
      let base: number;
      if (state.phase === 'hero' && state.hero.effects.automatic20) { base = 20; state.hero.effects.automatic20 = false; }
      else { const draw = nextInt(state.random, 20); state.random = draw.state; base = draw.value + 1; }
      const result = resolveD20(base, modifier ? [modifier] : []);
      const options = rollOptions(data, state);
      state.roll = { result, reason, continuation: { ...continuation, modifier }, reward: state.phase === 'hero', window: createResponseWindow({ eventId: `roll-${++state.taskSerial}`, activeSeatId: SOLO_SEAT, orderedSeatIds: [SOLO_SEAT] }, options.map(option => ({ id: option.id, ownerSeatId: SOLO_SEAT }))) };
      ctx.log(`${reason}: rolled ${base}${modifier ? `, modifier ${modifier}` : ''}.`, 'roll');
      offerRoll(ctx);
    },
    changeTerror: amount => {
      state.terror = Math.max(0, Math.min(data.board.terrorTrack.length - 1, state.terror + amount));
      if (state.terror >= data.board.terrorTrack.length - 1) finishGame(ctx, 'lost', 'Terror reached the end of the track.');
    },
    discardItems: ids => { state.hero.items = state.hero.items.filter(id => !ids.includes(id)); state.itemDiscard.push(...ids); },
    drawPerk: () => { const id = gainPerk(state); ctx.log(id ? `Gained ${perkDefinition(data, state, id)?.name ?? 'a Perk'}.` : 'The Perk draw pile is empty.'); },
  };
  return ctx;
}

function rollOptions(data: GameData, state: FighterGame): ChoiceOption[] {
  return state.hero.perks.flatMap(perk => {
    const definition = perkDefinition(data, state, perk);
    if (definition?.id === 'perk-skeemo-weirdbottle') return [{ id: JSON.stringify({ perk, reroll: true }), label: `${definition.name}: reroll and accept the new result` }];
    if (definition?.id === 'perk-ott-steeltoes') return [-4, -3, -2, -1, 1, 2, 3, 4].map(delta => ({ id: JSON.stringify({ perk, delta }), label: `${definition.name}: ${delta > 0 ? '+' : ''}${delta}` }));
    return [];
  });
}
function consumePerk(state: FighterGame, id: string) {
  state.hero.perks = state.hero.perks.filter(perk => perk !== id); state.perkDiscard.push(id);
}
function finishRoll(ctx: EngineContext) {
  const roll = ctx.state.roll!;
  ctx.state.rolls.push({ reason: roll.reason, result: structuredClone(roll.result), turn: ctx.state.turn });
  ctx.log(`${roll.reason}: final ${roll.result.effectiveResult} (adjusted total ${roll.result.adjustedTotal}).`, 'roll');
  if (roll.reward && roll.result.effectiveResult === 20) ctx.drawPerk();
  ctx.state.roll = null;
  ctx.prepend({ ...roll.continuation, result: roll.result.effectiveResult });
}
function offerRoll(ctx: EngineContext) {
  const roll = ctx.state.roll!;
  if (roll.window.closed) { finishRoll(ctx); return; }
  ctx.ask(`${roll.reason}: result ${roll.result.effectiveResult}. Use a relevant Perk or keep it.`,
    [{ id: 'pass', label: 'Keep this result' }, ...rollOptions(ctx.data, ctx.state)], 1, 1, { kind: 'roll:response' });
}

function resolveCoreTask(task: Task, ctx: EngineContext): boolean {
  const { state, data } = ctx;
  const selected = task.selected ?? [];
  switch (task.kind) {
    case 'roll:response': {
      const roll = state.roll!;
      const command = { eventId: roll.window.eventId, revision: roll.window.revision, seatId: SOLO_SEAT, actorSeatId: SOLO_SEAT };
      const options = rollOptions(data, state).map(option => ({ id: option.id, ownerSeatId: SOLO_SEAT }));
      if (selected[0] === 'pass') { roll.window = passResponse(roll.window, command, options); finishRoll(ctx); return true; }
      const response = JSON.parse(selected[0]) as { perk: string; reroll?: boolean; delta?: number };
      const candidate = structuredClone(state); consumePerk(candidate, response.perk);
      const nextWindow = selectResponse(roll.window, { ...command, optionId: selected[0] }, options, () => rollOptions(data, candidate).map(option => ({ id: option.id, ownerSeatId: SOLO_SEAT })));
      if (nextWindow === roll.window) throw new Error('Invalid internal roll response.');
      consumePerk(state, response.perk); roll.window = nextWindow;
      if (response.reroll) {
        const draw = nextInt(state.random, 20); state.random = draw.state;
        // A new die result retains the event's fixed cost modifier, but not prior Ott adjustments.
        roll.result = resolveD20(draw.value + 1, roll.continuation.modifier ? [roll.continuation.modifier] : []);
        roll.window = closeResponseWindow(roll.window, roll.window.eventId, roll.window.revision);
        ctx.log(`Rerolled ${draw.value + 1}; this result is final.`, 'roll'); finishRoll(ctx);
      } else { roll.result = resolveD20(roll.result.base, [...roll.result.modifiers, response.delta!]); offerRoll(ctx); }
      return true;
    }
    case 'relocate': {
      if (!task.entity || !task.to || !ctx.location(task.entity)) { finish(ctx, task); return true; }
      const escorts = task.entity === 'hero' && task.mode === 'move'
        ? Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location === state.hero.location).map(([id]) => id) : [];
      if (escorts.length) ctx.ask('Choose Citizens to accompany this step.', escorts.map(id => ({ id, label: ctx.name(id) })), 0, escorts.length, { ...task, kind: 'relocate:finish' });
      else { ctx.place(task.entity, task.to); finish(ctx, task); }
      return true;
    }
    case 'relocate:finish': ctx.place(task.entity!, task.to!, selected); finish(ctx, task); return true;
    case 'walk': {
      const from = ctx.location(task.entity!);
      if (!from || (task.count ?? 0) <= 0 || from === task.target || (task.reason === 'attack-movement' && isCharacterAt(state, from))) { finish(ctx, task); return true; }
      const traversal = task.entity === 'hero' ? 'hero' : state.citizens[task.entity!] ? 'guide' : 'monster';
      const steps = task.target ? shortestRouteSteps(data.board, from, task.target, traversal)
        : task.source ? awaySteps(data.board, from, task.source, traversal) : adjacentLocations(data.board, from, traversal);
      if (!steps.length) { finish(ctx, task); return true; }
      const options = steps.map(id => ({ id, label: ctx.name(id) }));
      if (task.optional) options.push({ id: 'stop', label: 'Finish moving' });
      if (options.length === 1) ctx.prepend({ ...task, kind: 'walk:step', selected: [options[0].id] });
      else ctx.ask(`Move ${ctx.name(task.entity!)} (${task.count} step${task.count === 1 ? '' : 's'} remaining).`, options, 1, 1, { ...task, kind: 'walk:step' });
      return true;
    }
    case 'walk:step': {
      if (selected[0] === 'stop') { finish(ctx, task); return true; }
      ctx.prepend({ kind: 'relocate', entity: task.entity, to: selected[0], mode: 'move' }, { ...task, kind: 'walk', count: task.count! - 1, selected: undefined });
      return true;
    }
    case 'discard': {
      const count = Math.min(task.amount ?? 1, state.hero.items.length);
      if (!count) { finish(ctx, task); return true; }
      ctx.ask(task.reason ?? 'Choose Items to discard.', state.hero.items.map(id => ({ id, label: itemDefinition(data, state, id)?.name ?? id })), count, count, { ...task, kind: 'discard:finish' }); return true;
    }
    case 'discard:finish':
      if (task.to) { state.hero.items = state.hero.items.filter(id => !selected.includes(id)); state.boardItems[task.to].push(...selected); }
      else ctx.discardItems(selected);
      finish(ctx, task); return true;
    case 'damage': {
      if ((task.amount ?? 0) <= 0 || !ctx.location(task.entity!)) {
        if (task.damageId !== undefined) state.damageOutcomes[task.damageId] = 'skipped';
        finish(ctx, task); return true;
      }
      if (task.entity !== 'hero') {
        if (task.damageId !== undefined) state.damageOutcomes[task.damageId] = 'defeated';
        state.citizens[task.entity!] = { location: null, status: 'defeated' };
        ctx.log(`${ctx.name(task.entity!)} defeated.`); ctx.changeTerror(1); finish(ctx, task); return true;
      }
      const options = [{ id: 'defeat', label: 'Accept defeat and keep your Items' }];
      if (state.hero.items.length >= task.amount!) options.unshift({ id: 'defend', label: `Discard ${task.amount} Item${task.amount === 1 ? '' : 's'} to defend` });
      ctx.ask(task.reason ?? `Defend against ${task.amount} Hit${task.amount === 1 ? '' : 's'}.`, options, 1, 1, { ...task, kind: 'damage:choice' }); return true;
    }
    case 'damage:choice': {
      if (task.damageId !== undefined) state.damageOutcomes[task.damageId] = selected[0] === 'defend' ? 'survived' : 'defeated';
      if (selected[0] === 'defend') ctx.prepend({ kind: 'discard', amount: task.amount, reason: 'Choose the Items used to defend.', after: task.after });
      else if (state.phase === 'monster' && state.hero.effects.clericRescue > 0 && state.hero.definitionId === 'hero-cleric' && state.hero.location) {
        ctx.ask('Use saved Cleric rescue after this defeat?', [{ id: 'rescue', label: 'Prevent Terror and remain at the Cleric location' }, { id: 'decline', label: 'Accept normal defeat' }], 1, 1,
          { kind: 'cleric:rescue', after: task.after });
      } else { state.hero.location = null; state.hero.penalties = { noMove: false, fewerActions: 0, skipTurn: false }; ctx.log('Hero defeated; return at the start of the next turn.'); ctx.changeTerror(1); finish(ctx, task); }
      return true;
    }
    case 'cleric:rescue': {
      if (selected[0] === 'rescue') {
        state.hero.effects.clericRescue--;
        state.hero.penalties = { noMove: false, fewerActions: 0, skipTurn: false };
        ctx.log('Cleric rescue prevented Terror from this defeat.');
      }
      else { state.hero.location = null; state.hero.penalties = { noMove: false, fewerActions: 0, skipTurn: false }; ctx.log('Hero defeated; return at the start of the next turn.'); ctx.changeTerror(1); }
      finish(ctx, task); return true;
    }
    case 'turn:start': {
      if (state.currentCard) { state.monsterDiscard.push(state.currentCard); state.currentCard = null; }
      state.attack = null; state.hero.effects = { ignoreHits: 0, skipMonsterCard: false, skipMonsterPhase: false, automatic20: false,
        clericRerollOne: 0, clericRerollAll: 0, clericRescue: 0, clericOneDieAttacks: 0 };
      state.turn++;
      if (state.hero.penalties.skipTurn) { state.hero.penalties = { noMove: false, fewerActions: 0, skipTurn: false }; ctx.log('The next Hero and Monster Phases are skipped.', 'phase'); state.turn++; }
      if (state.hero.location === null) state.hero.location = data.board.hospital;
      state.noMoveThisTurn = state.hero.penalties.noMove;
      state.hero.allowance = Math.max(0, data.heroes.find(hero => hero.id === state.hero.definitionId)!.actions - state.hero.penalties.fewerActions);
      state.hero.actions = state.hero.allowance; state.hero.penalties = { noMove: false, fewerActions: 0, skipTurn: false }; state.phase = 'hero';
      ctx.log(`Hero Phase ${state.turn} begins.`, 'phase'); return true;
    }
    default: return false;
  }
}

function guideOptions(data: GameData, state: FighterGame) {
  const at = state.hero.location;
  if (!at) return [];
  const neighbors = adjacentLocations(data.board, at, 'guide');
  return Object.entries(state.citizens).flatMap(([citizen, entry]) => entry.status !== 'board' ? []
    : entry.location === at ? neighbors.map(destination => ({ citizen, destination }))
    : entry.location && neighbors.includes(entry.location) ? [{ citizen, destination: at }] : []);
}
function advanceOptions(data: GameData, state: FighterGame): Extract<HeroAction, { kind: 'advance' }>[] {
  return monsterIds.flatMap<Extract<HeroAction, { kind: 'advance' }>>(monster => state.monsters[monster].defeated || state.monsters[monster].location !== state.hero.location ? []
    : monster === 'beholder' ? data.monsters.beholder.eyestalks.every(eye => state.damagedEyes.includes(eye.min)) ? []
      : state.hero.items.map(item => ({ kind: 'advance' as const, monster, item }))
    : state.hero.items.flatMap(item => cellEntries(data).filter(cell => !state.displacement[cell.id] && cellFits(data, state, item, cell.id))
      .map(cell => ({ kind: 'advance' as const, monster, item, cell: cell.id }))));
}
function canPayExactly(data: GameData, state: FighterGame, target: number): boolean {
  const sums = new Set([0]);
  for (const id of state.hero.items) for (const sum of [...sums]) {
    const value = sum + itemDefinition(data, state, id)!.strength;
    if (value === target) return true;
    if (value < target) sums.add(value);
  }
  return false;
}
function movableEntities(state: FighterGame): string[] {
  return [...(state.hero.location ? ['hero'] : []), ...monsterIds.filter(id => !state.monsters[id].defeated && state.monsters[id].location),
    ...Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'board').map(([id]) => id)];
}
function perkReason(data: GameData, state: FighterGame, id: string): string | null {
  if (!state.hero.perks.includes(id)) return 'Choose an owned Perk.';
  switch (perkDefinition(data, state, id)?.id) {
    case 'perk-skeemo-weirdbottle': case 'perk-ott-steeltoes': return 'Available only when a d20 result is awaiting responses.';
    case 'perk-the-blackstaff': return 'This solo game has no other Hero to give Items.';
    case 'perk-mystra': return state.terror === 0 ? 'Terror is already zero.' : canPayExactly(data, state, 7) ? null : 'Requires Items totaling exactly 7 strength.';
    case 'perk-jarlaxle-baenre': return state.hero.effects.automatic20 ? 'An automatic 20 is already waiting for the next roll.' : null;
    case 'perk-mordenkainen': return movableEntities(state).length ? null : 'There are no on-board targets.';
    case 'perk-laeral-silverhand': return Object.values(state.lairs).some(lair => !lair.revealed) || monsterIds.some(monster => !state.monsters[monster].defeated) ? null : 'No unrevealed Lair or active Monster remains.';
    case 'perk-durnan': case 'perk-drizzt-dourden': case 'perk-renaer-neverember': return null;
    default: return 'This Perk has no supported effect.';
  }
}

function choiceReason(data: GameData, state: FighterGame, action: Extract<HeroAction, { kind: 'choose' }>): string | null {
  const choice = state.pending;
  if (!choice || action.choiceId !== choice.id) return 'This choice is no longer pending.';
  if (!Array.isArray(action.selected) || !distinct(action.selected) || action.selected.length < choice.min || action.selected.length > choice.max ||
    action.selected.some(id => !choice.options.some(option => option.id === id))) return 'Select the required number of eligible options.';
  if (choice.resume.kind === 'perk:mystra:pay' && totalStrength(data, state, action.selected) !== 7) return 'Mystra requires exactly 7 strength.';
  return null;
}

/** The same legality boundary serves human controls and future controllers. */
export function getActionReason(data: GameData, state: FighterGame, action: HeroAction): string | null {
  if (!action || typeof action !== 'object') return 'Choose a supported action.';
  if (state.phase === 'won' || state.phase === 'lost') return 'This game has ended.';
  if (action.kind === 'choose') return choiceReason(data, state, action);
  if (state.pending || state.roll || state.queue.length) return 'Finish the pending choice first.';
  if (state.phase !== 'hero') return 'Wait for the Hero Phase.';
  if (action.kind === 'end-phase') return null;
  if (action.kind === 'perk') return perkReason(data, state, action.perk);
  if (state.hero.actions <= 0) return 'No ordinary actions remain; Perks and End phase are still available.';
  if (!state.hero.location) return 'The Hero is off the board.';
  switch (action.kind) {
    case 'move':
      if (state.noMoveThisTurn) return 'Paralyzing Ray prevents the Move action this turn.';
      if (!adjacentLocations(data.board, state.hero.location, 'hero').includes(action.destination)) return 'Choose a connected destination.';
      if (!Array.isArray(action.escorts) || !distinct(action.escorts) || action.escorts.some(id => state.citizens[id]?.status !== 'board' || state.citizens[id].location !== state.hero.location)) return 'Only Citizens at your location can accompany you.';
      return null;
    case 'guide': return guideOptions(data, state).some(option => option.citizen === action.citizen && option.destination === action.destination) ? null : 'Guide a Citizen into or out of your location along an ordinary path.';
    case 'pick-up': return Array.isArray(action.items) && action.items.length > 0 && distinct(action.items) && action.items.every(id => state.boardItems[state.hero.location!].includes(id)) ? null : 'Choose Items at your location.';
    case 'advance': return advanceOptions(data, state).some(option => option.monster === action.monster && option.item === action.item && option.cell === action.cell) ? null : 'Choose a valid held Item and challenge at your location.';
    case 'defeat': {
      if (!monsterIds.includes(action.monster) || state.monsters[action.monster].defeated || state.monsters[action.monster].location !== state.hero.location) return 'The active Monster must share your location.';
      if (!Array.isArray(action.items) || !action.items.length || !ownedItems(state, action.items)) return 'Choose held Items to spend.';
      if (action.monster === 'beholder') {
        if (!data.monsters.beholder.eyestalks.every(eye => state.damagedEyes.includes(eye.min))) return 'Damage every eyestalk first.';
        if (action.items.some(id => itemDefinition(data, state, id)?.color !== 'yellow') || totalStrength(data, state, action.items) < 6) return 'Spend yellow Items totaling at least 6 strength.';
      } else {
        if (Object.keys(state.displacement).length < data.monsters.displacerBeast.advance.minimumItems) return `Place at least ${data.monsters.displacerBeast.advance.minimumItems} Items on the field first.`;
        if (totalStrength(data, state, action.items) < 7) return 'Spend Items totaling at least 7 strength.';
      }
      return null;
    }
    case 'reveal':
      if (!state.lairs[state.hero.location] || state.lairs[state.hero.location].revealed) return 'There is no face-down Lair at your location.';
      return Array.isArray(action.items) && ownedItems(state, action.items) && totalStrength(data, state, action.items) >= 3 ? null : 'Spend held Items totaling at least 3 strength.';
    case 'special': return null;
    default: return 'Choose a supported action.';
  }
}

function nearestMonsterTargets(data: GameData, state: FighterGame): { id: string; distance: number }[] {
  const from = state.hero.location!;
  const distances = new Map<string, number>([[from, 0]]), queue = [from];
  for (let index = 0; index < queue.length; index++) for (const next of adjacentLocations(data.board, queue[index], 'hero')) {
    if (!distances.has(next)) { distances.set(next, distances.get(queue[index])! + 1); queue.push(next); }
  }
  const candidates = monsterIds.filter(id => !state.monsters[id].defeated && state.monsters[id].location)
    .map(id => ({ id, distance: distances.get(state.monsters[id].location!) ?? Infinity }));
  const minimum = Math.min(...candidates.map(candidate => candidate.distance));
  return candidates.filter(candidate => Number.isFinite(candidate.distance) && candidate.distance === minimum);
}

function resolveHeroTask(task: Task, ctx: EngineContext): boolean {
  const { data, state } = ctx, selected = task.selected ?? [];
  switch (task.kind) {
    case 'fighter:result': {
      const result = task.result!;
      if (result === 1) ctx.log('The special action has no effect.');
      else if (result <= 8) {
        const nearest = nearestMonsterTargets(data, state);
        if (nearest.length === 1) ctx.prepend({ kind: 'walk', entity: 'hero', target: ctx.location(nearest[0].id)!, count: nearest[0].distance });
        else if (nearest.length > 1) ctx.ask('Choose a nearest Monster to approach.', nearest.map(candidate => ({ id: candidate.id, label: ctx.name(candidate.id) })), 1, 1, { kind: 'fighter:target' });
      } else if (result <= 15) { state.hero.effects.ignoreHits++; ctx.log('Saved protection against the Hits from one Monster attack.'); }
      else if (result <= 19) { state.hero.effects.skipMonsterCard = true; ctx.log('The next Monster-card draw this turn will be skipped.'); }
      else { state.hero.actions += 2; state.hero.allowance += 2; ctx.log('Gained two actions.'); }
      return true;
    }
    case 'fighter:target': {
      const target = nearestMonsterTargets(data, state).find(candidate => candidate.id === selected[0]);
      if (target) ctx.prepend({ kind: 'walk', entity: 'hero', target: ctx.location(target.id)!, count: target.distance });
      return true;
    }
    case 'beholder:advance': {
      if (task.result === 1) { ctx.log('The eyestalk strike missed.'); return true; }
      if (task.result === 20 && state.itemDiscard.includes(task.item!)) { state.itemDiscard = state.itemDiscard.filter(id => id !== task.item); state.hero.items.push(task.item!); ctx.log('Retrieved the Item used for the strike.'); }
      const eyes = data.monsters.beholder.eyestalks.filter(eye => !state.damagedEyes.includes(eye.min));
      ctx.ask('Choose eyestalks to damage.', eyes.map(eye => ({ id: String(eye.min), label: `${eye.name} (${eye.min}–${eye.max})` })), task.result! <= 15 ? 1 : 0, task.result === 20 ? 3 : task.result! >= 16 ? 2 : 1, { kind: 'beholder:damage' });
      return true;
    }
    case 'beholder:damage': state.damagedEyes.push(...selected.map(Number)); ctx.log(`Damaged ${selected.length} eyestalk${selected.length === 1 ? '' : 's'}.`); return true;
    case 'displacer:strike': {
      if (task.result === 1) {
        ctx.ask('Choose one Item to discard from the displacement field.', Object.entries(state.displacement).map(([id, item]) => ({ id, label: `${itemDefinition(data, state, item)?.name} at ${id}` })), 1, 1, { kind: 'displacer:discard' });
      } else if (task.result === 20 || cellEntries(data).some(cell => state.displacement[cell.id] && cell.values.includes(task.result!))) {
        if (task.result === 20) { state.hero.actions++; state.hero.allowance++; }
        defeatMonster(ctx, 'displacerBeast');
      } else {
        const options = Object.entries(state.displacement).flatMap(([from, item]) => cellEntries(data)
          .filter(cell => cell.id !== from && !state.displacement[cell.id] && cellFits(data, state, item, cell.id))
          .map(cell => ({ id: JSON.stringify({ from, to: cell.id }), label: `${itemDefinition(data, state, item)?.name}: ${from} → ${cell.id}` })));
        if (options.length) ctx.ask('The strike missed. Relocate one placed Item.', options, 1, 1, { kind: 'displacer:relocate' });
        else ctx.log('The strike missed; no legal field relocation is available.');
      }
      return true;
    }
    case 'displacer:discard': state.itemDiscard.push(state.displacement[selected[0]]); delete state.displacement[selected[0]]; ctx.log('Discarded one field Item.'); return true;
    case 'displacer:relocate': {
      const move = JSON.parse(selected[0]) as { from: string; to: string };
      state.displacement[move.to] = state.displacement[move.from]; delete state.displacement[move.from]; ctx.log('Relocated one field Item.'); return true;
    }
    case 'perk:durnan': if (selected.includes('hero')) ctx.place('hero', task.to!); return true;
    case 'perk:mordenkainen': ctx.prepend({ kind: 'walk', entity: selected[0], count: 4, optional: true }); return true;
    case 'perk:laeral': {
      const option = JSON.parse(selected[0]) as { lair?: string; monster?: MonsterId };
      if (option.lair) { state.lairs[option.lair].revealed = true; ctx.log(`Revealed the Lair at ${ctx.name(option.lair)}.`); }
      if (option.monster) ctx.prepend({ kind: 'relocate', entity: option.monster, to: option.monster === 'beholder' ? data.setup!.beholderLocation : data.setup!.displacerLocation, mode: 'move' });
      return true;
    }
    case 'perk:mystra:pay': ctx.discardItems(selected); ctx.changeTerror(-2); ctx.log('Mystra lowered Terror by two.'); return true;
    default: return false;
  }
}

function usePerk(ctx: EngineContext, perk: string) {
  const { data, state } = ctx, definition = perkDefinition(data, state, perk)!;
  consumePerk(state, perk); ctx.log(`Played ${definition.name}.`, 'action');
  switch (definition.id) {
    case 'perk-durnan': {
      state.hero.effects.skipMonsterPhase = true;
      const taproom = data.board.locations.find(location => location.name === 'The Yawning Portal: Taproom')?.id;
      if (taproom && state.hero.location) ctx.ask('Durnan: move to the Taproom?', [{ id: 'hero', label: 'Place the Hero at the Taproom (no escorts)' }], 0, 1, { kind: 'perk:durnan', to: taproom });
      break;
    }
    case 'perk-mordenkainen': ctx.ask('Choose a piece to move up to four locations.', movableEntities(state).map(id => ({ id, label: ctx.name(id) })), 1, 1, { kind: 'perk:mordenkainen' }); break;
    case 'perk-jarlaxle-baenre': state.hero.effects.automatic20 = true; break;
    case 'perk-laeral-silverhand': {
      const options = Object.entries(state.lairs).filter(([, lair]) => !lair.revealed).map(([lair]) => ({ id: JSON.stringify({ lair }), label: `Reveal the Lair at ${ctx.name(lair)}` }));
      options.push(...monsterIds.filter(monster => !state.monsters[monster].defeated).map(monster => ({ id: JSON.stringify({ monster }), label: `Return ${ctx.name(monster)} to its starting location` })));
      ctx.ask('Choose Laeral’s effect.', options, 1, 1, { kind: 'perk:laeral' }); break;
    }
    case 'perk-mystra': ctx.ask('Spend Items totaling exactly 7 strength.', state.hero.items.map(id => ({ id, label: `${itemDefinition(data, state, id)?.name} (${itemDefinition(data, state, id)?.strength})` })), 1, state.hero.items.length, { kind: 'perk:mystra:pay' }); break;
    case 'perk-drizzt-dourden': state.hero.actions += 2; state.hero.allowance += 2; break;
    case 'perk-renaer-neverember': ctx.log(`Placed ${drawBoardItems(state, 1)} Item from the bag.`); break;
  }
}

function applyAction(ctx: EngineContext, action: HeroAction) {
  const { state } = ctx;
  if (action.kind === 'choose') { const choice = state.pending!; state.pending = null; ctx.prepend({ ...choice.resume, selected: [...action.selected] }); return; }
  if (action.kind === 'end-phase') { state.phase = 'monster'; ctx.log('Monster Phase begins.', 'phase'); ctx.prepend({ kind: 'monster:start' }); return; }
  if (action.kind === 'perk') { usePerk(ctx, action.perk); return; }
  state.hero.actions--; ctx.log(`Used ${action.kind}.`, 'action');
  switch (action.kind) {
    case 'move': ctx.place('hero', action.destination, action.escorts); break;
    case 'guide': ctx.place(action.citizen, action.destination); break;
    case 'pick-up': state.boardItems[state.hero.location!] = state.boardItems[state.hero.location!].filter(id => !action.items.includes(id)); state.hero.items.push(...action.items); break;
    case 'advance':
      if (action.monster === 'beholder') { ctx.discardItems([action.item]); ctx.rollD20('Eyestalk strike', { kind: 'beholder:advance', item: action.item }); }
      else { state.hero.items = state.hero.items.filter(id => id !== action.item); state.displacement[action.cell!] = action.item; }
      break;
    case 'defeat':
      ctx.discardItems(action.items);
      if (action.monster === 'beholder') defeatMonster(ctx, 'beholder');
      else ctx.rollD20('Displacer strike', { kind: 'displacer:strike' });
      break;
    case 'reveal': ctx.discardItems(action.items); state.lairs[state.hero.location!].revealed = true; ctx.log('Revealed the Lair here.'); break;
    case 'special': {
      const hero = state.hero.definitionId.slice('hero-'.length);
      ctx.rollD20(`${hero[0].toUpperCase()}${hero.slice(1)} special action`, { kind: `${hero}:result` });
      break;
    }
  }
}

/** Atomic command execution. Invalid, duplicate, stale, or foreign commands never mutate input. */
export function dispatchGame(data: GameData, state: FighterGame, command: GameCommand): { state: FighterGame; error: string | null } {
  const bound = registeredData.get(data);
  if (!bound || bound.identity !== state.dataIdentity || bound.serialized !== JSON.stringify(data)) return { state, error: 'Game data changed or is not bound to this session. Reload the verified data.' };
  if (!command || typeof command.id !== 'string' || !command.id.length || command.id.length > 200) return { state, error: 'A command ID is required.' };
  if (state.commandIds.includes(command.id)) return { state, error: 'This command was already applied.' };
  if (command.actorSeatId !== SOLO_SEAT) return { state, error: 'This command belongs to another seat.' };
  if (command.revision !== state.revision) return { state, error: 'The game changed; choose again.' };
  const reason = getActionReason(data, state, command.action);
  if (reason) return { state, error: reason };
  const next = structuredClone(state), ctx = context(data, next);
  applyAction(ctx, command.action);
  let steps = 0;
  while (next.queue.length && !next.pending && next.phase !== 'won' && next.phase !== 'lost') {
    if (++steps > 2000) throw new Error('Game resolution exceeded its bounded task count.');
    const task = next.queue.shift()!;
    if (!resolveCoreTask(task, ctx) && !resolveHeroTask(task, ctx) && !resolveOtherHeroTask(task, ctx) && !resolveMonsterTask(task, ctx)) throw new Error(`Unsupported resolution task: ${task.kind}`);
  }
  next.revision++; next.commandIds.push(command.id); next.commands.push(structuredClone(command));
  return { state: next, error: null };
}

export function getFighterView(data: GameData, state: FighterGame) {
  const view = projectGame(state);
  const blocked = state.phase === 'won' || state.phase === 'lost' ? 'This game has ended.'
    : state.pending || state.roll || state.queue.length ? 'Finish the pending choice first.'
    : state.phase !== 'hero' ? 'Wait for the Hero Phase.' : null;
  const ordinary = blocked ?? (state.hero.actions <= 0 ? 'No ordinary actions remain.' : !state.hero.location ? 'The Hero is off the board.' : null);
  const moves = !ordinary && !state.noMoveThisTurn ? adjacentLocations(data.board, state.hero.location!, 'hero') : [];
  const guides = ordinary ? [] : guideOptions(data, state);
  const advances = ordinary ? [] : advanceOptions(data, state);
  const perks = state.hero.perks.map(id => ({ id, reason: blocked ?? perkReason(data, state, id) }));
  const defeat = monsterIds.some(monster => !getActionReason(data, state, { kind: 'defeat', monster, items: state.hero.items.filter(id => monster !== 'beholder' || itemDefinition(data, state, id)?.color === 'yellow') }));
  const actions: Record<string, string | null> = {
    move: ordinary ?? (moves.length ? null : state.noMoveThisTurn ? 'Paralyzing Ray prevents Move this turn.' : 'No connected destination.'),
    guide: ordinary ?? (guides.length ? null : 'No eligible Citizen nearby.'),
    'pick-up': ordinary ?? (state.hero.location && state.boardItems[state.hero.location].length ? null : 'No Items at your location.'),
    share: 'This solo game has no other Hero to share with.',
    advance: ordinary ?? (advances.length ? null : 'No eligible challenge and Item at your location.'),
    defeat: ordinary ?? (defeat ? null : 'A challenge, location, or Item cost is not ready.'),
    special: ordinary,
    perks: blocked ?? (perks.some(perk => !perk.reason) ? null : 'No Perk is playable at this time.'),
    reveal: getActionReason(data, state, { kind: 'reveal', items: state.hero.items }),
    'end-phase': getActionReason(data, state, { kind: 'end-phase' }),
  };
  const visibleItemIds = [...state.hero.items, ...Object.values(state.boardItems).flat(), ...state.itemDiscard, ...Object.values(state.displacement)];
  const visibleItems = Object.fromEntries(visibleItemIds.map(id => { const item = itemDefinition(data, state, id)!; return [id, { id, name: item.name, color: item.color, strength: item.strength }]; }));
  const visiblePerks = Object.fromEntries([...state.hero.perks, ...state.perkDiscard].map(id => { const perk = perkDefinition(data, state, id)!; return [id, { id, name: perk.name, effect: perk.effect }]; }));
  const locationLabel = (id: string | null) => {
    const place = data.board.locations.find(candidate => candidate.id === id);
    return place ? `${place.number === undefined ? '' : `#${place.number} · `}${place.name}` : id ?? 'off the board';
  };
  const pending = state.pending ? {
    id: state.pending.id, title: state.pending.title, options: structuredClone(state.pending.options),
    min: state.pending.min, max: state.pending.max, description: null as string | null, destination: null as string | null,
  } : null;
  if (pending && state.pending?.resume.kind === 'wizard:place') {
    const target = state.pending.resume.to;
    if (target) {
      const activation = state.rolls.at(-2);
      const destinationRoll = state.rolls.at(-1);
      const rollContext = activation?.reason === 'Wizard special action' && destinationRoll?.reason === 'Wizard destination'
        ? `The initial roll ${activation.result.effectiveResult} moves a Monster; destination roll ${destinationRoll.result.effectiveResult} selected ${locationLabel(target)}. ` : '';
      pending.title = `Move an existing Monster to ${locationLabel(target)}`;
      pending.description = `${rollContext}Choose an existing Monster already on the board. It moves from its current location; the setup pieces are already placed.`;
      pending.destination = target;
      pending.options = pending.options.map(option => ({ ...option,
        label: `${option.label}: move from ${locationLabel(state.monsters[option.id as MonsterId]?.location ?? null)} to ${locationLabel(target)}`,
      }));
    } else {
      const result = state.rolls.at(-1);
      const rollContext = result?.reason === 'Wizard special action' ? `Wizard special action result ${result.result.effectiveResult}. ` : '';
      pending.title = 'Choose where the Wizard moves';
      pending.description = `${rollContext}The Wizard is currently at ${locationLabel(state.hero.location)}. Choose one destination for the existing Hero piece.`;
      pending.options = pending.options.map(option => ({ ...option, label: locationLabel(option.id) }));
    }
  }
  return { ...view, actions, moveDestinations: moves, guideOptions: guides, advanceOptions: advances, perkOptions: perks, visibleItems, visiblePerks,
    pending,
    currentRoll: state.roll ? { reason: state.roll.reason, result: structuredClone(state.roll.result), turn: state.turn } : null,
    rolls: structuredClone(state.rolls) };
}
export type GameView = ReturnType<typeof getFighterView>;
