import { adjacentLocations, awaySteps, nextInt, type Traversal } from './gamePrimitives';
import { drawBoardItems } from './horrifiedState';
import type { MonsterId } from './horrifiedState';
import type { ChoiceOption, EngineContext, Task } from './horrifiedRuntime';

const HERO = 'hero';
const monsters: MonsterId[] = ['beholder', 'displacerBeast'];

function cardOf(ctx: EngineContext) {
  const instance = ctx.state.currentCard ? ctx.state.monsterCards[ctx.state.currentCard] : undefined;
  return instance ? ctx.data.monsterCards.find(card => card.id === instance.definitionId) : undefined;
}

function locatedCharacters(ctx: EngineContext): string[] {
  const occupants = Object.entries(ctx.state.citizens)
    .filter(([, citizen]) => citizen.status === 'board' && citizen.location)
    .map(([id]) => id);
  if (ctx.state.hero.location) occupants.unshift(HERO);
  return occupants;
}

function distance(ctx: EngineContext, from: string, to: string, traversal: Traversal): number {
  if (from === to) return 0;
  const visited = new Set([from]);
  const queue = [{ location: from, steps: 0 }];
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    for (const neighbor of adjacentLocations(ctx.data.board, current.location, traversal)) {
      if (neighbor === to) return current.steps + 1;
      if (!visited.has(neighbor)) { visited.add(neighbor); queue.push({ location: neighbor, steps: current.steps + 1 }); }
    }
  }
  return Infinity;
}

function nearest(ctx: EngineContext, from: string, entities: string[], traversal: Traversal): string[] {
  const candidates = entities.map(entity => ({ entity, location: ctx.location(entity) }))
    .filter((candidate): candidate is { entity: string; location: string } => candidate.location !== null);
  const ranked = candidates.map(candidate => ({ entity: candidate.entity, distance: distance(ctx, from, candidate.location, traversal) }));
  const minimum = Math.min(...ranked.map(candidate => candidate.distance));
  return Number.isFinite(minimum) ? ranked.filter(candidate => candidate.distance === minimum).map(candidate => candidate.entity) : [];
}

function optionLabel(ctx: EngineContext, id: string): string {
  return ctx.state.items[id]
    ? ctx.data.items.find(item => item.id === ctx.state.items[id].definitionId)?.name ?? id
    : ctx.name(id);
}

function chooseOne(ctx: EngineContext, task: Task, title: string, ids: string[]): string | null {
  if (ids.length === 0) return null;
  if (ids.length === 1) return ids[0];
  if (task.selected?.length === 1 && ids.includes(task.selected[0])) return task.selected[0];
  ctx.ask(title, ids.map(id => ({ id, label: optionLabel(ctx, id) })), 1, 1, task);
  return null;
}

function symbolMonsters(ctx: EngineContext, symbol: string): MonsterId[] {
  if (symbol === 'crossed black symbol') return [];
  if (symbol === 'black flame') return ctx.state.monsters[ctx.state.frenzy].defeated ? [] : [ctx.state.frenzy];
  return monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
    ctx.data.monsters[monster].activationSymbols.includes(symbol));
}

function nextFrenzy(ctx: EngineContext): void {
  const available = monsters.filter(monster => !ctx.state.monsters[monster].defeated)
    .sort((a, b) => ctx.data.monsters[a].frenzyOrder - ctx.data.monsters[b].frenzyOrder);
  if (available.length < 2) return;
  const index = available.indexOf(ctx.state.frenzy);
  ctx.state.frenzy = available[(index + 1) % available.length];
}

