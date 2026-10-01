import { adjacentLocations } from './gamePrimitives.ts';
import { drawItem } from './horrifiedState.ts';
import type { EngineContext, Task } from './horrifiedRuntime';

const HERO = 'hero';

function heroLocation(ctx: EngineContext): string | null {
  return ctx.state.hero.location;
}

function boardDistance(ctx: EngineContext, from: string, to: string): number {
  if (from === to) return 0;
  const distances = new Map([[from, 0]]);
  const queue = [from];
  for (let index = 0; index < queue.length; index++) {
    for (const adjacent of adjacentLocations(ctx.data.board, queue[index], 'hero')) {
      if (distances.has(adjacent)) continue;
      const distance = distances.get(queue[index])! + 1;
      if (adjacent === to) return distance;
      distances.set(adjacent, distance);
      queue.push(adjacent);
    }
  }
  return Infinity;
}

function chooseEntity(ctx: EngineContext, task: Task, title: string, ids: string[]): string | null {
  if (!ids.length) return null;
  if (ids.length === 1) return ids[0];
  if (task.selected?.length === 1 && ids.includes(task.selected[0])) return task.selected[0];
  ctx.ask(title, ids.map(id => ({ id, label: ctx.name(id) })), 1, 1, task);
  return null;
}

function numberedDestination(ctx: EngineContext, result: number): string | null {
  return ctx.data.board.locations.find(location => location.kind === 'numbered' && location.number === result)?.id ?? null;
}

