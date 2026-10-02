import type { GameData } from '../../data/gameData';
import { setupFixture } from './setupFixture';

/** Invented labels/map/resources; semantic IDs exercise compiled game behavior. */
export function fighterFixture(): GameData {
  const data = setupFixture();
  data.monsterCards = [{ id: 'card-rest', printedId: 313, name: 'Synthetic return', quantity: 8, itemsDrawn: 0,
    activationSymbols: [], movement: 0, attackDice: 0, event: 'Synthetic test event' }];
  data.perks = ['drizzt-dourden', 'jarlaxle-baenre', 'ott-steeltoes', 'skeemo-weirdbottle', 'mordenkainen', 'durnan', 'mystra', 'laeral-silverhand', 'renaer-neverember', 'the-blackstaff']
    .map((key, index) => ({ id: `perk-${key}`, name: `Test Perk ${index + 1}`, quantity: 2, effect: 'Synthetic effect reference' }));
  data.items.forEach((item, index) => { item.strength = index % 6 + 1; item.color = index % 2 ? 'yellow' : 'blue'; });
  data.monsters.beholder.eyestalks = Array.from({ length: 10 }, (_, index) => ({ min: index * 2 + 2, max: Math.min(20, index * 2 + 3), name: `Eye ${index + 1}` }));
  data.monsters.beholder.damageMarkers = 10; data.setup!.beholderDamageMarkers = 10;
  data.monsters.beholder.rays = {
    front: [{ min: 1, max: 1, name: 'Ray 1', effect: 'Synthetic effect' }, ...Array.from({ length: 5 }, (_, index) => ({ min: index * 2 + 2, max: index * 2 + 3, name: `Ray ${index + 2}`, effect: 'Synthetic effect' }))],
    back: Array.from({ length: 5 }, (_, index) => ({ min: index * 2 + 12, max: Math.min(20, index * 2 + 13), name: `Ray ${index + 7}`, effect: 'Synthetic effect' })),
  };
  data.monsters.displacerBeast.advance.minimumItems = 5;
  data.monsters.displacerBeast.advance.grid = [[[2], [3], [4]], [[5, 6], [7, 8], [9, 10]], [[11, 12, 13], [14, 15, 16], [17, 18, 19]]];
  data.dice.monsterDice = { quantity: 3, facesPerDie: 6, faceCounts: { hit_starburst: 3, power_exclamation: 1, blank: 2 } };
  return data;
}
