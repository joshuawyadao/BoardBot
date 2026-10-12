import { describe, expect, it } from 'vitest';
import type { GameData } from '../data/gameData';
import { fighterFixture } from '../engine/fixtures/fighterFixture';
import { BOARD_HEIGHT, BOARD_WIDTH, NODE_HEIGHT, NODE_WIDTH, boardPassages, boardPositions, boardRoutes, hasIllustratedLayout, isPhysicalBoard, routeCrossesOtherNode } from './boardLayout';

// Synthetic labels; only the accepted board topology and semantic IDs are exercised.
function physicalFixture() {
  const data = fighterFixture();
  const pairs = [
    ['1', '3'], ['3', '5'], ['5', '6'], ['3', '2'], ['2', '4'], ['5', '4'], ['4', '7'],
    ['4', 'castle-corkscrew'], ['7', '8'], ['8', 'the-yawning-portal-the-well'],
    ['14', '13'], ['14', 'teleportation-circle-arcane-chambers'], ['13', 'teleportation-circle-arcane-chambers'],
    ['13', '11'], ['11', '12'], ['11', 'stairway-to-arcane-chambers'],
    ['stairway-to-arcane-chambers', 'teleportation-circle-dungeon-level'],
    ['stairway-to-arcane-chambers', 'entry-well'], ['10', 'entry-well'], ['entry-well', '9'],
    ['15', '16'], ['15', 'skullport-gate'], ['15', 'teleportation-circle-skullport'],
    ['skullport-gate', '17'], ['17', 'teleportation-circle-skullport'],
    ['18', '19'], ['19', '20'], ['19', 'teleportation-circle-wyllowwood'],
  ];
  const circles = ['arcane-chambers', 'dungeon-level', 'skullport', 'wyllowwood'].map(region => `location-teleportation-circle-${region}`);
  data.board.locations = [...new Set(pairs.flat().map(id => `location-${id}`))].map(id => ({ id, name: id, kind: 'unnumbered' }));
  data.board.edges = pairs.map(([from, to]) => ({ from: `location-${from}`, to: `location-${to}`, kind: 'ordinary' }));
  data.board.edges.push(
    { from: 'location-castle-corkscrew', to: 'location-skullport-gate', kind: 'passage' },
    { from: 'location-the-yawning-portal-the-well', to: 'location-entry-well', kind: 'passage' },
  );
  circles.forEach((from, index) => circles.slice(index + 1).forEach(to => data.board.edges.push({ from, to, kind: 'teleport' })));
  return data;
}

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

  it('rejects duplicate physical IDs and returns independent floor coordinates', () => {
    const data = physicalFixture();
    const positions = boardPositions(data);
    positions.get('location-1')!.x = 900;
    expect(boardPositions(data).get('location-1')!.x).toBe(56);
    data.board.locations[0] = data.board.locations[1];
    expect(isPhysicalBoard(data)).toBe(false);
  });

  it('uses the painted terrain only when its roads match the imported legal graph', () => {
    const data = physicalFixture();
    expect(hasIllustratedLayout(data)).toBe(true);
    data.board.edges.reverse();
    data.board.edges = data.board.edges.map(edge => ({ ...edge, from: edge.to, to: edge.from }));
    expect(hasIllustratedLayout(data)).toBe(true);
    data.board.edges[0] = { from: 'location-3', to: 'location-4', kind: 'ordinary' };
    expect(isPhysicalBoard(data)).toBe(true);
    expect(hasIllustratedLayout(data)).toBe(false);
    data.board.edges[0] = data.board.edges[1];
    expect(hasIllustratedLayout(data)).toBe(false);
  });

  it('keeps printed passage labels stable when edges are reordered and gives other pairs distinct labels', () => {
    const data = physicalFixture();
    data.board.edges.reverse();
    data.board.edges = data.board.edges.map(edge => ({ ...edge, from: edge.to, to: edge.from }));
    expect(boardPassages(data)).toEqual([
      { from: 'location-entry-well', to: 'location-the-yawning-portal-the-well', label: 'B' },
      { from: 'location-skullport-gate', to: 'location-castle-corkscrew', label: 'A' },
    ]);
    data.board.edges.push({ from: 'sample-one', to: 'sample-two', kind: 'passage' });
    expect(boardPassages(data).at(-1)?.label).toBe('C');
    data.board.edges = [{ from: 'sample-one', to: 'sample-two', kind: 'passage' }];
    expect(boardPassages(data)[0].label).toBe('A');
  });

  it('preserves every accepted edge and keeps ordinary roads clear of unrelated spaces', () => {
    const data = physicalFixture();
    const positions = boardPositions(data);
    const routes = boardRoutes(data);
    expect(routes.map(({ points: _points, ...edge }) => edge)).toEqual(data.board.edges);
    expect(routes.filter(route => route.kind === 'ordinary')).toHaveLength(28);
    expect(routes.filter(route => route.kind === 'passage')).toHaveLength(2);
    expect(routes.filter(route => route.kind === 'teleport')).toHaveLength(6);
    for (const route of routes) {
      expect(route.points[0]).toEqual(positions.get(route.from));
      expect(route.points.at(-1)).toEqual(positions.get(route.to));
      if (route.kind === 'ordinary') expect(routeCrossesOtherNode(route, positions), `${route.from} to ${route.to}`).toBe(false);
      for (const point of route.points) {
        expect(point.x).toBeGreaterThanOrEqual(0);
        expect(point.x).toBeLessThanOrEqual(BOARD_WIDTH);
        expect(point.y).toBeGreaterThanOrEqual(0);
        expect(point.y).toBeLessThanOrEqual(BOARD_HEIGHT);
      }
    }
    // Reverse direction and altered imports must still honor the supplied graph.
    data.board.edges = [
      { from: 'location-3', to: 'location-1', kind: 'ordinary' },
      { from: 'location-1', to: 'location-2', kind: 'ordinary' },
    ];
    const altered = boardRoutes(data);
    expect(altered).toHaveLength(2);
    expect(altered[0].points).toEqual(routes[0].points.slice().reverse());
    expect(altered[1].to).toBe('location-2');
  });

  it('does not introduce neutral junctions between ordinary roads', () => {
    const data = physicalFixture();
    const positions = boardPositions(data);
    const routes = boardRoutes(data).filter(route => route.kind === 'ordinary');
    for (let first = 0; first < routes.length; first++) for (let second = first + 1; second < routes.length; second++) {
      const a = routes[first], b = routes[second];
      const shared = [a.from, a.to].filter(id => id === b.from || id === b.to).map(id => positions.get(id)!);
      for (let i = 1; i < a.points.length; i++) for (let j = 1; j < b.points.length; j++) {
        const p = a.points[i - 1], q = b.points[j - 1];
        const dx = a.points[i].x - p.x, dy = a.points[i].y - p.y;
        const ex = b.points[j].x - q.x, ey = b.points[j].y - q.y;
        const denominator = dx * ey - dy * ex;
        if (Math.abs(denominator) < 0.001) continue;
        const t = ((q.x - p.x) * ey - (q.y - p.y) * ex) / denominator;
        const u = ((q.x - p.x) * dy - (q.y - p.y) * dx) / denominator;
        if (t < 0 || t > 1 || u < 0 || u > 1) continue;
        const x = p.x + t * dx, y = p.y + t * dy;
        expect(shared.some(center => Math.abs(x - center.x) <= NODE_WIDTH / 2 && Math.abs(y - center.y) <= NODE_HEIGHT / 2), `${a.from}–${a.to} crosses ${b.from}–${b.to} at ${x},${y}`).toBe(true);
      }
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
