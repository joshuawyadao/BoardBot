import type { GameData } from '../data/gameData';

export const BOARD_WIDTH = 1000;
export const BOARD_HEIGHT = 850;
export const NODE_WIDTH = 136;
export const NODE_HEIGHT = 64;

export interface BoardPoint { x: number; y: number }
export interface BoardRoute { from: string; to: string; kind: GameData['board']['edges'][number]['kind']; points: BoardPoint[] }

// Schematic positions follow the regions and relative places on the owner's board.
// This is original geometry, not board artwork or a reproduction of printed text.
const physicalPositions: Record<string, BoardPoint> = {
  'location-1': { x: 100, y: 150 },
  'location-2': { x: 220, y: 270 },
  'location-3': { x: 275, y: 105 },
  'location-4': { x: 390, y: 295 },
  'location-5': { x: 445, y: 105 },
  'location-6': { x: 565, y: 175 },
  'location-7': { x: 590, y: 305 },
  'location-8': { x: 850, y: 155 },
  'location-9': { x: 930, y: 555 },
  'location-10': { x: 750, y: 350 },
  'location-11': { x: 450, y: 470 },
  'location-12': { x: 475, y: 590 },
  'location-13': { x: 245, y: 505 },
  'location-14': { x: 100, y: 440 },
  'location-15': { x: 225, y: 660 },
  'location-16': { x: 130, y: 785 },
  'location-17': { x: 525, y: 780 },
  'location-18': { x: 700, y: 675 },
  'location-19': { x: 865, y: 670 },
  'location-20': { x: 910, y: 790 },
  'location-the-yawning-portal-the-well': { x: 850, y: 270 },
  'location-entry-well': { x: 850, y: 440 },
  'location-castle-corkscrew': { x: 340, y: 405 },
  'location-skullport-gate': { x: 365, y: 665 },
  'location-stairway-to-arcane-chambers': { x: 605, y: 435 },
  'location-teleportation-circle-arcane-chambers': { x: 105, y: 565 },
  'location-teleportation-circle-dungeon-level': { x: 690, y: 545 },
  'location-teleportation-circle-skullport': { x: 365, y: 775 },
  'location-teleportation-circle-wyllowwood': { x: 740, y: 785 },
};

export function isPhysicalBoard(data: GameData): boolean {
  const locations = data.board.locations;
  return locations.length === Object.keys(physicalPositions).length && locations.every(location => physicalPositions[location.id]);
}

export function boardPositions(data: GameData): Map<string, BoardPoint> {
  const locations = data.board.locations;
  if (isPhysicalBoard(data)) {
    return new Map(locations.map(location => [location.id, physicalPositions[location.id]]));
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
  return data.board.edges.map(edge => {
    const start = positions.get(edge.from), end = positions.get(edge.to);
    if (!start || !end) return { ...edge, points: [] };
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