function scheduleEvent(ctx: EngineContext, printedId: number): void {
  const task = (kind: string, extra: Task = { kind }): Task => ({ ...extra, kind });
  switch (printedId) {
    case 300: ctx.prepend(task('monster:event-300', { kind: '', monster: 'beholder' })); break;
    case 301: ctx.prepend(...monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
      ctx.data.monsters[monster].activationSymbols.includes('black pointed hat'))
      .map(monster => ({ kind: 'monster:event-walk', monster, target: ctx.state.hero.location ?? '', count: 3 }))
      .filter(move => move.target)); break;
    case 302: if (!ctx.state.monsters.beholder.defeated && ctx.state.hero.location) {
      ctx.prepend(task('relocate', { kind: '', entity: 'beholder', to: ctx.state.hero.location, mode: 'place' }));
    } break;
    case 303: ctx.prepend(...monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
      ctx.data.monsters[monster].activationSymbols.includes('green flask'))
      .map(monster => task('monster:event-303', { kind: '', monster }))); break;
    case 304: ctx.prepend(...monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
      ctx.data.monsters[monster].activationSymbols.includes('orange chest'))
      .map(monster => task('monster:event-304', { kind: '', monster }))); break;
    case 305: ctx.prepend(...monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
      ctx.data.monsters[monster].activationSymbols.includes('purple wand'))
      .map(monster => task('monster:event-305', { kind: '', monster }))); break;
    case 306: ctx.prepend(...monsters.filter(monster => !ctx.state.monsters[monster].defeated &&
      ctx.data.monsters[monster].activationSymbols.includes('red/orange sword'))
      .map(monster => task('monster:find-target', { kind: '', monster, count: 2, reason: 'event-movement' }))); break;
    case 307: if (!ctx.state.monsters.displacerBeast.defeated) ctx.rollD20('Displacer relocation', { kind: 'monster:event-307' }); break;
    case 312: ctx.drawPerk(); nextFrenzy(ctx); break;
    case 313: ctx.prepend(task('monster:event-313')); break;
    case 314: ctx.prepend(task('monster:event-314')); break;
    case 315: ctx.rollD20('Arcane relocation', { kind: 'monster:event-315' }); break;
    default: {
      const card = ctx.data.monsterCards.find(candidate => candidate.printedId === printedId);
      if (![308, 309, 310, 311, 316, 317, 318, 319, 320, 321].includes(printedId) || !card?.citizenStartingLocation) {
        throw new Error(`Unsupported Monster-card event ${printedId}.`);
      }
      ctx.prepend(task('monster:event-citizen', { kind: '', card: card.id }));
    }
  }
}

type DieFace = 'hit' | 'power' | 'blank';

function rollAttackDie(ctx: EngineContext): DieFace {
  const faces = ctx.data.dice.monsterDice.faceCounts;
  const hit = faces.hit_starburst ?? 0, power = faces.power_exclamation ?? 0, blank = faces.blank ?? 0;
  const total = hit + power + blank;
  if (total !== ctx.data.dice.monsterDice.facesPerDie || total === 0) throw new Error('Invalid Monster die distribution.');
  const draw = nextInt(ctx.state.random, total);
  ctx.state.random = draw.state;
  return draw.value < hit ? 'hit' : draw.value < hit + power ? 'power' : 'blank';
}

function rollAttackDice(ctx: EngineContext, count: number): DieFace[] {
  return Array.from({ length: count }, () => rollAttackDie(ctx));
}

function updateAttackCounts(attack: NonNullable<EngineContext['state']['attack']>): void {
  attack.hits = attack.faces.filter(face => face === 'hit').length;
  attack.powers = attack.faces.filter(face => face === 'power').length;
}

function finishAttack(ctx: EngineContext): void {
  ctx.state.attack = null;
}

