import type { GameData } from '../../data/gameData';
import { RULESET_VERSION } from '../decisionPolicies';

/** Invented content with sufficient physical quantities to exercise setup. */
export function setupFixture(): GameData {
  return {
    schemaVersion: 2, contentKind: 'synthetic', gameId: 'synthetic-setup', edition: 'test', interpretationVersion: RULESET_VERSION,
    provenance: { recordVersion: 0, recordSha256: 'a'.repeat(64), verification: 'synthetic', componentPointers: {}, componentSourceUrls: {} },
    effectStatus: 'reference-prose-only', capabilities: { setupVerified: true, playableRulesEngine: false },
    setup: { beholderLocation: 'c', displacerLocation: 'a', beholderDamageMarkers: 1, beholderReferenceReady: true,
      provenance: { sourceUrl: 'https://example.com/synthetic', photoSha256: 'b'.repeat(64), sourceKind: 'synthetic' } },
    board: {
      locations: ['a', 'b', 'c', 'd'].map((id, index) => ({ id, name: `Room ${index + 1}`, kind: 'numbered', number: index + 1 })),
      edges: [{ from: 'a', to: 'b', kind: 'ordinary' }, { from: 'b', to: 'c', kind: 'ordinary' }, { from: 'c', to: 'd', kind: 'passage' }],
      terrorTrack: [0, 1, 2, 3, 4, 5, 6, 'end'], soloLabelAt: 3, hospital: 'd',
      monsterStarts: [{ number: 4, location: 'c' }, { number: 1, location: 'a' }], lairLocations: ['b', 'd'],
    },
    heroes: [{ id: 'hero-fighter', name: 'Test Hero', actions: 4, start: 'b', specialAction: 'Synthetic action', outcomes: [{ min: 1, max: 20, effect: 'Synthetic outcome' }] }],
    items: Array.from({ length: 8 }, (_, index) => ({ id: `item-${index}`, name: `Object ${index}`, color: 'blue', strength: 2, quantity: 2, locations: [index % 2 ? 'a' : 'b', index % 2 ? 'c' : 'd'] })),
    citizens: [{ id: 'citizen-a', name: 'Visitor', quantity: 1, safeDestination: 'c' }],
    monsterCards: [{ id: 'card-a', printedId: 1, name: 'Test event', quantity: 3, itemsDrawn: 2, activationSymbols: ['black flame'], movement: 1, attackDice: 1, event: 'Synthetic event' }],
    perks: [{ id: 'perk-a', name: 'Test perk', quantity: 3, effect: 'Synthetic perk' }],
    lairTokens: { faces: [{ id: 'lair-a', printedId: 1, name: 'Hidden room', quantity: 1 }, { id: 'lair-b', printedId: 2, name: 'Empty room', quantity: 1 }], sharedBack: { requirement: '3+', itemSymbols: ['blue circle'] } },
    dice: { monsterDice: { quantity: 1, facesPerDie: 6, faceCounts: { hit: 3, power: 1, blank: 2 } }, d20: { quantity: 1, faces: Array.from({ length: 20 }, (_, i) => i + 1) } },
    monsters: {
      beholder: { frenzyOrder: 4, activationSymbols: ['red shield'], objective: 'Test objective', power: { name: 'Test power', resolution: 'Synthetic result' },
        advance: { name: 'Test advance', location: 'here', cost: 'one', roll: 'd20', outcomes: [{ min: 1, max: 20, effect: 'Synthetic effect' }] },
        eyestalks: [{ min: 2, max: 20, name: 'Test eye' }], rays: { front: [{ min: 1, max: 10, name: 'Test ray', effect: 'Synthetic effect' }], back: [{ min: 11, max: 20, name: 'Test ray 2', effect: 'Synthetic effect' }] },
        defeat: { name: 'Test defeat', prerequisite: 'test', location: 'here', color: 'yellow', threshold: '6+' }, damageMarkers: 1 },
      displacerBeast: { frenzyOrder: 1, activationSymbols: ['blue skull'], power: { name: 'Test power', effect: 'Synthetic effect' },
        advance: { name: 'Test advance', location: 'here', printedRequirement: 'one', minimumItems: 1, grid: [[[2], [3]]] },
        defeat: { name: 'Test defeat', location: 'here', cost: 'test', roll: 'd20', coveredResult: 'yes', uncoveredResult: 'no', specialResults: { '1': 'test', '20': 'test' } } },
    },
  };
}
