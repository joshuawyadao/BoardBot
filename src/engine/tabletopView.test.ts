import { describe, expect, it } from 'vitest';
import { createFighterGame, getFighterView } from './horrifiedGame';
import { LEGACY_RULESET_VERSION, RULESET_VERSION, STACKING_RULESET_VERSION } from './decisionPolicies';
import { fighterFixture } from './fixtures/fighterFixture';

describe('observed tabletop projection', () => {
  it('exposes cloned resolved attack and face-up card facts without private state', async () => {
    const data = fighterFixture();
    data.monsterCards[0].activationSymbols = ['black flame'];
    data.monsterCards[0].citizenStartingLocation = 'b';
    const game = await createFighterGame(data, 18);
    game.currentCard = game.monsterDeck.shift()!;
    game.attack = { id: 72, monster: 'beholder', target: 'hero', faces: ['hit', 'power', 'blank'],
      hits: 1, powers: 1, cancelled: false };
    const snapshot = structuredClone(game);
    const view = getFighterView(data, game);

    expect(view.currentAttack).toEqual({ monster: 'beholder', target: 'hero',
      faces: ['hit', 'power', 'blank'], remainingHits: 1, remainingPowers: 1 });
    expect(view.currentMonsterCard).toEqual({ name: 'Synthetic return', itemsDrawn: 0,
      activationSymbols: ['black flame'], movement: 0, attackDice: 0, event: 'Synthetic test event',
      citizenStartingLocation: 'b' });
    expect(view).not.toHaveProperty('random');
    expect(view).not.toHaveProperty('queue');
    expect(view).not.toHaveProperty('monsterDeck');
    expect(view).not.toHaveProperty('perkDeck');
    expect(view).not.toHaveProperty('bag');
    expect(view.currentAttack).not.toHaveProperty('id');
    expect(view.currentMonsterCard).not.toHaveProperty('id');
    expect(view.currentMonsterCard).not.toHaveProperty('printedId');
    expect(Object.values(view.lairs).every(lair => !('definitionId' in lair))).toBe(true);
    view.currentAttack!.faces.push('hit');
    view.currentMonsterCard!.activationSymbols.push('synthetic symbol');
    expect(game).toEqual(snapshot);
  });

  it('reports null observed events before a card or attack and derives the next budget from base actions', async () => {
    const data = fighterFixture();
    const game = await createFighterGame(data, 19);
    const view = getFighterView(data, game);
    expect(view.currentAttack).toBeNull();
    expect(view.currentMonsterCard).toBeNull();
    expect(view.nextHeroPhaseAllowance).toBe(data.heroes.find(hero => hero.id === game.hero.definitionId)!.actions);
    expect(view.nextHeroPhaseSkipped).toBe(false);
    expect(view.pending).toBeNull();

    game.currentCard = game.monsterDeck.shift()!;
    expect(getFighterView(data, game).currentMonsterCard?.citizenStartingLocation).toBeNull();
    game.currentCard = null;

    game.hero.allowance = 1;
    game.hero.actions = 0;
    game.hero.penalties.fewerActions = 2;
    expect(getFighterView(data, game).nextHeroPhaseAllowance).toBe(data.heroes[0].actions - 2);
    game.hero.penalties.fewerActions = 20;
    expect(getFighterView(data, game).nextHeroPhaseAllowance).toBe(0);
    expect(getFighterView(data, game).nextHeroPhaseSkipped).toBe(false);
    game.hero.penalties.fewerActions = 1;
    game.hero.penalties.skipTurn = true;
    expect(getFighterView(data, game).nextHeroPhaseAllowance).toBe(0);
    expect(getFighterView(data, game).nextHeroPhaseSkipped).toBe(true);
  });

  it.each([
    [LEGACY_RULESET_VERSION, 0, 1, 4, 3],
    [LEGACY_RULESET_VERSION, 1, 1, 3, 3],
    [STACKING_RULESET_VERSION, 1, 2, 3, 2],
    [RULESET_VERSION, 3, 4, 1, 0],
  ])('previews Slowing responses under %s with %i existing penalties', async (version, existing, accepted, discarded, acceptAllowance) => {
    const data = fighterFixture();
    data.interpretationVersion = version;
    const game = await createFighterGame(data, 20);
    game.hero.penalties.fewerActions = existing;
    game.hero.actions = 0;
    game.hero.allowance = 0;
    game.pending = { id: 'choice-synthetic', title: 'Choose a response to the ray',
      options: [{ id: 'discard', label: 'Discard one Item' }, { id: 'take-penalty', label: 'Accept the penalty' }],
      min: 1, max: 1, resume: { kind: 'monster:ray-choice', result: 8, attackId: 41 } };
    const snapshot = structuredClone(game);
    const pending = getFighterView(data, game).pending;
    expect(pending?.kind).toBe('slowing-response');
    expect(pending?.slowing).toEqual({ ownerName: data.heroes[0].name, existingPenalties: existing,
      discardAllowance: discarded, acceptAllowance, acceptPenalties: accepted, skipped: false });
    expect(pending?.title).toBe('Choose a response to the ray');
    expect(pending?.options).toEqual(snapshot.pending?.options);
    expect(pending).not.toHaveProperty('resume');
    expect(game).toEqual(snapshot);
  });

  it('previews skip-turn as zero and does not classify other ray choices as Slowing', async () => {
    const data = fighterFixture();
    const game = await createFighterGame(data, 21);
    game.hero.penalties.skipTurn = true;
    game.pending = { id: 'choice-synthetic', title: 'Choose a response to the ray', options: [], min: 0, max: 0,
      resume: { kind: 'monster:ray-choice', result: 9 } };
    expect(getFighterView(data, game).pending?.slowing).toMatchObject({ discardAllowance: 0, acceptAllowance: 0, skipped: true });
    game.pending.resume.result = 17;
    const pending = getFighterView(data, game).pending;
    expect(pending).not.toHaveProperty('kind');
    expect(pending).not.toHaveProperty('slowing');
  });

  it('shows only the matched current ray on a ray choice without exposing its continuation', async () => {
    const data = fighterFixture();
    const petrification = data.monsters.beholder.rays.back.find(candidate => candidate.min <= 17 && candidate.max >= 17)!;
    petrification.effect = 'Synthetic petrification effect';
    const game = await createFighterGame(data, 22);
    game.pending = { id: 'choice-synthetic', title: 'Choose a response to the ray',
      options: [{ id: 'discard', label: 'Discard one Item' }, { id: 'skip-turn', label: 'Accept the penalty' }],
      min: 1, max: 1, resume: { kind: 'monster:ray-choice', result: 17, attackId: 94 } };
    const snapshot = structuredClone(game);
    const pending = getFighterView(data, game).pending;
    expect(pending?.ray).toEqual({ result: 17, name: petrification.name, min: petrification.min,
      max: petrification.max, effect: 'Synthetic petrification effect' });
    expect(pending).not.toHaveProperty('resume');
    expect(pending?.ray).not.toHaveProperty('attackId');
    expect(game).toEqual(snapshot);

    game.pending.resume.result = 21;
    expect(getFighterView(data, game).pending).not.toHaveProperty('ray');
    game.pending.resume = { kind: 'discard', result: 17, attackId: 94 };
    expect(getFighterView(data, game).pending).not.toHaveProperty('ray');
    game.pending = null;
    expect(getFighterView(data, game).pending).toBeNull();
  });
});
