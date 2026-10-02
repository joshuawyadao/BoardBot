import type { GameData } from '../../data/gameData';
import { RULESET_VERSION } from '../decisionPolicies';
import { fighterFixture } from './fighterFixture';

/** Invented components make every Beholder activation resolve two POW rays. */
export function slowingFixture(version = RULESET_VERSION): GameData {
  const data = fighterFixture();
  data.interpretationVersion = version;
  data.heroes[0].start = 'b';
  data.setup!.beholderLocation = 'b';
  data.board.monsterStarts.find(start => start.number === 4)!.location = 'b';
  data.monsterCards = [{ id: 'card-slowing', printedId: 312, name: 'Synthetic ray trial', quantity: 8,
    itemsDrawn: 0, activationSymbols: ['red shield'], movement: 0, attackDice: 2, event: 'Synthetic event' }];
  data.dice.monsterDice.faceCounts = { hit_starburst: 0, power_exclamation: 6, blank: 0 };
  data.items.forEach(item => { item.locations = ['b', 'b']; });
  data.perks = [{ id: 'perk-durnan', name: 'Synthetic nonresponse', quantity: 8, effect: 'Synthetic effect' }];
  return data;
}

/** Natural setup and attack seed: both POW rays resolve to Slowing (8 or 9). */
export const SLOWING_SEED = 26;
