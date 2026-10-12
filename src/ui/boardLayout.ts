import type { GameData } from '../data/gameData';

export const BOARD_WIDTH = 1000;
export const BOARD_HEIGHT = 1000;
export const NODE_WIDTH = 110;
export const NODE_HEIGHT = 56;

export interface BoardPoint { x: number; y: number }
export interface BoardRoute { from: string; to: string; kind: GameData['board']['edges'][number]['kind']; points: BoardPoint[] }

const physicalPassages = [
  { from: 'location-castle-corkscrew', to: 'location-skullport-gate', label: 'A' },
  { from: 'location-the-yawning-portal-the-well', to: 'location-entry-well', label: 'B' },
];

function pairKey(from: string, to: string): string {
  return [from, to].sort().join('|');
}

// The printed A/B pairing is independent of an import's edge order or direction.
// Other boards receive distinct labels without borrowing an existing pair's badge.
export function boardPassages(data: GameData): { from: string; to: string; label: string }[] {
  const edges = data.board.edges.filter(edge => edge.kind === 'passage');
  const labels = new Map(physicalPassages.map(passage => [pairKey(passage.from, passage.to), passage.label]));
  const keys = [...new Set(edges.map(edge => pairKey(edge.from, edge.to)))].sort();
  const used = new Set(keys.flatMap(key => labels.has(key) ? [labels.get(key)!] : []));
  let next = 0;
  for (const key of keys) {
    if (labels.has(key)) continue;
    let label: string;
    do { label = next < 26 ? String.fromCharCode(65 + next++) : `${++next}`; } while (used.has(label));
    labels.set(key, label);
    used.add(label);
  }
  return edges.map(edge => ({ from: edge.from, to: edge.to, label: labels.get(pairKey(edge.from, edge.to))! }));
}

// Floor anchors follow the owner's perspective-normalized physical-board reference.
// Original UI geometry only; commercial artwork and the private reference stay local.
const physicalPositions: Record<string, BoardPoint> = {
  'location-1': { x: 56, y: 157 },
  'location-2': { x: 159, y: 276 },
  'location-3': { x: 216, y: 132 },
  'location-4': { x: 330, y: 320 },
  'location-5': { x: 378, y: 141 },
  'location-6': { x: 575, y: 234 },
  'location-7': { x: 566, y: 306 },
  'location-8': { x: 816, y: 144 },
  'location-9': { x: 917, y: 466 },
  'location-10': { x: 706, y: 385 },
  'location-11': { x: 456, y: 532 },
  'location-12': { x: 503, y: 644 },
  'location-13': { x: 289, y: 585 },
  'location-14': { x: 105, y: 470 },
  'location-15': { x: 170, y: 715 },
  'location-16': { x: 180, y: 887 },
  'location-17': { x: 465, y: 888 },
  'location-18': { x: 674, y: 762 },
  'location-19': { x: 861, y: 745 },
  'location-20': { x: 882, y: 892 },
  'location-the-yawning-portal-the-well': { x: 839, y: 272 },
  'location-entry-well': { x: 803, y: 475 },
  'location-castle-corkscrew': { x: 336, y: 408 },
  'location-skullport-gate': { x: 334, y: 699 },
  'location-stairway-to-arcane-chambers': { x: 576, y: 478 },
  'location-teleportation-circle-arcane-chambers': { x: 89, y: 659 },
  'location-teleportation-circle-dungeon-level': { x: 693, y: 538 },
  'location-teleportation-circle-skullport': { x: 296, y: 803 },
  'location-teleportation-circle-wyllowwood': { x: 739, y: 852 },
};