/** Other base Heroes use the same serializable queue, choice, and roll boundary as Fighter. */
export function resolveOtherHeroTask(task: Task, ctx: EngineContext): boolean {
  const { state, data } = ctx;
  const selected = task.selected ?? [];
  switch (task.kind) {
    case 'bard:result': {
      const result = task.result!;
      if (result === 1) ctx.log('The Bard ability had no effect.');
      else if (result <= 8) {
        const pool = Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location).map(([id]) => id);
        ctx.prepend({ kind: 'bard:move-all', pool, target: heroLocation(ctx) ?? undefined, count: 2, optional: true });
      } else if (result <= 15) {
        ctx.prepend({ kind: 'bard:move-all', pool: heroLocation(ctx) ? [HERO] : [], target: heroLocation(ctx) ?? undefined, count: 2, optional: true });
      } else if (result <= 19) {
        const pool = (['beholder', 'displacerBeast'] as const).filter(id => !state.monsters[id].defeated && state.monsters[id].location);
        ctx.prepend({ kind: 'bard:move-all', pool, source: heroLocation(ctx) ?? undefined, count: 2, optional: false });
      } else {
        const pool = [...Object.entries(state.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location).map(([id]) => id), HERO];
        ctx.ask('Choose one on-board Citizen or Hero to move to the Bard.', pool.map(id => ({ id, label: ctx.name(id) })), 1, 1, { kind: 'bard:bring' });
      }
      return true;
    }
    case 'bard:move-all': {
      const pool = task.pool ?? [];
      if (!pool.length) return true;
      const entity = chooseEntity(ctx, task, 'Choose who moves next', pool);
      if (!entity) return true;
      const remaining = pool.filter(id => id !== entity);
      ctx.prepend({ kind: 'walk', entity, target: task.target, source: task.source, count: task.count,
        optional: task.optional, after: [{ kind: 'bard:move-all', pool: remaining, target: task.target, source: task.source, count: task.count, optional: task.optional }] });
      return true;
    }
    case 'bard:bring': {
      const destination = heroLocation(ctx);
      if (destination && selected[0] && selected[0] !== HERO) ctx.prepend({ kind: 'relocate', entity: selected[0], to: destination, mode: 'move' });
      else ctx.log('The Bard remained at the current location.');
      return true;
    }
    case 'cleric:result': {
      const result = task.result!;
      if (result === 1) ctx.log('The Cleric ability had no effect.');
      else if (result <= 8) { state.hero.effects.clericRerollOne++; ctx.log('Saved one Monster-die reroll.'); }
      else if (result <= 15) { state.hero.effects.clericRerollAll++; ctx.log('Saved an all-nonblank Monster-dice reroll.'); }
      else if (result <= 19) { state.hero.effects.clericRescue++; ctx.log('Saved one Hero-defeat rescue.'); }
      else { state.hero.effects.clericOneDieAttacks++; ctx.log('Monster attacks use one die in this Monster Phase.'); }
      return true;
    }
    case 'rogue:result': {
      const result = task.result!;
      if (result === 1) ctx.log('The Rogue ability had no effect.');
      else if (result <= 8) ctx.log('There is no other Hero to share with in this solo game.');
      else if (result <= 15) {
        const origin = heroLocation(ctx);
        if (!origin) break;
        const occupied = Object.entries(state.boardItems).filter(([, items]) => items.length > 0)
          .map(([location]) => ({ location, distance: boardDistance(ctx, origin, location) }));
        const minimum = Math.min(...occupied.map(entry => entry.distance));
        const nearest = occupied.filter(entry => entry.distance === minimum && Number.isFinite(entry.distance)).map(entry => entry.location);
        if (nearest.length) ctx.ask('Choose one nearest location with Items.', nearest.map(id => ({ id, label: ctx.name(id) })), 1, 1, { kind: 'rogue:location' });
        else ctx.log('No board Items are available.');
      } else if (result <= 19) {
        const available = state.itemDiscard;
        if (available.length) ctx.ask('Choose up to two discarded Items.', available.map(id => ({ id, label: data.items.find(item => item.id === state.items[id].definitionId)?.name ?? 'Item' })),
          Math.min(2, available.length), Math.min(2, available.length), { kind: 'rogue:take-discard' });
        else ctx.log('No discarded Items are available.');
      } else {
        const drawn: string[] = [];
        for (let index = 0; index < 3; index++) { const id = drawItem(state); if (id) drawn.push(id); }
        state.hero.items.push(...drawn);
        ctx.log(`Rogue drew ${drawn.length} Item${drawn.length === 1 ? '' : 's'} from the bag.`);
      }
      return true;
    }
    case 'rogue:location': {
      const location = selected[0];
      const items = state.boardItems[location] ?? [];
      if (items.length) ctx.ask('Choose Items from this one location.', items.map(id => ({ id, label: data.items.find(item => item.id === state.items[id].definitionId)?.name ?? 'Item' })),
        Math.min(2, items.length), Math.min(2, items.length), { kind: 'rogue:take-board', to: location });
      return true;
    }
    case 'rogue:take-board': {
      const location = task.to!;
      state.boardItems[location] = state.boardItems[location].filter(id => !selected.includes(id));
      state.hero.items.push(...selected);
      ctx.log(`Rogue took ${selected.length} Item${selected.length === 1 ? '' : 's'} from ${ctx.name(location)}.`);
      return true;
    }
    case 'rogue:take-discard': {
      state.itemDiscard = state.itemDiscard.filter(id => !selected.includes(id));
      state.hero.items.push(...selected);
      ctx.log(`Rogue recovered ${selected.length} discarded Item${selected.length === 1 ? '' : 's'}.`);
      return true;
    }
    case 'wizard:result': {
      const result = task.result!;
      if (result === 1) ctx.log('The Wizard ability had no effect.');
      else if (result <= 15) ctx.rollD20('Wizard destination', { kind: 'wizard:destination', entity: result <= 8 ? 'monster' : HERO });
      else {
        const destinations = data.board.locations.map(location => ({ id: location.id, label: location.name }));
        ctx.ask(result === 20 ? 'Choose where the Wizard moves.' : 'Choose where the Hero moves.', destinations, 1, 1,
          { kind: 'wizard:place', mode: 'move' });
      }
      return true;
    }
    case 'wizard:destination': {
      const destination = numberedDestination(ctx, task.result!);
      if (!destination) { ctx.log('The rolled destination is unavailable.'); return true; }
      if (task.entity === 'monster') {
        const pool = (['beholder', 'displacerBeast'] as const).filter(id => !state.monsters[id].defeated && state.monsters[id].location);
        if (pool.length) ctx.ask('Choose a Monster to place.', pool.map(id => ({ id, label: ctx.name(id) })), 1, 1,
          { kind: 'wizard:place', to: destination, mode: 'move' });
      } else ctx.prepend({ kind: 'relocate', entity: HERO, to: destination, mode: 'move' });
      return true;
    }
    case 'wizard:place': {
      if (task.to) ctx.prepend({ kind: 'relocate', entity: selected[0], to: task.to, mode: task.mode });
      else if (selected[0]) ctx.prepend({ kind: 'relocate', entity: HERO, to: selected[0], mode: task.mode });
      return true;
    }
    default: return false;
  }
  return true;
}
