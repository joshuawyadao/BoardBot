import type { GameData } from '../data/gameData';
import type { HeroAction } from '../engine/horrifiedRuntime';
import type { GameView } from '../engine/horrifiedGame';

/** Compare only what the player can see on each floor, never logs or hidden engine tasks. */
export function changedBoardLocations(previous: GameView, next: GameView): string[] {
  const locations = new Set<string>();
  for (const view of [previous, next]) {
    for (const id of [...Object.keys(view.boardItems), ...Object.keys(view.lairs)]) locations.add(id);
    if (view.hero.location) locations.add(view.hero.location);
    for (const monster of Object.values(view.monsters)) if (!monster.defeated && monster.location) locations.add(monster.location);
    for (const citizen of Object.values(view.citizens)) if (citizen.status === 'board' && citizen.location) locations.add(citizen.location);
  }
  const contents = (view: GameView, id: string) => JSON.stringify({
    hero: view.hero.location === id,
    monsters: Object.entries(view.monsters).filter(([, monster]) => !monster.defeated && monster.location === id).map(([name]) => name).sort(),
    citizens: Object.entries(view.citizens).filter(([, citizen]) => citizen.status === 'board' && citizen.location === id).map(([name]) => name).sort(),
    items: [...view.boardItems[id] ?? []].sort(),
    lair: view.lairs[id] ? { revealed: view.lairs[id].revealed } : null,
  });
  return [...locations].filter(id => contents(previous, id) !== contents(next, id)).sort();
}

/** Replace generic action markers with the visible outcome, without altering saved event text. */
export function actionOutcomeSummary(data: GameData, previous: GameView, next: GameView, kind: HeroAction['kind']): string | undefined {
  const locationName = (id: string | null) => data.board.locations.find(location => location.id === id)?.name ?? 'off the board';
  if (kind === 'move' && previous.hero.location !== next.hero.location) {
    return `Moved from ${locationName(previous.hero.location)} to ${locationName(next.hero.location)}.`;
  }
  if (kind === 'pick-up') {
    const added = next.hero.items.filter(id => !previous.hero.items.includes(id));
    if (added.length) {
      const names = added.map(id => next.visibleItems[id]?.name ?? 'Item');
      return `Picked up ${added.length} Item${added.length === 1 ? '' : 's'}: ${names.join(', ')}.`;
    }
  }
  return undefined;
}