// These waypoints shape only existing ordinary edges. The data remains authoritative:
// importing a different edge never creates a road or changes the engine's legal moves.
const physicalRoads: [string, string, BoardPoint[]][] = [
  ['1', '3', [{ x: 125, y: 170 }, { x: 174, y: 159 }]],
  ['3', '5', [{ x: 258, y: 140 }, { x: 295, y: 151 }, { x: 335, y: 145 }]],
  ['5', '6', [{ x: 440, y: 163 }, { x: 490, y: 198 }, { x: 540, y: 207 }]],
  ['3', '2', [{ x: 198, y: 179 }, { x: 199, y: 208 }, { x: 180, y: 231 }]],
  ['2', '4', [{ x: 201, y: 291 }, { x: 240, y: 315 }, { x: 289, y: 325 }]],
  ['5', '4', [{ x: 390, y: 201 }, { x: 372, y: 230 }, { x: 341, y: 264 }, { x: 330, y: 292 }]],
  ['4', '7', [{ x: 385, y: 340 }, { x: 429, y: 340 }, { x: 486, y: 324 }, { x: 535, y: 316 }]],
  ['4', 'castle-corkscrew', [{ x: 314, y: 353 }, { x: 327, y: 380 }]],
  ['7', '8', [{ x: 635, y: 289 }, { x: 692, y: 264 }, { x: 740, y: 225 }, { x: 784, y: 195 }]],
  ['8', 'the-yawning-portal-the-well', [{ x: 841, y: 182 }, { x: 844, y: 227 }]],
  ['14', '13', [{ x: 118, y: 505 }, { x: 171, y: 514 }, { x: 217, y: 548 }, { x: 250, y: 564 }]],
  ['14', 'teleportation-circle-arcane-chambers', [{ x: 80, y: 505 }, { x: 61, y: 555 }, { x: 62, y: 610 }]],
  ['13', 'teleportation-circle-arcane-chambers', [{ x: 248, y: 613 }, { x: 191, y: 624 }, { x: 137, y: 651 }]],
  ['13', '11', [{ x: 340, y: 577 }, { x: 379, y: 560 }, { x: 427, y: 546 }]],
  ['11', '12', [{ x: 487, y: 571 }, { x: 473, y: 604 }, { x: 489, y: 625 }]],
  ['11', 'stairway-to-arcane-chambers', [{ x: 487, y: 518 }, { x: 518, y: 504 }, { x: 543, y: 491 }]],
  ['stairway-to-arcane-chambers', 'teleportation-circle-dungeon-level', [{ x: 592, y: 508 }, { x: 613, y: 533 }, { x: 659, y: 538 }]],
  ['stairway-to-arcane-chambers', 'entry-well', [{ x: 630, y: 472 }, { x: 678, y: 466 }, { x: 736, y: 468 }]],
  ['10', 'entry-well', [{ x: 719, y: 429 }, { x: 761, y: 449 }]],
  ['entry-well', '9', [{ x: 842, y: 479 }, { x: 870, y: 492 }]],
  ['15', '16', [{ x: 171, y: 763 }, { x: 155, y: 807 }, { x: 172, y: 848 }]],
  ['15', 'skullport-gate', [{ x: 227, y: 717 }, { x: 263, y: 712 }, { x: 301, y: 710 }]],
  ['15', 'teleportation-circle-skullport', [{ x: 215, y: 757 }, { x: 248, y: 764 }, { x: 274, y: 791 }]],
  ['skullport-gate', '17', [{ x: 369, y: 743 }, { x: 405, y: 779 }, { x: 411, y: 833 }, { x: 441, y: 861 }]],
  ['17', 'teleportation-circle-skullport', [{ x: 412, y: 876 }, { x: 387, y: 854 }, { x: 362, y: 834 }, { x: 333, y: 814 }]],
  ['18', '19', [{ x: 727, y: 756 }, { x: 784, y: 751 }, { x: 821, y: 739 }]],
  ['19', '20', [{ x: 908, y: 791 }, { x: 917, y: 844 }, { x: 896, y: 870 }]],
  ['19', 'teleportation-circle-wyllowwood', [{ x: 845, y: 794 }, { x: 800, y: 812 }, { x: 771, y: 842 }]],
];

function authoredRoad(from: string, to: string): BoardPoint[] | undefined {
  for (const [a, b, points] of physicalRoads) {
    if (from === `location-${a}` && to === `location-${b}`) return points.map(point => ({ ...point }));
    if (from === `location-${b}` && to === `location-${a}`) return points.map(point => ({ ...point })).reverse();
  }
  return undefined;
}

export function isPhysicalBoard(data: GameData): boolean {
  const locations = data.board.locations;
  return locations.length === Object.keys(physicalPositions).length && new Set(locations.map(location => location.id)).size === locations.length && locations.every(location => physicalPositions[location.id]);
}

