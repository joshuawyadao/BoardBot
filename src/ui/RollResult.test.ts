import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { resolveD20 } from '../engine/decisionPolicies';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { heroFixture } from '../engine/fixtures/heroFixture';
import { createFighterGame, getFighterView } from '../engine/horrifiedGame';
import { RollResult, SpecialActionGuide } from './RollResult';

describe('roll presentation', () => {
  it('shows pending and final arithmetic, including uncapped overflow, using the public projection', async () => {
    const data = fighterFixture();
    const game = await createFighterGame(data, 1);
    const view = getFighterView(data, game);
    const roll = { reason: 'Fighter special action', result: resolveD20(19, [2]), turn: 1 };
    view.currentRoll = roll;
    const pending = renderToStaticMarkup(createElement(RollResult, { game: view, data }));
    expect(pending).toContain('Awaiting response');
    expect(pending).toContain('<strong>19</strong><span> +2</span>');
    expect(pending).toContain('21</strong> total');
    expect(pending).toContain('20</strong> effective');
    expect(pending).toContain('If kept:');

    view.currentRoll = null;
    view.rolls = [roll];
    const final = renderToStaticMarkup(createElement(RollResult, { game: view, data, compact: true }));
    expect(final).toContain('Last roll');
    expect(final).not.toContain('Outcome:');
    expect(final).toContain('Effective result 20');
    const details = renderToStaticMarkup(createElement(RollResult, { game: view, data }));
    expect(details).toContain('Outcome:');
    expect(final).toContain('roll-result-compact');

    view.rolls = [{ ...roll, reason: 'Wizard destination' }];
    const unrelated = renderToStaticMarkup(createElement(RollResult, { game: view, data }));
    expect(unrelated).not.toContain('Outcome:');
  });

  it('renders every imported Hero range and its effect, highlighting only the matching outcome', () => {
    const hero = heroFixture().heroes.find(candidate => candidate.id === 'hero-bard')!;
    const guide = renderToStaticMarkup(createElement(SpecialActionGuide, { hero, result: 20 }));
    expect(guide).toContain('Synthetic ability');
    for (const effect of hero.outcomes.map(outcome => outcome.effect)) expect(guide).toContain(effect);
    expect(guide).toContain('>1</th>');
    expect(guide).toContain('>20</th>');
    expect(guide.match(/aria-current="true"/g)).toHaveLength(1);
  });
});
