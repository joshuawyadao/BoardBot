import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, getFighterView } from '../engine/horrifiedGame';
import { AttackPanel, LocationInspector } from './TabletopPanels';

it('inspects observed contents with explicit Strength and safe destination without exposing a Lair face', async () => {
  const data = fighterFixture();
  const state = await createFighterGame(data, 1);
  const locationId = state.hero.location!;
  state.boardItems[locationId] = Object.keys(state.items).slice(0, 2);
  state.citizens['citizen-a'] = { status: 'board', location: locationId };
  state.lairs[locationId] = { revealed: false, definitionId: 'private-face' };
  const html = renderToStaticMarkup(createElement(LocationInspector, { data, game: getFighterView(data, state),
    locationId, locationName: id => data.board.locations.find(location => location.id === id)?.name ?? 'off board' }));
  expect(html).toContain('Strength');
  expect(html).toContain('Safe destination:');
  expect(html).toContain('Unrevealed');
  expect(html).not.toContain('private-face');
  expect(html).not.toContain('<button'); // read-only contents cannot commit an action
});

it('shows the confirmed current ray effect and never inherits a previous attack ray', async () => {
  const data = fighterFixture();
  const state = await createFighterGame(data, 1);
  state.attack = { id: 2, monster: 'beholder', target: 'hero', faces: ['hit', 'power'], hits: 1, powers: 0, cancelled: false };
  state.rolls.push({ reason: 'Beholder eye', turn: 1, result: { base: 17, modifiers: [], adjustedTotal: 17, effectiveResult: 17 } });
  const props = () => ({ data, game: getFighterView(data, state), locationName: () => 'Room 2' });
  expect(renderToStaticMarkup(createElement(AttackPanel, props()))).not.toContain('Current ray:');
  state.pending = { id: 'current-ray', title: 'Respond', min: 1, max: 1, options: [], resume: { kind: 'monster:ray-choice', result: 17, attackId: 2 } };
  const html = renderToStaticMarkup(createElement(AttackPanel, props()));
  expect(html).toContain('Current ray: Ray 9 (16–17)');
  expect(html).toContain('Synthetic effect');
  expect(html).toContain('POW first');
  expect(html).not.toContain('attackId');
});
