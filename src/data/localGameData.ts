import { hasUniqueNamedCitizen, isCitizenMonsterEventId, isSupportedMonsterEventId, validateGameData } from './gameData.ts';
import type { GameData } from './gameData.ts';

export const MAX_SAVE_LENGTH = 8 * 1024 * 1024;

/** Bound imported synthetic quantities as well as owner-verified data before expanding pieces. */
export function validateLocalGameData(input: unknown): GameData {
  const data = validateGameData(input);
  if (data.monsterCards.some(card => !isSupportedMonsterEventId(card.printedId))) {
    throw new Error('The imported data contains a Monster-card event with no supported resolution.');
  }
  if (data.monsterCards.some(card => isCitizenMonsterEventId(card.printedId) && !card.citizenStartingLocation)) {
    throw new Error('The imported data contains a citizen Monster-card event without a starting location.');
  }
  if (data.monsterCards.some(card => isCitizenMonsterEventId(card.printedId) && !hasUniqueNamedCitizen(card.name, data.citizens))) {
    throw new Error('The imported data contains a named Citizen Monster-card event without exactly one matching Citizen.');
  }
  const cards = [...data.monsterCards, ...data.perks, ...data.lairTokens.faces];
  if (cards.reduce((sum, card) => sum + card.quantity, 0) > 1000 ||
    data.items.reduce((sum, item) => sum + item.quantity, 0) > 1000 || data.board.locations.length > 500 ||
    data.citizens.length > 100 || data.dice.monsterDice.quantity > 100 ||
    data.monsterCards.some(card => card.movement > 1000 || card.itemsDrawn > 1000)) {
    throw new Error('The imported data exceeds the supported local game size.');
  }
  return data;
}
