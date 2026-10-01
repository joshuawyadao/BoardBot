import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { BOARD_HEIGHT, BOARD_WIDTH, NODE_HEIGHT, NODE_WIDTH, boardPositions, boardRoutes, isPhysicalBoard, routeCrossesOtherNode } from './boardLayout';

describe('fitted board layout', () => {
  it('places every recognized physical location within the board and keeps all nodes distinct', () => {
    const data = fighterFixture();
    const ids = [
      ...Array.from({ length: 20 }, (_, index) => `location-${index + 1}`),
      'location-the-yawning-portal-the-well', 'location-entry-well',
      'location-castle-corkscrew', 'location-skullport-gate', 'location-stairway-to-arcane-chambers',
      'location-teleportation-circle-arcane-chambers', 'location-teleportation-circle-dungeon-level',
      'location-teleportation-circle-skullport', 'location-teleportation-circle-wyllowwood',
    ];
    data.board.locations = ids.map(id => ({ id, name: id, kind: 'unnumbered' }));
    expect(isPhysicalBoard(data)).toBe(true);
    const positions = boardPositions(data);
    expect(positions.size).toBe(ids.length);
    for (const position of positions.values()) {
      expect(position.x).toBeGreaterThanOrEqual(NODE_WIDTH / 2);
      expect(position.x).toBeLessThanOrEqual(BOARD_WIDTH - NODE_WIDTH / 2);
      expect(position.y).toBeGreaterThanOrEqual(NODE_HEIGHT / 2);
      expect(position.y).toBeLessThanOrEqual(BOARD_HEIGHT - NODE_HEIGHT / 2);
    }
    const points = [...positions.values()];
    for (let a = 0; a < points.length; a++) for (let b = a + 1; b < points.length; b++) {
      expect(Math.abs(points[a].x - points[b].x) >= NODE_WIDTH || Math.abs(points[a].y - points[b].y) >= NODE_HEIGHT).toBe(true);
    }
  });

  it('keeps fallback layouts complete for sample and larger synthetic boards', () => {
    for (const count of [4, 20]) {
      const data = fighterFixture();
      data.board.locations = Array.from({ length: count }, (_, index) => ({ id: `sample-${index}`, name: `Sample ${index}`, kind: 'numbered', number: index + 1 }));
      expect(isPhysicalBoard(data)).toBe(false);
      const positions = boardPositions(data);
      expect(positions.size).toBe(count);
      for (const position of positions.values()) {
        expect(position.x).toBeGreaterThan(0);
        expect(position.x).toBeLessThan(BOARD_WIDTH);
        expect(position.y).toBeGreaterThan(0);
        expect(position.y).toBeLessThan(BOARD_HEIGHT);
      }
    }
  });

  it('routes around an unrelated node instead of drawing a false connection through it', () => {
    const data = fighterFixture();
    data.board.edges = [{ from: 'a', to: 'c', kind: 'ordinary' }];
    const positions = new Map([
      ['a', { x: 100, y: 200 }],
      ['b', { x: 250, y: 200 }],
      ['c', { x: 400, y: 200 }],
    ]);
    const route = boardRoutes(data as GameData, positions)[0];
    expect(route.points.length).toBeGreaterThan(2);
    expect(routeCrossesOtherNode(route, positions)).toBe(false);
  });
});
