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

    const cluster = html.slice(html.indexOf('data-pieces-for="b"'), html.indexOf('data-caption-for'));
    expect(locationButton).toBeDefined();
    expect(cluster).toBeDefined();
    expect(locationButton).toContain('aria-label="Room 2. Test Hero, Beholder, Displacer Beast, 2 Items, 1 Citizen, Unrevealed Lair. Board markers 2 ×2"');
    expect(locationButton).toContain('Test Hero, Beholder, Displacer Beast, 2 Items, 1 Citizen');
    for (const kind of ['hero', 'beholder', 'displacer', 'item', 'citizen', 'lair']) {
      expect(cluster).toContain(`class="piece piece-${kind}`);
      expect(cluster).toContain(`tabletop-art--${kind}`);
    }
    expect(cluster).toContain('class="board-piece-count"');
    expect(cluster).toContain('×2');
    expect(cluster).toContain('aria-hidden="true"');
    expect(html).toContain(`data-caption-for="${location}"`);
    expect(html).toContain('>Room 2</span>');
    expect(locationButton).toContain('Unrevealed Lair');
    expect(html).not.toContain('hidden-face-must-not-leak');
    expect(html).toContain('Beholder');
    expect(html).toContain('Displacer');
    expect(locationButton).not.toContain('class="piece');
    expect(html).toContain('game-board-piece-layer');
    expect(html).not.toContain('class="game-board-number"');
    expect(html).toContain('class="game-board-nameplate');
    expect(html).toContain('class="game-board-caption-number"');
  });

  it('includes passage, floor, selection and quantity markers in visible order without revealing hidden Lairs', async () => {
    const data = fighterFixture();
    data.board.locations.find(location => location.id === 'b')!.name = 'North gate';
    data.board.edges.push({ from: 'b', to: 'd', kind: 'passage' });
    const state = await createFighterGame(data, 9);
    const view = getFighterView(data, state);
    view.boardItems.b = Object.keys(state.items).slice(0, 2);
    view.citizens['citizen-a'] = { status: 'board', location: 'b' };
    view.citizens['citizen-b'] = { status: 'board', location: 'b' };
    view.lairs.b = { revealed: false };

    const html = renderToStaticMarkup(createElement(GameBoard, {
      data, game: view, moving: false, locked: false, onMove: () => {},
      buttonRefs: { current: new Map() }, choiceDestinations: ['b'], chosenDestination: 'b',
      onChooseDestination: () => {},
    }));
    const button = html.match(/<button[^>]*aria-label="North gate\.[\s\S]*?<\/button>/)?.[0];

    expect(button).toContain('aria-label="North gate. Secret passage A.');
    expect(button).toContain('Board markers A 2 ✓ ×2 ×2"');
    expect(button).toContain('2 Items, 2 Citizens, Unrevealed Lair');
    expect(button).toContain('Selected destination, awaiting confirmation');
  });

  it('marks only public changed locations and keeps the highlight separate from legal Move targets', async () => {
    const data = fighterFixture();
    const state = await createFighterGame(data, 9);
    const html = renderToStaticMarkup(createElement(GameBoard, {
      data, game: getFighterView(data, state), moving: false, locked: false,
      onMove: () => {}, buttonRefs: { current: new Map() }, recentLocations: ['b'],
    }));
    const b = html.match(/<g><ellipse class="game-board-floor[^"]*recent-event[^"]*"[^>]*>[\s\S]*?data-location-id="b"[\s\S]*?<\/g>/)?.[0];
    expect(b).toBeUndefined();
    expect(html).toContain('class="game-board-floor recent-event game-board-recent-ring"');
    expect(html).toContain('Changed this action');
    expect(html).not.toContain('hidden-face-must-not-leak');
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
  it('puts floor numbers in nameplates while keeping unnumbered captions plain', async () => {
    const data = fighterFixture();
    const state = await createFighterGame(data, 9);
    const html = renderToStaticMarkup(createElement(GameBoard, {
      data, game: getFighterView(data, state), moving: false, locked: false,
      onMove: () => {}, buttonRefs: { current: new Map() },
    }));
    expect(html).not.toContain('class="game-board-number"');
    for (const location of data.board.locations) {
      const beginning = html.indexOf(`data-caption-for="${location.id}"`);
      expect(beginning).toBeGreaterThan(-1);
      const caption = html.slice(beginning, html.indexOf('</foreignObject>', beginning));
      expect(caption).toContain('game-board-nameplate');
      expect(caption).toContain(`>${location.name}</span>`);
      if (location.number) expect(caption).toContain(`class="game-board-caption-number"`);
      else expect(caption).not.toContain('game-board-caption-number');
    }
  });

});
