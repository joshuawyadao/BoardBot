import { describe, expect, it } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, dispatchGame } from '../engine/horrifiedGame';
import { decodeGameSave, encodeGameSave, validateLocalGameData } from './gameSave';

describe('executable named Citizen event data', () => {
  it('places the uniquely named Citizen and replays the completed Monster phase from a local save', async () => {
    const data = fighterFixture();
    data.monsterCards[0] = {
      id: 'card-visitor', printedId: 308, name: 'Visitor', quantity: 8, itemsDrawn: 0,
      activationSymbols: [], movement: 0, attackDice: 0, event: 'Synthetic Citizen arrival',
      citizenStartingLocation: 'a',
    };
    expect(validateLocalGameData(data)).toBe(data);
    const start = await createFighterGame(data, 17);
    const result = dispatchGame(data, start, {
      id: 'named-citizen-phase', revision: start.revision, actorSeatId: 'solo', action: { kind: 'end-phase' },
    });
    expect(result.error).toBeNull();
    expect(result.state.citizens['citizen-a']).toMatchObject({ location: 'a', status: 'board' });
    const restored = await decodeGameSave(encodeGameSave(data, result.state));
    expect(restored.game).toEqual(result.state);
  });
});