/** Handles monster-prefixed continuations; unrelated work stays in the core engine. */
export function resolveMonsterTask(task: Task, ctx: EngineContext): boolean {
  if (!task.kind.startsWith('monster:')) return false;
  const state = ctx.state;
  switch (task.kind) {
    case 'monster:start': {
      state.phase = 'monster';
      if (state.hero.effects.skipMonsterPhase || state.hero.effects.skipMonsterCard) {
        ctx.log('The Monster Phase was skipped.', 'phase');
        ctx.prepend({ kind: 'turn:start' });
        break;
      }
      const cardId = state.monsterDeck.shift();
      if (!cardId) {
        state.phase = 'lost'; state.endReason = 'The Monster deck is empty when a draw is required.';
        ctx.log('The Monster deck was exhausted when a draw was required.', 'end');
        break;
      }
      state.currentCard = cardId;
      const card = cardOf(ctx);
      if (!card) throw new Error('Drawn Monster card has no definition.');
      ctx.log(`Monster card drawn: ${card.name}.`, 'phase');
      ctx.prepend({ kind: 'monster:items', count: card.itemsDrawn },
        { kind: 'monster:event' },
        ...card.activationSymbols.map((symbol, index) => ({ kind: 'monster:symbol', symbol, index, movement: card.movement, dice: card.attackDice })),
        { kind: 'monster:finish' });
      break;
    }
    case 'monster:items': {
      const count = drawBoardItems(state, task.count ?? 0);
      ctx.log(`${count} Item${count === 1 ? '' : 's'} placed.`, 'effect');
      break;
    }
    case 'monster:event': {
      const card = cardOf(ctx);
      if (card) scheduleEvent(ctx, card.printedId);
      break;
    }
    case 'monster:symbol': {
      const eligible = task.pool ?? symbolMonsters(ctx, task.symbol ?? '');
      if (eligible.length === 0) break;
      const selected = chooseOne(ctx, task, 'Choose the next Monster to activate', eligible);
      if (!selected) break;
      ctx.prepend({ kind: 'monster:activate', monster: selected as MonsterId, movement: task.movement, dice: task.dice },
        ...(eligible.length > 1 ? [{ ...task, pool: eligible.filter(monster => monster !== selected), selected: undefined }] : []));
      break;
    }
    case 'monster:activate': {
      if (!task.monster || state.monsters[task.monster].defeated) break;
      ctx.prepend({ kind: 'monster:find-target', monster: task.monster, count: task.movement, dice: task.dice, reason: 'attack-movement' });
      break;
    }
    case 'monster:find-target': {
      const monster = task.monster;
      if (!monster || state.monsters[monster].defeated) break;
      const position = state.monsters[monster].location;
      if (!position) break;
      const candidates = nearest(ctx, position, locatedCharacters(ctx), 'monster');
      if (!candidates.length) break;
      const preferred = candidates.includes(HERO) ? [HERO] : candidates;
      const selected = chooseOne(ctx, task, 'Choose the Monster target', preferred);
      if (!selected) break;
      const target = ctx.location(selected);
      if (!target) break;
      ctx.prepend({ kind: 'walk', entity: monster, target, count: task.count ?? 0,
        reason: task.reason, optional: false,
        after: task.reason === 'attack-movement' ? [{ kind: 'monster:attack-start', monster, dice: task.dice }] : [] });
      break;
    }
    case 'monster:attack-start': {
      const monster = task.monster;
      if (!monster || state.monsters[monster].defeated) break;
      const position = state.monsters[monster].location;
      if (!position) break;
      const atLocation = locatedCharacters(ctx).filter(entity => ctx.location(entity) === position);
      if (!atLocation.length) break;
      const preferred = atLocation.includes(HERO) ? [HERO] : atLocation;
      const selected = chooseOne(ctx, task, 'Choose who the Monster attacks', preferred);
      if (!selected) break;
      const count = state.hero.definitionId === 'hero-cleric' && state.hero.effects.clericOneDieAttacks > 0 ? Math.min(1, task.dice ?? 0) : task.dice ?? 0;
      const faces = rollAttackDice(ctx, count);
      state.attack = { id: ++state.taskSerial, monster, target: selected, hits: 0, powers: 0, cancelled: false, faces };
      updateAttackCounts(state.attack);
      ctx.log(`${ctx.name(monster)} rolled ${state.attack.powers} power and ${state.attack.hits} hit results.`, 'roll');
      ctx.prepend({ kind: 'monster:attack-reroll', attackId: state.attack.id });
      break;
    }
    case 'monster:attack-reroll': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId) break;
      const rerollable = attack.faces.flatMap((face, index) => face === 'blank' ? [] : [index]);
      const effects = state.hero.effects;
      if (state.hero.definitionId !== 'hero-cleric' || !rerollable.length || effects.clericRerollOne + effects.clericRerollAll === 0) {
        ctx.prepend({ kind: 'monster:attack-power', attackId: attack.id }); break;
      }
      if (!task.selected) {
        const options: ChoiceOption[] = [{ id: 'pass', label: 'Keep these dice' }];
        if (effects.clericRerollOne) options.push(...rerollable.map(index => ({ id: `one:${index}`, label: `Reroll die ${index + 1} (${attack.faces[index]})` })));
        if (effects.clericRerollAll) options.push({ id: 'all', label: 'Reroll every Hit or Power die' });
        ctx.ask('Use a saved Cleric reroll before resolving Powers and Hits?', options, 1, 1, task);
        break;
      }
      const selection = task.selected[0];
      if (selection === 'pass') { ctx.prepend({ kind: 'monster:attack-power', attackId: attack.id }); break; }
      if (selection === 'all' && effects.clericRerollAll > 0) {
        effects.clericRerollAll--;
        for (const index of rerollable) attack.faces[index] = rollAttackDie(ctx);
      } else if (selection.startsWith('one:') && effects.clericRerollOne > 0) {
        const index = Number(selection.slice(4));
        if (!rerollable.includes(index)) throw new Error('Invalid Cleric die selection.');
        effects.clericRerollOne--;
        attack.faces[index] = rollAttackDie(ctx);
      } else throw new Error('Invalid Cleric reroll selection.');
      updateAttackCounts(attack);
      ctx.log(`Cleric reroll left ${attack.powers} power and ${attack.hits} hit results.`, 'roll');
      ctx.prepend({ kind: 'monster:attack-reroll', attackId: attack.id });
      break;
    }
    case 'monster:attack-power': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId) break;
      if (attack.cancelled) { finishAttack(ctx); break; }
      if (attack.powers === 0) { ctx.prepend({ kind: 'monster:attack-hits', attackId: attack.id }); break; }
      attack.powers--;
      if (attack.monster === 'beholder') ctx.rollD20('Beholder eye', { kind: 'monster:beholder-ray', attackId: attack.id });
      else ctx.prepend({ kind: 'monster:displacer-power', attackId: attack.id });
      break;
    }
    case 'monster:beholder-ray': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId || task.result === undefined) break;
      let effect: Task | null = null;
      const eyestalk = ctx.data.monsters.beholder.eyestalks.find(
        eye => task.result! >= eye.min && task.result! <= eye.max,
      );
      if (eyestalk && state.damagedEyes.includes(eyestalk.min)) {
        if (state.hero.location && state.hero.items.length) effect = { kind: 'discard', amount: 1, reason: 'Antimagic eye' };
      } else {
        const ray = [...ctx.data.monsters.beholder.rays.front, ...ctx.data.monsters.beholder.rays.back]
          .find(candidate => task.result! >= candidate.min && task.result! <= candidate.max);
        if (ray) effect = { kind: 'monster:ray-effect', result: task.result, attackId: attack.id };
      }
      ctx.prepend(...(effect ? [effect] : []), { kind: 'monster:attack-power', attackId: attack.id });
      break;
    }
    case 'monster:ray-effect': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId) break;
      const result = task.result ?? 0;
      if (result === 1) { attack.cancelled = true; break; }
      if (result <= 3) {
        const eligible = Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'waiting' || citizen.status === 'board').map(([id]) => id);
        const selected = chooseOne(ctx, task, 'Choose a Citizen drawn by the ray', eligible);
        if (selected && state.monsters.beholder.location) ctx.place(selected, state.monsters.beholder.location);
      } else if (result <= 5) {
        if (state.hero.location) {
          if (state.hero.items.length) ctx.prepend({ kind: 'discard', amount: 1, reason: 'Paralyzing ray' });
          state.hero.penalties.noMove = true;
        }
      } else if (result <= 7) {
        const source = state.monsters.beholder.location;
        if (source) ctx.prepend(...locatedCharacters(ctx).map(entity =>
          ({ kind: 'monster:fear', entity, source, target: ctx.location(entity)! })));
      } else if (result <= 9) {
        if (state.hero.location) {
          if (state.hero.items.length) ctx.prepend({ kind: 'monster:ray-choice', result, attackId: attack.id });
          else state.hero.penalties.fewerActions = Math.max(1, state.hero.penalties.fewerActions);
        }
      } else if (result <= 11) {
        if (state.hero.location && state.hero.items.length > 2) ctx.prepend({ kind: 'monster:ray-choice', result, attackId: attack.id });
      } else if (result <= 13) {
        if (state.hero.location && state.hero.items.length && state.monsters.beholder.location) ctx.prepend({ kind: 'discard', amount: 1, to: state.monsters.beholder.location, reason: 'Telekinetic ray' });
      } else if (result <= 15) {
        if (state.hero.location) ctx.prepend(...monsters.filter(monster => !state.monsters[monster].defeated)
          .map(monster => ({ kind: 'walk', entity: monster, target: state.hero.location!, count: 1, optional: false })));
      } else if (result <= 17) {
        if (state.hero.location) {
          if (state.hero.items.length) ctx.prepend({ kind: 'monster:ray-choice', result, attackId: attack.id });
          else state.hero.penalties.skipTurn = true;
        }
      } else if (result <= 19) {
        const source = state.monsters.beholder.location;
        if (source) {
          const selected = chooseOne(ctx, task, 'Choose the closest character hit by the ray', nearest(ctx, source, locatedCharacters(ctx), 'monster'));
          if (selected) ctx.prepend({ kind: 'damage', entity: selected, amount: 1, reason: 'Disintegration ray' });
        }
      } else ctx.changeTerror(1);
      break;
    }
    case 'monster:fear': {
      if (!task.entity || !task.source) break;
      const position = ctx.location(task.entity);
      // A Citizen escorted by the Hero already took its step. This also
      // excludes Citizens rescued during that step from moving again.
      if (!position || position !== task.target) break;
      const candidates = awaySteps(ctx.data.board, position, task.source, task.entity === HERO ? 'hero' : 'guide');
      const selected = chooseOne(ctx, task, 'Choose a location away from Beholder', candidates);
      if (selected) {
        if (task.entity === HERO) ctx.prepend({ kind: 'relocate', entity: HERO, to: selected, mode: 'move' });
        else ctx.place(task.entity, selected);
      }
      break;
    }
    case 'monster:ray-choice': {
      const result = task.result ?? 0;
      if (result <= 9 || result <= 17 && result >= 16) {
        const penalty = result <= 9 ? 'take-penalty' : 'skip-turn';
        if (!task.selected) {
          ctx.ask('Choose a response to the ray', [{ id: 'discard', label: 'Discard one Item' }, { id: penalty, label: 'Accept the penalty' }], 1, 1, task);
          break;
        }
        if (task.selected[0] === 'discard') ctx.prepend({ kind: 'discard', amount: 1, reason: 'Eye ray' });
        else if (result <= 9) state.hero.penalties.fewerActions = Math.max(1, state.hero.penalties.fewerActions);
        else state.hero.penalties.skipTurn = true;
      } else if (result <= 11 && result >= 10) {
        const excess = state.hero.items.length - 2;
        if (excess <= 0) break;
        if (!task.selected) { ctx.ask('Discard Items down to two', state.hero.items.map(id => ({ id, label: optionLabel(ctx, id) })), excess, excess, task); break; }
        ctx.discardItems(task.selected);
      }
      break;
    }
    case 'monster:displacer-power': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId) break;
      if (attack.target !== HERO && state.hero.location) {
        ctx.place('displacerBeast', state.hero.location);
        attack.target = HERO;
      }
      ctx.prepend({ kind: 'monster:attack-power', attackId: attack.id });
      break;
    }
    case 'monster:attack-hits': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId) break;
      if (attack.cancelled || attack.hits === 0 || ctx.location(attack.target) !== state.monsters[attack.monster].location) { finishAttack(ctx); break; }
      if (attack.target === HERO && state.hero.effects.ignoreHits > 0) {
        ctx.ask('Use Fighter protection against these hits?', [{ id: 'ignore', label: 'Ignore all hits' }, { id: 'allow', label: 'Resolve hits normally' }], 1, 1,
          { kind: 'monster:attack-hits-choice', attackId: attack.id });
      } else {
        ctx.prepend({ kind: 'damage', entity: attack.target, amount: attack.hits, reason: 'Monster attack' });
        finishAttack(ctx);
      }
      break;
    }
    case 'monster:attack-hits-choice': {
      const attack = state.attack;
      if (!attack || attack.id !== task.attackId || !task.selected) break;
      if (task.selected[0] === 'ignore') state.hero.effects.ignoreHits--;
      else ctx.prepend({ kind: 'damage', entity: attack.target, amount: attack.hits, reason: 'Monster attack' });
      finishAttack(ctx);
      break;
    }
    case 'monster:event-citizen': {
      const card = ctx.data.monsterCards.find(candidate => candidate.id === task.card);
      const citizen = ctx.data.citizens.find(candidate => candidate.name === card?.name);
      if (!citizen || !card?.citizenStartingLocation) throw new Error('Named Citizen event has no matching Citizen.');
      if (['waiting', 'board'].includes(state.citizens[citizen.id]?.status)) ctx.place(citizen.id, card.citizenStartingLocation);
      break;
    }
    case 'monster:event-300': {
      const location = state.monsters.beholder.location;
      if (!location || state.monsters.beholder.defeated) break;
      const occupied = Object.keys(state.boardItems).filter(id => state.boardItems[id].length);
      const minimum = Math.min(...occupied.map(id => distance(ctx, location, id, 'monster')));
      if (!Number.isFinite(minimum)) break;
      const candidates = occupied.filter(id => distance(ctx, location, id, 'monster') === minimum);
      const selected = chooseOne(ctx, task, 'Choose the closest Items location', candidates);
      if (!selected) break;
      ctx.place('beholder', selected);
      ctx.prepend({ kind: 'monster:event-300-discard', to: selected });
      break;
    }
    case 'monster:event-300-discard': {
      const ids = state.boardItems[task.to ?? ''] ?? [];
      if (!ids.length) break;
      const strength = (id: string) => ctx.data.items.find(item => item.id === state.items[id].definitionId)?.strength ?? 0;
      const maximum = Math.max(...ids.map(strength));
      const selected = chooseOne(ctx, task, 'Choose a highest-strength Item to discard', ids.filter(id => strength(id) === maximum));
      if (!selected) break;
      state.boardItems[task.to!].splice(state.boardItems[task.to!].indexOf(selected), 1);
      state.itemDiscard.push(selected);
      break;
    }
    case 'monster:event-walk': {
      if (task.monster && task.target && !state.monsters[task.monster].defeated) ctx.prepend({ kind: 'walk', entity: task.monster, target: task.target, count: task.count, optional: false });
      break;
    }
    case 'monster:event-303': {
      if (!task.monster || state.monsters[task.monster].defeated) break;
      const location = state.monsters[task.monster].location;
      if (!location) break;
      const victims = locatedCharacters(ctx).filter(entity => ctx.location(entity) === location);
      ctx.prepend(...victims.flatMap(entity => {
        const damageId = ++state.taskSerial;
        return [{ kind: 'damage', entity, amount: 1, reason: 'Monster event', damageId },
          { kind: 'monster:event-303-survivor', entity, source: location, damageId }];
      }));
      break;
    }
    case 'monster:event-303-survivor': {
      const outcome = task.damageId === undefined ? undefined : state.damageOutcomes[task.damageId];
      if (outcome !== 'survived' || !task.entity || ctx.location(task.entity) !== task.source) {
        if (task.damageId !== undefined) delete state.damageOutcomes[task.damageId];
        break;
      }
      const options = adjacentLocations(ctx.data.board, ctx.location(task.entity)!, task.entity === HERO ? 'hero' : 'guide');
      const selected = chooseOne(ctx, task, 'Choose a survivor destination', options);
      if (!selected && options.length) break;
      if (task.damageId !== undefined) delete state.damageOutcomes[task.damageId];
      if (selected) ctx.place(task.entity, selected);
      break;
    }
    case 'monster:event-304': {
      if (!task.monster || state.monsters[task.monster].defeated) break;
      const location = state.monsters[task.monster].location;
      if (!location) break;
      const lairs = Object.keys(state.lairs);
      const minimum = Math.min(...lairs.map(id => distance(ctx, location, id, 'monster')));
      if (!Number.isFinite(minimum)) break;
      const selected = chooseOne(ctx, task, 'Choose the nearest Lair', lairs.filter(id => distance(ctx, location, id, 'monster') === minimum));
      if (selected) ctx.place(task.monster, selected);
      break;
    }
    case 'monster:event-305': {
      if (!task.monster || !state.hero.location || state.monsters[task.monster].defeated) break;
      const target = state.monsters[task.monster].location;
      if (target) ctx.prepend({ kind: 'walk', entity: HERO, target, count: 3, optional: false });
      break;
    }
    case 'monster:event-307': {
      if (task.result === undefined || state.monsters.displacerBeast.defeated) break;
      const destination = ctx.data.board.locations.find(location => location.number === task.result)?.id;
      if (destination && task.result !== 1) ctx.place('displacerBeast', destination);
      break;
    }
    case 'monster:event-313': {
      for (const monster of monsters) {
        if (!state.monsters[monster].defeated) ctx.place(monster,
          monster === 'beholder' ? ctx.data.setup!.beholderLocation : ctx.data.setup!.displacerLocation);
      }
      ctx.prepend(...Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location)
        .map(([entity]) => ({ kind: 'walk', entity, target: ctx.data.citizens.find(citizen => citizen.id === entity)!.safeDestination,
          count: 1, optional: false })));
      break;
    }
    case 'monster:event-314': {
      if (!task.selected) {
        const options: ChoiceOption[] = state.hero.items.map(id => ({ id, label: optionLabel(ctx, id) }));
        if (options.length) { ctx.ask('Choose Items for the trial', options, 0, options.length, task); break; }
      }
      const selected = task.selected ?? [];
      const modifier = selected.reduce((total, id) => total + (ctx.data.items.find(item => item.id === state.items[id]?.definitionId)?.strength ?? 0), 0);
      ctx.discardItems(selected);
      ctx.rollD20('Trial of Valor', { kind: 'monster:event-314-result', modifier }, modifier);
      break;
    }
    case 'monster:event-314-result': if ((task.result ?? 0) < 20) ctx.changeTerror(1); break;
    case 'monster:event-315': {
      if (task.result === undefined) break;
      const destination = ctx.data.board.locations.find(location => location.number === task.result)?.id;
      if (destination && task.result !== 1 && state.hero.location) ctx.place(HERO, destination);
      nextFrenzy(ctx);
      break;
    }
    case 'monster:finish': {
      if (state.currentCard) state.monsterDiscard.push(state.currentCard);
      state.currentCard = null;
      ctx.prepend({ kind: 'turn:start' });
      break;
    }
    default: throw new Error(`Unknown monster task: ${task.kind}`);
  }
  return true;
}
