import { describe, expect, it } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, getFighterView } from '../engine/horrifiedGame';
import { actionOutcomeSummary, changedBoardLocations } from './actionFeedback';

async function views() {
  const data = fighterFixture();
  const state = await createFighterGame(data, 9);
  return { data, state, before: getFighterView(data, state), after: getFighterView(data, state) };
}

describe('recent public board changes', () => {
  it('marks only visible origins and destinations when pieces move', async () => {
    const { before, after } = await views();
    const start = before.hero.location!;
    const destination = Object.keys(after.boardItems).find(id => id !== start)!;
    after.hero.location = destination;
    after.boardItems[destination] = [...(after.boardItems[destination] ?? []), 'visible-item'];
    expect(changedBoardLocations(before, after)).toEqual(expect.arrayContaining([start, destination]));
    expect(changedBoardLocations(before, after)).toHaveLength(2);
  });

  it('tracks board citizen and Lair changes without exposing a hidden face', async () => {
    const { before, after } = await views();
    const location = before.hero.location!;
    after.citizens['synthetic-citizen'] = { status: 'board', location };
    after.lairs[location] = { revealed: false };
    expect(changedBoardLocations(before, after)).toContain(location);
    const revealed = structuredClone(after);
    revealed.lairs[location] = { revealed: true, definitionId: 'hidden-face' };
    expect(changedBoardLocations(after, revealed)).toEqual([location]);
    const sameBack = structuredClone(after);
    sameBack.lairs[location] = { revealed: false, definitionId: 'unseen-different-face' };
    expect(changedBoardLocations(after, sameBack)).toEqual([]);
  });

  it('ignores ordering of identical public Item membership and unchanged views', async () => {
    const { before, after } = await views();
    expect(changedBoardLocations(before, after)).toEqual([]);
    const location = Object.keys(after.boardItems).find(id => (after.boardItems[id]?.length ?? 0) > 1);
    if (!location) {
      after.boardItems[before.hero.location!] = ['item-a', 'item-b'];
      before.boardItems[before.hero.location!] = ['item-b', 'item-a'];
    } else after.boardItems[location] = [...after.boardItems[location]].reverse();
    expect(changedBoardLocations(before, after)).toEqual([]);
  });
  it('describes visible Move and Pick Up outcomes without deriving hidden card data', async () => {
    const { data, before, after } = await views();
    const destination = data.board.locations.find(location => location.id !== before.hero.location)!.id;
    after.hero.location = destination;
    expect(actionOutcomeSummary(data, before, after, 'move')).toBe(
      `Moved from ${data.board.locations.find(location => location.id === before.hero.location)!.name} to ${data.board.locations.find(location => location.id === destination)!.name}.`,
    );
    const item = Object.keys(after.visibleItems)[0];
    const picked = structuredClone(after);
    picked.hero.items.push(item);
    expect(actionOutcomeSummary(data, after, picked, 'pick-up')).toContain(picked.visibleItems[item].name);
    expect(actionOutcomeSummary(data, before, before, 'move')).toBeUndefined();
  });

});
