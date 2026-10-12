import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { createFighterGame, getFighterView } from '../engine/horrifiedGame';
import { GameBoard } from './GameBoard';

describe('game board pieces', () => {
  it('keeps each kind of piece visible when Hero, both Monsters, Items and Citizens share a location', async () => {
    const data = fighterFixture();
    const state = await createFighterGame(data, 9);
    const location = state.hero.location!;
    state.monsters.beholder.location = location;
    state.monsters.displacerBeast.location = location;
    state.boardItems[location] = Object.keys(state.items).slice(0, 2);
    state.citizens['citizen-a'] = { status: 'board', location };
    state.lairs[location] = { revealed: false, definitionId: 'hidden-face-must-not-leak' };

    const html = renderToStaticMarkup(createElement(GameBoard, {
      data, game: getFighterView(data, state), moving: false, locked: false,
      onMove: () => {}, buttonRefs: { current: new Map() },
    }));
    const locationButton = html.match(/<button[^>]*aria-label="Room 2\.[\s\S]*?<\/button>/)?.[0];

    expect(locationButton).toBeDefined();
    expect(locationButton).toContain('Test Hero, Beholder, Displacer Beast, 2 Items, 1 Citizen');
    for (const kind of ['hero', 'beholder', 'displacer', 'item', 'citizen', 'lair']) {
      expect(locationButton).toContain(`class="piece piece-${kind}`);
      expect(locationButton).toContain(`tabletop-art--${kind}`);
    }
    expect(locationButton).toContain('data-count="2"');
    expect(locationButton).toContain('×2');
    expect(locationButton).toContain('aria-hidden="true"');
    expect(html).toContain(`data-caption-for="${location}"`);
    expect(html).toContain('>Room 2</span>');
    expect(locationButton).toContain('Unrevealed Lair');
    expect(html).not.toContain('hidden-face-must-not-leak');
    expect(html).toContain('Beholder');
    expect(html).toContain('Displacer');
  });

  it('marks a pending Wizard Monster destination without making it a Move target', async () => {
    const data = fighterFixture();
    const state = await createFighterGame(data, 9);
    const view = getFighterView(data, state);
    view.pending = { id: 'wizard-choice', title: 'Move a Monster', options: [], min: 1, max: 1,
      description: 'Synthetic pending choice', destination: 'c' };

    const html = renderToStaticMarkup(createElement(GameBoard, {
      data, game: view, moving: false, locked: true, onMove: () => {}, buttonRefs: { current: new Map() },
    }));
    const targetButton = html.match(/<button[^>]*aria-label="Room 3\.[\s\S]*?<\/button>/)?.[0];

    expect(targetButton).toContain('wizard-destination');
    expect(targetButton).toContain('Wizard Monster destination');
    expect(targetButton).toContain('aria-disabled="true"');
    expect(html).toContain('Wizard destination');
  });
});