// Painted roads are appropriate only for this exact graph. Synthetic imports with
// the same location IDs but different edges must not imply unavailable movement.
export function hasIllustratedLayout(data: GameData): boolean {
  if (!isPhysicalBoard(data)) return false;
  const key = (from: string, to: string, kind: BoardRoute['kind']) => `${kind}:${pairKey(from, to)}`;
  const expected = physicalRoads.map(([a, b]) => key(`location-${a}`, `location-${b}`, 'ordinary'));
  expected.push(...physicalPassages.map(passage => key(passage.from, passage.to, 'passage')));
  const circles = ['arcane-chambers', 'dungeon-level', 'skullport', 'wyllowwood'].map(region => `location-teleportation-circle-${region}`);
  circles.forEach((from, index) => circles.slice(index + 1).forEach(to => expected.push(key(from, to, 'teleport'))));
  const actual = new Set(data.board.edges.map(edge => key(edge.from, edge.to, edge.kind)));
  return data.board.edges.length === expected.length && actual.size === expected.length && expected.every(edge => actual.has(edge));
}

export function boardPositions(data: GameData): Map<string, BoardPoint> {
  const locations = data.board.locations;
  if (isPhysicalBoard(data)) {
    return new Map(locations.map(location => [location.id, { ...physicalPositions[location.id] }]));
  }
  // Synthetic fixtures and future boards use a complete, bounded fallback.
  const columns = Math.max(1, Math.ceil(Math.sqrt(locations.length * BOARD_WIDTH / BOARD_HEIGHT)));
  const rows = Math.max(1, Math.ceil(locations.length / columns));
  return new Map(locations.map((location, index) => [location.id, {
    x: (index % columns + 0.5) * BOARD_WIDTH / columns,
    y: (Math.floor(index / columns) + 0.5) * BOARD_HEIGHT / rows,
  }]));
}

function segmentIntersectsBox(a: BoardPoint, b: BoardPoint, center: BoardPoint): boolean {
  const left = center.x - NODE_WIDTH / 2 - 5, right = center.x + NODE_WIDTH / 2 + 5;
  const top = center.y - NODE_HEIGHT / 2 - 5, bottom = center.y + NODE_HEIGHT / 2 + 5;
  let first = 0, last = 1;
  const dx = b.x - a.x, dy = b.y - a.y;
  for (const [p, q] of [[-dx, a.x - left], [dx, right - a.x], [-dy, a.y - top], [dy, bottom - a.y]]) {
    if (p === 0) { if (q < 0) return false; }
    else {
      const t = q / p;
      if (p < 0) first = Math.max(first, t);
      else last = Math.min(last, t);
      if (first > last) return false;
    }
  }
  return true;
}

export function routeCrossesOtherNode(route: BoardRoute, positions: Map<string, BoardPoint>): boolean {
  for (const [id, center] of positions) {
    if (id === route.from || id === route.to) continue;
    for (let index = 1; index < route.points.length; index++) {
      if (segmentIntersectsBox(route.points[index - 1], route.points[index], center)) return true;
    }
  }
  return false;
}

function compact(points: BoardPoint[]): BoardPoint[] {
  return points.filter((point, index) => index === 0 || point.x !== points[index - 1].x || point.y !== points[index - 1].y);
}

function length(points: BoardPoint[]): number {
  return points.slice(1).reduce((sum, point, index) => sum + Math.hypot(point.x - points[index].x, point.y - points[index].y), 0);
}

export function boardRoutes(data: GameData, positions = boardPositions(data)): BoardRoute[] {
  const physical = isPhysicalBoard(data);
  return data.board.edges.map(edge => {
    const start = positions.get(edge.from), end = positions.get(edge.to);
    if (!start || !end) return { ...edge, points: [] };
    const road = physical && edge.kind === 'ordinary' ? authoredRoad(edge.from, edge.to) : undefined;
    if (road) return { ...edge, points: [start, ...road, end] };
    const candidates: BoardPoint[][] = [
      [start, end],
      [start, { x: end.x, y: start.y }, end],
      [start, { x: start.x, y: end.y }, end],
    ];
    for (let coordinate = 35; coordinate < BOARD_WIDTH; coordinate += 20) {
      candidates.push([start, { x: coordinate, y: start.y }, { x: coordinate, y: end.y }, end]);
    }
    for (let coordinate = 35; coordinate < BOARD_HEIGHT; coordinate += 20) {
      candidates.push([start, { x: start.x, y: coordinate }, { x: end.x, y: coordinate }, end]);
    }
    const clear = candidates.map(compact).filter(points => !routeCrossesOtherNode({ ...edge, points }, positions));
    const points = (clear.length ? clear : [[start, end]]).sort((a, b) =>
      length(a) + (a.length - 2) * 24 - length(b) - (b.length - 2) * 24)[0];
    return { ...edge, points };
  });
}
